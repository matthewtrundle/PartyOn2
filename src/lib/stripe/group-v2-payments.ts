/**
 * Group Orders V2 - Stripe Payment Integration
 * Participant item checkout and host delivery fee invoices
 */

import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { stripe } from './client';
import { prisma } from '@/lib/database/client';
import { DEFAULT_TAX_RATE } from '@/lib/tax';
import { moveDraftToPurchased, moveAllDraftsToPurchased } from '@/lib/group-orders-v2/service';
import { notifyNewOrder, buildGhlPayload } from '@/lib/webhooks/ghl';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { recordDiscountUsage } from '@/lib/discounts/discount-engine';
import { linkOrderToAffiliate } from '@/lib/affiliates/commission-engine';
import { getAffiliateByCode } from '@/lib/affiliates/affiliate-service';
import { createOrderCalendarEvent } from '@/lib/calendar/google-calendar';
import { commitInventoryForOrderItem } from '@/lib/inventory/services/order-service';
import { snapshotItemCost } from '@/lib/analytics/margin-service';
import { classifySegment } from '@/lib/analytics/segment-classifier';
import { assertVariantsPurchasable } from '@/lib/products/availability';
import {
  buildChargedLineItems,
  chargedLineItemToStripe,
  parseChargedLineItems,
  snapshotToOrderItemCreates,
  assertOrderItemsMatchCharge,
  type OrderItemSnapshotCreate,
} from './charge-snapshot';

// ==========================================
// Types
// ==========================================

interface DraftItemForCheckout {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string | null;
  price: { toString(): string } | number;
  imageUrl: string | null;
  quantity: number;
}

interface CreateCheckoutInput {
  groupOrderId: string;
  subOrderId: string;
  participantId: string;
  participantEmail?: string;
  /** Optional phone from our checkout modal, used only to pair the SMS opt-in
   *  with a number and to gate the smsConsent metadata below. Not persisted to
   *  the participant; Stripe collects the authoritative order phone. */
  participantPhone?: string;
  /** A2P 10DLC express SMS opt-in from the modal checkbox. Recorded to Stripe
   *  metadata only when a phone is present; not enforced yet (deferred). */
  smsConsent?: boolean;
  participantName: string;
  draftItems: DraftItemForCheckout[];
  discountCode?: string;
  tipAmount?: number;
  successUrl: string;
  cancelUrl: string;
  checkoutType?: 'participant' | 'all';
  /** When true, delivery fee is bundled into this checkout instead of a separate invoice */
  includeDeliveryFee?: boolean;
  deliveryFeeAmount?: number;
  /** Affiliate code from the GroupOrderV2 — passed through Stripe metadata for commission tracking */
  affiliateCode?: string;
  /** When true, the delivery fee is being waived by an affiliate perk -- webhook will stamp deliveryFeeWaived */
  waiveDeliveryFee?: boolean;
}

interface CreateDeliveryInvoiceInput {
  groupOrderId: string;
  subOrderId: string;
  hostParticipantId: string;
  hostEmail?: string;
  deliveryFee: number;
  discountCode?: string;
  successUrl: string;
  cancelUrl: string;
}

// ==========================================
// Participant Checkout
// ==========================================

