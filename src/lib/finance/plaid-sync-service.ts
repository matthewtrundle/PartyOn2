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

// ---------------------------------------------------------------------------
// Relink cutover (replace a duplicate Item for the same institution)
// ---------------------------------------------------------------------------

export interface CutoverCoverageInput {
  keep: { minDate: string; maxDate: string; txnCount: number };
  old: { minDate: string; maxDate: string; txnCount: number };
}

/**
 * Guard for the relink cutover: the KEEP item must cover the OLD item's date
 * range before the old one may be deleted. Used when a bank is re-linked as a
 * fresh Item (e.g. to obtain a larger days_requested history window that
 * update mode failed to deliver): the new Item's initial pull only reaches
 * ~90 days, so the cutover must wait until its HISTORICAL_UPDATE backfill has
 * at least reached the old Item's earliest transaction. maxDate gets one day
 * of slack (the old item may have synced this morning; the new one minutes
 * later). Count sanity: keep must have ≥90% of old's rows in the overlap era —
 * a keeper missing whole weeks means Plaid is still backfilling.
 */
export function cutoverCoverageOk(c: CutoverCoverageInput): { ok: boolean; reason: string } {
  if (c.keep.minDate > c.old.minDate) {
    return {
      ok: false,
      reason: `keep item history starts ${c.keep.minDate}, after old item's ${c.old.minDate} — historical backfill not complete yet`,
    };
  }
  const oldMax = new Date(c.old.maxDate);
  oldMax.setUTCDate(oldMax.getUTCDate() - 1);
  if (c.keep.maxDate < oldMax.toISOString().slice(0, 10)) {
    return {
      ok: false,
      reason: `keep item history ends ${c.keep.maxDate}, more than a day before old item's ${c.old.maxDate}`,
    };
  }
  if (c.keep.txnCount < c.old.txnCount * 0.9) {
    return {
      ok: false,
      reason: `keep item has ${c.keep.txnCount} txns vs old item's ${c.old.txnCount} — too few to be a superset`,
    };
  }
  return { ok: true, reason: 'keep item covers the old item' };
}

export interface CutoverResult {
  dryRun: boolean;
  keptId: string;
  removed: Array<{
    id: string;
    institutionName: string | null;
    txnCount: number;
    pendingDeleted: number;
    payoutMatchesReset: number;
    /** Non-null = Plaid /item/remove failed. The DB row is RETAINED with
     * status 'removal_failed' (access token kept) so removal can be retried —
     * only its transactions/accounts/cursor were deleted. */
    plaidRemoveError: string | null;
  }>;
  refused: Array<{ id: string; reason: string }>;
  recategorized: number;
  reconciled: { inflowsMatched: number; outflowsMatched: number } | null;
}

const CUTOVER_CHUNK = 500; // bound in-clause sizes on large histories

/**
 * Retire duplicate production Items for the same institution as `keepId`,
 * keeping only the keeper. For each duplicate the keeper fully COVERS (see
 * cutoverCoverageOk): flip it to 'retiring' FIRST so the daily sync/reconcile
 * cron (status in active/error) stops touching it mid-cutover, then —
 * atomically per item — reset StripePayout matches pointing at its rows and
 * delete its transactions, accounts, and sync cursor. Pending rows are deleted
 * knowingly: the keeper surfaces the same unsettled charges from its own feed.
 * The Item is then removed at Plaid (stops billing); ONLY on success is the DB
 * row deleted — on failure it is kept (status 'removal_failed', access token
 * retained) so removal can be retried rather than orphaning billing at Plaid.
 * Finally the keeper is re-categorized + re-reconciled. Dry-run reports the
 * plan without writing.
 */
