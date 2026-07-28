/**
 * Cron: Reconcile Stripe payments with orders
 *
 * Runs every 15 minutes. Finds Stripe checkout sessions that completed
 * but have no matching order in the database, and creates the missing orders.
 *
 * This is a safety net for when the checkout.session.completed webhook
 * fails or times out.
 *
 * Also handles Group V2 participant payments that were marked PAID but
 * never got an Order record created (payment.orderId is null).
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCheckoutSession } from '@/lib/stripe/checkout';
import { prisma } from '@/lib/database/client';
import {
  createOrderFromCheckout,
  getOrderByCheckoutSession,
} from '@/lib/inventory/services/order-service';
import { getCartById } from '@/lib/inventory/services/cart-service';
import { notifyNewOrder, buildGhlPayload } from '@/lib/webhooks/ghl';
import { sanitizeName } from '@/lib/leads/leadCapture';
import {
  sendOrderConfirmationEmail,
} from '@/lib/email';
import { recordDiscountUsage } from '@/lib/discounts/discount-engine';
import { linkOrderToAffiliate } from '@/lib/affiliates/commission-engine';
import { createOrderCalendarEvent } from '@/lib/calendar/google-calendar';
import { classifySegment } from '@/lib/analytics/segment-classifier';
import { Prisma } from '@prisma/client';
import { snapshotItemCost } from '@/lib/analytics/margin-service';
import {
  parseChargedLineItems,
  snapshotToOrderItemCreates,
  assertOrderItemsMatchCharge,
  type OrderItemSnapshotCreate,
} from '@/lib/stripe/charge-snapshot';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recovered: string[] = [];
  const errors: string[] = [];

  try {
    // ==========================================
    // Pass 1: Standard checkout reconciliation
    // ==========================================

    // List completed checkout sessions from the last 2 hours
    const twoHoursAgo = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000);

    const sessions = await stripe.checkout.sessions.list({
      status: 'complete',
      created: { gte: twoHoursAgo },
      limit: 100,
      expand: ['data.line_items'],
    });

    console.log(`[Reconcile] Checking ${sessions.data.length} completed sessions`);

    for (const session of sessions.data) {
      try {
        // Skip non-standard checkouts (group v2, draft orders, etc.)
        const sessionType = session.metadata?.type;
        if (sessionType && sessionType !== 'standard') {
          continue;
        }

        // Must have a cartId in metadata
        const cartId = session.metadata?.cartId;
        if (!cartId) continue;

        // Check if an order already exists
        const existingOrder = await getOrderByCheckoutSession(session.id);
        if (existingOrder) continue;

        // No order exists -- this is a missed webhook. Recover it.
        console.log(`[Reconcile] Missing order for session ${session.id}, cart ${cartId}`);

        const cart = await getCartById(cartId);
        if (!cart) {
          errors.push(`Cart ${cartId} not found for session ${session.id}`);
          continue;
        }

        // Retrieve the full session with expanded data
        const fullSession = await getCheckoutSession(session.id);
        if (!fullSession) {
          errors.push(`Failed to retrieve full session ${session.id}`);
          continue;
        }

        // Create the order
        const order = await createOrderFromCheckout(fullSession, cart);
        console.log(`[Reconcile] Recovered order ${order.orderNumber} from session ${session.id}`);
        recovered.push(String(order.orderNumber));

        // Notify GHL webhook
        try {
          await notifyNewOrder(buildGhlPayload(order, 'standard'));
        } catch (ghlErr) {
          console.error(`[Reconcile] GHL notify failed for ${order.orderNumber}:`, ghlErr);
        }

        // Create delivery task
        try {
          await prisma.deliveryTask.create({
            data: {
              orderId: order.id,
              scheduledDate: order.deliveryDate,
              scheduledTime: order.deliveryTime,
              status: 'PENDING',
            },
          });
        } catch (deliveryErr) {
          console.error(`[Reconcile] Delivery task failed for ${order.orderNumber}:`, deliveryErr);
        }

        // Send confirmation email
        try {
          const deliveryAddress = order.deliveryAddress as {
            address1?: string;
            address2?: string;
            city?: string;
            province?: string;
            zip?: string;
          } || {};

          await sendOrderConfirmationEmail({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            items: order.items.map((item) => ({
              title: item.title,
              variantTitle: item.variantTitle,
              quantity: item.quantity,
              price: Number(item.price),
              totalPrice: Number(item.totalPrice),
            })),
            subtotal: Number(order.subtotal),
            deliveryFee: Number(order.deliveryFee),
            taxAmount: Number(order.taxAmount),
            discountAmount: Number(order.discountAmount),
            discountCode: order.discountCode || undefined,
            total: Number(order.total),
            deliveryDate: order.deliveryDate,
            deliveryTime: order.deliveryTime,
            deliveryAddress: {
              address1: deliveryAddress.address1 || '',
              address2: deliveryAddress.address2,
              city: deliveryAddress.city || 'Austin',
              province: deliveryAddress.province || 'TX',
              zip: deliveryAddress.zip || '',
            },
            deliveryInstructions: order.deliveryInstructions || undefined,
          });
        } catch (emailErr) {
          console.error(`[Reconcile] Email failed for ${order.orderNumber}:`, emailErr);
        }
      } catch (sessionErr) {
        const msg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
        errors.push(`Session ${session.id}: ${msg}`);
        console.error(`[Reconcile] Error processing session ${session.id}:`, sessionErr);
      }
    }

    // ==========================================
    // Pass 2: Group V2 reconciliation
    // ==========================================

    const twoHoursAgoDate = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Find ParticipantPayments that are PAID but have no orderId (missed order creation)
    const orphanedPayments = await prisma.participantPayment.findMany({
      where: {
        status: 'PAID',
        orderId: null,
        paidAt: { lte: twoHoursAgoDate },
      },
      include: {
        participant: true,
        subOrder: true,
      },
    });

    console.log(`[Reconcile] Found ${orphanedPayments.length} orphaned Group V2 payments`);

    for (const payment of orphanedPayments) {
      try {
        const participant = payment.participant;
        const subOrder = payment.subOrder;

        if (!participant || !subOrder) {
          errors.push(`Group V2 payment ${payment.id}: missing participant or subOrder`);
          continue;
        }

        const purchasedItems = await prisma.purchasedItem.findMany({
          where: { paymentId: payment.id },
        });

        if (purchasedItems.length === 0) {
          errors.push(`Group V2 payment ${payment.id}: no purchased items`);
          continue;
        }

        // Group participant names are customer-supplied — neutralize before the
        // recovered Customer + Order store them and the GHL emitter forwards them
        // (this path mirrors handleGroupV2PaymentCompleted, which sanitizes too).
        const safeGuestName = sanitizeName(participant.guestName) || 'Guest';

        // Resolve or create Customer
        let customerId = participant.customerId;
        if (!customerId && participant.guestEmail) {
          const existing = await prisma.customer.findFirst({
            where: { email: participant.guestEmail },
          });
          if (existing) {
            customerId = existing.id;
          } else {
            const newCustomer = await prisma.customer.create({
              data: {
                email: participant.guestEmail,
                firstName: safeGuestName,
                lastName: '',
              },
            });
            customerId = newCustomer.id;
          }
          await prisma.groupParticipantV2.update({
            where: { id: participant.id },
            data: { customerId },
          });
        }

        if (!customerId) {
          errors.push(`Group V2 payment ${payment.id}: no customer ID or email`);
          continue;
        }

        // Build items from the charge snapshot (what Stripe charged), not a re-read of
        // purchasedItems — mirrors the webhook fix so cron recovery can't reintroduce drift.
        const chargeSnapshot = parseChargedLineItems(payment.chargedLineItems);
        let orderItemCreates: OrderItemSnapshotCreate[];
        if (chargeSnapshot) {
          orderItemCreates = await snapshotToOrderItemCreates(prisma, chargeSnapshot);
          assertOrderItemsMatchCharge(orderItemCreates, chargeSnapshot);
        } else {
          console.warn(`[Reconcile] Payment ${payment.id} has no charge snapshot — falling back to purchasedItems`);
          orderItemCreates = [];
          for (const item of purchasedItems) {
            const { unitCost, totalCost } = await snapshotItemCost(prisma, item.variantId, item.quantity);
            orderItemCreates.push({
              productId: item.productId,
              variantId: item.variantId,
              title: item.title,
              variantTitle: item.variantTitle,
              sku: null,
              price: new Prisma.Decimal(item.price),
              quantity: item.quantity,
              totalPrice: new Prisma.Decimal(Number(item.price) * item.quantity),
              unitCost,
              totalCost,
            });
          }
        }

        // Inherit the group's host first-touch attribution (mirrors
        // handleGroupV2PaymentCompleted) so cron-recovered orders feed the
        // per-landing-page hub too. Null group/attribution falls through to null.
        const group = await prisma.groupOrderV2.findUnique({
          where: { id: subOrder.groupOrderId },
          select: {
            landingPage: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            utmTerm: true,
            utmContent: true,
            referrer: true,
          },
        });

        // Create Order record
        const order = await prisma.order.create({
          data: {
            customerId,
            // A2P 10DLC: cron-recovered group orders carry no customerPhone
            // (this path never sets it), so a marketing SMS could not reach them
            // regardless — consent defaults false (fail closed). The main
            // handleGroupV2PaymentCompleted webhook is authoritative for consent;
            // reconcile only runs as a backstop when that failed to create the order.
            smsConsent: false,
            status: 'CONFIRMED',
            financialStatus: 'PAID',
            fulfillmentStatus: 'UNFULFILLED',
            stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
            stripePaymentIntentId: payment.stripePaymentIntentId,
            subtotal: payment.subtotal,
            taxAmount: payment.taxAmount,
            deliveryFee: 0,
            discountCode: payment.discountCode,
            discountAmount: payment.discountAmount,
            total: payment.total,
            deliveryDate: subOrder.deliveryDate,
            deliveryTime: subOrder.deliveryTime,
            deliveryAddress: subOrder.deliveryAddress || {},
            deliveryPhone: subOrder.deliveryPhone || '',
            customerEmail: participant.guestEmail || '',
            customerName: safeGuestName,
            groupOrderId: null,
            groupOrderV2Id: payment.subOrder.groupOrderId,
            landingPage: group?.landingPage ?? null,
            utmSource: group?.utmSource ?? null,
            utmMedium: group?.utmMedium ?? null,
            utmCampaign: group?.utmCampaign ?? null,
            utmTerm: group?.utmTerm ?? null,
            utmContent: group?.utmContent ?? null,
            referrer: group?.referrer ?? null,
            segment: classifySegment(group?.landingPage, group?.utmCampaign),
            items: {
              create: orderItemCreates,
            },
          },
          include: {
            items: true,
            groupOrderV2: { select: { shareCode: true } },
          },
        });

        // Link order to payment
        await prisma.participantPayment.update({
          where: { id: payment.id },
          data: { orderId: order.id },
        });

        console.log(`[Reconcile] Recovered Group V2 order ${order.orderNumber} for payment ${payment.id}`);
        recovered.push(`GV2-${order.orderNumber}`);

        // Record discount usage
        if (payment.discountCode && Number(payment.discountAmount) > 0) {
          try {
            await recordDiscountUsage(
              payment.discountCode,
              order.id,
              customerId,
              Number(payment.discountAmount)
            );
          } catch (discountErr) {
            console.error(`[Reconcile] Discount usage failed for GV2 ${order.orderNumber}:`, discountErr);
          }
        }

        // Link affiliate if session metadata has affiliateCode
        if (payment.stripeCheckoutSessionId) {
          try {
            const stripeSession = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId);
            const affiliateCode = stripeSession.metadata?.affiliateCode;
            if (affiliateCode) {
              await linkOrderToAffiliate(order, affiliateCode);
            }
          } catch (affiliateErr) {
            console.error(`[Reconcile] Affiliate link failed for GV2 ${order.orderNumber}:`, affiliateErr);
          }
        }

        // Notify GHL
        try {
          await notifyNewOrder(buildGhlPayload(order, 'group_v2'));
        } catch (ghlErr) {
          console.error(`[Reconcile] GHL notify failed for GV2 ${order.orderNumber}:`, ghlErr);
        }

        // Create delivery task
        try {
          await prisma.deliveryTask.create({
            data: {
              orderId: order.id,
              scheduledDate: subOrder.deliveryDate,
              scheduledTime: subOrder.deliveryTime,
              status: 'PENDING',
            },
          });
        } catch (deliveryErr) {
          console.error(`[Reconcile] Delivery task failed for GV2 ${order.orderNumber}:`, deliveryErr);
        }

        // Create calendar event
        createOrderCalendarEvent(order).catch((calErr) =>
          console.error(`[Reconcile] Calendar event failed for GV2 ${order.orderNumber}:`, calErr)
        );

        // Send confirmation email
        try {
          const deliveryAddress = subOrder.deliveryAddress as {
            address1?: string;
            address2?: string;
            city?: string;
            province?: string;
            zip?: string;
          } || {};

          await sendOrderConfirmationEmail({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            items: order.items.map((item) => ({
              title: item.title,
              variantTitle: item.variantTitle,
              quantity: item.quantity,
              price: Number(item.price),
              totalPrice: Number(item.totalPrice),
            })),
            subtotal: Number(order.subtotal),
            deliveryFee: Number(order.deliveryFee),
            taxAmount: Number(order.taxAmount),
            discountAmount: Number(order.discountAmount),
            discountCode: order.discountCode || undefined,
            total: Number(order.total),
            deliveryDate: order.deliveryDate,
            deliveryTime: order.deliveryTime,
            deliveryAddress: {
              address1: deliveryAddress.address1 || '',
              address2: deliveryAddress.address2,
              city: deliveryAddress.city || 'Austin',
              province: deliveryAddress.province || 'TX',
              zip: deliveryAddress.zip || '',
            },
            deliveryInstructions: order.deliveryInstructions || undefined,
          });
        } catch (emailErr) {
          console.error(`[Reconcile] Email failed for GV2 ${order.orderNumber}:`, emailErr);
        }
      } catch (paymentErr) {
        const msg = paymentErr instanceof Error ? paymentErr.message : String(paymentErr);
        errors.push(`Group V2 payment ${payment.id}: ${msg}`);
        console.error(`[Reconcile] Error processing Group V2 payment ${payment.id}:`, paymentErr);
      }
    }

    const summary = {
      checked: sessions.data.length,
      groupV2Orphaned: orphanedPayments.length,
      recovered: recovered.length,
      recoveredOrders: recovered,
      errors: errors.length,
      errorDetails: errors,
    };

    console.log('[Reconcile] Complete:', JSON.stringify(summary));

    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('[Reconcile] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Reconciliation failed',
      },
      { status: 500 }
    );
  }
}
