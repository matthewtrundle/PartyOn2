/**
 * Finance Director — 9 detector functions (signals 1, 3, 4, 7, 8, 9, 10, 11, 12
 * from the buildout brief §8). Signal 2 (distributor invoice past due) is
 * removed per the Phase 1B cancellation. Signals 5 (sales tax accrual) and
 * 6 (contractor 1099 threshold) need data Phase 4 and Phase 3 will add.
 *
 * Every detector function:
 *   - returns FinanceRecommendationInput[] (possibly empty)
 *   - reads from existing PartyOn DB tables only (no external API calls;
 *     external state is already cached via the daily snapshot + cron pulls)
 *   - is pure with respect to its `now` argument so tests can pin time
 */

import { prisma } from '@/lib/database/client';
import type { ActionPayload } from '@/lib/recommendations/card-types';
import type {
  FinanceRecommendationInput,
  FinanceSeverity,
} from '../types';
import type { PlSnapshotPayload } from '../pl-calculation';

const ONE_DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function navigate(href: string, label: string): ActionPayload {
  return { kind: 'navigate', label, params: { href } };
}

// ---------------------------------------------------------------------------
// 1. Stripe payout unmatched to a bank deposit (>4 banking days)
// ---------------------------------------------------------------------------

export async function detectStripePayoutUnmatched(
  now: Date = new Date()
): Promise<FinanceRecommendationInput[]> {
  const cutoff = new Date(now.getTime() - 4 * ONE_DAY_MS);
  const rows = await prisma.stripePayout.findMany({
    where: {
      status: 'paid',
      matchedPlaidTxId: null,
      arrivalDate: { lt: cutoff },
    },
    orderBy: { arrivalDate: 'asc' },
    take: 50,
  });
  return rows.map<FinanceRecommendationInput>((p) => {
    const daysLate = Math.floor((now.getTime() - p.arrivalDate.getTime()) / ONE_DAY_MS);
    const severity: FinanceSeverity = daysLate > 10 ? 'urgent' : 'high';
    return {
      signalKind: 'stripe-payout-unmatched',
      severity,
      title: `Stripe payout ${(p.amountCents / 100).toFixed(2)} hasn't matched a bank deposit (${daysLate}d ago)`,
      evidence: [
        {
          metricName: 'payout amount',
          metricValue: `$${(p.amountCents / 100).toFixed(2)}`,
          note: `Arrival date ${p.arrivalDate.toISOString().slice(0, 10)} · status ${p.status}`,
        },
      ],
      targetEntityType: 'stripePayout',
      targetEntityId: p.id,
      actionPayload: navigate('/admin/finance/plaid?filter=unmatched', 'Investigate'),
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Cash runway < 30 days
// ---------------------------------------------------------------------------

export async function detectCashRunwayLow(
  snapshot: PlSnapshotPayload | null,
  now: Date = new Date()
): Promise<FinanceRecommendationInput[]> {
  if (!snapshot) return [];
  if (snapshot.opexDailyAvgCents === null || snapshot.opexDailyAvgCents <= 0) return [];

  // Bank balance from the latest Plaid account balance + outstanding AR
  // (DraftOrder.PENDING/SENT/VIEWED). Per saved memory: no internal AP
  // tracking, so we just use bank + AR ÷ daily burn for V1.
  const [accounts, drafts] = await Promise.all([
    prisma.plaidAccount.findMany({
      where: { type: 'depository' },
      select: { availableBalance: true, currentBalance: true },
    }),
    prisma.draftOrder.aggregate({
      where: { status: { in: ['PENDING', 'SENT', 'VIEWED'] } },
      _sum: { subtotal: true, taxAmount: true, deliveryFee: true },
    }),
  ]);

  const bankCents = accounts.reduce((s, a) => {
    const bal = a.availableBalance ?? a.currentBalance;
    return s + (bal !== null ? Math.round(Number(bal) * 100) : 0);
  }, 0);
  const draftSubtotal = Number(drafts._sum.subtotal ?? 0);
  const draftTax = Number(drafts._sum.taxAmount ?? 0);
  const draftDelivery = Number(drafts._sum.deliveryFee ?? 0);
  const arCents = Math.round((draftSubtotal + draftTax + draftDelivery) * 100);

  const dailyBurn = snapshot.opexDailyAvgCents;
  const runwayDays = Math.floor((bankCents + arCents) / dailyBurn);

  if (runwayDays >= 30) return [];

  const severity: FinanceSeverity = runwayDays < 14 ? 'urgent' : 'high';
  const stableTargetId = now.toISOString().slice(0, 10);
  return [
    {
      signalKind: 'cash-runway-low',
      severity,
      title: `Cash runway ${runwayDays}d (bank + AR vs daily OpEx)`,
      evidence: [
        {
          metricName: 'bank balance',
          metricValue: `$${(bankCents / 100).toFixed(2)}`,
        },
        {
          metricName: 'outstanding AR (DraftOrder)',
          metricValue: `$${(arCents / 100).toFixed(2)}`,
        },
        {
          metricName: 'daily OpEx',
          metricValue: `$${(dailyBurn / 100).toFixed(2)}`,
          note: 'rolling 30d avg from QB',
        },
      ],
      targetEntityType: 'snapshot',
      targetEntityId: stableTargetId,
      actionPayload: navigate('/admin/finance', 'Open dashboard'),
      dedupeKey: 'cash-runway-low:active',
    },
  ];
}

// ---------------------------------------------------------------------------
// 4. Gross margin trending down (>5pp drop in 30-day rolling vs prior 30)
// ---------------------------------------------------------------------------

export async function detectGrossMarginTrendingDown(
  now: Date = new Date()
): Promise<FinanceRecommendationInput[]> {
  const recent = await prisma.financeSnapshot.findMany({
    where: { snapshotDate: { gte: new Date(now.getTime() - 60 * ONE_DAY_MS) } },
    orderBy: { snapshotDate: 'desc' },
  });
  if (recent.length < 14) return []; // not enough history to trend

  function avgMarginPct(snapshots: typeof recent): number | null {
    let total = 0;
    let count = 0;
    for (const s of snapshots) {
      const p = s.payload as { grossMarginPct?: number; netRevenueCents?: number };
      if (p?.netRevenueCents && p.netRevenueCents > 0 && typeof p.grossMarginPct === 'number') {
        total += p.grossMarginPct;
        count += 1;
      }
    }
    return count > 0 ? total / count : null;
  }

  const last30 = recent.slice(0, 30);
  const prior30 = recent.slice(30, 60);
  if (prior30.length < 10) return [];

  const cur = avgMarginPct(last30);
  const prior = avgMarginPct(prior30);
  if (cur === null || prior === null) return [];

  const dropPp = prior - cur;
  if (dropPp < 5) return [];

  const severity: FinanceSeverity = dropPp > 10 ? 'urgent' : 'high';
  return [
    {
      signalKind: 'gross-margin-trending-down',
      severity,
      title: `Gross margin dropped ${dropPp.toFixed(1)}pp (${prior.toFixed(1)}% → ${cur.toFixed(1)}% last 30d)`,
      evidence: [
        { metricName: 'prior 30d avg', metricValue: `${prior.toFixed(1)}%` },
        { metricName: 'last 30d avg', metricValue: `${cur.toFixed(1)}%` },
        { metricName: 'drop', metricValue: `${dropPp.toFixed(1)}pp` },
      ],
      targetEntityType: 'snapshot',
      targetEntityId: 'rolling-30d',
      actionPayload: navigate('/admin/finance', 'Open margin analysis'),
      dedupeKey: 'gross-margin-trending-down:active',
    },
  ];
}

// ---------------------------------------------------------------------------
// 7. OpEx category spiking (>150% of trailing 90d avg in last 30d)
// ---------------------------------------------------------------------------

export async function detectOpexCategorySpiking(
  now: Date = new Date()
): Promise<FinanceRecommendationInput[]> {
  const from90 = new Date(now.getTime() - 90 * ONE_DAY_MS);
  const from30 = new Date(now.getTime() - 30 * ONE_DAY_MS);

  const recent30 = await prisma.qbExpense.groupBy({
    by: ['categorySlug'],
    where: { txnDate: { gte: from30, lt: now } },
    _sum: { amountCents: true },
  });
  const trailing90 = await prisma.qbExpense.groupBy({
    by: ['categorySlug'],
    where: { txnDate: { gte: from90, lt: from30 } },
    _sum: { amountCents: true },
  });
  const trailing90Map = new Map(
    trailing90.map((g) => [g.categorySlug ?? 'other', g._sum.amountCents ?? 0])
  );

  const out: FinanceRecommendationInput[] = [];
  for (const g of recent30) {
    const category = g.categorySlug ?? 'other';
    const recent = g._sum.amountCents ?? 0;
    if (recent < 5000) continue; // ignore <$50 (small noise)
    const trailing = trailing90Map.get(category) ?? 0;
    const dailyAvgTrailing = trailing / 60; // 60 days in trailing window
    const dailyAvgRecent = recent / 30;
    if (dailyAvgTrailing < 100) continue; // <$1/day baseline — ratio meaningless
    const ratio = dailyAvgRecent / dailyAvgTrailing;
    if (ratio < 1.5) continue;
    const severity: FinanceSeverity = ratio > 3 ? 'high' : 'normal';
    out.push({
      signalKind: 'opex-category-spiking',
      severity,
      title: `${category} OpEx spiked ${Math.round(ratio * 100)}% vs trailing 90d`,
      evidence: [
        {
          metricName: 'last 30d',
          metricValue: `$${(recent / 100).toFixed(2)}`,
          note: `$${(dailyAvgRecent / 100).toFixed(2)}/day`,
        },
        {
          metricName: 'trailing 90d (excl last 30)',
          metricValue: `$${(trailing / 100).toFixed(2)}`,
          note: `$${(dailyAvgTrailing / 100).toFixed(2)}/day`,
        },
      ],
      targetEntityType: 'qbCategory',
      targetEntityId: category,
      actionPayload: navigate('/admin/finance', 'Open OpEx breakdown'),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 8. Affiliate commission accrual aging (>30 days held/approved)
// ---------------------------------------------------------------------------

export async function detectAffiliateCommissionAging(
  now: Date = new Date()
): Promise<FinanceRecommendationInput[]> {
  const cutoff = new Date(now.getTime() - 30 * ONE_DAY_MS);
  const agg = await prisma.affiliateCommission.aggregate({
    where: {
      status: { in: ['HELD', 'APPROVED'] },
      createdAt: { lt: cutoff },
    },
    _sum: { commissionAmountCents: true },
    _count: { _all: true },
  });
  const totalCents = agg._sum.commissionAmountCents ?? 0;
  const count = agg._count._all;
  if (count === 0) return [];

  return [
    {
      signalKind: 'affiliate-commission-aging',
      severity: 'normal',
      title: `${count} affiliate commissions held >30d ($${(totalCents / 100).toFixed(2)})`,
      evidence: [
        { metricName: 'commissions outstanding', metricValue: count },
        { metricName: 'total held', metricValue: `$${(totalCents / 100).toFixed(2)}` },
      ],
      targetEntityType: 'affiliateCommissionBatch',
      targetEntityId: 'aging-30d',
      actionPayload: navigate('/admin/affiliates/payouts', 'Open affiliate payouts'),
      dedupeKey: 'affiliate-commission-aging:active',
    },
  ];
}

// ---------------------------------------------------------------------------
// 9. Discount over-use (single code > configured $ in last 7d)
// ---------------------------------------------------------------------------

const DISCOUNT_OVERUSE_THRESHOLD_CENTS = 50_000; // $500/week per code

export async function detectDiscountOveruse(
  now: Date = new Date()
): Promise<FinanceRecommendationInput[]> {
  const from = new Date(now.getTime() - 7 * ONE_DAY_MS);
  const grouped = await prisma.order.groupBy({
    by: ['discountCode'],
    where: {
      financialStatus: 'PAID',
      createdAt: { gte: from },
      discountCode: { not: null },
    },
    _sum: { discountAmount: true },
    _count: { _all: true },
  });
  const out: FinanceRecommendationInput[] = [];
  for (const g of grouped) {
    if (!g.discountCode) continue;
    const totalCents = Math.round(Number(g._sum.discountAmount ?? 0) * 100);
    if (totalCents < DISCOUNT_OVERUSE_THRESHOLD_CENTS) continue;
    out.push({
      signalKind: 'discount-overuse',
      severity: 'normal',
      title: `Discount "${g.discountCode}" gave away $${(totalCents / 100).toFixed(2)} in 7d`,
      evidence: [
        { metricName: 'total discounted', metricValue: `$${(totalCents / 100).toFixed(2)}` },
        { metricName: 'redemptions', metricValue: g._count._all },
      ],
      targetEntityType: 'discountCode',
      targetEntityId: g.discountCode,
      actionPayload: navigate('/admin/promotions', 'Review discount usage'),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 10. Untouched bank transaction (Plaid txn unreconciled >7d)
// ---------------------------------------------------------------------------

export async function detectUntouchedBankTransaction(
  now: Date = new Date()
): Promise<FinanceRecommendationInput[]> {
  const cutoff = new Date(now.getTime() - 7 * ONE_DAY_MS);
  const stale = await prisma.plaidTransaction.findMany({
    where: {
      reconciledAt: null,
      pending: false,
      date: { lt: cutoff },
    },
    take: 1,
    orderBy: { date: 'asc' },
  });
  if (stale.length === 0) return [];

  // Roll up to one summary rec rather than spamming one per txn.
  const totalUnmatched = await prisma.plaidTransaction.count({
    where: { reconciledAt: null, pending: false, date: { lt: cutoff } },
  });

  return [
    {
      signalKind: 'untouched-bank-transaction',
      severity: 'normal',
      title: `${totalUnmatched} bank transactions unreconciled >7 days`,
      evidence: [
        { metricName: 'unmatched (>7d)', metricValue: totalUnmatched },
        { metricName: 'oldest', metricValue: stale[0].date.toISOString().slice(0, 10) },
      ],
      targetEntityType: 'plaidTransaction',
      targetEntityId: 'aging-7d',
      actionPayload: navigate('/admin/finance/plaid?filter=unmatched', 'Open Plaid reconciliation'),
      dedupeKey: 'untouched-bank-transaction:active',
    },
  ];
}

// ---------------------------------------------------------------------------
// 11. QB sync error (token expired / API failing)
// ---------------------------------------------------------------------------

export async function detectQbSyncError(): Promise<FinanceRecommendationInput[]> {
  const row = await prisma.intuitOAuthState.findUnique({
    where: { id: 'singleton' },
  });
  if (!row || !row.lastError) return [];
  return [
    {
      signalKind: 'qb-sync-error',
      severity: 'urgent',
      title: 'QuickBooks sync failing',
      evidence: [
        { metricName: 'last error', metricValue: row.lastError.slice(0, 200) },
        {
          metricName: 'last refreshed',
          metricValue: row.lastRefreshedAt?.toISOString() ?? 'never',
        },
      ],
      targetEntityType: 'intuitConnection',
      targetEntityId: 'singleton',
      actionPayload: navigate('/admin/finance/connect-quickbooks', 'Reconnect QuickBooks'),
      dedupeKey: 'qb-sync-error:active',
    },
  ];
}

// ---------------------------------------------------------------------------
// 12. Plaid sync error (item login_required or error status)
// ---------------------------------------------------------------------------

export async function detectPlaidSyncError(): Promise<FinanceRecommendationInput[]> {
  const broken = await prisma.plaidItem.findMany({
    where: { status: { in: ['login_required', 'error'] } },
  });
  return broken.map<FinanceRecommendationInput>((item) => ({
    signalKind: 'plaid-sync-error',
    severity: 'urgent',
    title: `Plaid connection broken: ${item.institutionName ?? 'unknown bank'}`,
    evidence: [
      { metricName: 'item status', metricValue: item.status },
      {
        metricName: 'last error',
        metricValue: (item.lastError ?? 'no detail').slice(0, 200),
      },
    ],
    targetEntityType: 'plaidItem',
    targetEntityId: item.id,
    actionPayload: navigate('/admin/finance/connect-bank', 'Reconnect bank'),
  }));
}