export async function createGroupV2CheckoutSession(input: CreateCheckoutInput) {
  const {
    groupOrderId, subOrderId, participantId, participantEmail,
    draftItems, discountCode, successUrl, cancelUrl,
  } = input;

  // Defense-in-depth: refuse to charge for any product that isn't ACTIVE (or whose variant isn't
  // availableForSale), re-read from the DB. A product drafted/archived after a participant added
  // it to their tab must not be purchasable here. Throws ProductNotPurchasableError, which the
  // checkout route surfaces as a clear error listing the offending items.
  await assertVariantsPurchasable(
    prisma,
    draftItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      title: item.title,
    }))
  );

  // Calculate subtotal
  const subtotal = draftItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  // Resolve discount BEFORE calculating tax (tax applies to post-discount amount)
  let discountAmount = 0;
  let stripeCouponId: string | undefined;
  let discountWaivesDelivery = false;

  if (discountCode) {
    const discount = await prisma.discount.findUnique({
      where: { code: discountCode, isActive: true },
    });
    if (discount) {
      if (discount.type === 'PERCENTAGE') {
        discountAmount = Math.round(subtotal * (Number(discount.value) / 100) * 100) / 100;
      } else if (discount.type === 'FIXED_AMOUNT') {
        discountAmount = Math.min(Number(discount.value), subtotal);
      }
      // Free shipping discounts (e.g. affiliate codes like BACHPLAN) waive the delivery fee.
      // Schema has both fields for legacy reasons -- match the discount engine OR logic.
      if (discount.freeShipping || discount.type === 'FREE_SHIPPING') {
        discountWaivesDelivery = true;
      }
    }
    if (discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: 'usd',
        duration: 'once',
        name: discountCode,
      });
      stripeCouponId = coupon.id;
    }
  }

  // Calculate tax on post-discount amount (Texas tax applies to actual selling price)
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * DEFAULT_TAX_RATE * 100) / 100;

  // Build the immutable charge snapshot from the participant's draft products, then derive the
  // Stripe product line items from it so the snapshot equals what's charged. The Order's items
  // are later rebuilt from this snapshot (persisted on the ParticipantPayment) — not from a
  // re-read of drafts/purchased items, which is what let post-checkout edits drift.
  const chargedLineItems = buildChargedLineItems(
    draftItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      title: item.title,
      variantTitle: item.variantTitle,
      price: item.price,
      quantity: item.quantity,
    }))
  );
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    chargedLineItems.map(chargedLineItemToStripe);

  // Add delivery fee line item when bundled into this checkout.
  // A FREE_SHIPPING discount code (e.g. BACHPLAN) overrides includeDeliveryFee
  // and triggers the waive metadata path so the webhook stamps deliveryFeeWaived.
  const includeDeliveryFee = !discountWaivesDelivery
    && input.includeDeliveryFee
    && input.deliveryFeeAmount
    && input.deliveryFeeAmount > 0;
  const effectiveWaiveDeliveryFee = input.waiveDeliveryFee || discountWaivesDelivery;
  const deliveryFeeAmount = includeDeliveryFee ? input.deliveryFeeAmount! : 0;
  if (includeDeliveryFee) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Delivery Fee',
          description: 'Party On Delivery fee',
        },
        unit_amount: Math.round(deliveryFeeAmount * 100),
      },
      quantity: 1,
    });
  }

  // Add tip line item
  const tipAmount = input.tipAmount && input.tipAmount > 0 ? input.tipAmount : 0;
  if (tipAmount > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Tip for the Party On Team',
        },
        unit_amount: Math.round(tipAmount * 100),
      },
      quantity: 1,
    });
  }

  // Add tax line item (calculated on post-discount amount)
  if (taxAmount > 0) {
    const taxRateDisplay = `${(DEFAULT_TAX_RATE * 100).toFixed(2)}%`;
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Sales Tax (${taxRateDisplay})`,
          description: 'Texas sales tax',
        },
        unit_amount: Math.round(taxAmount * 100),
      },
      quantity: 1,
    });
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card', 'link'],
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: 'group_v2',
      groupOrderId,
      subOrderId,
      participantId,
      checkoutType: input.checkoutType || 'participant',
      ...(tipAmount > 0 ? { tipAmount: String(tipAmount) } : {}),
      ...(includeDeliveryFee
        ? { deliveryFee: String(deliveryFeeAmount) }
        : effectiveWaiveDeliveryFee
          ? { deliveryFee: '0', deliveryFeeWaivedByAffiliate: 'true' }
          : {}),
      ...(input.affiliateCode ? { affiliateCode: input.affiliateCode } : {}),
      // A2P 10DLC: record express SMS opt-in only when a phone was provided.
      ...(input.participantPhone && input.smsConsent !== undefined
        ? { smsConsent: input.smsConsent ? 'true' : 'false' }
        : {}),
    },
    billing_address_collection: 'required',
    phone_number_collection: { enabled: true },
    // Transactional order/delivery texts for THIS order shown at the phone
    // field. Marketing/reminder SMS consent is collected separately via the
    // explicit, unchecked opt-in checkbox on our checkout modal (A2P 10DLC
    // express consent) — this disclosure is not the marketing opt-in.
    custom_text: {
      submit: {
        message:
          'We may text you order and delivery updates for this order at the number you provide. Msg & data rates may apply. Reply STOP to opt out, HELP for help. See our Privacy Policy at partyondelivery.com/privacy.',
      },
    },
  };

  if (participantEmail) {
    sessionParams.customer_email = participantEmail;
  }

  if (stripeCouponId) {
    sessionParams.discounts = [{ coupon: stripeCouponId }];
  }

  const total = subtotal + taxAmount - discountAmount + tipAmount + deliveryFeeAmount;

  // Create Stripe session
  const session = await stripe.checkout.sessions.create(sessionParams);

  // Create ParticipantPayment record. Persist the immutable charge snapshot so the Order's
  // items are later built from exactly what Stripe charged (not a re-read of the drafts).
  const payment = await prisma.participantPayment.create({
    data: {
      subOrderId,
      participantId,
      stripeCheckoutSessionId: session.id,
      subtotal,
      taxAmount,
      discountCode: discountCode || null,
      discountAmount,
      tipAmount,
      total,
      chargedLineItems: chargedLineItems as unknown as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });

  return {
    checkoutUrl: session.url || '',
    sessionId: session.id,
    paymentId: payment.id,
  };
}

// ==========================================
// Delivery Fee Invoice
// ==========================================

export async function createDeliveryInvoiceSession(input: CreateDeliveryInvoiceInput) {
  const {
    groupOrderId, subOrderId, hostParticipantId, hostEmail,
    deliveryFee, discountCode, successUrl, cancelUrl,
  } = input;

  let discountAmount = 0;
  let feeWaived = false;

  // Check for FREE_SHIPPING discount
  if (discountCode) {
    const discount = await prisma.discount.findUnique({
      where: { code: discountCode, isActive: true },
    });
    if (discount && (discount.type === 'FREE_SHIPPING' || discount.freeShipping)) {
      feeWaived = true;
      discountAmount = deliveryFee;
    } else if (discount && discount.type === 'PERCENTAGE') {
      discountAmount = Math.round(deliveryFee * (Number(discount.value) / 100) * 100) / 100;
    } else if (discount && discount.type === 'FIXED_AMOUNT') {
      discountAmount = Math.min(Number(discount.value), deliveryFee);
    }
  }

  const total = Math.max(0, deliveryFee - discountAmount);

  // If fee is waived, just create the invoice record and return
  if (feeWaived || total === 0) {
    const invoice = await prisma.groupDeliveryInvoice.create({
      data: {
        subOrderId,
        hostParticipantId,
        deliveryFee,
        discountCode: discountCode || null,
        discountAmount,
        total: 0,
        status: 'PAID',
        paidAt: new Date(),
      },
    });
    // Mark tab fee as waived
    await prisma.subOrder.update({
      where: { id: subOrderId },
      data: { deliveryFeeWaived: true },
    });
    return {
      checkoutUrl: successUrl,
      sessionId: '',
      invoiceId: invoice.id,
    };
  }

  // Create Stripe session for delivery fee
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card', 'link'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Delivery Fee',
            description: 'Group order delivery fee',
          },
          unit_amount: Math.round(total * 100),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: 'group_v2_delivery',
      groupOrderId,
      subOrderId,
      hostParticipantId,
    },
    billing_address_collection: 'required',
  };

  if (hostEmail) {
    sessionParams.customer_email = hostEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  // Create invoice record
  const invoice = await prisma.groupDeliveryInvoice.create({
    data: {
      subOrderId,
      hostParticipantId,
      deliveryFee,
      discountCode: discountCode || null,
      discountAmount,
      total,
      stripeCheckoutSessionId: session.id,
      status: 'PENDING',
    },
  });

  return {
    checkoutUrl: session.url || '',
    sessionId: session.id,
    invoiceId: invoice.id,
  };
}

// ==========================================
// Webhook Handlers
// ==========================================

/**
 * Handle successful participant checkout
 * Moves draft items to purchased, creates Order record
 *
 * CRITICAL: If order creation fails, this function THROWS so Stripe
 * retries the webhook. Non-fatal side effects (email, GHL, calendar)
 * are wrapped in individual try/catch blocks.
 */
export async function handleGroupV2PaymentCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { groupOrderId, subOrderId, participantId } = session.metadata || {};
  if (!groupOrderId || !subOrderId || !participantId) {
    console.error('[Group V2 Payment] Missing metadata on session:', session.id);
    return;
  }

  // Find payment record
  const payment = await prisma.participantPayment.findFirst({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (!payment) {
    console.error('[Group V2 Payment] Payment record not found:', session.id);
    return;
  }

  // Idempotency: skip if order already created (orderId set)
  if (payment.orderId) {
    console.log('[Group V2 Payment] Already processed (orderId set):', session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  // Update payment status to PAID (if not already)
  if (payment.status !== 'PAID') {
    await prisma.participantPayment.update({
      where: { id: payment.id },
      data: {
        stripePaymentIntentId: paymentIntentId || null,
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  // Move draft items to purchased
  const checkoutType = session.metadata?.checkoutType;
  if (checkoutType === 'all') {
    await moveAllDraftsToPurchased(subOrderId, participantId, payment.id);
  } else {
    await moveDraftToPurchased(subOrderId, participantId, payment.id);
  }

  // --- CRITICAL: Create Order record (throws on failure so Stripe retries) ---
  const participant = await prisma.groupParticipantV2.findUnique({
    where: { id: participantId },
  });
  const subOrder = await prisma.subOrder.findUnique({
    where: { id: subOrderId },
  });

  if (!participant || !subOrder) {
    throw new Error(`[Group V2 Payment] Participant or SubOrder not found: participant=${participantId} subOrder=${subOrderId}`);
  }

  // Fetch the group once: its host first-touch attribution is inherited by this Order
  // (so the per-landing-page analytics hub attributes group revenue/conversion to the
  // page that drove the party), and its affiliate is the fallback for commission linking
  // further down. Missing attribution is fine — older groups carry none (null columns).
  const group = await prisma.groupOrderV2.findUnique({
    where: { id: groupOrderId },
    select: {
      landingPage: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmTerm: true,
      utmContent: true,
      referrer: true,
      affiliate: { select: { code: true } },
    },
  });

  const purchasedItems = await prisma.purchasedItem.findMany({
    where: { paymentId: payment.id },
  });

  // Resolve or create Customer for guest participants
  // Fall back to Stripe checkout session email/name when participant record is missing them
  const customerEmail = participant.guestEmail || session.customer_details?.email || '';
  // Prefer the participant's own name (matches the email line above), UNLESS it's the
  // 'Party Host' placeholder — the host default when they skipped entering a name — in
  // which case fall back to the Stripe checkout name.
  const customerName = (participant.guestName && participant.guestName !== 'Party Host')
    ? participant.guestName
    : (session.customer_details?.name || participant.guestName || 'Guest');
  const customerPhone = participant.guestPhone || session.customer_details?.phone || '';

  let customerId = participant.customerId;
  if (!customerId && customerEmail) {
    const existing = await prisma.customer.findFirst({
      where: { email: customerEmail },
    });
    if (existing) {
      customerId = existing.id;
    } else {
      try {
        const nameParts = customerName.split(' ');
        const newCustomer = await prisma.customer.create({
          data: {
            email: customerEmail,
            firstName: nameParts[0] || 'Guest',
            lastName: nameParts.slice(1).join(' ') || '',
            phone: customerPhone || undefined,
          },
        });
        customerId = newCustomer.id;
      } catch (createErr) {
        // Race condition: another webhook may have created the customer concurrently
        const raceCustomer = await prisma.customer.findFirst({
          where: { email: customerEmail },
        });
        if (raceCustomer) {
          customerId = raceCustomer.id;
        } else {
          throw createErr; // Genuine error, not a race
        }
      }
    }
    // Link participant to customer and update their details for future lookups
    // Wrapped in try/catch: this is non-critical backfill -- must not block order creation
    // (can fail if Stripe email matches another participant in the same group due to unique constraint)
    try {
      await prisma.groupParticipantV2.update({
        where: { id: participantId },
        data: {
          customerId,
          guestEmail: participant.guestEmail || customerEmail || undefined,
          guestName: customerName !== participant.guestName ? customerName : undefined,
          guestPhone: participant.guestPhone || customerPhone || undefined,
        },
      });
    } catch (linkErr) {
      console.error('[Group V2 Payment] Non-fatal: failed to link participant to customer:', linkErr);
      // Still set customerId so order creation can proceed
    }
  }

  if (!customerId) {
    throw new Error(`[Group V2 Payment] No customer ID or email for participant: ${participantId}`);
  }

  // Delivery fee: use bundled amount from metadata, otherwise 0 (host pays separately)
  const bundledDeliveryFee = session.metadata?.deliveryFee ? Number(session.metadata.deliveryFee) : 0;

  // Build Order items from the immutable charge snapshot persisted on the payment (what Stripe
  // charged), NOT from a re-read of purchased/draft items — this closes the two-snapshot race.
  // Fall back to purchasedItems only for payments created before the snapshot shipped.
  const chargeSnapshot = parseChargedLineItems(payment.chargedLineItems);
  let orderItemCreates: OrderItemSnapshotCreate[];
  if (chargeSnapshot) {
    orderItemCreates = await snapshotToOrderItemCreates(prisma, chargeSnapshot);
    assertOrderItemsMatchCharge(orderItemCreates, chargeSnapshot);
  } else {
    console.warn(`[Group V2 Payment] Payment ${payment.id} has no charge snapshot — falling back to purchasedItems`);
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

  const order = await prisma.order.create({
    data: {
      customerId,
      status: 'CONFIRMED',
      financialStatus: 'PAID',
      fulfillmentStatus: 'UNFULFILLED',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId || null,
      subtotal: payment.subtotal,
      taxAmount: payment.taxAmount,
      deliveryFee: bundledDeliveryFee,
      discountCode: payment.discountCode,
      discountAmount: payment.discountAmount,
      tipAmount: payment.tipAmount,
      total: payment.total,
      deliveryDate: subOrder.deliveryDate,
      deliveryTime: subOrder.deliveryTime,
      deliveryAddress: subOrder.deliveryAddress || {},
      deliveryPhone: subOrder.deliveryPhone || customerPhone || '',
      customerEmail: customerEmail,
      customerName: customerName,
      customerPhone: customerPhone || null,
      groupOrderId: null, // V2 doesn't use v1 group order FK
      groupOrderV2Id: groupOrderId,
      // Inherit the host's first-touch attribution + derived segment from the group, so
      // this Order rolls up to the landing page that drove the party. Every Order in a
      // group inherits the same host attribution — accurate for revenue (each Order is a
      // distinct charge counted once), and it leaves the channel rollup untouched (group
      // orders bucket as 'group' before 'utm_*'). See landing-page-metrics.ts caveat.
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

  // Link order to payment (acts as idempotency marker for retries)
  await prisma.participantPayment.update({
    where: { id: payment.id },
    data: { orderId: order.id },
  });

  // If delivery fee was bundled OR waived by an affiliate perk, mark the tab as waived
  // so the separate host-invoice flow won't charge it later.
  const waivedByAffiliate = session.metadata?.deliveryFeeWaivedByAffiliate === 'true';
  if (bundledDeliveryFee > 0 || waivedByAffiliate) {
    await prisma.subOrder.update({
      where: { id: subOrderId },
      data: { deliveryFeeWaived: true },
    });
  }

  // Commit inventory for each purchased item
  for (const item of order.items) {
    try {
      await commitInventoryForOrderItem(
        prisma,
        item.productId,
        item.variantId,
        item.quantity,
        order.orderNumber,
        order.id
      );
    } catch (invErr) {
      console.error(`[Group V2 Payment] Failed to commit inventory for ${item.title}:`, invErr);
    }
  }

  console.log('[Group V2 Payment] Order created:', order.orderNumber);

  // --- NON-FATAL side effects below (each in its own try/catch) ---

  // Record discount usage
  if (payment.discountCode && Number(payment.discountAmount) > 0) {
    try {
      await recordDiscountUsage(
        payment.discountCode,
        order.id,
        customerId,
        Number(payment.discountAmount)
      );
      console.log('[Group V2 Payment] Discount usage recorded:', payment.discountCode);
    } catch (discountErr) {
      console.error('[Group V2 Payment] Failed to record discount usage:', discountErr);
    }
  }

  // Link order to affiliate. Priority:
  //   1. Stripe metadata code (set at checkout via cookie/ref attribution)
  //   2. Group's attached affiliate (for orders created before metadata
  //      propagation landed)
  //   3. Discount code matching an affiliate code (customer typed the code at
  //      checkout without coming through the partner page)
  let resolvedAffiliateCode = session.metadata?.affiliateCode;
  if (!resolvedAffiliateCode) {
    resolvedAffiliateCode = group?.affiliate?.code;
  }
  if (!resolvedAffiliateCode && order.discountCode) {
    resolvedAffiliateCode = order.discountCode;
  }
  let affiliateEmail: string | null = null;
  if (resolvedAffiliateCode) {
    try {
      const linked = await linkOrderToAffiliate(order, resolvedAffiliateCode);
      if (linked) {
        const affiliate = await getAffiliateByCode(resolvedAffiliateCode);
        if (affiliate?.email) affiliateEmail = affiliate.email;
        console.log('[Group V2 Payment] Linked to affiliate:', resolvedAffiliateCode);
      }
    } catch (affiliateErr) {
      console.error('[Group V2 Payment] Failed to link affiliate:', affiliateErr);
    }
  }

  // Notify GHL webhook
  try {
    await notifyNewOrder(buildGhlPayload(order, 'group_v2'));
  } catch (ghlErr) {
    console.error('[Group V2 Payment] GHL notify failed:', ghlErr);
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
    console.log('[Group V2 Payment] Delivery task created for order:', order.orderNumber);
  } catch (deliveryErr) {
    console.error('[Group V2 Payment] Failed to create delivery task:', deliveryErr);
  }

  // Create Google Calendar event
  createOrderCalendarEvent(order).catch((calErr) =>
    console.error('[Group V2 Payment] Calendar event failed:', calErr)
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
    }, affiliateEmail ? { cc: [affiliateEmail] } : undefined);
    console.log('[Group V2 Payment] Confirmation email sent for order:', order.orderNumber);
  } catch (emailErr) {
    console.error('[Group V2 Payment] Failed to send confirmation email:', emailErr);
  }

  console.log('[Group V2 Payment] Completed for participant:', participantId);
}

/**
 * Handle successful delivery fee payment
 */
export async function handleGroupV2DeliveryPayment(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { subOrderId } = session.metadata || {};
  if (!subOrderId) {
    console.error('[Group V2 Delivery] Missing metadata:', session.id);
    return;
  }

  const invoice = await prisma.groupDeliveryInvoice.findFirst({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (!invoice) {
    console.error('[Group V2 Delivery] Invoice not found:', session.id);
    return;
  }

  if (invoice.status === 'PAID') {
    console.log('[Group V2 Delivery] Already processed:', session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  await prisma.groupDeliveryInvoice.update({
    where: { id: invoice.id },
    data: {
      stripePaymentIntentId: paymentIntentId || null,
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  console.log('[Group V2 Delivery] Invoice paid for tab:', subOrderId);
}
