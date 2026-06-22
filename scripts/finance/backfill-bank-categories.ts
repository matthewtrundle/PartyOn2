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
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/finance/backfill-bank-categories.ts [--dry-run]
 */

import { prisma } from '../../src/lib/database/client';
import { categorizeBankOutflows } from '../../src/lib/finance/plaid-sync-service';

const UNCATEGORIZED_OUTFLOW = {
  pending: false,
  matchedQbExpenseId: null,
  bankDerivedCategory: null,
  amount: { gt: 0 }, // Plaid convention: positive = outflow
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
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

  console.log(
    `[backfill-bank-categories] ${items.length} production item(s)` +
      (dryRun ? ' (dry-run — no writes)' : '')
  );

  let totalCategorized = 0;
  let totalExpenses = 0;
  for (const item of items) {
    const label = item.institutionName ?? item.id.slice(0, 8);

    if (dryRun) {
      const pending = await prisma.plaidTransaction.count({
        where: { plaidItemId: item.id, ...UNCATEGORIZED_OUTFLOW },
      });
      console.log(`  ${label}: ${pending} uncategorized outflow(s) would be stamped`);
      totalCategorized += pending;
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

  console.log(
    `[backfill-bank-categories] done — ${totalCategorized} ` +
      (dryRun ? 'pending' : `categorized (${totalExpenses} expenses)`) +
      (dryRun ? '' : '. Next: re-run scripts/finance/backfill-monthly-rollups.ts')
  );
}

main()
  .catch((err) => {
    console.error('[backfill-bank-categories] FATAL:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
