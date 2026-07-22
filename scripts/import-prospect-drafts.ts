/**
 * Import session-produced 3-touch drafts into partner_prospects.
 *
 * Thin CLI wrapper — the safety rules (batch-reject on unknown ids, never
 * overwrite APPROVED, lint every record) live in
 * src/lib/outreach/import-runners.ts and are unit tested there. Imports land
 * as DRAFTED — approval is always an explicit operator action. Input is a
 * JSON array of DraftSchema records.
 *
 * Usage (repo root, .env.local sourced):
 *   npx tsx scripts/import-prospect-drafts.ts <file.json>            # dry run
 *   npx tsx scripts/import-prospect-drafts.ts <file.json> --apply
 *   npx tsx scripts/import-prospect-drafts.ts <file.json> --apply --strict
 */

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { prisma } from '../src/lib/database/client';
import { runDraftImport } from '../src/lib/outreach/import-runners';
import { DraftSchema } from '../src/lib/outreach/schemas';

const APPLY = process.argv.includes('--apply');
const STRICT = process.argv.includes('--strict');
const file = process.argv[2];

async function main(): Promise<void> {
  if (!file || file.startsWith('--')) {
    throw new Error('usage: npx tsx scripts/import-prospect-drafts.ts <file.json> [--apply] [--strict]');
  }
  const parsed = z.array(DraftSchema).safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) {
    console.error(parsed.error.issues.slice(0, 20));
    throw new Error('input failed DraftSchema validation — nothing imported');
  }

  const result = await runDraftImport(parsed.data, { apply: APPLY, strict: STRICT });
  for (const line of result.lines) console.log(line);
  const withErrors = Object.values(result.lintIssues).filter((issues) =>
    issues.some((i) => i.severity === 'error')
  ).length;
  console.log(
    `${APPLY ? 'Imported' : 'Would import'} ${APPLY ? result.imported : parsed.data.length - result.skippedApproved - result.strictRejected} drafts; ` +
      `skipped APPROVED: ${result.skippedApproved}; strict-rejected: ${result.strictRejected}; with lint errors: ${withErrors}.` +
      (APPLY ? '' : ' Re-run with --apply to write.')
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
