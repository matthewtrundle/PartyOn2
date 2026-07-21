/**
 * Income reconciliation against real bank deposits (finance data cleanup, B3).
 *
 * The operator's source of truth for income is **actual Wells Fargo deposits**.
 * This module does NOT replace the itemized revenue line (Order + Shopify, which
 * every SKU/segment/customer/affiliate breakdown depends on) — it's a CROSS-CHECK:
 * do the month's production bank deposits line up with known Stripe revenue?
 *
 * It splits production bank inflows into:
 *   - FINANCING (owner capital — Brian's injections) and vendor refunds, which
 *     are excluded from the income check entirely (they are not sales), then
 *   - matched to a StripePayout (via the existing reconciliation), and
 *   - everything else, "explained" by the month's aggregate Stripe revenue.
 *
 * Owner capital: the operator confirmed (2026-07-10) that the recurring
 * ~$15–17K/mo of non-sales deposits are equity injections from the co-owner
 * (B Hill Entertainment LLC / Hill B transfers). Plaid mislabels these
 * INCOME_CONTRACTOR, so classification is by descriptor, not PFC. They are
 * financing — never income — and must not trip the "deposits exceed revenue"
 * flag once recognized.
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
import {
  COGS_MERCHANT_RULES,
  COGS_GROCERY_MERCHANT_RULES,
} from './plaid-category-map';

/**
 * Owner-capital (financing) inflow descriptors, ANCHORED to the exact shapes
 * observed on the real Wells Fargo feed (operator-confirmed 2026-07-10):
 *
 *   "ZELLE FROM B HILL ENTERTAINMENT LLC ON 05/15"
 *   "ONLINE TRANSFER FROM B HILL ENTERTAINMENT LL"   (WF truncation)
 *   "ONLINE TRANSFER FROM HILL B EVERYDAY CHECKIN"
 *   "ONLINE TRANSFER FROM HILL B REF #IB0Y2NKXHG"
 *
 * Deliberately NOT a bare name match: a customer payment from a real person
 * whose name happens to contain "B Hill" (e.g. "PAYMENT FROM SARAH B HILL")
 * must stay in the income check — this recon exists to catch unrecorded
 * off-platform sales, and a loose rule would silently launder one as
 * financing. So each rule requires the funding-source context: either the
 * LLC name, or WF's own online-transfer form of Brian's account ("HILL B" +
 * word boundary). If Brian's descriptor drifts, the month re-flags as excess
 * deposits (see the drift hint in the flag text) rather than misclassifying.
 */
export const OWNER_CAPITAL_RULES: readonly RegExp[] = [
  /from\s+b\.?\s+hill\s+entertainment/i, // Zelle / transfer from the LLC
  /online\s+transfer\s+from\s+hill\s+b\b/i, // WF transfer from Brian's checking ("HILL B EVERYDAY…", "HILL B REF #…")
];

/**
 * Loan-proceeds (financing) inflow descriptors — the PeopleFund term-loan
 * DISBURSEMENTS, ANCHORED to the exact shape on the real Wells Fargo feed
 * (surfaced by the 2024 statement import, operator-confirmed loan #0006957):
 *
 *   "Peoplefund Advance 0006957 Full and Final Funding; Working Capital"
 *   "Peoplefund Advances 0006957 Partial Funding; Inventory Category…"
 *
 * These are loan proceeds — financing, never income — and must not trip the
 * "deposits exceed revenue" flag (2024 H1 alone was ~$328K of PeopleFund
 * advances, which would otherwise read as phantom sales). The loan PAYMENTS
 * ("Peoplefund Pymt…") are the matching outflow, already mapped `non_operating`
 * via the PFC / statement LOAN_PAYMENTS hint.
 *
 * Anchored like OWNER_CAPITAL_RULES: PeopleFund is Party On's CDFI lender, not a
 * customer, and the "advance" wording + loan number pin it to a disbursement —
 * a real sale (Stripe/Square "ST-…" / Square Inc) can't be laundered as
 * financing by this rule. If the descriptor drifts, the month re-flags as excess
 * deposits (see the drift hint) rather than silently misclassifying.
 */
export const LOAN_PROCEEDS_RULES: readonly RegExp[] = [
  /\bpeoplefund\b.*\badvance/i, // "Peoplefund Advance(s) 0006957 … Funding"
];

/**
 * The distributors' payment-processor stamp that appears on their ACH debits
 * AND their refund credits ("Southern Glazer' FINTECHEFT 051826 …"). A vendor
 * refund must carry it — a Zelle from a person whose name merely contains a
 * distributor-like word (e.g. "ZELLE FROM JOHN SPECS") must NOT be excluded
 * from the income check.
 */
const VENDOR_PROCESSOR_STAMP = /fintech/i;

export type BankInflowClass =
  | 'owner_capital'
  | 'loan_proceeds'
  | 'vendor_refund'
  | 'sales_or_other';

/**
 * Classify a production bank INFLOW by descriptor. Owner capital, loan proceeds
 * (PeopleFund advances), and vendor refunds (credits back from a COGS merchant,
 * e.g. a distributor rebate) are all excluded from the income reconciliation —
 * none is sales revenue.
 */
