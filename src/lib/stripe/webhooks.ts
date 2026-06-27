/**
 * Stripe Webhook Handlers
 * Process incoming Stripe webhook events
 */

import Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from './client';
import { getCheckoutSession } from './checkout';
import { prisma } from '@/lib/database/client';
import { createOrderFromCheckout, getOrderByCheckoutSession, createOrderFromDraftOrder, recomputeOrderFinancialStatus } from '@/lib/inventory/services/order-service';
import { getCartById } from '@/lib/inventory/services/cart-service';
import { getDraftOrderById, updateDraftOrderStatus, DraftOrderWithTotal } from '@/lib/draft-orders';
import {
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail,
  sendRefundProcessedEmail,
} from '@/lib/email';
import { notifyNewOrder, buildGhlPayload } from '@/lib/webhooks/ghl';
import { recordDiscountUsage } from '@/lib/discounts/discount-engine';
import {
  handleGroupV2PaymentCompleted,
  handleGroupV2DeliveryPayment,
} from './group-v2-payments';
import { linkOrderToAffiliate, voidCommissionForOrder } from '@/lib/affiliates/commission-engine';
import { getAffiliateByCode } from '@/lib/affiliates/affiliate-service';
import { createOrderCalendarEvent } from '@/lib/calendar/google-calendar';
import {
  snapshotOrderStripeFees,
  snapshotStripeBalance,
  upsertDispute,
  upsertPayout,
} from '@/lib/finance/stripe-extended';

/**
 * Verify webhook signature and construct event
 */
export async function constructWebhookEvent(
  body: string,
  signature: string
): Promise<Stripe.Event | null> {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] Missing webhook secret');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('[Stripe Webhook] Signature verification failed:', error);
    return null;
  }
}

/**
 * Handle checkout.session.completed event
 * Creates an order when payment is successful
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('[Stripe Webhook] Processing checkout.session.completed:', session.id);

  // Check if order already exists (idempotency)
  const existingOrder = await getOrderByCheckoutSession(session.id);
  if (existingOrder) {
    console.log('[Stripe Webhook] Order already exists:', existingOrder.orderNumber);
    return;
  }

  // Check if this is a draft order invoice payment
  if (session.metadata?.type === 'draft_order_invoice' && session.metadata?.draftOrderId) {
    await handleDraftOrderPayment(session);
    return;
  }

  // Check if this is a Group V2 participant checkout
  if (session.metadata?.type === 'group_v2') {
    await handleGroupV2PaymentCompleted(session);
    return;
  }

  // Check if this is a Group V2 delivery fee payment
  if (session.metadata?.type === 'group_v2_delivery') {
    await handleGroupV2DeliveryPayment(session);
    return;
  }

  // Get cart ID from metadata
  const cartId = session.metadata?.cartId;
  if (!cartId) {
    throw new Error(`[Stripe Webhook] No cartId in session metadata for session ${session.id}`);
  }

  // Retrieve the cart
  const cart = await getCartById(cartId);
  if (!cart) {
    throw new Error(`[Stripe Webhook] Cart not found: ${cartId} for session ${session.id}`);
  }

  // Retrieve full session with expanded data
  const fullSession = await getCheckoutSession(session.id);
  if (!fullSession) {
    throw new Error(`[Stripe Webhook] Failed to retrieve full session: ${session.id}`);
  }

  // Create the order
  try {
    const order = await createOrderFromCheckout(fullSession, cart);
    console.log('[Stripe Webhook] Order created:', order.orderNumber);

    // Link order to affiliate. Two paths:
    //   1. Cookie/ref attribution from session metadata (affiliateCode)
    //   2. Discount code happens to match an affiliate code — fallback when the
    //      customer typed a partner's code at checkout without coming through
    //      the partner page or ?ref= link.
    const refCode = session.metadata?.affiliateCode;
    const discountCode = order.discountCode;
    let attributedCode: string | null = null;
    let affiliateEmail: string | null = null;

    const tryAttribute = async (code: string): Promise<boolean> => {
      try {
        const result = await linkOrderToAffiliate(order, code);
        return Boolean(result);
      } catch (err) {
        console.error('[Stripe Webhook] Failed to link affiliate:', err);
        return false;
      }
    };

    if (refCode && await tryAttribute(refCode)) {
      attributedCode = refCode;
    } else if (discountCode && discountCode !== refCode && await tryAttribute(discountCode)) {
      attributedCode = discountCode;
    }

    if (attributedCode) {
      const affiliate = await getAffiliateByCode(attributedCode);
      if (affiliate?.email) affiliateEmail = affiliate.email;
    }

    // Notify GHL webhook
    await notifyNewOrder(buildGhlPayload(order, 'standard'));

    // Create Google Calendar event
    createOrderCalendarEvent(order).catch((err) =>
      console.error('[Stripe Webhook] Calendar event failed:', err)
    );

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
      console.log('[Stripe Webhook] Delivery task created for order:', order.orderNumber);
    } catch (deliveryError) {
      console.error('[Stripe Webhook] Failed to create delivery task:', deliveryError);
      // Don't throw - order was created successfully
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
      }, affiliateEmail ? { cc: [affiliateEmail] } : undefined);
      console.log('[Stripe Webhook] Confirmation email sent for order:', order.orderNumber);
    } catch (emailError) {
      console.error('[Stripe Webhook] Failed to send confirmation email:', emailError);
      // Don't throw - order was created successfully
    }
  } catch (error) {
    console.error('[Stripe Webhook] Failed to create order:', error);
    throw error;
  }
}

/**
 * Handle draft order invoice payment
 * Converts draft order to real order when paid
 */
