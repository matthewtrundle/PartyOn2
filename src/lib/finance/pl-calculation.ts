/**
 * P&L (Profit & Loss) computation — Phase 1C of the Finance Director.
 *
 * Computes a one-day "internal" P&L snapshot from PartyOn data only. No
 * QuickBooks integration here — that comes in Phase 2A and adds OpEx on
 * top of this snapshot. Phase 1C answers: "what did we make yesterday,
 * minus the costs we actually know about?"
 *
 * Inputs (per `[from, to)` window — `to` is exclusive):
 *   - `orders` rows where `created_at` falls in the window AND
 *     `financial_status = 'PAID'`.
 *   - `refunds` rows by `created_at`.
 *   - `affiliate_commissions` rows by `created_at`.
 *   - Stripe net snapshots if available (`net_received_cents`).
 *
 * Outputs (all in cents — match Stripe's native unit, avoid floats):
 *   - gross revenue, refunds, discounts, tax, delivery fees, tips
 *   - COGS (where known) + margin coverage %
 *   - Stripe fees + net received (where snapshotted)
 *   - sales-tax accrual (cumulative collected up to `to`)
 *   - affiliate commission accrual (HELD + APPROVED at `to`)
 *
 * Used by /api/cron/finance-snapshot to persist the daily row.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';

const ONE_DAY_MS = 86_400_000;

export interface PlWindow {
  /** Window start (inclusive) — typically yesterday 00:00 UTC. */
  from: Date;
  /** Window end (exclusive) — typically today 00:00 UTC. */
  to: Date;
}

export interface PlSnapshotPayload {
  /** ISO date "YYYY-MM-DD" of the day the window covers. */
  date: string;
  windowFromIso: string;
  windowToIso: string;

  // Order counts
  paidOrderCount: number;
  refundCount: number;

  // Revenue (all cents)
  grossRevenueCents: number;
  subtotalCents: number;
  taxCollectedCents: number;
  deliveryFeesCents: number;
  tipsCents: number;
  discountAmountCents: number;
  refundedAmountCents: number;

  // Cost (where snapshotted on OrderItems)
  cogsCents: number;
  /** % of orders in the window that have margin data populated (0–100). */
  marginCoveragePct: number;

  // Stripe net (where snapshotted via Phase 1A pipeline)
  stripeChargeAmountCents: number;
  stripeFeesCents: number;
  netReceivedCents: number;
  /** % of paid orders in window that have stripeFeesCents populated (0–100). */
  stripeFeeCoveragePct: number;

  // Derived
  /** grossRevenue − refunds − stripeFees. Approximation when fee coverage < 100%. */
  netRevenueCents: number;
  /** netRevenue − cogs (where known). */
  grossProfitCents: number;
  grossMarginPct: number;

  // Accruals (cumulative as of `to`)
  salesTaxAccrualCents: number;
  affiliateCommissionAccrualCents: number;

  // Counts for Director context
  refundedTodayCount: number;
  commissionsCreatedTodayCount: number;
  commissionsCreatedTodayCents: number;

  // Phase 2A — OpEx from QuickBooks (trailing 30 days, averaged to day).
  // Null when QB hasn't been synced yet. Net income = grossProfit − opexDailyAvg.
  opex30dTotalCents: number | null;
  opexDailyAvgCents: number | null;
  netIncomeCents: number | null;
}

/**
 * Default window = yesterday (UTC).
 */
export function yesterdayWindow(now = new Date()): PlWindow {
  const todayMidnightUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return {
    from: new Date(todayMidnightUtc.getTime() - ONE_DAY_MS),
    to: todayMidnightUtc,
  };
}

function decToCents(d: Prisma.Decimal | null | undefined): number {
  if (d === null || d === undefined) return 0;
  // .toFixed(2) keeps precision tight; * 100 + round avoids float drift.
  return Math.round(Number(d) * 100);
}

