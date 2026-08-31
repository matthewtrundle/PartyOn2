/**
 * Backfill `vercel_events.is_datacenter` for rows ingested before the flag
 * existed (or before a ranges refresh), using the same matcher the drain
 * webhook runs at ingest.
 *
 * Dry-run by default — prints what WOULD change and a sample of the IPs it
 * would reclassify. Pass --apply to write.
 *
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/analytics/backfill-datacenter-flag.ts          # dry run
 *   npx tsx scripts/analytics/backfill-datacenter-flag.ts --apply
 *
 * Idempotent: only touches rows WHERE is_datacenter IS NULL, so a re-run after
 * a partial apply picks up where it left off and a completed backfill is a
 * no-op. (To re-score after a ranges refresh, first NULL the column yourself —
 * deliberately manual, since that rewrites history.)
 */

import { prisma } from '../../src/lib/database/client';
import { isDatacenterIp } from '../../src/lib/analytics/datacenter-ip';

const APPLY = process.argv.includes('--apply');
const BATCH = 2_000;

async function main(): Promise<void> {
  let scanned = 0;
  let datacenter = 0;
  let human = 0;
  let updated = 0;
  const sampleHits = new Map<string, number>();

  // Cursor-paginate on id so an --apply run (which shrinks the NULL set as it
  // goes) can't skip rows the way OFFSET pagination would.
  let cursor: string | null = null;
  for (;;) {
    const rows: { id: string; clientIp: string | null }[] = await prisma.vercelEvent.findMany({
      where: { isDatacenter: null },
      select: { id: true, clientIp: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;
    scanned += rows.length;

    const hits: string[] = [];
    const misses: string[] = [];
    for (const row of rows) {
      if (isDatacenterIp(row.clientIp)) {
        hits.push(row.id);
        if (row.clientIp) sampleHits.set(row.clientIp, (sampleHits.get(row.clientIp) ?? 0) + 1);
      } else {
        misses.push(row.id);
      }
    }
    datacenter += hits.length;
    human += misses.length;

    if (APPLY) {
      if (hits.length) {
        const r = await prisma.vercelEvent.updateMany({
          where: { id: { in: hits } },
          data: { isDatacenter: true },
        });
        updated += r.count;
      }
      if (misses.length) {
        const r = await prisma.vercelEvent.updateMany({
          where: { id: { in: misses } },
          data: { isDatacenter: false },
        });
        updated += r.count;
      }
    } else if (scanned >= 50_000) {
      console.log('(dry run capped at 50k rows scanned — the shape is clear by now)');
      break;
    }
  }

  const top = [...sampleHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — scanned ${scanned} unflagged rows`);
  console.log(`  would-be datacenter (→ bot): ${datacenter}`);
  console.log(`  would-be non-datacenter:     ${human}`);
  if (APPLY) console.log(`  rows updated:                ${updated}`);
  if (top.length) {
    console.log('  top datacenter IPs:');
    for (const [ip, n] of top) console.log(`    ${ip}  ×${n}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('backfill failed:', err);
    process.exit(1);
  });