async function handleDraftOrderPayment(
  session: Stripe.Checkout.Session
): Promise<void> {
  const draftOrderId = session.metadata?.draftOrderId;
  if (!draftOrderId) {
    throw new Error(`[Stripe Webhook] No draftOrderId in session metadata for session ${session.id}`);
  }

  console.log('[Stripe Webhook] Processing draft order payment:', draftOrderId);

  // Get the draft order
  const draftOrder = await getDraftOrderById(draftOrderId);
  if (!draftOrder) {
    throw new Error(`[Stripe Webhook] Draft order not found: ${draftOrderId} for session ${session.id}`);
  }

  // Check if already processed
  if (draftOrder.status === 'PAID' || draftOrder.status === 'CONVERTED') {
    console.log('[Stripe Webhook] Draft order already processed:', draftOrderId);
    return;
  }

  // Check if this is an amendment invoice payment
  const rawDraftOrder = await prisma.draftOrder.findUnique({
    where: { id: draftOrderId },
    select: { amendmentForOrderId: true },
  });

  if (rawDraftOrder?.amendmentForOrderId) {
    await handleAmendmentInvoicePayment(draftOrderId, rawDraftOrder.amendmentForOrderId, draftOrder, session);
    return;
  }

  try {
    // Create order from draft order
    const order = await createOrderFromDraftOrder(draftOrder, session);
    console.log('[Stripe Webhook] Order created from draft order:', order.orderNumber);

    // Notify GHL webhook
    await notifyNewOrder(buildGhlPayload(order, 'draft'));

    // Create Google Calendar event
    createOrderCalendarEvent(order).catch((err) =>
      console.error('[Stripe Webhook] Calendar event failed:', err)
    );

    // Record discount usage if a discount code was applied at checkout
    const appliedDiscountCode = session.metadata?.appliedDiscountCode;
    const appliedDiscountAmount = session.metadata?.appliedDiscountAmount;
    if (appliedDiscountCode && appliedDiscountAmount) {
      try {
        const discountAmt = parseFloat(appliedDiscountAmount);
        // If customer applied a code that differs from baked-in, update the order
        if (appliedDiscountCode !== draftOrder.discountCode || discountAmt !== Number(draftOrder.discountAmount)) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              discountCode: appliedDiscountCode,
              discountAmount: discountAmt,
              total: Number(order.total) - discountAmt + Number(order.discountAmount),
            },
          });
        }
        await recordDiscountUsage(
          appliedDiscountCode,
          order.id,
          order.customerId,
          discountAmt
        );
        console.log('[Stripe Webhook] Discount usage recorded:', appliedDiscountCode, discountAmt);
      } catch (discountError) {
        console.error('[Stripe Webhook] Failed to record discount usage:', discountError);
      }
    }

    // Update draft order status
    await updateDraftOrderStatus(draftOrderId, 'CONVERTED', {
      paidAt: new Date(),
      stripePaymentIntentId: session.payment_intent as string,
      convertedOrderId: order.id,
    });
    console.log('[Stripe Webhook] Draft order marked as converted:', draftOrderId);

    // Link order to affiliate. Try ref/draft-attached code first; fall back to
    // the discount code if the customer typed an affiliate code at checkout.
    const draftRefCode = session.metadata?.affiliateCode || draftOrder.affiliateCode;
    const draftDiscountCode = order.discountCode;
    const tryDraftAttribute = async (code: string): Promise<boolean> => {
      try {
        const result = await linkOrderToAffiliate(order, code);
        if (result) console.log('[Stripe Webhook] Draft order linked to affiliate:', code);
        return Boolean(result);
      } catch (err) {
        console.error('[Stripe Webhook] Failed to link draft order affiliate:', err);
        return false;
      }
    };
    if (draftRefCode) {
      const linked = await tryDraftAttribute(draftRefCode);
      if (!linked && draftDiscountCode && draftDiscountCode !== draftRefCode) {
        await tryDraftAttribute(draftDiscountCode);
      }
    } else if (draftDiscountCode) {
      await tryDraftAttribute(draftDiscountCode);
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
      console.log('[Stripe Webhook] Delivery task created for order:', order.orderNumber);
    } catch (deliveryError) {
      console.error('[Stripe Webhook] Failed to create delivery task:', deliveryError);
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
      console.log('[Stripe Webhook] Confirmation email sent for order:', order.orderNumber);
    } catch (emailError) {
      console.error('[Stripe Webhook] Failed to send confirmation email:', emailError);
    }
  } catch (error) {
    console.error('[Stripe Webhook] Failed to process draft order payment:', error);
    throw error;
  }
}

