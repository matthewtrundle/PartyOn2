/**
 * Plaid transaction sync + auto-reconciliation — Phase 2C.
 *
 * Pulls every linked PlaidItem's transactions via Plaid /transactions/sync
 * (incremental, cursor-based). For each new transaction:
 *
 *   - Inflows: try to match a StripePayout (amount + date window) and link.
 *   - Outflows: try to match a QbExpense (amount + date window + vendor)
 *     so we know QB already has it on the books. Unmatched outflows surface
 *     on /admin/finance/plaid for operator review.
 *
 * Read-only against QuickBooks. QB has its own bank-feed integration; we do
 * not push Plaid transactions into QB to avoid duplicating those rows.
 *
 * Called by:
 *   - /api/webhooks/plaid (on Plaid's TRANSACTIONS / SYNC_UPDATES_AVAILABLE)
 *   - /api/cron/finance-plaid-sync (daily safety net)
 */

import { prisma } from '@/lib/database/client';
import { syncTransactions, type SyncTransactionsResult } from './plaid-client';
import { categorizeBankOutflow, isBankExpenseCategory } from './plaid-category-map';

const ONE_DAY_MS = 86_400_000;

// Match windows
const STRIPE_PAYOUT_MATCH_DAYS = 4;
const QB_EXPENSE_MATCH_DAYS = 3;
/** Amount fuzz, in cents, when matching ($ value can drift a few cents on
 * cross-bank routing). */
const AMOUNT_FUZZ_CENTS = 50;

// ---------------------------------------------------------------------------
// Sync per item
// ---------------------------------------------------------------------------

export interface ItemSyncResult {
  plaidItemId: string;
  itemId: string;
  institution: string | null;
  added: number;
  modified: number;
  removed: number;
  finalCursor: string;
  loops: number;
  /** Reconciliation results after the sync upserts complete. */
  inflowsMatched: number;
  outflowsMatched: number;
  unmatched: number;
  /** Outflows stamped with a bank-derived expense category (production only). */
  bankCategorized: number;
}

