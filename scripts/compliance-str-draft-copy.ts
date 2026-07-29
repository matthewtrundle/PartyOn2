/**
 * Compliance pass 2026-07-29 — flat-bounty the ALCOHOL side of the STR drafts.
 *
 * The 10 current-gen STR drafts promise "revenue share on the drink orders"
 * (or "on the drinks") plus "a commission on every booked boat" in all three
 * touches. Percentage-of-alcohol-sales comp to a new unlicensed party is the
 * construction the legal posture forbids (flat banded bounties only), so the
 * drink-side phrase becomes "a flat per-order bounty …". The BOAT-side
 * commission claims are left exactly as they are — boat bookings are not
 * alcohol, so a commission may still be named (this preserves Allan's
 * 2026-07-28 "partners earn on both doors" decision from PR #327 while
 * fixing the alcohol-side wording).
 *
 * Modeled on scripts/fix-str-commission-copy.ts (PR #327): idempotent — the
 * patterns only match the old wording, so a second run is a no-op. Never
 * touches APPROVED drafts (status re-checked inside the write). Refuses to
 * apply if a rewrite would push any field past its lint word cap.
 *
 * Usage (repo root, .env.local sourced):
 *   npx tsx scripts/compliance-str-draft-copy.ts            # dry run
 *   npx tsx scripts/compliance-str-draft-copy.ts --apply
 */

import { prisma } from '../src/lib/database/client';
import { wordCount } from '../src/lib/outreach/draft-lint';

const APPLY = process.argv.includes('--apply');

/**
 * Drink-side comp phrasings → the flat-bounty equivalent. Optional leading
 * article absorbed so "a revenue share …" never becomes "a a flat …".
 * Boat-side phrases ("a commission on every booked boat" / "on every boat
 * booked") are deliberately NOT matched.
 */
const REWRITES: Array<{ find: RegExp; replace: string }> = [
  {
    find: /(?:a )?revenue share on the drink orders/gi,
    replace: 'a flat per-order bounty on the drink orders',
  },
  {
    find: /(?:a )?revenue share on the drinks/gi,
    replace: 'a flat per-order bounty on the drinks',
  },
  // Safety nets for earlier phrasings, in case any row still carries them.
  {
    find: /(?:a )?commission on drinks and boat bookings/gi,
    replace: 'a flat per-order bounty on drinks and a commission on boat bookings',
  },
  {
    find: /(?:a )?commission on every drink order/gi,
    replace: 'a flat per-order bounty on the drink orders',
  },
  {
    find: /(?:a )?commission on the drink orders/gi,
    replace: 'a flat per-order bounty on the drink orders',
  },
];

/** Stay warning-free: lint warns >110 body words and errors >90 on follow-ups. */
const CAPS: Record<string, number> = { draftBody: 110, draftFollowUpBody: 90, draftTouch3Body: 90 };

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