/**
 * Handle checkout.session.expired event
 * Mark the cart as abandoned
 */
async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('[Stripe Webhook] Processing checkout.session.expired:', session.id);

  const cartId = session.metadata?.cartId;
  if (!cartId) return;

  try {
    await prisma.cart.update({
      where: { id: cartId },
      data: {
        status: 'ABANDONED',
      },
    });
    console.log('[Stripe Webhook] Cart marked as abandoned:', cartId);
  } catch (error) {
    console.error('[Stripe Webhook] Failed to update cart:', error);
  }
}

/**
 * Handle payment_intent.succeeded event
 * This is a backup in case checkout.session.completed fails
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log('[Stripe Webhook] Processing payment_intent.succeeded:', paymentIntent.id);

  // Check if order already exists via checkout session
  const checkoutSessionId = paymentIntent.metadata?.checkout_session_id;
  if (checkoutSessionId) {
    const existingOrder = await getOrderByCheckoutSession(checkoutSessionId);
    if (existingOrder) {
      console.log('[Stripe Webhook] Order already exists:', existingOrder.orderNumber);
      return;
    }
  }

  // If no checkout session, log for manual review
  console.log('[Stripe Webhook] Payment succeeded without checkout session:', paymentIntent.id);
}

/**
 * Postgres unique-constraint violation. We use it to treat a concurrent insert
 * of the same stripeRefundId (admin route vs. this webhook racing) as
 * "already recorded" rather than an error.
 */
function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002');
}

