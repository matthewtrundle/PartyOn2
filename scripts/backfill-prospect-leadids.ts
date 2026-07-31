/**
 * Backfill PartnerProspect.leadId for rows whose back-link was never
 * written (the enroll route only started persisting it 2026-07-31; before
 * that only the sync POST linked, so a prospect enrolled between syncs —
 * e.g. 512 Retreat, the first live enrollment — sat unlinked and rendered
 * as a bare email in the campaign funnel panel).
 *
 * For each prospect with leadId NULL, resolve the Lead exactly the way the
 * sync/enroll routes do — tag 'partner-prospect' + metadata.websiteKey,
 * newest first — and write the back-link. Nothing else: no lead creation,
 * no CRM mirror, no tag changes (all of that stays the sync POST's job).
 *
 * DRY-RUN BY DEFAULT — prints what it would link. Pass --apply to write.
 * Idempotent: rows already linked are never selected; re-running after
 * apply finds nothing.
 *
 *   npx tsx scripts/backfill-prospect-leadids.ts           # dry run
 *   npx tsx scripts/backfill-prospect-leadids.ts --apply   # write links
 */

import { prisma } from '../src/lib/database/client';
import { TAG_PARTNER_PROSPECT } from '../src/lib/leads/partner-tags';

const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  const unlinked = await prisma.partnerProspect.findMany({
    where: { leadId: null },
    select: { id: true, name: true, vertical: true, websiteKey: true },
    orderBy: { name: 'asc' },
  });
  console.log(
    `${APPLY ? 'APPLY' : 'DRY RUN'} — ${unlinked.length} prospect(s) with no leadId back-link`,
  );

  let linked = 0;
  let noLead = 0;
  for (const p of unlinked) {
    const lead = await prisma.lead.findFirst({
      where: {
        tags: { has: TAG_PARTNER_PROSPECT },
        metadata: { path: ['websiteKey'], equals: p.websiteKey },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!lead) {
      noLead++;
      continue;
    }
    linked++;
    console.log(
      `${APPLY ? 'LINK' : 'would link'} ${p.name} [${p.vertical}] ${p.websiteKey} -> lead ${lead.id}`,
    );
    if (APPLY) {
      await prisma.partnerProspect.update({
        where: { id: p.id },
        data: { leadId: lead.id },
      });
    }
  }

  console.log(
    `${APPLY ? 'Linked' : 'Would link'} ${linked}; ${noLead} have no synced lead yet ` +
      '(expected for never-synced rows — the sync POST creates their leads).',
  );
  if (!APPLY && linked > 0) console.log('Re-run with --apply to write.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
