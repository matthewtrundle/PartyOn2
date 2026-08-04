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

import type Stripe from 'stripe';
import type { FinancialStatus, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { stripe } from '@/lib/stripe/client';
import { getMaxRefundable } from '@/lib/stripe/refund-utils';
import {
  createRefund,
  recomputeOrderFinancialStatus,
  releaseCommittedInventory,
} from '@/lib/inventory/services/order-service';
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
      /**
       * Set only when this call moved real money and then lost the cancel to a
       * concurrent request — a refunding cancel racing a non-refunding one. The
       * cancel failed, but the refund did not, and a caller totalling money out
       * has to count it. Absent on every other failure.
       */
      refund?: CancelRefundResult | null;
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

/** Terminal statuses a cancel refuses to act on — an order here is already done. */
const TERMINAL_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED'];

/** Prisma's unique-constraint violation. Same check the charge.refunded webhook uses. */
function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: string }).code === 'P2002',
  );
}

/**
 * True when Stripe rejected the request because the idempotency key is currently
 * held by another in-flight request, i.e. a concurrent duplicate of this cancel.
 */
function isStripeIdempotencyConflict(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { type?: unknown }).type === 'idempotency_error'
  );
}

/**
 * Moves the order into its terminal state, but only if nothing else got there
 * first. Returns whether THIS call was the one that made the transition.
 *
 * This compare-and-set — not the plain read at the top of `cancelOrder` — is what
 * makes a cancel one-shot. Two overlapping requests both read the order in the
 * same non-terminal status, so that read can only ever be a fast path; the write
 * is the arbiter and the read cannot be. Postgres
 * re-evaluates an UPDATE's WHERE clause after the contended row lock is released,
 * so of two concurrent claims exactly one matches a row and the other matches
 * none. Same pattern as the amendment re-check in the refund route.
 *
 * Every effect the customer or the warehouse can observe — the inventory release
 * and both emails — hangs off winning this, so losing the race is
 * indistinguishable from having arrived second.
 */
