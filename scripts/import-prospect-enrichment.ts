/**
 * Import session-produced enrichment dossiers into partner_prospects.
 *
 * Thin CLI wrapper — the safety rules (batch-reject on unknown ids, never
 * write suppressed emails, fill contact fields only when null) live in
 * src/lib/outreach/import-runners.ts and are unit tested there. Input is a
 * JSON array of { id, enrichment } records (EnrichmentImportSchema).
 *
 * Usage (repo root, .env.local sourced):
 *   npx tsx scripts/import-prospect-enrichment.ts <file.json>           # dry run
 *   npx tsx scripts/import-prospect-enrichment.ts <file.json> --apply
 */

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { prisma } from '../src/lib/database/client';
import { runEnrichmentImport } from '../src/lib/outreach/import-runners';
import { EnrichmentImportSchema } from '../src/lib/outreach/schemas';

const APPLY = process.argv.includes('--apply');
const file = process.argv[2];

async function main(): Promise<void> {
  if (!file || file.startsWith('--')) {
    throw new Error('usage: npx tsx scripts/import-prospect-enrichment.ts <file.json> [--apply]');
  }
  const parsed = z.array(EnrichmentImportSchema).safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) {
    console.error(parsed.error.issues.slice(0, 20));
    throw new Error('input failed EnrichmentImportSchema validation — nothing imported');
  }

  const result = await runEnrichmentImport(parsed.data, { apply: APPLY });
  for (const line of result.lines) console.log(line);
  console.log(
    `${APPLY ? 'Imported' : 'Would import'} ${parsed.data.length} dossiers; emails filled: ${result.emailsFilled}, skipped (suppressed): ${result.emailsSkippedSuppressed}.` +
      (APPLY ? '' : ' Re-run with --apply to write.')
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
