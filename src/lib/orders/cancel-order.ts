/**
 * Order cancellation — the single money path.
 *
 * Both the per-order cancel route and the bulk (whole-cooler) cancel route call
 * `cancelOrder`, so the Stripe refund, the DB Refund row, the inventory release
 * and the customer emails can never drift apart between the two surfaces.
 *
 * Refund amount is Stripe-authoritative (`getMaxRefundable`), never
 * `Order.total` — OrderAmendment rewrites `total` when items change.
 */

import { prisma } from '@/lib/database/client';
import { stripe } from '@/lib/stripe/client';
import { getMaxRefundable } from '@/lib/stripe/refund-utils';
import { createRefund, releaseCommittedInventory } from '@/lib/inventory/services/order-service';
import { sendOrderCancellationEmail, sendRefundProcessedEmail } from '@/lib/email/email-service';
import { generateOrderCancellationEmail } from '@/lib/email/templates/order-cancellation';

/** Why a cancel could not be performed. Routes map these onto HTTP statuses. */
export type CancelFailureCode =
  | 'NOT_FOUND'
  | 'ALREADY_TERMINAL'
  | 'NO_PAYMENT'
  | 'ALREADY_REFUNDED'
  | 'STRIPE_ERROR'
  | 'UNKNOWN';

/** The refund actually issued by a cancel, if any. */
export interface CancelRefundResult {
  stripeRefundId: string;
  amount: number;
  status: string;
}

export type CancelOrderResult =
  | { ok: true; orderId: string; orderNumber: number; customerName: string; refund: CancelRefundResult | null }
  | {
      ok: false;
      orderId: string;
      orderNumber: number | null;
      customerName: string | null;
      code: CancelFailureCode;
      error: string;
    };

export interface CancelOrderOptions {
  /** Extra line rendered into the cancellation email. */
  customNote?: string;
  /** Refund whatever Stripe still holds for this order. */
  issueRefund?: boolean;
  /**
   * Ops role that authorized this cancel, recorded on the Refund row. The ops
   * session carries no per-person identity, so the role is the most specific
   * attribution available — still better than stamping every refund 'admin'.
   */
  actorRole?: string;
}

/** Order shape the cancellation email needs. */
type OrderForEmail = {
  customerName: string;
  orderNumber: number;
  total: unknown;
  deliveryDate: Date | string | null;
  items: Array<{ title: string; quantity: number; price: unknown }>;
};

function buildEmailData(
  order: OrderForEmail,
  opts: { customNote?: string; issueRefund?: boolean; refundAmount?: number },
): Parameters<typeof generateOrderCancellationEmail>[0] {
  return {
    customerName: order.customerName,
    orderNumber: order.orderNumber,
    total: Number(order.total),
    customNote: opts.customNote,
    refundIssued: opts.issueRefund,
    // The amount actually refunded, not order.total — an order with a prior
    // partial refund gets less back than its total, and the email must not
    // promise the customer more money than Stripe is sending.
    refundAmount: opts.refundAmount ?? Number(order.total),
    items: order.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      price: Number(item.price),
    })),
    deliveryDate: order.deliveryDate
      ? new Date(order.deliveryDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : undefined,
  };
}

/**
 * Renders the cancellation email for an order without changing anything.
 * Used by the per-order dialog's live preview.
 */
export async function previewCancellationEmail(
  orderId: string,
  opts: CancelOrderOptions = {},
): Promise<{ ok: true; html: string } | { ok: false; code: 'NOT_FOUND'; error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, refunds: true },
  });

  if (!order) {
    return { ok: false, code: 'NOT_FOUND', error: 'Order not found' };
  }

  return { ok: true, html: generateOrderCancellationEmail(buildEmailData(order, opts)) };
}

/**
 * Cancels one order: optional Stripe refund, status update, inventory release,
 * and customer email. Never throws for expected states — callers get a typed
 * failure so a bulk run can report per-order outcomes instead of aborting.
 *
 * Ordering is deliberate and matches the retry-safety contract: the Stripe
 * refund happens FIRST under an order-derived idempotency key, so a retry after
 * a mid-flight crash replays the same refund rather than issuing a second one.
 */