export async function cutoverDuplicateItems(
  keepId: string,
  opts: { dryRun?: boolean } = {}
): Promise<CutoverResult> {
  const dryRun = opts.dryRun !== false;
  const keep = await prisma.plaidItem.findUnique({
    where: { id: keepId },
    select: { id: true, environment: true, institutionId: true },
  });
  if (!keep || keep.environment !== 'production') {
    throw new Error('keepId must be an existing PRODUCTION PlaidItem');
  }
  // A null institutionId would match OTHER null-institution items below
  // (Prisma null equality) — potentially an unrelated bank. Refuse outright.
  if (!keep.institutionId) {
    throw new Error(
      'keep item has no institutionId — cannot safely identify duplicates of the same bank; refusing'
    );
  }

  const others = await prisma.plaidItem.findMany({
    where: {
      id: { not: keepId },
      environment: 'production',
      institutionId: keep.institutionId,
    },
    select: { id: true, institutionName: true, accessToken: true },
  });

  const rangeOf = async (itemId: string) => {
    const [min, max, count] = await Promise.all([
      prisma.plaidTransaction.findFirst({ where: { plaidItemId: itemId, pending: false }, orderBy: { date: 'asc' }, select: { date: true } }),
      prisma.plaidTransaction.findFirst({ where: { plaidItemId: itemId, pending: false }, orderBy: { date: 'desc' }, select: { date: true } }),
      prisma.plaidTransaction.count({ where: { plaidItemId: itemId, pending: false } }),
    ]);
    return {
      minDate: min?.date.toISOString().slice(0, 10) ?? '9999-12-31',
      maxDate: max?.date.toISOString().slice(0, 10) ?? '0000-01-01',
      txnCount: count,
    };
  };

  const keepRange = await rangeOf(keepId);
  const result: CutoverResult = {
    dryRun,
    keptId: keepId,
    removed: [],
    refused: [],
    recategorized: 0,
    reconciled: null,
  };

  for (const other of others) {
    const oldRange = await rangeOf(other.id);
    const coverage = cutoverCoverageOk({ keep: keepRange, old: oldRange });
    if (!coverage.ok) {
      result.refused.push({ id: other.id, reason: coverage.reason });
      continue;
    }

    // Payout matches pointing at the old item's transactions must be reset so
    // reconcileItem can re-match them against the keeper's rows.
    const oldTxnIds = (
      await prisma.plaidTransaction.findMany({
        where: { plaidItemId: other.id },
        select: { id: true },
      })
    ).map((t) => t.id);
    const payoutMatches = await prisma.stripePayout.count({
      where: { matchedPlaidTxId: { in: oldTxnIds } },
    });
    const pendingDeleted = await prisma.plaidTransaction.count({
      where: { plaidItemId: other.id, pending: true },
    });

    let plaidRemoveError: string | null = null;
    if (!dryRun) {
      // 1. Take the item out of the cron's reach BEFORE mutating, closing the
      // window where a concurrent sync/reconcile could re-match a payout to a
      // row this function is about to delete.
      await prisma.plaidItem.update({
        where: { id: other.id },
        data: { status: 'retiring' },
      });

      // 2. Atomic per-item cleanup: payout resets (chunked to bound the
      // in-clause) + row deletes in ONE transaction, so a crash can't leave a
      // payout pointing at a deleted transaction.
      const chunkedResets = [];
      for (let i = 0; i < oldTxnIds.length; i += CUTOVER_CHUNK) {
        chunkedResets.push(
          prisma.stripePayout.updateMany({
            where: { matchedPlaidTxId: { in: oldTxnIds.slice(i, i + CUTOVER_CHUNK) } },
            data: { matchedPlaidTxId: null },
          })
        );
      }
      await prisma.$transaction([
        ...chunkedResets,
        prisma.plaidTransaction.deleteMany({ where: { plaidItemId: other.id } }),
        prisma.plaidAccount.deleteMany({ where: { plaidItemId: other.id } }),
        prisma.plaidSyncCursor.deleteMany({ where: { plaidItemId: other.id } }),
      ]);

      // 3. Remove at Plaid; only delete the DB row on success. On failure the
      // row (and its access token) survives as 'removal_failed' for a retry —
      // deleting it would orphan the Item at Plaid with no way to stop billing.
      try {
        const { removeItem } = await import('./plaid-client');
        await removeItem(other.accessToken);
        await prisma.plaidItem.delete({ where: { id: other.id } });
      } catch (err) {
        plaidRemoveError = err instanceof Error ? err.message : String(err);
        await prisma.plaidItem.update({
          where: { id: other.id },
          data: { status: 'removal_failed', lastError: plaidRemoveError },
        });
      }
    }

    result.removed.push({
      id: other.id,
      institutionName: other.institutionName,
      txnCount: oldRange.txnCount,
      pendingDeleted,
      payoutMatchesReset: payoutMatches,
      plaidRemoveError,
    });
  }

  if (!dryRun && result.removed.length > 0) {
    // Re-stamp categories on any keeper rows not yet categorized, then
    // re-match payouts against the keeper's transactions.
    for (;;) {
      const res = await categorizeBankOutflows(keepId);
      result.recategorized += res.categorized;
      if (res.categorized < 1000) break;
    }
    const recon = await reconcileItem(keepId);
    result.reconciled = {
      inflowsMatched: recon.inflowsMatched,
      outflowsMatched: recon.outflowsMatched,
    };
  }

  return result;
}
