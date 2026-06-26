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
