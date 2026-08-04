/**
 * Refund cap helpers — source of truth is the Stripe charge, not Order.total.
 * Order.total can be mutated by OrderAmendment when items are added/removed,
 * so it cannot be used to cap refunds.
 *
 * The refund cap also cannot trust the DB Refund table alone. Every refund
 * route creates the Stripe refund FIRST, then writes the DB Refund record. If
 * the process dies in between (e.g. a Neon cold-start connection drop), Stripe
 * has refunded but the DB shows 0 prior refunds — and a retry would compute the
 * full captured amount as refundable again, double-refunding the customer.
 * So the cap subtracts whatever Stripe has ACTUALLY refunded, falling back to a
 * larger DB figure only if the DB somehow ran ahead.
 */

import { stripe } from './client';

/**
 * Stripe refund `metadata.type` written by the order-cancel flow. Lives here
 * rather than in cancel-order.ts so the writer and the reader of the marker
 * cannot drift apart.
 */
export const CANCEL_REFUND_TYPE = 'cancel';

/** A refund that one of our cancel flows created, as read back from Stripe. */
export interface CancelRefundRecord {
  stripeRefundId: string;
  /** In dollars. */
  amount: number;
  status: string;
}

/**
 * Returns the amount actually captured by Stripe for a PaymentIntent, in dollars.
 */
export async function getStripeCapturedAmount(paymentIntentId: string): Promise<number> {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  return pi.amount_received / 100;
}

/**
 * Returns the total amount Stripe has already refunded against a PaymentIntent,
 * in dollars. This is the authoritative prior-refunds figure — it reflects money
 * that has actually left (or is in-flight to leave) our Stripe balance, even when
 * the corresponding DB Refund record was never written.
 *
 * Pending / in-flight refunds count against the cap; only `failed` and `canceled`
 * refunds (no money moved) are excluded.
 */
export async function getStripeRefundedAmount(paymentIntentId: string): Promise<number> {
  let totalCents = 0;
  for await (const refund of stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })) {
    if (refund.status === 'failed' || refund.status === 'canceled') continue;
    totalCents += refund.amount;
  }
  return totalCents / 100;
}

/**
 * Finds a refund on this PaymentIntent that one of OUR order-cancel flows issued.
 *
 * Used to tell an interrupted cancel apart from a deliberate full refund. A cancel
 * that dies between `stripe.refunds.create` and the status write leaves the order
 * fully refunded at Stripe but NOT cancelled, and every retry then short-circuits
 * on "already fully refunded" without ever finishing the cancel — so the order
 * still looks live and its delivery still goes out.
 *
 * Falling back to "fully refunded ⇒ safe to cancel" would be wrong: fully-refunded
 * non-terminal orders are a legitimate state produced by the Full Moon batch
 * refunder and by the admin refund route, neither of which writes Order.status.
 * So this matches on the structural `metadata.type` stamp, which only the cancel
 * flow writes, AND on `metadata.orderId`, so a refund belonging to a different
 * order sharing a PaymentIntent can never be mistaken for this one's.
 *
 * `failed` / `canceled` refunds are ignored — no money moved, so they are not
 * evidence of anything. Returns the newest match (Stripe lists newest first);
 * in practice a payment intent carries at most one cancel refund.
 */
export async function findCancelRefund(
  paymentIntentId: string,
  orderId: string
): Promise<CancelRefundRecord | null> {
  for await (const refund of stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })) {
    if (refund.status === 'failed' || refund.status === 'canceled') continue;
    if (refund.metadata?.type !== CANCEL_REFUND_TYPE) continue;
    if (refund.metadata?.orderId !== orderId) continue;
    return {
      stripeRefundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status ?? 'unknown',
    };
  }
  return null;
}

/**
 * Returns the maximum amount that can still be refunded against a PaymentIntent.
 * = (Stripe-captured) − (prior refunds).
 *
 * Prior refunds are taken as the LARGER of Stripe's actual refunded total and the
 * caller's DB-derived sum, so a DB write that lagged the Stripe refund can never
 * widen the cap and let a retry double-refund.
 *
 * @param priorRefundsTotalDollars - sum of the order's DB Refund records, in dollars.
 */
export async function getMaxRefundable(
  paymentIntentId: string,
  priorRefundsTotalDollars: number
): Promise<number> {
  const [captured, stripeRefunded] = await Promise.all([
    getStripeCapturedAmount(paymentIntentId),
    getStripeRefundedAmount(paymentIntentId),
  ]);
  const priorRefunds = Math.max(priorRefundsTotalDollars, stripeRefunded);
  return Math.round((captured - priorRefunds) * 100) / 100;
}