export async function syncItem(plaidItemId: string): Promise<ItemSyncResult> {
  const item = await prisma.plaidItem.findUnique({ where: { id: plaidItemId } });
  if (!item) throw new Error(`PlaidItem ${plaidItemId} not found`);

  // Load or initialise cursor row.
  let cursorRow = await prisma.plaidSyncCursor.findUnique({
    where: { plaidItemId },
  });
  if (!cursorRow) {
    cursorRow = await prisma.plaidSyncCursor.create({
      data: { plaidItemId },
    });
  }

  let cursor: string | undefined = cursorRow.cursor ?? undefined;
  let added = 0;
  let modified = 0;
  let removed = 0;
  let loops = 0;
  let finalCursor = cursor ?? '';

  try {
    let result: SyncTransactionsResult;
    do {
      result = await syncTransactions(item.accessToken, cursor);
      loops++;

      // Upsert added + modified
      for (const txn of [...result.added, ...result.modified]) {
        await prisma.plaidTransaction.upsert({
          where: { transactionId: txn.transaction_id },
          create: {
            plaidItemId,
            accountId: txn.account_id,
            transactionId: txn.transaction_id,
            date: new Date(`${txn.date}T00:00:00Z`),
            authorizedDate: txn.authorized_date
              ? new Date(`${txn.authorized_date}T00:00:00Z`)
              : null,
            amount: txn.amount,
            isoCurrencyCode: txn.iso_currency_code ?? 'USD',
            name: txn.name,
            merchantName: txn.merchant_name ?? null,
            pending: txn.pending,
            paymentChannel: txn.payment_channel ?? null,
            category: txn.category ?? [],
            personalFinanceCategoryPrimary:
              txn.personal_finance_category?.primary ?? null,
            personalFinanceCategoryDetailed:
              txn.personal_finance_category?.detailed ?? null,
          },
          update: {
            date: new Date(`${txn.date}T00:00:00Z`),
            authorizedDate: txn.authorized_date
              ? new Date(`${txn.authorized_date}T00:00:00Z`)
              : null,
            amount: txn.amount,
            name: txn.name,
            merchantName: txn.merchant_name ?? null,
            pending: txn.pending,
            paymentChannel: txn.payment_channel ?? null,
            category: txn.category ?? [],
            personalFinanceCategoryPrimary:
              txn.personal_finance_category?.primary ?? null,
            personalFinanceCategoryDetailed:
              txn.personal_finance_category?.detailed ?? null,
          },
        });
      }
      added += result.added.length;
      modified += result.modified.length;

      // Apply removals
      for (const rm of result.removed) {
        await prisma.plaidTransaction.deleteMany({
          where: { transactionId: rm.transaction_id },
        });
        removed++;
      }

      cursor = result.nextCursor;
      finalCursor = result.nextCursor;
    } while (result.hasMore);

    await prisma.plaidSyncCursor.update({
      where: { plaidItemId },
      data: {
        cursor: finalCursor,
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
    await prisma.plaidItem.update({
      where: { id: plaidItemId },
      data: { lastSyncAt: new Date(), lastError: null, status: 'active' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.plaidSyncCursor.update({
      where: { plaidItemId },
      data: { lastError: message },
    });
    await prisma.plaidItem.update({
      where: { id: plaidItemId },
      data: { lastError: message, status: 'error' },
    });
    throw err;
  }

  // Auto-reconcile in the same call so the dashboard reflects the new state.
  const reconcile = await reconcileItem(plaidItemId);

  // Stamp bank-derived expense categories on unmatched outflows (production
  // items only) so QB-dormant months can source expenses from the bank feed.
  const bankCat = await categorizeBankOutflows(plaidItemId);

  return {
    plaidItemId,
    itemId: item.itemId,
    institution: item.institutionName,
    added,
    modified,
    removed,
    finalCursor,
    loops,
    inflowsMatched: reconcile.inflowsMatched,
    outflowsMatched: reconcile.outflowsMatched,
    unmatched: reconcile.unmatched,
    bankCategorized: bankCat.categorized,
  };
}

export async function syncAllItems(): Promise<ItemSyncResult[]> {
  const items = await prisma.plaidItem.findMany({
    where: { status: { in: ['active', 'error'] } },
    select: { id: true },
  });
  const results: ItemSyncResult[] = [];
  for (const i of items) {
    try {
      results.push(await syncItem(i.id));
    } catch (err) {
      console.error('[plaid-sync] item failed', i.id, err);
    }
  }
  return results;
}

export interface PurgeNonProdResult {
  itemsDeleted: number;
  accountsDeleted: number;
  transactionsDeleted: number;
  cursorsDeleted: number;
}

/**
 * Delete every NON-production PlaidItem and its dependent rows. Used on the
 * Wells Fargo cutover to clear the Plaid sandbox "Platypus" data once real
 * production is connected (mirrors the QB realm purge). PlaidAccount +
 * PlaidTransaction cascade from PlaidItem, but PlaidSyncCursor has no FK cascade
 * — all are deleted explicitly inside one transaction so the counts are exact.
 */
export async function purgeNonProdPlaidData(): Promise<PurgeNonProdResult> {
  const nonProd = await prisma.plaidItem.findMany({
    where: { environment: { not: 'production' } },
    select: { id: true },
  });
  const ids = nonProd.map((i) => i.id);
  if (ids.length === 0) {
    return { itemsDeleted: 0, accountsDeleted: 0, transactionsDeleted: 0, cursorsDeleted: 0 };
  }
  return prisma.$transaction(async (tx) => {
    const transactions = await tx.plaidTransaction.deleteMany({
      where: { plaidItemId: { in: ids } },
    });
    const accounts = await tx.plaidAccount.deleteMany({
      where: { plaidItemId: { in: ids } },
    });
    const cursors = await tx.plaidSyncCursor.deleteMany({
      where: { plaidItemId: { in: ids } },
    });
    const items = await tx.plaidItem.deleteMany({ where: { id: { in: ids } } });
    return {
      itemsDeleted: items.count,
      accountsDeleted: accounts.count,
      transactionsDeleted: transactions.count,
      cursorsDeleted: cursors.count,
    };
  });
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function cents(dollarAmount: number | string | { toString(): string }): number {
  return Math.round(Number(dollarAmount) * 100);
}

interface ReconcileResult {
  inflowsMatched: number;
  outflowsMatched: number;
  unmatched: number;
}

/**
 * Reconcile every unmatched PlaidTransaction for the given item. Idempotent:
 * already-matched rows are skipped.
 */
export async function reconcileItem(plaidItemId: string): Promise<ReconcileResult> {
  const txns = await prisma.plaidTransaction.findMany({
    where: {
      plaidItemId,
      reconciledAt: null,
      pending: false,
    },
    take: 500,
    orderBy: { date: 'desc' },
  });

  let inflowsMatched = 0;
  let outflowsMatched = 0;
  let unmatched = 0;

  for (const txn of txns) {
    const amountCents = cents(txn.amount);
    // Plaid convention: positive = outflow / debit; negative = inflow / credit.
    const isInflow = amountCents < 0;
    const absCents = Math.abs(amountCents);

    let matched = false;

    if (isInflow) {
      const payout = await findStripePayoutMatch(txn.date, absCents);
      if (payout) {
        await prisma.plaidTransaction.update({
          where: { id: txn.id },
          data: {
            matchedStripePayoutId: payout.id,
            reconciledAt: new Date(),
          },
        });
        await prisma.stripePayout.update({
          where: { id: payout.id },
          data: {
            matchedPlaidTxId: txn.id,
            matchedAt: new Date(),
          },
        });
        inflowsMatched++;
        matched = true;
      }
    } else {
      const expense = await findQbExpenseMatch(txn.date, absCents, txn.merchantName);
      if (expense) {
        await prisma.plaidTransaction.update({
          where: { id: txn.id },
          data: {
            matchedQbExpenseId: expense.qbTransactionId,
            qbTransactionId: expense.qbTransactionId,
            qbCategoryAssigned: expense.categorySlug ?? null,
            reconciledAt: new Date(),
            // QB is the source for this outflow — never also a bank-derived expense.
            isBankDerivedExpense: false,
          },
        });
        outflowsMatched++;
        matched = true;
      }
    }

    if (!matched) unmatched++;
  }

  return { inflowsMatched, outflowsMatched, unmatched };
}

export interface BankCategorizeResult {
  categorized: number;
  expenseCount: number;
}

/**
 * Stamp bank-derived expense categories on this item's UNMATCHED outflows
 * (outflows with no QB expense match). PRODUCTION items only — sandbox data must
 * never count as a real expense, even before the sandbox PlaidItem is purged.
 *
 * The monthly rollup uses these for QB-dormant months (e.g. 2026), where the
 * bank outflow IS the expense because QB has no real expense rows. Idempotent:
 * only touches rows not yet categorized (bankDerivedCategory IS NULL), so it's
 * safe to run on every sync and from the backfill script.
 */
export async function categorizeBankOutflows(
  plaidItemId: string
): Promise<BankCategorizeResult> {
  const item = await prisma.plaidItem.findUnique({
    where: { id: plaidItemId },
    select: { environment: true },
  });
  if (!item || item.environment !== 'production') {
    return { categorized: 0, expenseCount: 0 };
  }

  const txns = await prisma.plaidTransaction.findMany({
    where: {
      plaidItemId,
      pending: false,
      matchedQbExpenseId: null,
      bankDerivedCategory: null,
      amount: { gt: 0 }, // Plaid convention: positive = outflow / debit
    },
    take: 1000,
    orderBy: { date: 'desc' },
  });

  let categorized = 0;
  let expenseCount = 0;
  for (const txn of txns) {
    const slug = categorizeBankOutflow({
      name: txn.name,
      merchantName: txn.merchantName,
      personalFinanceCategoryPrimary: txn.personalFinanceCategoryPrimary,
      personalFinanceCategoryDetailed: txn.personalFinanceCategoryDetailed,
    });
    const isExpense = isBankExpenseCategory(slug);
    await prisma.plaidTransaction.update({
      where: { id: txn.id },
      data: { bankDerivedCategory: slug, isBankDerivedExpense: isExpense },
    });
    categorized++;
    if (isExpense) expenseCount++;
  }
  return { categorized, expenseCount };
}

async function findStripePayoutMatch(
  txnDate: Date,
  absCents: number
): Promise<{ id: string } | null> {
  const from = new Date(txnDate.getTime() - STRIPE_PAYOUT_MATCH_DAYS * ONE_DAY_MS);
  const to = new Date(txnDate.getTime() + STRIPE_PAYOUT_MATCH_DAYS * ONE_DAY_MS);
  // Match on amount + arrival_date window, only against payouts that
  // haven't already been matched.
  const row = await prisma.stripePayout.findFirst({
    where: {
      matchedPlaidTxId: null,
      arrivalDate: { gte: from, lte: to },
      amountCents: { gte: absCents - AMOUNT_FUZZ_CENTS, lte: absCents + AMOUNT_FUZZ_CENTS },
    },
    select: { id: true },
    orderBy: { arrivalDate: 'asc' },
  });
  return row;
}

async function findQbExpenseMatch(
  txnDate: Date,
  absCents: number,
  merchantName: string | null
): Promise<{ qbTransactionId: string; categorySlug: string | null } | null> {
  const from = new Date(txnDate.getTime() - QB_EXPENSE_MATCH_DAYS * ONE_DAY_MS);
  const to = new Date(txnDate.getTime() + QB_EXPENSE_MATCH_DAYS * ONE_DAY_MS);
  // First try: amount + date + vendor name (best match)
  if (merchantName) {
    const byVendor = await prisma.qbExpense.findFirst({
      where: {
        txnDate: { gte: from, lte: to },
        amountCents: {
          gte: absCents - AMOUNT_FUZZ_CENTS,
          lte: absCents + AMOUNT_FUZZ_CENTS,
        },
        vendorName: {
          contains: merchantName.split(' ')[0],
          mode: 'insensitive',
        },
      },
      select: { qbTransactionId: true, categorySlug: true },
      orderBy: { txnDate: 'asc' },
    });
    if (byVendor) return byVendor;
  }
  // Fallback: amount + date only
  const byAmount = await prisma.qbExpense.findFirst({
    where: {
      txnDate: { gte: from, lte: to },
      amountCents: {
        gte: absCents - AMOUNT_FUZZ_CENTS,
        lte: absCents + AMOUNT_FUZZ_CENTS,
      },
    },
    select: { qbTransactionId: true, categorySlug: true },
    orderBy: { txnDate: 'asc' },
  });
  return byAmount;
}

// ---------------------------------------------------------------------------
// Read API for the dashboard
// ---------------------------------------------------------------------------

export interface PlaidReconciliationSummary {
  totalTxns: number;
  reconciledCount: number;
  inflowMatchedCount: number;
  outflowMatchedCount: number;
  unmatchedCount: number;
  unmatchedInflowCents: number;
  unmatchedOutflowCents: number;
}

export interface PlaidReconciliationRow {
  id: string;
  date: string;
  amountCents: number;
  direction: 'inflow' | 'outflow';
  name: string;
  merchantName: string | null;
  reconciled: boolean;
  matchedStripePayoutId: string | null;
  matchedQbExpenseId: string | null;
  qbCategoryAssigned: string | null;
  pfcPrimary: string | null;
  pfcDetailed: string | null;
}

export async function plaidReconciliationSummary(
  days: number
): Promise<{ summary: PlaidReconciliationSummary; rows: PlaidReconciliationRow[] }> {
  const since = new Date(Date.now() - days * ONE_DAY_MS);
  const txns = await prisma.plaidTransaction.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'desc' },
    take: 500,
  });

  let inflowMatchedCount = 0;
  let outflowMatchedCount = 0;
  let unmatchedCount = 0;
  let unmatchedInflowCents = 0;
  let unmatchedOutflowCents = 0;

  const rows: PlaidReconciliationRow[] = txns.map((t) => {
    const amountCents = cents(t.amount);
    const direction: 'inflow' | 'outflow' = amountCents < 0 ? 'inflow' : 'outflow';
    const reconciled = t.reconciledAt !== null;
    if (reconciled) {
      if (direction === 'inflow') inflowMatchedCount++;
      else outflowMatchedCount++;
    } else if (!t.pending) {
      unmatchedCount++;
      if (direction === 'inflow') unmatchedInflowCents += Math.abs(amountCents);
      else unmatchedOutflowCents += amountCents;
    }
    return {
      id: t.id,
      date: t.date.toISOString().slice(0, 10),
      amountCents,
      direction,
      name: t.name,
      merchantName: t.merchantName,
      reconciled,
      matchedStripePayoutId: t.matchedStripePayoutId,
      matchedQbExpenseId: t.matchedQbExpenseId,
      qbCategoryAssigned: t.qbCategoryAssigned,
      pfcPrimary: t.personalFinanceCategoryPrimary,
      pfcDetailed: t.personalFinanceCategoryDetailed,
    };
  });

  return {
    summary: {
      totalTxns: rows.length,
      reconciledCount: inflowMatchedCount + outflowMatchedCount,
      inflowMatchedCount,
      outflowMatchedCount,
      unmatchedCount,
      unmatchedInflowCents,
      unmatchedOutflowCents,
    },
    rows,
  };
}