async function claimTerminal(
  orderId: string,
  data: { status: OrderStatus; financialStatus?: FinancialStatus },
): Promise<boolean> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: { notIn: TERMINAL_STATUSES } },
    data,
  });
  return count > 0;
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
 *
 * Two one-shot actions, two gates. The terminal-status write is a compare-and-set
 * (`claimTerminal`) and gates the inventory release and the cancellation email;
 * the refund email is gated instead on having written the Refund row, since one
 * email per refund is the invariant there and a refunding cancel can lose the
 * status race to a non-refunding one.
 *
 * Claiming at the status write rather than BEFORE the Stripe call is deliberate:
 * an up-front claim would leave a crashed attempt marked CANCELLED with no
 * Refund row and no email, and every retry would bounce off the terminal check.
 * Claiming after keeps the Stripe call itself retryable. It is NOT a full
 * crash-recovery story — a crash between a successful refund and the claim
 * leaves the order non-terminal, and a retry then short-circuits at
 * ALREADY_REFUNDED before reaching the claim, so the status has to be corrected
 * by cancelling again with `issueRefund: false`.
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

  // Fast path only. This read cannot make the cancel one-shot — a concurrent
  // request reads the same pre-cancel status — it just avoids three Stripe round
  // trips in the common case of re-cancelling an already-cancelled order. The
  // `claimTerminal` compare-and-set below is the real guard.
  if (TERMINAL_STATUSES.includes(order.status)) {
    return {
      ok: false,
      ...ident,
      code: 'ALREADY_TERMINAL',
      error: `Order is already ${order.status.toLowerCase()}`,
    };
  }

  let refundResult: CancelRefundResult | null = null;
  /**
   * Whether THIS call is the one that recorded the Stripe refund in the DB.
   * That — not winning the cancel below — is what makes a caller responsible for
   * the refund email, because "one email per refund" is the actual invariant.
   */
  let ownsRefundRecord = false;

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
    let stripeRefund: Stripe.Refund;
    try {
      stripeRefund = await stripe.refunds.create(
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
    } catch (error) {
      // Stripe replays a completed request that reuses an idempotency key, but a
      // key still held by an IN-FLIGHT request gets `idempotency_error` instead.
      // The key here is derived from orderId + amount and every parameter above
      // derives from those same two values, so that error can only mean another
      // cancel for this order is running right now — never a key reused with
      // different parameters. Report it as losing the race rather than as a
      // Stripe fault, so a bulk cooler run shows "already cancelled" on that
      // payer instead of a red Stripe error the operator would try to retry.
      if (isStripeIdempotencyConflict(error)) {
        return {
          ok: false,
          ...ident,
          code: 'ALREADY_TERMINAL',
          error: 'Another cancel for this order is already in progress',
        };
      }
      throw error;
    }

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

    // An existing row is left exactly as it is. It was written either by a
    // concurrent cancel or by the charge.refunded webhook, which stamps
    // processedBy: 'stripe' to mean "not one of our admin routes" — and
    // re-stamping it here would relabel the webhook's own record as an admin
    // action. Reusing the row is the point; re-attributing it is not.
    if (!existingRow) {
      const refundRowId = await createRefund(orderId, refundAmount, 'Order cancelled');
      try {
        await prisma.refund.update({
          where: { id: refundRowId },
          data: {
            stripeRefundId: stripeRefund.id,
            processedBy: actorRole ?? 'admin',
            processedAt: new Date(),
          },
        });
        // The stamp IS the election, and it is race-proof: Refund.stripeRefundId
        // is UNIQUE, so of two callers holding the same replayed Stripe refund
        // exactly one can land it. The findFirst above is only a fast path — on
        // its own it is a check-then-act, and both callers can read null.
        ownsRefundRecord = true;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // Someone else stamped this Stripe refund first, so they own the refund
        // and its customer email. Drop the row we just created: left unstamped it
        // would still count toward the order's refund total (getMaxRefundable
        // sums the DB rows) and wrongly cap a later legitimate partial refund.
        //
        // A failure here must not abort the cancel — the money has already moved
        // and the order still needs to reach CANCELLED. Log loudly instead: the
        // leftover row is a reconcilable data problem, an un-cancelled paid order
        // is a delivery that still goes out.
        try {
          await prisma.refund.delete({ where: { id: refundRowId } });
          await recomputeOrderFinancialStatus(orderId);
        } catch (cleanupError) {
          console.error(
            `[cancelOrder] Failed to remove duplicate refund row ${refundRowId} for order ${orderId} ` +
              `(stripe refund ${stripeRefund.id}); it will overstate the order's refunded total:`,
            cleanupError,
          );
        }
      }
    }

    refundResult = {
      stripeRefundId: stripeRefund.id,
      amount: refundAmount,
      status: stripeRefund.status ?? 'unknown',
    };
  }

  // Claim the cancel. financialStatus is keyed off refundResult rather than the
  // issueRefund flag so the order is only marked REFUNDED when money moved.
  const claimed = await claimTerminal(
    orderId,
    refundResult
      ? { status: 'CANCELLED', financialStatus: 'REFUNDED' }
      : { status: 'CANCELLED' },
  );

  // Cancelling the order and refunding it are two different one-shot actions, so
  // they get two different gates. The cancel claim owns everything that follows
  // from the order becoming CANCELLED; owning the Refund row owns the refund
  // email. Gating BOTH on the cancel claim looks tidier and is wrong: an
  // `issueRefund: false` cancel can win the claim while a concurrent refunding
  // cancel is still mid-Stripe, and that refunding call would then go silent
  // after really moving money — the customer would be left holding only the
  // other call's "no refund" cancellation email.
  if (claimed) {
    // Release committed inventory (cancel previously left stock decremented).
    // Gated on the claim: releaseCommittedInventory subtracts the order's
    // quantity from committedQuantity on every call, so two cancels running it
    // would double-release and understate what is still committed.
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
  }

  // One email per recorded refund, whoever won the cancel. A caller that found
  // the row already written (concurrent cancel, or the charge.refunded webhook)
  // stays quiet because the caller that wrote it is the one doing the telling.
  if (refundResult && ownsRefundRecord) {
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

  if (!claimed) {
    // `refund` is carried on the failure so a caller totalling money out still
    // counts what this call actually sent back.
    return {
      ok: false,
      ...ident,
      code: 'ALREADY_TERMINAL',
      error: 'Order was already cancelled by another request',
      refund: refundResult,
    };
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