/**
 * Handle charge.refunded event.
 *
 * IDEMPOTENT. This webhook fires ~0.5s after the admin cancel/refund routes have
 * already created (and stamped) a Refund row for the same Stripe refund, and it
 * can be re-delivered by Stripe at any time. So instead of blindly creating a
 * row from charge.amount_refunded (a cumulative total, not a per-refund figure),
 * we list the charge's actual refunds from Stripe — the source of truth — and
 * reconcile each one into the DB exactly once:
 *
 *   1. A Refund row already carries this stripeRefundId  → nothing to do.
 *   2. An unstamped row matches this order + amount (the route created it but the
 *      webhook beat its stamping step, or a legacy orphan) → claim it by writing
 *      the stripeRefundId. The route already emailed the customer.
 *   3. No matching row → the refund was issued outside our app (Stripe
 *      dashboard). Create a row AND notify the customer.
 *
 * Commission voiding is order-level and idempotent, so it runs whenever the
 * charge has any live refund. The customer email is sent ONLY for refunds we
 * newly recorded here, so admin-route refunds don't get double-emailed.
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  console.log('[Stripe Webhook] Processing charge.refunded:', charge.id);

  const paymentIntentId = charge.payment_intent as string;
  if (!paymentIntentId) {
    console.error('[Stripe Webhook] No payment_intent on charge');
    return;
  }

  // Find order by payment intent
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!order) {
    console.error('[Stripe Webhook] Order not found for payment intent:', paymentIntentId);
    return;
  }

  // Pull the authoritative per-refund breakdown from Stripe. We key off this
  // charge (the event's subject) rather than the PaymentIntent so we reconcile
  // exactly what this charge.refunded event is about; a sibling charge on the
  // same PI gets its own event. Skip refunds that moved no money
  // (failed/canceled) — they must not create rows or count.
  const stripeRefunds: Stripe.Refund[] = [];
  try {
    for await (const r of stripe.refunds.list({ charge: charge.id, limit: 100 })) {
      if (r.status === 'failed' || r.status === 'canceled') continue;
      stripeRefunds.push(r);
    }
  } catch (error) {
    console.error('[Stripe Webhook] Failed to list refunds for charge:', charge.id, error);
    throw error;
  }

  if (stripeRefunds.length === 0) {
    console.log('[Stripe Webhook] No live refunds on charge:', charge.id);
    return;
  }

  // Amounts newly recorded by THIS invocation (Stripe-dashboard refunds the
  // routes never saw) — only these get a customer email.
  const newlyRecorded: number[] = [];

  for (const r of stripeRefunds) {
    const amount = r.amount / 100;
    const amountStr = amount.toFixed(2); // exact Decimal match, dodges float drift

    // 1. Already reconciled (this id is unique in the DB) → idempotent no-op.
    const existing = await prisma.refund.findUnique({
      where: { stripeRefundId: r.id },
    });
    if (existing) continue;

    // 2. Claim an unstamped row the admin route created for this same refund
    //    (race) or a legacy orphan of the right amount, instead of duplicating.
    const candidate = await prisma.refund.findFirst({
      where: {
        orderId: order.id,
        stripeRefundId: null,
        amount: amountStr,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (candidate) {
      try {
        await prisma.refund.update({
          where: { id: candidate.id },
          data: {
            stripeRefundId: r.id,
            status: 'SUCCEEDED',
            processedAt: candidate.processedAt ?? new Date(),
          },
        });
      } catch (error) {
        // Another writer stamped this id between our read and write — safe to skip.
        if (!isUniqueViolation(error)) throw error;
      }
      continue;
    }

    // 3. Refund originated outside our app (Stripe dashboard). Record it.
    try {
      await prisma.refund.create({
        data: {
          orderId: order.id,
          stripeRefundId: r.id,
          amount: amountStr,
          reason: 'Stripe refund',
          status: 'SUCCEEDED',
          processedBy: 'stripe',
          processedAt: new Date(),
        },
      });
      newlyRecorded.push(amount);
    } catch (error) {
      // Lost the create race; the id now exists, so it's recorded. Skip.
      if (!isUniqueViolation(error)) throw error;
    }
  }

  // Recompute REFUNDED / PARTIALLY_REFUNDED from the full set of rows.
  try {
    await recomputeOrderFinancialStatus(order.id);
  } catch (error) {
    console.error('[Stripe Webhook] Failed to recompute financial status:', error);
  }

  // Void any affiliate commission for this order (idempotent).
  try {
    await voidCommissionForOrder(order.id, 'refund');
  } catch (voidError) {
    console.error('[Stripe Webhook] Failed to void affiliate commission:', voidError);
  }

  // Email only for refunds we recorded here. Admin-route refunds already sent
  // their own email, so re-sending would double-notify the customer.
  if (newlyRecorded.length > 0) {
    try {
      const orderWithCustomer = await prisma.order.findUnique({
        where: { id: order.id },
        include: { customer: true },
      });

      if (orderWithCustomer?.customerEmail) {
        const total = newlyRecorded.reduce((sum, a) => sum + a, 0);
        await sendRefundProcessedEmail(
          orderWithCustomer.customerEmail,
          orderWithCustomer.customerName,
          orderWithCustomer.orderNumber,
          total,
          'Stripe refund'
        );
        console.log('[Stripe Webhook] Refund email sent for order:', order.orderNumber);
      }
    } catch (emailError) {
      console.error('[Stripe Webhook] Failed to send refund email:', emailError);
    }
  }

  console.log('[Stripe Webhook] Refund reconciled for order:', order.orderNumber);
}

/**
 * Handle payment_intent.payment_failed event
 * Log failed payments and notify customer
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log('[Stripe Webhook] Processing payment_intent.payment_failed:', paymentIntent.id);

  const error = paymentIntent.last_payment_error;
  console.error('[Stripe Webhook] Payment failed:', {
    paymentIntentId: paymentIntent.id,
    errorCode: error?.code,
    errorMessage: error?.message,
    customerEmail: paymentIntent.receipt_email,
  });

  // Send payment failure notification
  const customerEmail = paymentIntent.receipt_email;
  if (customerEmail) {
    try {
      // Get customer name from metadata or use generic
      const customerName = paymentIntent.metadata?.customerName || 'Valued Customer';
      const errorMessage = error?.message || 'Your payment could not be processed.';

      await sendPaymentFailedEmail(customerEmail, customerName, errorMessage);
      console.log('[Stripe Webhook] Payment failure email sent to:', customerEmail);
    } catch (emailError) {
      console.error('[Stripe Webhook] Failed to send payment failure email:', emailError);
    }
  }
}

/**
 * Main webhook event processor
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'checkout.session.expired':
      await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;

    // ---- Finance Director Phase 1A ---------------------------------------
    case 'payout.created':
    case 'payout.paid':
    case 'payout.failed':
    case 'payout.canceled':
    case 'payout.updated':
      await handleFinancePayoutEvent(event.data.object as Stripe.Payout);
      break;

    case 'balance.available':
      await handleFinanceBalanceAvailable();
      break;

    case 'charge.dispute.created':
    case 'charge.dispute.updated':
    case 'charge.dispute.funds_withdrawn':
    case 'charge.dispute.funds_reinstated':
    case 'charge.dispute.closed':
      await handleFinanceDisputeEvent(event.data.object as Stripe.Dispute);
      break;

    default:
      console.log('[Stripe Webhook] Unhandled event type:', event.type);
  }
}

/**
 * Phase 1A — persist payout to StripePayout. Also kicks off fee-snapshot
 * backfill for any recent orders that haven't been snapshotted yet (the
 * payout signal means the underlying charges have settled and have
 * BalanceTransactions available).
 */
