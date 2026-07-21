/**
 * Read-only verification for the Wells Fargo statement backfill
 * (scripts/finance/import-wf-statements.ts). Run after --apply + a rollup
 * rebuild to confirm the newly-covered months look right and the 2024-07 Plaid
 * seam has no duplicate rows. Writes nothing.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/finance/verify-wf-backfill.ts
 */

import { prisma } from '../../src/lib/database/client';
import { earliestDataMonth } from '../../src/lib/finance/monthly-rollup';

const STMT_ITEM_ID = 'wf-statements-import';
const money = (c: number | bigint | null) =>
  c === null ? 'null' : `$${(Number(c) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

async function main(): Promise<void> {
  const floor = await earliestDataMonth();
  console.log(`earliestDataMonth(): ${floor.year}-${String(floor.month).padStart(2, '0')} ` +
    `(rollups already compute from here — no floor change needed for the Jan-2024 statement data)`);

  // --- Statement-import provenance item ------------------------------------
  const stmtItem = await prisma.plaidItem.findUnique({ where: { itemId: STMT_ITEM_ID }, select: { id: true, institutionName: true, environment: true, status: true } });
  if (!stmtItem) {
    console.log('\nNo statement-import item yet — run import-wf-statements.ts --apply first.');
    await prisma.$disconnect();
    return;
  }
  const stmtTxns = await prisma.plaidTransaction.findMany({
    where: { plaidItemId: stmtItem.id }, select: { date: true }, orderBy: { date: 'asc' },
  });
  const perMonth = new Map<string, number>();
  for (const t of stmtTxns) {
    const k = t.date.toISOString().slice(0, 7);
    perMonth.set(k, (perMonth.get(k) ?? 0) + 1);
  }
  console.log(`\nStatement item: "${stmtItem.institutionName}" env=${stmtItem.environment} status=${stmtItem.status}`);
  console.log(`  ${stmtTxns.length} rows, ${stmtTxns[0]?.date.toISOString().slice(0, 10)} → ${stmtTxns.at(-1)?.date.toISOString().slice(0, 10)}`);
  console.log('  per-month: ' + [...perMonth].map(([k, n]) => `${k}:${n}`).join('  '));

  // --- Seam integrity (no double-count with the live Plaid item) -----------
  const liveItems = await prisma.plaidItem.findMany({
    where: { environment: 'production', itemId: { not: STMT_ITEM_ID } }, select: { id: true },
  });
  const liveIds = liveItems.map((i) => i.id);
  const seamRow = await prisma.plaidTransaction.findFirst({
    where: { plaidItemId: { in: liveIds }, pending: false }, orderBy: { date: 'asc' }, select: { date: true },
  });
  const seam = seamRow!.date;
  const seamISO = seam.toISOString().slice(0, 10);
  // (1) statement rows that leaked on/after the seam — non-tautological (would be
  // >0 if the import filter regressed).
  const stmtAfterSeam = await prisma.plaidTransaction.count({ where: { plaidItemId: stmtItem.id, date: { gte: seam } } });
  // (2) date+amount collisions across the two items ANYWHERE they could overlap:
  // live rows within the statement item's date range (≤ its latest row). A "live
  // rows < seam" query would be empty by construction (seam IS the live min), so
  // instead scope to the statement range, where a real overlap would actually show.
  const stmtMaxRow = await prisma.plaidTransaction.findFirst({ where: { plaidItemId: stmtItem.id }, orderBy: { date: 'desc' }, select: { date: true } });
  const stmtMax = stmtMaxRow?.date ?? seam;
  const [stmtRows, liveInRange] = await Promise.all([
    prisma.plaidTransaction.findMany({ where: { plaidItemId: stmtItem.id }, select: { date: true, amount: true } }),
    prisma.plaidTransaction.findMany({ where: { plaidItemId: { in: liveIds }, date: { lte: stmtMax }, pending: false }, select: { date: true, amount: true } }),
  ]);
  const liveKeys = new Set(liveInRange.map((l) => `${l.date.toISOString().slice(0, 10)}|${Math.round(Number(l.amount) * 100)}`));
  const collisions = stmtRows.filter((s) => liveKeys.has(`${s.date.toISOString().slice(0, 10)}|${Math.round(Number(s.amount) * 100)}`)).length;
  const seamOk = stmtAfterSeam === 0 && liveInRange.length === 0 && collisions === 0;
  console.log(`\nSeam ${seamISO} (statement latest ${stmtMax.toISOString().slice(0, 10)}): statement rows on/after seam=${stmtAfterSeam} (want 0), ` +
    `live rows within statement range=${liveInRange.length} (want 0), date+amount collisions=${collisions} (want 0)  ${seamOk ? '✓ CLEAN' : '⚠️  REVIEW'}`);

  // --- Newly-covered months' rollups (Jan 2023 → the Plaid seam month) -------
  const rollups = await prisma.financeMonthlyRollup.findMany({
    where: { OR: [{ year: 2023 }, { year: 2024, month: { lte: 7 } }] },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
    select: { year: true, month: true, revenueCents: true, cogsCents: true, netIncomeCents: true, dataHealth: true },
  });
  console.log('\n=== 2023-01 → 2024-07 rollups (the statement-enriched months) ===');
  console.log('month     revenue    COGS       net        reliable  src   ownerCap   loanProc   otherInc   reconciled');
  for (const r of rollups) {
    const h = (r.dataHealth ?? {}) as Record<string, unknown>;
    console.log(
      `${r.year}-${String(r.month).padStart(2, '0')}  ${money(r.revenueCents).padStart(9)}  ${money(r.cogsCents).padStart(9)}  ` +
      `${money(r.netIncomeCents).padStart(9)}  ${String(h.netIncomeReliable).padStart(7)}  ${String(h.expenseSource ?? '-').padStart(4)}  ` +
      `${money((h.ownerCapitalCents as number) ?? null).padStart(9)}  ${money((h.loanProceedsCents as number) ?? null).padStart(9)}  ` +
      `${money((h.otherIncomeCents as number) ?? null).padStart(9)}  ${String(h.incomeReconciled)}`
    );
  }
  console.log('\nNote: these months are QB-sourced (2024 QB ≈ $342K), so net income stays QB-based and remains');
  console.log('unreliable under the Shopify net-of-refund caveat. The statement import adds the DEPOSIT/');
  console.log('financing picture (owner capital, PeopleFund loan proceeds) + a QB-completeness cross-check.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[verify-wf-backfill] FATAL:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
  return prisma.$disconnect();
});