export async function cancelOrder(
  orderId: string,
  opts: CancelOrderOptions = {},
): Promise<CancelOrderResult> {
  const { customNote, issueRefund, actorRole } = opts;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, refunds: true },
  });

  if (!order) {
    return {
      ok: false,
      orderId,
      orderNumber: null,
      customerName: null,
      code: 'NOT_FOUND',
      error: 'Order not found',
    };
  }

  const ident = { orderId, orderNumber: order.orderNumber, customerName: order.customerName };

  if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
    return {
      ok: false,
      ...ident,
      code: 'ALREADY_TERMINAL',
      error: `Order is already ${order.status.toLowerCase()}`,
    };
  }

  let refundResult: CancelRefundResult | null = null;

  if (issueRefund) {
    if (!order.stripePaymentIntentId) {
      return {
        ok: false,
        ...ident,
        code: 'NO_PAYMENT',
        error: 'No Stripe payment found for this order. Cannot process refund.',
      };
    }

    // Refund whatever Stripe still has — not what order.total says,
    // since order.total gets rewritten by OrderAmendment when items change.
    const totalPriorRefunds = order.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const refundAmount = await getMaxRefundable(order.stripePaymentIntentId, totalPriorRefunds);

    if (refundAmount <= 0) {
      return {
        ok: false,
        ...ident,
        code: 'ALREADY_REFUNDED',
        error: 'Order has already been fully refunded',
      };
    }

    // Idempotency key is derived from the order id + amount: a cancel is a
    // one-shot terminal action, so if this request is retried after the Stripe
    // refund succeeded but the DB write failed, Stripe replays the SAME refund
    // instead of issuing a second one. The amount is included so that if the
    // order is amended between a failed attempt and the retry (changing the
    // computed refund), the retry gets a fresh key rather than colliding with
    // the old amount and locking Stripe for 24h. Belt-and-suspenders with the
    // Stripe-aware cap above (which already blocks re-refunding a refunded order).
    const refundAmountCents = Math.round(refundAmount * 100);
    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount: refundAmountCents,
        reason: 'requested_by_customer',
        metadata: {
          orderId,
          orderNumber: String(order.orderNumber),
          reason: 'Order cancelled',
        },
      },
      { idempotencyKey: `order-cancel-refund-${orderId}-${refundAmountCents}` },
    );

    // Create refund record in DB and stamp it with the Stripe refund id.
    // createRefund returns the new row's id so we stamp THAT row — looking it
    // up afterward with findFirst(desc) could grab a different row if the
    // charge.refunded webhook inserts one for this order in between.
    //
    // First check whether this exact Stripe refund is already recorded. Two
    // operators cancelling the same order at once both get the SAME refund
    // object back (the idempotency key makes Stripe replay it), so without this
    // guard each would insert its own row for one real refund — inflating the
    // DB refund total and blocking a legitimate later partial refund, since
    // getMaxRefundable caps on max(DB, Stripe).
    const existingRow = await prisma.refund.findFirst({
      where: { stripeRefundId: stripeRefund.id },
      select: { id: true },
    });
    const refundRowId =
      existingRow?.id ?? (await createRefund(orderId, refundAmount, 'Order cancelled'));
    await prisma.refund.update({
      where: { id: refundRowId },
      data: {
        stripeRefundId: stripeRefund.id,
        processedBy: actorRole ?? 'admin',
        processedAt: new Date(),
      },
    });

    refundResult = {
      stripeRefundId: stripeRefund.id,
      amount: refundAmount,
      status: stripeRefund.status ?? 'unknown',
    };

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', financialStatus: 'REFUNDED' },
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  }

  // Release committed inventory (cancel previously left stock decremented)
  try {
    if (order.fulfillmentStatus === 'DELIVERED') {
      // Already fulfilled: inventoryQuantity was already decremented by fulfillment,
      // committedQuantity is already 0. Restoring stock is handled by the return flow.
      // No inventory action needed here — the physical goods were delivered.
    } else {
      // Not yet fulfilled: release the committed quantity back to available
      await releaseCommittedInventory(orderId);
    }
  } catch (inventoryError) {
    console.error('[cancelOrder] Failed to release committed inventory:', inventoryError);
  }

  try {
    await sendOrderCancellationEmail(
      order.customerEmail,
      buildEmailData(order, { customNote, issueRefund, refundAmount: refundResult?.amount }),
    );
  } catch (emailError) {
    console.error('[cancelOrder] Failed to send cancellation email:', emailError);
  }

  if (issueRefund && refundResult) {
    try {
      await sendRefundProcessedEmail(
        order.customerEmail,
        order.customerName,
        order.orderNumber,
        refundResult.amount,
        'Order cancelled',
      );
    } catch (emailError) {
      console.error('[cancelOrder] Failed to send refund email:', emailError);
    }
  }

  return { ok: true, ...ident, refund: refundResult };
}

/**
 * Wraps `cancelOrder` so an unexpected throw (Stripe outage, DB drop) becomes a
 * typed failure instead of killing a bulk run partway through.
 */
export async function cancelOrderSafe(
  orderId: string,
  opts: CancelOrderOptions = {},
): Promise<CancelOrderResult> {
  try {
    return await cancelOrder(orderId, opts);
  } catch (error) {
    console.error(`[cancelOrder] Unexpected failure for order ${orderId}:`, error);
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return {
        ok: false,
        orderId,
        orderNumber: null,
        customerName: null,
        code: 'STRIPE_ERROR',
        error: `Stripe error: ${stripeError.message}`,
      };
    }
    return {
      ok: false,
      orderId,
      orderNumber: null,
      customerName: null,
      code: 'UNKNOWN',
      error: 'Failed to cancel order',
    };
  }
}
