/**
 * Stripe "extended" data helpers — Phase 1A of the Finance Director.
 *
 * The existing src/lib/stripe/* code captures the bare minimum needed to
 * create orders. This module adds the deeper financial data:
 *
 *   - Per-charge fee + net amount snapshot (writes to Order.stripeFeesCents /
 *     netReceivedCents from the BalanceTransaction).
 *   - Payout upsert (StripePayout) from `payout.*` webhook events + nightly
 *     catch-up.
 *   - Balance snapshot (StripeBalance) — daily row.
 *   - Dispute upsert (ChargeDispute) from `charge.dispute.*` webhook events,
 *     with best-effort `orderId` resolution via the matching charge.
 *
 * Used by:
 *   - src/lib/stripe/webhooks.ts (event handlers)
 *   - src/app/api/cron/finance-stripe-sync/route.ts (daily catch-up)
 *   - scripts/finance/backfill-stripe-history.ts (one-shot historical pull)
 */

import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/database/client';

// ---------------------------------------------------------------------------
// Per-charge fee snapshot
// ---------------------------------------------------------------------------

/**
 * Result of fetching the BalanceTransaction for a charge.
 * All amounts in cents (Stripe's native unit).
 */
export interface ChargeFeeSnapshot {
  chargeId: string;
  amountCents: number;
  feesCents: number;
  netCents: number;
  balanceTransactionId: string;
}

/**
 * Fetch + parse a charge's BalanceTransaction for fees + net. Stripe needs
 * a separate API call because charge.balance_transaction is just an ID until
 * expanded.
 */
export async function fetchChargeFees(chargeId: string): Promise<ChargeFeeSnapshot> {
  const stripe = getStripe();
  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ['balance_transaction'],
  });
  const btObj = charge.balance_transaction;
  if (!btObj || typeof btObj === 'string') {
    throw new Error(
      `Charge ${chargeId} has no expanded balance_transaction (got ${typeof btObj})`
    );
  }
  return {
    chargeId,
    amountCents: btObj.amount,
    feesCents: btObj.fee,
    netCents: btObj.net,
    balanceTransactionId: btObj.id,
  };
}

/**
 * Snapshot the fee data onto the Order. Idempotent: skips if all three
 * columns are already populated. Returns the snapshot (or null if the order
 * has no stripeChargeId yet).
 */
export async function snapshotOrderStripeFees(
  orderId: string
): Promise<ChargeFeeSnapshot | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      stripeChargeId: true,
      stripeChargeAmountCents: true,
      stripeFeesCents: true,
      netReceivedCents: true,
    },
  });
  if (!order || !order.stripeChargeId) return null;
  if (
    order.stripeChargeAmountCents !== null &&
    order.stripeFeesCents !== null &&
    order.netReceivedCents !== null
  ) {
    return {
      chargeId: order.stripeChargeId,
      amountCents: order.stripeChargeAmountCents,
      feesCents: order.stripeFeesCents,
      netCents: order.netReceivedCents,
      balanceTransactionId: '',
    };
  }
  const snapshot = await fetchChargeFees(order.stripeChargeId);
  await prisma.order.update({
    where: { id: orderId },
    data: {
      stripeChargeAmountCents: snapshot.amountCents,
      stripeFeesCents: snapshot.feesCents,
      netReceivedCents: snapshot.netCents,
    },
  });
  return snapshot;
}

// ---------------------------------------------------------------------------
// Payout upsert
// ---------------------------------------------------------------------------

export async function upsertPayout(payout: Stripe.Payout): Promise<void> {
  const arrival = new Date(payout.arrival_date * 1000);
  await prisma.stripePayout.upsert({
    where: { stripePayoutId: payout.id },
    create: {
      stripePayoutId: payout.id,
      amountCents: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: arrival,
      method: payout.method ?? null,
      destination: typeof payout.destination === 'string' ? payout.destination : null,
      description: payout.description ?? null,
      failureCode: payout.failure_code ?? null,
      failureMessage: payout.failure_message ?? null,
      rawPayload: payout as unknown as object,
    },
    update: {
      amountCents: payout.amount,
      status: payout.status,
      arrivalDate: arrival,
      method: payout.method ?? null,
      destination: typeof payout.destination === 'string' ? payout.destination : null,
      description: payout.description ?? null,
      failureCode: payout.failure_code ?? null,
      failureMessage: payout.failure_message ?? null,
      rawPayload: payout as unknown as object,
    },
  });
}

