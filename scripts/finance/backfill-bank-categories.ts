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
 * (alias `--force`) to also RE-run the categorizer over already-tagged outflows:
 * it clears their bankDerivedCategory first, then re-stamps every unmatched
 * production outflow through the current `categorizeBankOutflow` rules. Use this
 * after a COGS_MERCHANT_RULES change so mis-tagged rows (e.g. a distributor that
 * previously fell into meals/office) self-correct — the null-only sync never
 * revisits them on its own.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/finance/backfill-bank-categories.ts [--dry-run] [--recategorize|--force]
 */

import { prisma } from '../../src/lib/database/client';
import { categorizeBankOutflows } from '../../src/lib/finance/plaid-sync-service';

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

  const mode = recategorize ? ' (RECATEGORIZE — re-stamps ALL outflows)' : '';
  console.log(
    `[backfill-bank-categories] ${items.length} production item(s)${mode}` +
      (dryRun ? ' (dry-run — no writes)' : '')
  );

  let totalCategorized = 0;
  let totalExpenses = 0;
  for (const item of items) {
    const label = item.institutionName ?? item.id.slice(0, 8);

    if (dryRun) {
      // In recategorize mode every unmatched outflow is re-stamped; otherwise
      // only the not-yet-categorized ones.
      const where = recategorize
        ? { plaidItemId: item.id, ...OUTFLOW }
        : { plaidItemId: item.id, ...OUTFLOW, bankDerivedCategory: null };
      const n = await prisma.plaidTransaction.count({ where });
      console.log(
        `  ${label}: ${n} outflow(s) would be ${recategorize ? 're-stamped' : 'stamped'}`
      );
      totalCategorized += n;
      continue;
    }

    // Recategorize: clear the existing tags so the (idempotent, null-only)
    // categorizer revisits every unmatched outflow with the current rules.
    if (recategorize) {
      const { count } = await prisma.plaidTransaction.updateMany({
        where: { plaidItemId: item.id, ...OUTFLOW, bankDerivedCategory: { not: null } },
        data: { bankDerivedCategory: null, isBankDerivedExpense: false },
      });
      console.log(`  ${label}: cleared ${count} existing categor${count === 1 ? 'y' : 'ies'}`);
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
      (dryRun ? (recategorize ? 'to re-stamp' : 'pending') : `categorized (${totalExpenses} expenses)`) +
      (dryRun ? '' : '. Next: re-run scripts/finance/backfill-monthly-rollups.ts')
  );
}

main()
  .catch((err) => {
    console.error('[backfill-bank-categories] FATAL:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
