/**
 * One-shot backfill of finance_monthly_rollup for the full history
 * (Finance Director Phase 5C).
 *
 * Computes + persists one row per month from the earliest order on record
 * through the current month. Idempotent — re-running recomputes in place.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/finance/backfill-monthly-rollups.ts
 */

import {
  computeMonthlyRollup,
  persistMonthlyRollup,
  enumerateMonths,
  earliestDataMonth,
} from '../../src/lib/finance/monthly-rollup';
import { prisma } from '../../src/lib/database/client';

async function main(): Promise<void> {
  const start = await earliestDataMonth();
  const now = new Date();
  const end = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const months = enumerateMonths(start, end);
  console.log(
    `[backfill-monthly-rollups] ${months.length} months from ` +
      `${start.year}-${String(start.month).padStart(2, '0')} to ` +
      `${end.year}-${String(end.month).padStart(2, '0')}`
  );

  let ok = 0;
  for (const { year, month } of months) {
    try {
      const result = await computeMonthlyRollup(year, month);
      await persistMonthlyRollup(result);
      ok += 1;
      const rev = (result.revenueCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
      console.log(`  ${year}-${String(month).padStart(2, '0')}: $${rev} (${result.orderCount} orders)`);
    } catch (err) {
      console.error(`  ${year}-${String(month).padStart(2, '0')} FAILED:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[backfill-monthly-rollups] done — ${ok}/${months.length} months persisted`);
}

main()
  .catch((err) => {
    console.error('[backfill-monthly-rollups] FATAL:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
