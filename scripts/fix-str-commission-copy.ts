/**
 * Widen the STR outreach commission claim from drinks-only to drinks + boat.
 *
 * The drafted STR emails pitch the co-branded page as two doors (drinks
 * delivered, or a boat through Premier Party Cruises) but claimed commission on
 * the drink orders only — the deliberately "safest wording" chosen while the
 * boat-side split was unconfirmed. Allan 2026-07-28: partners will earn on boat
 * bookings too; the specifics are just not settled, so the copy should say both
 * without naming a rate.
 *
 * Only touch-1 and touch-2 carry the restrictive phrasing. Touch 3 already says
 * "a commission to you", which is not restricted, and variant-B bodies say
 * "commission on every guest purchase" — both left alone.
 *
 * Idempotent: the patterns only match the old drinks-only wording, so a second
 * run is a no-op. Never touches APPROVED drafts.
 *
 * Usage (repo root, .env.local sourced):
 *   npx tsx scripts/fix-str-commission-copy.ts            # dry run
 *   npx tsx scripts/fix-str-commission-copy.ts --apply
 */

import { prisma } from '../src/lib/database/client';
import { wordCount } from '../src/lib/outreach/draft-lint';

const APPLY = process.argv.includes('--apply');

/**
 * Old drinks-only phrasings → the both-doors equivalent.
 *
 * Kept to +1 word: wordier variants ("commission on both the drinks and the
 * boat bookings") pushed the detailed arm-B bodies past the lint's 110-word
 * warning threshold. Deliberately names no rate — the split is unsettled.
 */
const BOTH_DOORS = 'commission on drinks and boat bookings';
const REWRITES: Array<{ find: RegExp; replace: string }> = [
  // "…and you earn a commission on every drink order."
  { find: /commission on every drink order/gi, replace: BOTH_DOORS },
  // "…and pays you a commission on the drink orders."
  { find: /commission on the drink orders/gi, replace: BOTH_DOORS },
];

/** Lint caps that must still hold after the rewrite (src/lib/outreach/draft-lint.ts). */
const CAPS: Record<string, number> = { draftBody: 120, draftFollowUpBody: 90, draftTouch3Body: 90 };

type Field = 'draftBody' | 'draftFollowUpBody' | 'draftTouch3Body';
const FIELDS: Field[] = ['draftBody', 'draftFollowUpBody', 'draftTouch3Body'];

function rewrite(text: string): string {
  return REWRITES.reduce((acc, r) => acc.replace(r.find, r.replace), text);
}

async function main(): Promise<void> {
  const rows = await prisma.partnerProspect.findMany({
    where: { vertical: 'str', draftStatus: 'DRAFTED' },
    select: {
      id: true, name: true, abArm: true, draftStatus: true,
      draftBody: true, draftFollowUpBody: true, draftTouch3Body: true,
    },
    orderBy: { name: 'asc' },
  });

  let changedRows = 0;
  let changedFields = 0;
  const overCap: string[] = [];

  for (const row of rows) {
    const data: Partial<Record<Field, string>> = {};
    for (const field of FIELDS) {
      const before = row[field];
      if (!before) continue;
      const after = rewrite(before);
      if (after === before) continue;

      const words = wordCount(after);
      if (words > CAPS[field]) {
        overCap.push(`${row.name} ${field}: ${words} words > cap ${CAPS[field]}`);
      }
      data[field] = after;
      changedFields++;
      console.log(
        `  ${row.name} [arm ${row.abArm ?? '-'}] ${field}: ${wordCount(before)} → ${words} words`
      );
    }
    if (Object.keys(data).length === 0) continue;
    changedRows++;
    if (APPLY) {
      // Re-check status inside the write so a draft approved between the read
      // and the write is never overwritten.
      const res = await prisma.partnerProspect.updateMany({
        where: { id: row.id, draftStatus: 'DRAFTED' },
        data,
      });
      if (res.count === 0) console.log(`  SKIPPED ${row.name} — no longer DRAFTED`);
    }
  }

  console.log(
    `\nSTR drafts scanned: ${rows.length} | rows changed: ${changedRows} | fields changed: ${changedFields}`
  );
  if (overCap.length > 0) {
    console.log('\nWORD-CAP BREACHES (fix copy by hand before applying):');
    overCap.forEach((o) => console.log('  ' + o));
    if (APPLY) throw new Error('refusing to apply — rewrite pushed a draft over its lint cap');
  }
  console.log(APPLY ? 'Applied.' : 'Dry run — re-run with --apply to write.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