async function handleFinancePayoutEvent(payout: Stripe.Payout): Promise<void> {
  try {
    await upsertPayout(payout);
  } catch (err) {
    console.error('[Stripe Webhook] upsertPayout failed:', err);
    throw err;
  }
}

async function handleFinanceBalanceAvailable(): Promise<void> {
  try {
    await snapshotStripeBalance();
  } catch (err) {
    console.error('[Stripe Webhook] snapshotStripeBalance failed:', err);
    throw err;
  }
}

async function handleFinanceDisputeEvent(dispute: Stripe.Dispute): Promise<void> {
  try {
    await upsertDispute(dispute);
  } catch (err) {
    console.error('[Stripe Webhook] upsertDispute failed:', err);
    throw err;
  }
}

/**
 * Phase 1A — exported so the order-creation path can snapshot fees opportunistically.
 * Re-export of snapshotOrderStripeFees so callers don't need to import from
 * @/lib/finance/* directly.
 */
export { snapshotOrderStripeFees };

/**
 * Handle amendment invoice payment.
 *
 * IMPORTANT: do NOT mutate OrderItem rows or Order totals here. Those are already
 * applied synchronously at amendment submission time by POST /api/v1/admin/orders/[id]/amend
 * (see amend/route.ts). When this webhook used to re-apply the diff, every paid
 * amendment ended up with item quantities and order totals doubled — the customer
 * was charged correctly via Stripe, but the order rows reflected 2× the request,
 * causing over-delivery. (Repaired on prod 2026-05-19; see
 * scripts/ops/fix-doubled-amendment-orders.mjs.)
 *
 * This handler now ONLY:
 *   1. Marks the DraftOrder as CONVERTED.
 *   2. Marks the OrderAmendment as PAID.
 *   3. Sends a confirmation email for the amendment items.
 */