// ---------------------------------------------------------------------------
// Balance snapshot
// ---------------------------------------------------------------------------

export async function snapshotStripeBalance(): Promise<void> {
  const stripe = getStripe();
  const balance = await stripe.balance.retrieve();
  const sumCents = (arr: { amount: number; currency: string }[]): number =>
    arr.filter((b) => b.currency === 'usd').reduce((s, b) => s + b.amount, 0);
  await prisma.stripeBalance.create({
    data: {
      availableCents: sumCents(balance.available),
      pendingCents: sumCents(balance.pending),
      instantAvailableCents: balance.instant_available
        ? sumCents(balance.instant_available)
        : null,
      reservedCents: null, // not present on standard Stripe accounts
      currency: 'usd',
      rawPayload: balance as unknown as object,
    },
  });
}

// ---------------------------------------------------------------------------
// Dispute upsert
// ---------------------------------------------------------------------------

export async function upsertDispute(dispute: Stripe.Dispute): Promise<void> {
  const chargeId =
    typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? '';
  if (!chargeId) {
    throw new Error(`Dispute ${dispute.id} has no charge ID`);
  }
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id ?? null;

  // Best-effort link to an existing Order via the charge or payment intent.
  let orderId: string | null = null;
  const orderByCharge = await prisma.order.findFirst({
    where: { stripeChargeId: chargeId },
    select: { id: true },
  });
  if (orderByCharge) {
    orderId = orderByCharge.id;
  } else if (paymentIntentId) {
    const orderByPi = await prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true },
    });
    if (orderByPi) orderId = orderByPi.id;
  }

  const evidenceDueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000)
    : null;

  await prisma.chargeDispute.upsert({
    where: { stripeDisputeId: dispute.id },
    create: {
      stripeDisputeId: dispute.id,
      stripeChargeId: chargeId,
      stripePaymentIntentId: paymentIntentId,
      amountCents: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason ?? null,
      status: dispute.status,
      evidenceDueBy,
      isChargeRefundable: dispute.is_charge_refundable ?? false,
      orderId,
      rawPayload: dispute as unknown as object,
    },
    update: {
      status: dispute.status,
      reason: dispute.reason ?? null,
      amountCents: dispute.amount,
      evidenceDueBy,
      isChargeRefundable: dispute.is_charge_refundable ?? false,
      orderId: orderId ?? undefined,
      rawPayload: dispute as unknown as object,
    },
  });
}

// ---------------------------------------------------------------------------
// Bulk pulls for cron + backfill
// ---------------------------------------------------------------------------

/**
 * Pull payouts whose `created` timestamp is >= sinceUnix. Paginates.
 */
export async function pullPayoutsSince(
  sinceUnix: number,
  onPayout?: (p: Stripe.Payout) => Promise<void>
): Promise<number> {
  const stripe = getStripe();
  let count = 0;
  for await (const payout of stripe.payouts.list({
    created: { gte: sinceUnix },
    limit: 100,
  })) {
    await upsertPayout(payout);
    if (onPayout) await onPayout(payout);
    count++;
  }
  return count;
}

/**
 * Pull disputes whose `created` timestamp is >= sinceUnix. Paginates.
 */
export async function pullDisputesSince(sinceUnix: number): Promise<number> {
  const stripe = getStripe();
  let count = 0;
  for await (const dispute of stripe.disputes.list({
    created: { gte: sinceUnix },
    limit: 100,
  })) {
    await upsertDispute(dispute);
    count++;
  }
  return count;
}

/**
 * Backfill missing Order.stripeFeesCents / netReceivedCents for paid orders
 * that have a stripeChargeId but no fee snapshot. Returns counts.
 */
export async function backfillMissingFeeSnapshots(
  limit = 100
): Promise<{ processed: number; failed: number }> {
  const candidates = await prisma.order.findMany({
    where: {
      stripeChargeId: { not: null },
      OR: [
        { stripeFeesCents: null },
        { netReceivedCents: null },
        { stripeChargeAmountCents: null },
      ],
    },
    select: { id: true, stripeChargeId: true },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
  let processed = 0;
  let failed = 0;
  for (const order of candidates) {
    try {
      await snapshotOrderStripeFees(order.id);
      processed++;
    } catch (err) {
      failed++;
      console.error(
        '[finance-stripe-sync] fee snapshot failed for order',
        order.id,
        err
      );
    }
  }
  return { processed, failed };
}
