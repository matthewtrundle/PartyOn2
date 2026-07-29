/**
 * Compliance pass 2026-07-29 — send the 23 legacy bartender drafts back for
 * redraft so they cannot be approved as-is.
 *
 * The legacy-manual bartender drafts (~200-250 words) promise "commission on
 * every order" — a comp promise the legal posture forbids for new partners —
 * and fail the 2.0 draft lint by design. Lint errors do NOT block approval
 * (the operator can approve-with-errors behind a confirm), so this applies
 * the system's own redraft-needed state: draftStatus 'NONE' plus
 * draftRedoGuidance, exactly what the workbench's request-redraft action
 * does. Approval is impossible from NONE ("not-approvable-from-none"), the
 * stale copy stays on the row for reference, and the next drafting session
 * picks these up first with the guidance applied (buildDraftPrompt).
 *
 * Scope: vertical='bartender' AND draftModel='legacy-manual' AND
 * draftStatus='DRAFTED'. The 10 current-gen bartender drafts
 * (model=claude-code-session, comp-free) and Lynn's Lodging's legacy STR
 * draft (existing ACTIVE partner) are untouched.
 *
 * Idempotent: a second run matches zero rows (status is no longer DRAFTED).
 *
 * Usage (repo root, .env.local sourced):
 *   npx tsx scripts/compliance-legacy-draft-redraft.ts            # dry run
 *   npx tsx scripts/compliance-legacy-draft-redraft.ts --apply
 */

import { prisma } from '../src/lib/database/client';

const APPLY = process.argv.includes('--apply');

const GUIDANCE =
  'Compliance pass 2026-07-29: this legacy draft promises a commission on orders — comp ' +
  'promises to new partners are not allowed (a flat per-order bounty is the only sanctioned ' +
  'comp mention, and the current bartender offer is reliability-first with zero comp ' +
  'language). It also fails the 2.0 lint (~200+ words). Redraft from the current bartender ' +
  'offer block before any approval.';

async function main(): Promise<void> {
  const rows = await prisma.partnerProspect.findMany({
    where: { vertical: 'bartender', draftModel: 'legacy-manual', draftStatus: 'DRAFTED' },
    select: { id: true, name: true, draftStatus: true, draftRedoGuidance: true },
    orderBy: { name: 'asc' },
  });

  console.log(`Legacy bartender drafts still DRAFTED: ${rows.length}`);
  rows.forEach((r) => console.log(`  ${r.name}`));

  let changed = 0;
  if (APPLY) {
    for (const row of rows) {
      // Mirror the workbench request-redraft action; re-check status inside
      // the write so a row approved between read and write is never moved.
      const res = await prisma.partnerProspect.updateMany({
        where: { id: row.id, draftStatus: 'DRAFTED', draftModel: 'legacy-manual' },
        data: {
          draftStatus: 'NONE',
          draftRedoGuidance: GUIDANCE,
          draftApprovedAt: null,
          draftApprovedBy: null,
        },
      });
      if (res.count === 0) {
        console.log(`  SKIPPED ${row.name} — no longer a DRAFTED legacy draft`);
      } else {
        changed++;
      }
    }
  }

  console.log(
    APPLY
      ? `Applied — ${changed} drafts moved to NONE + redo guidance.`
      : 'Dry run — re-run with --apply to write.'
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
