/**
 * One-shot historical Stripe backfill (Phase 1A of the Finance Director).
 *
 * Pulls the last 12 months of:
 *   - Payouts          → StripePayout
 *   - Disputes         → ChargeDispute
 *   - Per-charge fees  → Order.stripeFeesCents / netReceivedCents (for orders
 *                        that already exist with a stripeChargeId)
 *
 * Also snapshots the current Stripe balance once (StripeBalance).
 *
 * Usage:
 *   npx tsx scripts/finance/backfill-stripe-history.ts [--days=N] [--dry-run]
 *
 * Idempotent: re-running uses the same upsert keys so it's safe to re-execute.
 *
 * Per saved memory `reference_worktree_env_and_github_token.md`, scripts/ is
 * outside the `@/` path alias — imports use relative paths.
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const DAYS = (() => {
  const arg = argv.find((a) => a.startsWith('--days='));
  if (!arg) return 365;
  const n = Number.parseInt(arg.split('=')[1] ?? '365', 10);
  return Number.isFinite(n) && n > 0 ? n : 365;
})();

const prisma = new PrismaClient();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY env var required');
  return new Stripe(key, { apiVersion: '2025-12-15.clover', typescript: true });
}

async function backfillPayouts(stripe: Stripe, sinceUnix: number): Promise<number> {
  let count = 0;
  for await (const payout of stripe.payouts.list({
    created: { gte: sinceUnix },
    limit: 100,
  })) {
    if (DRY_RUN) {
      console.log(
        '[dry] payout',
        payout.id,
        payout.status,
        payout.amount,
        new Date(payout.arrival_date * 1000).toISOString().slice(0, 10)
      );
    } else {
      await prisma.stripePayout.upsert({
        where: { stripePayoutId: payout.id },
        create: {
          stripePayoutId: payout.id,
          amountCents: payout.amount,
          currency: payout.currency,
          status: payout.status,
          arrivalDate: new Date(payout.arrival_date * 1000),
          method: payout.method ?? null,
          destination:
            typeof payout.destination === 'string' ? payout.destination : null,
          description: payout.description ?? null,
          failureCode: payout.failure_code ?? null,
          failureMessage: payout.failure_message ?? null,
          rawPayload: payout as unknown as object,
        },
        update: {
          amountCents: payout.amount,
          status: payout.status,
          arrivalDate: new Date(payout.arrival_date * 1000),
          method: payout.method ?? null,
          failureCode: payout.failure_code ?? null,
          failureMessage: payout.failure_message ?? null,
          rawPayload: payout as unknown as object,
        },
      });
    }
    count++;
  }
  return count;
}

async function backfillDisputes(stripe: Stripe, sinceUnix: number): Promise<number> {
  let count = 0;
  for await (const dispute of stripe.disputes.list({
    created: { gte: sinceUnix },
    limit: 100,
  })) {
    const chargeId =
      typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? '';
    if (!chargeId) continue;
    const paymentIntentId =
      typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent?.id ?? null;

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

    if (DRY_RUN) {
      console.log('[dry] dispute', dispute.id, dispute.status, '→ order', orderId);
    } else {
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
    count++;
  }
  return count;
}

async function backfillOrderFees(stripe: Stripe): Promise<{ done: number; failed: number }> {
  const orders = await prisma.order.findMany({
    where: {
      stripeChargeId: { not: null },
      OR: [
        { stripeFeesCents: null },
        { netReceivedCents: null },
        { stripeChargeAmountCents: null },
      ],
    },
    select: { id: true, stripeChargeId: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`[backfill-stripe] ${orders.length} orders need fee snapshots`);
  let done = 0;
  let failed = 0;
  for (const order of orders) {
    if (!order.stripeChargeId) continue;
    try {
      const charge = await stripe.charges.retrieve(order.stripeChargeId, {
        expand: ['balance_transaction'],
      });
      const bt = charge.balance_transaction;
      if (!bt || typeof bt === 'string') {
        console.warn('[backfill-stripe] no expanded BT for', order.id);
        failed++;
        continue;
      }
      if (!DRY_RUN) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            stripeChargeAmountCents: bt.amount,
            stripeFeesCents: bt.fee,
            netReceivedCents: bt.net,
          },
        });
      } else {
        console.log(
          '[dry] order',
          order.id,
          'amount=',
          bt.amount,
          'fee=',
          bt.fee,
          'net=',
          bt.net
        );
      }
      done++;
    } catch (err) {
      console.error('[backfill-stripe] order', order.id, 'failed:', err);
      failed++;
    }
  }
  return { done, failed };
}

async function snapshotBalance(stripe: Stripe): Promise<void> {
  const balance = await stripe.balance.retrieve();
  const sumCents = (arr: { amount: number; currency: string }[]): number =>
    arr.filter((b) => b.currency === 'usd').reduce((s, b) => s + b.amount, 0);
  if (DRY_RUN) {
    console.log(
      '[dry] balance available=',
      sumCents(balance.available),
      'pending=',
      sumCents(balance.pending)
    );
    return;
  }
  await prisma.stripeBalance.create({
    data: {
      availableCents: sumCents(balance.available),
      pendingCents: sumCents(balance.pending),
      instantAvailableCents: balance.instant_available
        ? sumCents(balance.instant_available)
        : null,
      reservedCents: null,
      currency: 'usd',
      rawPayload: balance as unknown as object,
    },
  });
}

async function main(): Promise<void> {
  console.log(
    `[backfill-stripe] starting${DRY_RUN ? ' (DRY RUN)' : ''} — pulling last ${DAYS} days`
  );
  const stripe = getStripe();
  const sinceUnix = Math.floor(Date.now() / 1000) - DAYS * 86400;

  const payouts = await backfillPayouts(stripe, sinceUnix);
  console.log(`[backfill-stripe] payouts: ${payouts}`);

  const disputes = await backfillDisputes(stripe, sinceUnix);
  console.log(`[backfill-stripe] disputes: ${disputes}`);

  const fees = await backfillOrderFees(stripe);
  console.log(`[backfill-stripe] order fees: done=${fees.done} failed=${fees.failed}`);

  await snapshotBalance(stripe);
  console.log('[backfill-stripe] balance snapshot taken');

  console.log('[backfill-stripe] done');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