async function handleAmendmentInvoicePayment(
  draftOrderId: string,
  existingOrderId: string,
  draftOrder: DraftOrderWithTotal,
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('[Stripe Webhook] Processing amendment invoice payment for order:', existingOrderId);

  const existingOrder = await prisma.order.findUnique({
    where: { id: existingOrderId },
  });

  if (!existingOrder) {
    throw new Error(`[Stripe Webhook] Existing order not found for amendment: ${existingOrderId}`);
  }

  const amendmentItems = draftOrder.items;
  const amendmentSubtotal = Number(draftOrder.subtotal);
  const amendmentTax = Number(draftOrder.taxAmount);
  const amendmentDeliveryFee = Number(draftOrder.deliveryFee);
  const amendmentTotal = Number(draftOrder.total);

  // Mark draft order as converted
  await updateDraftOrderStatus(draftOrderId, 'CONVERTED', {
    paidAt: new Date(),
    stripePaymentIntentId: session.payment_intent as string,
    convertedOrderId: existingOrderId,
  });

  // Update linked OrderAmendment resolution to PAID
  const amendment = await prisma.orderAmendment.findFirst({
    where: { draftOrderId, orderId: existingOrderId },
  });
  if (amendment) {
    await prisma.orderAmendment.update({
      where: { id: amendment.id },
      data: {
        resolution: 'PAID',
        resolvedAt: new Date(),
      },
    });
  }

  // Send confirmation email
  try {
    await sendOrderConfirmationEmail({
      orderNumber: existingOrder.orderNumber,
      customerName: existingOrder.customerName,
      customerEmail: existingOrder.customerEmail,
      items: amendmentItems.map((item) => ({
        title: item.title,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.price * item.quantity,
      })),
      subtotal: amendmentSubtotal,
      deliveryFee: amendmentDeliveryFee,
      taxAmount: amendmentTax,
      discountAmount: 0,
      total: amendmentTotal,
      deliveryDate: existingOrder.deliveryDate,
      deliveryTime: existingOrder.deliveryTime,
      deliveryAddress: {
        address1: (existingOrder.deliveryAddress as { address1?: string })?.address1 || '',
        city: (existingOrder.deliveryAddress as { city?: string })?.city || 'Austin',
        province: (existingOrder.deliveryAddress as { province?: string; state?: string })?.province || (existingOrder.deliveryAddress as { state?: string })?.state || 'TX',
        zip: (existingOrder.deliveryAddress as { zip?: string })?.zip || '',
      },
    });
    console.log('[Stripe Webhook] Amendment confirmation email sent for order:', existingOrder.orderNumber);
  } catch (emailError) {
    console.error('[Stripe Webhook] Failed to send amendment confirmation email:', emailError);
  }

  console.log('[Stripe Webhook] Amendment invoice processed for order:', existingOrder.orderNumber);
}

/**
 * List of webhook events to subscribe to
 */
export const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'checkout.session.expired',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'customer.created',
  'customer.updated',
];