export function classifyBankInflow(txn: {
  name: string;
  merchantName?: string | null;
}): BankInflowClass {
  const text = `${txn.merchantName ?? ''} ${txn.name ?? ''}`.trim();
  for (const re of OWNER_CAPITAL_RULES) {
    if (re.test(text)) return 'owner_capital';
  }
  for (const re of LOAN_PROCEEDS_RULES) {
    if (re.test(text)) return 'loan_proceeds';
  }
  // Vendor refund = COGS-merchant descriptor AND the processor stamp their
  // real credits carry — never a bare name match.
  if (VENDOR_PROCESSOR_STAMP.test(text)) {
    for (const re of [...COGS_MERCHANT_RULES, ...COGS_GROCERY_MERCHANT_RULES]) {
      if (re.test(text)) return 'vendor_refund';
    }
  }
  return 'sales_or_other';
}

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
  /** ALL production inflows for the month (incl. financing + refunds). */
  totalDepositsCents: number;
  /** Owner-capital injections (financing) — excluded from the income check. */
  ownerCapitalCents: number;
  /**
   * Per-transfer audit trail of what was classified owner capital, so a
   * misclassified deposit is spot-checkable in the monthly email instead of
   * disappearing into an aggregate.
   */
  ownerCapitalTxns: Array<{ name: string; cents: number }>;
  /** Loan proceeds (PeopleFund advances) — financing, excluded from income. */
  loanProceedsCents: number;
  /** Per-advance audit trail of what was classified loan proceeds. */
  loanProceedsTxns: Array<{ name: string; cents: number }>;
  /** Credits back from COGS merchants (distributor refunds) — excluded too. */
  vendorRefundCents: number;
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
      ownerCapitalCents: 0,
      ownerCapitalTxns: [],
      loanProceedsCents: 0,
      loanProceedsTxns: [],
      vendorRefundCents: 0,
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

  const inflows = await prisma.plaidTransaction.findMany({
    where: inflowWhere,
    select: { name: true, merchantName: true, amount: true, matchedStripePayoutId: true },
  });

  // Classify each inflow; financing (owner capital) and vendor refunds are not
  // sales, so they're removed BEFORE the deposits-vs-revenue check. The matched
  // sum is computed over sales-class rows only, so a coincidental payout match
  // on a financing row can't inflate the explainable amount.
  let totalDepositsCents = 0;
  let ownerCapitalCents = 0;
  const ownerCapitalTxns: Array<{ name: string; cents: number }> = [];
  let loanProceedsCents = 0;
  const loanProceedsTxns: Array<{ name: string; cents: number }> = [];
  let vendorRefundCents = 0;
  let salesDepositsCents = 0;
  let matchedToStripeCents = 0;
  for (const t of inflows) {
    const cents = Math.abs(decToCents(t.amount));
    totalDepositsCents += cents;
    const cls = classifyBankInflow(t);
    if (cls === 'owner_capital') {
      ownerCapitalCents += cents;
      ownerCapitalTxns.push({ name: t.merchantName ?? t.name, cents });
    } else if (cls === 'loan_proceeds') {
      loanProceedsCents += cents;
      loanProceedsTxns.push({ name: t.merchantName ?? t.name, cents });
    } else if (cls === 'vendor_refund') {
      vendorRefundCents += cents;
    } else {
      salesDepositsCents += cents;
      if (t.matchedStripePayoutId) matchedToStripeCents += cents;
    }
  }

  // Sales-class deposits up to known Stripe revenue are Stripe-explained even
  // without a payout match (covers the Jan–May payout-sync gap).
  const { stripeExplainedCents, otherIncomeCents, reconciled } = explainDeposits({
    totalDepositsCents: salesDepositsCents,
    matchedToStripeCents,
    stripeRevenueProxyCents,
  });

  if (salesDepositsCents > 0 && matchedToStripeCents === 0) {
    flags.push(
      'no deposits matched to Stripe payouts (payout-sync gap before 2026-05-26) — ' +
        'explained via aggregate Stripe revenue'
    );
  }
  if (otherIncomeCents > salesDepositsCents * OTHER_INCOME_TOLERANCE) {
    // Drift hint: if a month shows a large excess AND no owner-capital rows
    // were recognized, the most likely cause is a changed transfer descriptor
    // (a classifier miss), not a new anomaly — say so, so the operator checks
    // OWNER_CAPITAL_RULES before hunting for missing orders.
    const driftHint =
      ownerCapitalCents === 0 && loanProceedsCents === 0
        ? ' (no owner-capital or loan-proceeds transfers recognized this month — if Brian injected capital or a loan disbursed, the bank descriptor may have drifted; check OWNER_CAPITAL_RULES / LOAN_PROCEEDS_RULES)'
        : '';
    flags.push(
      `$${(otherIncomeCents / 100).toFixed(0)} of bank deposits exceed known Stripe ` +
        'revenue — possible other income (owner injection / loan) or missing orders' +
        driftHint
    );
  }

  return {
    hasProductionBank: true,
    totalDepositsCents,
    ownerCapitalCents,
    ownerCapitalTxns,
    loanProceedsCents,
    loanProceedsTxns,
    vendorRefundCents,
    matchedToStripeCents,
    stripeExplainedCents,
    otherIncomeCents,
    reconciled,
    flags,
  };
}