export async function computeDailyPL(window: PlWindow): Promise<PlSnapshotPayload> {
  const { from, to } = window;

  // ---- Revenue side -----------------------------------------------------
  const paidOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lt: to },
      financialStatus: 'PAID',
    },
    select: {
      id: true,
      subtotal: true,
      taxAmount: true,
      deliveryFee: true,
      tipAmount: true,
      total: true,
      discountAmount: true,
      marginAmount: true,
      marginCoveragePct: true,
      stripeChargeAmountCents: true,
      stripeFeesCents: true,
      netReceivedCents: true,
    },
  });

  let subtotalCents = 0;
  let taxCollectedCents = 0;
  let deliveryFeesCents = 0;
  let tipsCents = 0;
  let grossRevenueCents = 0;
  let discountAmountCents = 0;
  let stripeChargeAmountCents = 0;
  let stripeFeesCents = 0;
  let netReceivedCents = 0;
  let cogsCents = 0;
  let ordersWithMargin = 0;
  let ordersWithStripeFees = 0;

  for (const o of paidOrders) {
    subtotalCents += decToCents(o.subtotal);
    taxCollectedCents += decToCents(o.taxAmount);
    deliveryFeesCents += decToCents(o.deliveryFee);
    tipsCents += decToCents(o.tipAmount);
    grossRevenueCents += decToCents(o.total);
    discountAmountCents += decToCents(o.discountAmount);
    if (o.marginAmount !== null) {
      // marginAmount = revenue − cogs (in dollars). Derive cogs ≈ subtotal − marginAmount.
      const subCents = decToCents(o.subtotal);
      const marginCents = decToCents(o.marginAmount);
      cogsCents += Math.max(0, subCents - marginCents);
      ordersWithMargin++;
    }
    if (o.stripeChargeAmountCents !== null) {
      stripeChargeAmountCents += o.stripeChargeAmountCents;
    }
    if (o.stripeFeesCents !== null) {
      stripeFeesCents += o.stripeFeesCents;
      ordersWithStripeFees++;
    }
    if (o.netReceivedCents !== null) {
      netReceivedCents += o.netReceivedCents;
    }
  }

  const paidOrderCount = paidOrders.length;
  const marginCoveragePct =
    paidOrderCount > 0 ? Math.round((ordersWithMargin / paidOrderCount) * 100) : 0;
  const stripeFeeCoveragePct =
    paidOrderCount > 0 ? Math.round((ordersWithStripeFees / paidOrderCount) * 100) : 0;

  // ---- Refunds ----------------------------------------------------------
  const refunds = await prisma.refund.findMany({
    where: { createdAt: { gte: from, lt: to } },
    select: { amount: true },
  });
  const refundedAmountCents = refunds.reduce((s, r) => s + decToCents(r.amount), 0);
  const refundCount = refunds.length;

  // ---- Affiliate commissions created today ------------------------------
  const commissionsToday = await prisma.affiliateCommission.findMany({
    where: { createdAt: { gte: from, lt: to } },
    select: { commissionAmountCents: true },
  });
  const commissionsCreatedTodayCents = commissionsToday.reduce(
    (s, c) => s + c.commissionAmountCents,
    0
  );

  // ---- Accruals at `to` -------------------------------------------------
  const accrualAt = to;

  // Sales tax accrual = cumulative tax collected on PAID orders.
  // No remittance log yet (Phase 4), so this is the running total.
  const taxRow = await prisma.order.aggregate({
    where: {
      createdAt: { lt: accrualAt },
      financialStatus: 'PAID',
    },
    _sum: { taxAmount: true },
  });
  const salesTaxAccrualCents = decToCents(taxRow._sum.taxAmount as Prisma.Decimal | null);

  // Affiliate commission accrual = HELD + APPROVED commissions at `to`.
  // Excludes PAID (already paid out) and VOID (cancelled).
  const commissionAccrual = await prisma.affiliateCommission.aggregate({
    where: {
      createdAt: { lt: accrualAt },
      status: { in: ['HELD', 'APPROVED'] },
    },
    _sum: { commissionAmountCents: true },
  });
  const affiliateCommissionAccrualCents =
    commissionAccrual._sum.commissionAmountCents ?? 0;

  // ---- OpEx (Phase 2A) --------------------------------------------------
  // Pull trailing-30-day total + daily average from QbExpense. Null if
  // no rows yet (QB not synced).
  const opexFrom = new Date(to.getTime() - 30 * ONE_DAY_MS);
  const opexAgg = await prisma.qbExpense.aggregate({
    where: { txnDate: { gte: opexFrom, lt: to } },
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  let opex30dTotalCents: number | null = null;
  let opexDailyAvgCents: number | null = null;
  let netIncomeCents: number | null = null;
  if (opexAgg._count._all > 0) {
    opex30dTotalCents = opexAgg._sum.amountCents ?? 0;
    opexDailyAvgCents = Math.round(opex30dTotalCents / 30);
  }

  // ---- Derived numbers --------------------------------------------------
  const netRevenueCents = Math.max(
    0,
    grossRevenueCents - refundedAmountCents - stripeFeesCents
  );
  const grossProfitCents = netRevenueCents - cogsCents;
  const grossMarginPct =
    netRevenueCents > 0 ? Math.round((grossProfitCents / netRevenueCents) * 10000) / 100 : 0;
  if (opexDailyAvgCents !== null) {
    netIncomeCents = grossProfitCents - opexDailyAvgCents;
  }

  return {
    date: from.toISOString().slice(0, 10),
    windowFromIso: from.toISOString(),
    windowToIso: to.toISOString(),

    paidOrderCount,
    refundCount,

    grossRevenueCents,
    subtotalCents,
    taxCollectedCents,
    deliveryFeesCents,
    tipsCents,
    discountAmountCents,
    refundedAmountCents,

    cogsCents,
    marginCoveragePct,

    stripeChargeAmountCents,
    stripeFeesCents,
    netReceivedCents,
    stripeFeeCoveragePct,

    netRevenueCents,
    grossProfitCents,
    grossMarginPct,

    salesTaxAccrualCents,
    affiliateCommissionAccrualCents,

    refundedTodayCount: refundCount,
    commissionsCreatedTodayCount: commissionsToday.length,
    commissionsCreatedTodayCents,

    opex30dTotalCents,
    opexDailyAvgCents,
    netIncomeCents,
  };
}
