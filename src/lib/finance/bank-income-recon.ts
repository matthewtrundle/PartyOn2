/**
 * Income reconciliation against real bank deposits (finance data cleanup, B3).
 *
 * The operator's source of truth for income is **actual Wells Fargo deposits**.
 * This module does NOT replace the itemized revenue line (Order + Shopify, which
 * every SKU/segment/customer/affiliate breakdown depends on) — it's a CROSS-CHECK:
 * do the month's production bank deposits line up with known Stripe revenue?
 *
 * It splits production bank inflows into:
 *   - matched to a StripePayout (via the existing reconciliation), and
 *   - everything else, "explained" by the month's aggregate Stripe revenue.
 *
 * ⚠️ StripePayout gap: there are no StripePayout rows before 2026-05-26, so
 * Jan–May 2026 deposits would look non-Stripe purely from the sync gap. The
 * caller passes the month's known Stripe revenue (gross, from Order + Shopify)
 * as `stripeRevenueProxyCents`; deposits up to that amount are treated as
 * Stripe-explained even without a payout match. Only deposits that EXCEED known
 * revenue surface as `otherIncome` (genuinely unexplained — possible owner
 * injection, loan proceeds, or missing orders). Backfilling earlier payouts is
 * deferred.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';

/** Share of deposits allowed to be unexplained before the month is "unreconciled". */
const OTHER_INCOME_TOLERANCE = 0.15;

export interface BankIncomeReconInput {
  year: number;
  month: number;
  /**
   * The month's known Stripe-processed revenue (gross, from Order + Shopify),
   * used to explain deposits when StripePayout rows are missing. Pass the
   * rollup's computed `revenueCents`.
   */
  stripeRevenueProxyCents: number;
}

export interface BankIncomeRecon {
  hasProductionBank: boolean;
  totalDepositsCents: number;
  matchedToStripeCents: number;
  stripeExplainedCents: number;
  otherIncomeCents: number;
  reconciled: boolean;
  flags: string[];
}

export interface DepositExplanation {
  stripeExplainedCents: number;
  otherIncomeCents: number;
  reconciled: boolean;
}

/**
 * Pure core of the income reconciliation. Given a month's total bank deposits,
 * the portion explicitly matched to Stripe payouts, and the month's known Stripe
 * revenue (proxy), decide how much is Stripe-explained vs genuinely "other".
 *
 * Deposits up to known revenue count as Stripe even WITHOUT a payout match —
 * this is what defends the Jan–May 2026 payout-sync gap (no StripePayout rows
 * before 2026-05-26). Only deposits exceeding known revenue surface as other
 * income (possible owner injection / loan / missing orders).
 */
export function explainDeposits(args: {
  totalDepositsCents: number;
  matchedToStripeCents: number;
  stripeRevenueProxyCents: number;
}): DepositExplanation {
  const { totalDepositsCents, matchedToStripeCents, stripeRevenueProxyCents } = args;
  const explainable = Math.max(matchedToStripeCents, Math.max(0, stripeRevenueProxyCents));
  const stripeExplainedCents = Math.min(totalDepositsCents, explainable);
  const otherIncomeCents = totalDepositsCents - stripeExplainedCents;
  const reconciled =
    totalDepositsCents > 0 &&
    otherIncomeCents <= totalDepositsCents * OTHER_INCOME_TOLERANCE;
  return { stripeExplainedCents, otherIncomeCents, reconciled };
}

function decToCents(d: Prisma.Decimal | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return Math.round(Number(d) * 100);
}

function monthWindow(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * Reconcile a month's production bank deposits against known Stripe revenue.
 * Read-only. Returns zeros + a flag when no production bank is connected yet.
 */
export async function reconcileBankIncome(
  input: BankIncomeReconInput
): Promise<BankIncomeRecon> {
  const { year, month, stripeRevenueProxyCents } = input;
  const { start, end } = monthWindow(year, month);
  const flags: string[] = [];

  const prodBankCount = await prisma.plaidItem.count({
    where: { environment: 'production' },
  });
  if (prodBankCount === 0) {
    return {
      hasProductionBank: false,
      totalDepositsCents: 0,
      matchedToStripeCents: 0,
      stripeExplainedCents: 0,
      otherIncomeCents: 0,
      reconciled: false,
      flags: ['no production bank connected — income not reconciled to deposits'],
    };
  }

  // Plaid convention: negative amount = inflow / deposit.
  const inflowWhere = {
    item: { environment: 'production' },
    date: { gte: start, lt: end },
    pending: false,
    amount: { lt: 0 },
  } satisfies Prisma.PlaidTransactionWhereInput;

  const [allInflows, matchedInflows] = await Promise.all([
    prisma.plaidTransaction.aggregate({ where: inflowWhere, _sum: { amount: true } }),
    prisma.plaidTransaction.aggregate({
      where: { ...inflowWhere, matchedStripePayoutId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const totalDepositsCents = Math.abs(decToCents(allInflows._sum.amount));
  const matchedToStripeCents = Math.abs(decToCents(matchedInflows._sum.amount));

  // Deposits up to known Stripe revenue are Stripe-explained even without a
  // payout match (covers the Jan–May payout-sync gap).
  const { stripeExplainedCents, otherIncomeCents, reconciled } = explainDeposits({
    totalDepositsCents,
    matchedToStripeCents,
    stripeRevenueProxyCents,
  });

  if (totalDepositsCents > 0 && matchedToStripeCents === 0) {
    flags.push(
      'no deposits matched to Stripe payouts (payout-sync gap before 2026-05-26) — ' +
        'explained via aggregate Stripe revenue'
    );
  }
  if (otherIncomeCents > totalDepositsCents * OTHER_INCOME_TOLERANCE) {
    flags.push(
      `$${(otherIncomeCents / 100).toFixed(0)} of bank deposits exceed known Stripe ` +
        'revenue — possible other income (owner injection / loan) or missing orders'
    );
  }

  return {
    hasProductionBank: true,
    totalDepositsCents,
    matchedToStripeCents,
    stripeExplainedCents,
    otherIncomeCents,
    reconciled,
    flags,
  };
}
