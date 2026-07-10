/**
 * Monthly-close P&L payload (Finance Director Phase 5 — the recurring
 * monthly-close email).
 *
 * On the 1st of each month the cron closes the PRIOR month: it reads that
 * month's `finance_monthly_rollup` row (plus the month before, for a
 * month-over-month delta) and shapes a P&L payload for the email template.
 *
 * The rollup already did the hard part — UNION of the two revenue eras, QB-vs-
 * bank expense-source precedence, and the `dataHealth` honesty flags. This layer
 * only reshapes it for display. **Net income is shaped through as-is; the
 * template decides whether to render it based on `netIncomeReliable`** so the
 * honesty gate lives in exactly one place.
 *
 * The bank-sourced expense numbers are CASH-BASIS: "COGS" is alcohol PURCHASED
 * that month (cash out to distributors), not accrual cost-of-goods-SOLD — so it
 * is lumpy (restock months spike). `cashBasis` flags this for the template.
 */

import { prisma } from '@/lib/database/client';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://partyondelivery.com';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface YearMonth {
  year: number;
  month: number;
}

/** The month a close fired on `now` covers = the prior calendar month. */
export function resolveCloseMonth(now: Date): YearMonth {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function priorOf(ym: YearMonth): YearMonth {
  const d = new Date(Date.UTC(ym.year, ym.month - 2, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function monthLabel(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}

/** One OpEx category line for the P&L breakdown. */
export interface MonthlyCloseExpenseRow {
  label: string;
  cents: number;
  topVendor: string | null;
}

/** `dataHealth` block persisted on the rollup (only the fields we read). */
interface RollupDataHealth {
  expenseSource?: 'qb' | 'bank' | 'none' | null;
  netIncomeReliable?: boolean;
  incomeReconciled?: boolean | null;
  otherIncomeCents?: number | null;
  flags?: string[];
}

interface RollupExpenseCat {
  category: string;
  label: string;
  cents: number;
  topVendor: string | null;
  topVendorCents: number;
}

/** Plain (BigInt-free) view of a rollup row — what the pure shaper consumes. */
export interface RollupRow {
  year: number;
  month: number;
  revenueCents: number;
  revenueFromShopifyCents: number;
  revenueFromOrdersCents: number;
  orderCount: number;
  cogsCents: number | null;
  grossProfitCents: number | null;
  opexCents: number | null;
  netIncomeCents: number | null;
  expenseCategories: RollupExpenseCat[];
  dataHealth: RollupDataHealth;
}

export interface MonthlyClosePayload {
  monthLabel: string;
  period: string; // "2026-07"
  generatedAtIso: string;
  // Revenue
  revenueCents: number;
  revenueFromShopifyCents: number;
  revenueFromOrdersCents: number;
  orderCount: number;
  revenueMoMPct: number | null;
  // Expenses (cash-basis when bank-sourced)
  expenseSource: 'qb' | 'bank' | 'none';
  cashBasis: boolean;
  cogsCents: number | null;
  cogsTopVendor: string | null;
  grossProfitCents: number | null;
  grossMarginPct: number | null;
  opexCents: number | null;
  opexRows: MonthlyCloseExpenseRow[];
  // Net (template gates rendering on netIncomeReliable)
  netIncomeCents: number | null;
  netIncomeReliable: boolean;
  flags: string[];
  // Reconciliation status
  incomeReconciled: boolean | null;
  otherIncomeCents: number | null;
  dashboardUrl: string;
}

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

/**
 * Pure shaper — turns a rollup row (+ optional prior month) into the email
 * payload. No DB access, so it is unit-testable in isolation.
 */
export function shapeMonthlyClosePayload(args: {
  rollup: RollupRow;
  prior: RollupRow | null;
  generatedAt: Date;
  baseUrl?: string;
}): MonthlyClosePayload {
  const { rollup, prior, generatedAt } = args;
  const base = args.baseUrl ?? BASE_URL;
  const ym: YearMonth = { year: rollup.year, month: rollup.month };
  const health = rollup.dataHealth ?? {};
  const expenseSource = (health.expenseSource ?? 'none') as 'qb' | 'bank' | 'none';

  const cats = Array.isArray(rollup.expenseCategories) ? rollup.expenseCategories : [];
  const cogsCat = cats.find((c) => c.category === 'cogs') ?? null;
  const opexRows: MonthlyCloseExpenseRow[] = cats
    .filter((c) => c.category !== 'cogs')
    .map((c) => ({ label: c.label, cents: c.cents, topVendor: c.topVendor }))
    .sort((a, b) => b.cents - a.cents);

  const grossMarginPct =
    rollup.grossProfitCents !== null && rollup.revenueCents > 0
      ? (rollup.grossProfitCents / rollup.revenueCents) * 100
      : null;

  return {
    monthLabel: monthLabel(ym),
    period: `${ym.year}-${String(ym.month).padStart(2, '0')}`,
    generatedAtIso: generatedAt.toISOString(),
    revenueCents: rollup.revenueCents,
    revenueFromShopifyCents: rollup.revenueFromShopifyCents,
    revenueFromOrdersCents: rollup.revenueFromOrdersCents,
    orderCount: rollup.orderCount,
    revenueMoMPct: prior ? pctChange(rollup.revenueCents, prior.revenueCents) : null,
    expenseSource,
    cashBasis: expenseSource === 'bank',
    cogsCents: rollup.cogsCents,
    cogsTopVendor: cogsCat?.topVendor ?? null,
    grossProfitCents: rollup.grossProfitCents,
    grossMarginPct,
    opexCents: rollup.opexCents,
    opexRows,
    netIncomeCents: rollup.netIncomeCents,
    netIncomeReliable: health.netIncomeReliable === true,
    flags: Array.isArray(health.flags) ? health.flags : [],
    incomeReconciled: health.incomeReconciled ?? null,
    otherIncomeCents: health.otherIncomeCents ?? null,
    dashboardUrl: `${base}/admin/finance`,
  };
}

/** Prisma row → plain RollupRow (BigInt → number, Json → typed). */
function toRollupRow(r: {
  year: number;
  month: number;
  revenueCents: bigint;
  revenueFromShopifyCents: bigint;
  revenueFromOrdersCents: bigint;
  orderCount: number;
  cogsCents: bigint | null;
  grossProfitCents: bigint | null;
  opexCents: bigint | null;
  netIncomeCents: bigint | null;
  expenseCategories: unknown;
  dataHealth: unknown;
}): RollupRow {
  const n = (b: bigint | null): number | null => (b === null ? null : Number(b));
  return {
    year: r.year,
    month: r.month,
    revenueCents: Number(r.revenueCents),
    revenueFromShopifyCents: Number(r.revenueFromShopifyCents),
    revenueFromOrdersCents: Number(r.revenueFromOrdersCents),
    orderCount: r.orderCount,
    cogsCents: n(r.cogsCents),
    grossProfitCents: n(r.grossProfitCents),
    opexCents: n(r.opexCents),
    netIncomeCents: n(r.netIncomeCents),
    expenseCategories: Array.isArray(r.expenseCategories)
      ? (r.expenseCategories as RollupExpenseCat[])
      : [],
    dataHealth: (r.dataHealth ?? {}) as RollupDataHealth,
  };
}

/**
 * Read the just-closed month (+ the prior month) from `finance_monthly_rollup`
 * and shape the email payload. Returns null when the closed month has no rollup
 * row yet (the nightly rollup cron should have built it; if not, the caller
 * skips the email rather than inventing numbers).
 */
export async function buildMonthlyClosePayload(
  now: Date,
  baseUrl?: string
): Promise<MonthlyClosePayload | null> {
  const target = resolveCloseMonth(now);
  const prevYm = priorOf(target);

  // Select only the P&L fields — deliberately EXCLUDE topCustomers (name +
  // email), topAffiliates, topSkus, segmentBreakdown so customer PII never
  // enters this email pipeline.
  const select = {
    year: true,
    month: true,
    revenueCents: true,
    revenueFromShopifyCents: true,
    revenueFromOrdersCents: true,
    orderCount: true,
    cogsCents: true,
    grossProfitCents: true,
    opexCents: true,
    netIncomeCents: true,
    expenseCategories: true,
    dataHealth: true,
  } as const;

  const [targetRow, priorRow] = await Promise.all([
    prisma.financeMonthlyRollup.findUnique({
      where: { year_month: { year: target.year, month: target.month } },
      select,
    }),
    prisma.financeMonthlyRollup.findUnique({
      where: { year_month: { year: prevYm.year, month: prevYm.month } },
      select,
    }),
  ]);

  if (!targetRow) return null;

  return shapeMonthlyClosePayload({
    rollup: toRollupRow(targetRow),
    prior: priorRow ? toRollupRow(priorRow) : null,
    generatedAt: now,
    baseUrl,
  });
}
