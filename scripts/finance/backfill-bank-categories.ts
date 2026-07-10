/**
 * Backfill bank-derived expense categories on existing PRODUCTION Plaid outflows
 * (finance data cleanup, B6).
 *
 * Run AFTER Wells Fargo is connected + the sandbox is purged, once the first
 * production sync has populated PlaidTransaction rows. Stamps bankDerivedCategory
 * + isBankDerivedExpense via the exact logic the daily sync uses
 * (`categorizeBankOutflows` — production items only, idempotent). Then re-run
 * scripts/finance/backfill-monthly-rollups.ts so the rollups pick up the
 * bank-sourced expenses and 2026 months flip to reliable.
 *
 * By default this only stamps NOT-YET-categorized outflows (bankDerivedCategory
 * IS NULL) — matching the idempotent daily-sync path. Pass `--recategorize`
 * (alias `--force`) to also RE-run the categorizer over already-tagged outflows.
 * Use this after a rule change (e.g. COGS_MERCHANT_RULES) so mis-tagged rows
 * self-correct — the null-only sync never revisits them on its own.
 *
 * The recategorize pass updates each row IN PLACE (old category → new category)
 * inside a transaction, and logs every change (old → new, count, $). It never
 * clears a row to NULL first, so there is no window where a row is missing from
 * the rollup's expense totals even if the run is interrupted, and the change log
 * is a reversible audit trail of exactly what moved.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/finance/backfill-bank-categories.ts [--dry-run] [--recategorize|--force]
 */

import { prisma } from '../../src/lib/database/client';
import { categorizeBankOutflows } from '../../src/lib/finance/plaid-sync-service';
import {
  categorizeBankOutflow,
  isBankExpenseCategory,
} from '../../src/lib/finance/plaid-category-map';

// Unmatched production outflows the categorizer will process (mirrors the
// WHERE clause in categorizeBankOutflows, minus the bankDerivedCategory gate).
const OUTFLOW: {
  pending: false;
  matchedQbExpenseId: null;
  amount: { gt: number };
} = {
  pending: false,
  matchedQbExpenseId: null,
  amount: { gt: 0 }, // Plaid convention: positive = outflow
};

const TX_CHUNK = 500; // cap per-transaction update count on large accounts

/**
 * Recompute every unmatched production outflow for one item through the current
 * `categorizeBankOutflow` rules and update the changed rows in place. Returns a
 * change log keyed `oldCat->newCat` → { count, cents }. Read-only when dryRun.
 */
async function recategorizeItem(
  itemId: string,
  dryRun: boolean
): Promise<{ scanned: number; changed: number; log: Map<string, { count: number; cents: number }> }> {
  const rows = await prisma.plaidTransaction.findMany({
    where: { plaidItemId: itemId, ...OUTFLOW },
    select: {
      id: true,
      name: true,
      merchantName: true,
      amount: true,
      bankDerivedCategory: true,
      isBankDerivedExpense: true,
      personalFinanceCategoryPrimary: true,
      personalFinanceCategoryDetailed: true,
    },
  });

  const log = new Map<string, { count: number; cents: number }>();
  const updates: ReturnType<typeof prisma.plaidTransaction.update>[] = [];
  for (const r of rows) {
    const newCat = categorizeBankOutflow({
      name: r.name,
      merchantName: r.merchantName,
      personalFinanceCategoryPrimary: r.personalFinanceCategoryPrimary,
      personalFinanceCategoryDetailed: r.personalFinanceCategoryDetailed,
    });
    const newIsExp = isBankExpenseCategory(newCat);
    if (r.bankDerivedCategory === newCat && r.isBankDerivedExpense === newIsExp) continue;

    const key = `${r.bankDerivedCategory ?? 'null'}->${newCat}`;
    const entry = log.get(key) ?? { count: 0, cents: 0 };
    entry.count += 1;
    entry.cents += Math.round(Number(r.amount) * 100);
    log.set(key, entry);

    if (!dryRun) {
      updates.push(
        prisma.plaidTransaction.update({
          where: { id: r.id },
          data: { bankDerivedCategory: newCat, isBankDerivedExpense: newIsExp },
        })
      );
    }
  }

  // Apply in bounded transactions — each row moves old→new atomically, so an
  // interrupted run never leaves a row uncategorized.
  for (let i = 0; i < updates.length; i += TX_CHUNK) {
    await prisma.$transaction(updates.slice(i, i + TX_CHUNK));
  }

  const changed = [...log.values()].reduce((s, e) => s + e.count, 0);
  return { scanned: rows.length, changed, log };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const recategorize =
    process.argv.includes('--recategorize') || process.argv.includes('--force');
  const items = await prisma.plaidItem.findMany({
    where: { environment: 'production' },
    select: { id: true, institutionName: true },
  });

  if (items.length === 0) {
    console.log(
      '[backfill-bank-categories] no production PlaidItems — connect Wells Fargo first ' +
        '(docs/CONNECT-PRODUCTION-PLAID.md).'
    );
    return;
  }

  const mode = recategorize ? ' (RECATEGORIZE — in-place recompute of ALL outflows)' : '';
  console.log(
    `[backfill-bank-categories] ${items.length} production item(s)${mode}` +
      (dryRun ? ' (dry-run — no writes)' : '')
  );

  let totalCategorized = 0;
  let totalExpenses = 0;
  for (const item of items) {
    const label = item.institutionName ?? item.id.slice(0, 8);

    // --- Recategorize path: in-place recompute + change log. ---
    if (recategorize) {
      const { scanned, changed, log } = await recategorizeItem(item.id, dryRun);
      console.log(
        `  ${label}: ${scanned} outflow(s) scanned, ${changed} ` +
          `${dryRun ? 'would change' : 'changed'}`
      );
      for (const [move, e] of [...log.entries()].sort((a, b) => b[1].cents - a[1].cents)) {
        console.log(`      ${move}: ${e.count} row(s), $${(e.cents / 100).toFixed(2)}`);
      }
      totalCategorized += changed;
      continue;
    }

    // --- Default path: stamp not-yet-categorized rows only. ---
    if (dryRun) {
      const n = await prisma.plaidTransaction.count({
        where: { plaidItemId: item.id, ...OUTFLOW, bankDerivedCategory: null },
      });
      console.log(`  ${label}: ${n} uncategorized outflow(s) would be stamped`);
      totalCategorized += n;
      continue;
    }

    // categorizeBankOutflows handles up to 1000 rows per call — drain the backlog.
    let itemCategorized = 0;
    let itemExpenses = 0;
    for (;;) {
      const res = await categorizeBankOutflows(item.id);
      itemCategorized += res.categorized;
      itemExpenses += res.expenseCount;
      if (res.categorized < 1000) break;
    }
    console.log(`  ${label}: ${itemCategorized} categorized (${itemExpenses} expenses)`);
    totalCategorized += itemCategorized;
    totalExpenses += itemExpenses;
  }

  const tail = recategorize
    ? `${totalCategorized} row(s) ${dryRun ? 'would change' : 'changed'}`
    : dryRun
      ? `${totalCategorized} pending`
      : `${totalCategorized} categorized (${totalExpenses} expenses)`;
  console.log(
    `[backfill-bank-categories] done — ${tail}` +
      (dryRun ? '' : '. Next: re-run scripts/finance/backfill-monthly-rollups.ts')
  );
}

main()
  .catch((err) => {
    console.error('[backfill-bank-categories] FATAL:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
