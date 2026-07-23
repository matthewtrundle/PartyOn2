/**
 * Restore Brian's original enrichment-based personalized outreach emails as
 * VARIANT B (draft_b_*) on partner_prospects — without touching variant A
 * (the Hormozi 3-touch draft columns the send path reads).
 *
 * Source of truth: the legacy prospect JSONs, exactly as authored:
 *   - src/data/str-partner-prospects.json        (enrichment.outreachEmail)
 *   - src/data/bartending-partner-prospects.json (enrichment.outreachEmail)
 *
 * The body goes through the SAME stripLegacySignature() the original seed
 * used (the send renderer appends Brian's signature itself), so a future
 * variant-B send would not double-sign. Rows are matched by websiteKey —
 * identical to how seed-partner-prospects.ts keyed them.
 *
 * Idempotent: re-running rewrites draft_b_* from the JSON (the JSON is the
 * canonical original), and never touches rows with no legacy email.
 *
 * Usage (repo root, .env.local sourced for DATABASE_URL):
 *   npx tsx scripts/restore-legacy-draft-b.ts           # dry run (default)
 *   npx tsx scripts/restore-legacy-draft-b.ts --apply   # write draft_b_*
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../src/lib/database/client';
import { websiteKey } from '../src/lib/partners/prospect-store';

/**
 * Same logic as seed-partner-prospects.ts (which can't be imported — it
 * executes its seed on import): strip the trailing inline Brian signature;
 * the send renderer appends the signature itself.
 */
function stripLegacySignature(body: string): string {
  const sigStart = body.lastIndexOf('Brian Hill\nFounder, Party On Delivery');
  if (sigStart === -1) return body.trim();
  let head = body.slice(0, sigStart).trimEnd();
  head = head.replace(/\n(Cheers|Best|Thanks|Talk soon|Cheers!)[,!]?$/i, '').trimEnd();
  return head;
}

const APPLY = process.argv.includes('--apply');
const ROOT = join(__dirname, '..');

interface LegacyProspect {
  name: string;
  website: string;
  enrichment?: {
    outreachEmail?: { subject: string; body: string };
  } | null;
}

function legacyEmails(file: string): Array<{ name: string; key: string; subject: string; body: string }> {
  const rows = JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as LegacyProspect[];
  return rows
    .filter((p) => p.enrichment?.outreachEmail?.subject && p.enrichment?.outreachEmail?.body)
    .map((p) => ({
      name: p.name,
      key: websiteKey(p.website),
      subject: p.enrichment!.outreachEmail!.subject,
      body: stripLegacySignature(p.enrichment!.outreachEmail!.body),
    }));
}

async function main(): Promise<void> {
  const originals = [
    ...legacyEmails('src/data/str-partner-prospects.json'),
    ...legacyEmails('src/data/bartending-partner-prospects.json'),
  ];
  console.log(`${originals.length} legacy personalized emails found in the JSONs`);

  let updated = 0;
  let unchanged = 0;
  const missing: string[] = [];

  for (const o of originals) {
    const row = await prisma.partnerProspect.findUnique({
      where: { websiteKey: o.key },
      select: { id: true, name: true, draftBSubject: true, draftBBody: true, draftModel: true },
    });
    if (!row) {
      missing.push(`${o.name} (${o.key})`);
      continue;
    }
    const already = row.draftBSubject === o.subject && row.draftBBody === o.body;
    if (already) {
      unchanged++;
      continue;
    }
    console.log(
      `${APPLY ? 'RESTORE' : 'would restore'}: ${row.name}` +
        ` [current A model: ${row.draftModel ?? 'none'}]` +
        ` — B subject: "${o.subject.slice(0, 60)}"`
    );
    if (APPLY) {
      await prisma.partnerProspect.update({
        where: { id: row.id },
        data: {
          draftBSubject: o.subject,
          draftBBody: o.body,
          draftBSource: 'legacy-manual-json',
        },
      });
    }
    updated++;
  }

  console.log(
    `\n${APPLY ? 'Restored' : 'Would restore'}: ${updated} · already current: ${unchanged} · no matching prospect row: ${missing.length}`
  );
  for (const m of missing) console.log(`  MISSING: ${m}`);
  if (!APPLY) console.log('\nDry run — re-run with --apply to write.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
