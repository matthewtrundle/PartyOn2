/**
 * Import discovery-session candidates into partner_prospects.
 *
 * Input: JSON array of DiscoveryCandidateSchema records from a
 * "discover <city> <vertical>" session. Dedupe rules live in
 * src/lib/outreach/discovery.ts (unit tested): existing website_key (exact +
 * bare host), suppressed emails, signed Affiliates, existing partner-prospect
 * Leads — every skip is reported with its reason. Inserts land as
 * source 'discovery', research PENDING. Writes ONLY to partner_prospects.
 *
 * Usage (repo root, .env.local sourced):
 *   npx tsx scripts/import-discovered-prospects.ts <file.json> --vertical str [--city Austin] [--query "seed query"]        # dry run
 *   npx tsx scripts/import-discovered-prospects.ts <file.json> --vertical str --apply
 */

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { prisma } from '../src/lib/database/client';
import { TAG_PARTNER_PROSPECT, PARTNER_VERTICAL_TAGS } from '../src/lib/leads/partner-tags';
import {
  classifyCandidate,
  footprintWarning,
  hostOfKey,
  type DedupeContext,
} from '../src/lib/outreach/discovery';
import { DiscoveryCandidateSchema } from '../src/lib/outreach/schemas';

const APPLY = process.argv.includes('--apply');
const file = process.argv[2];

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : null;
}

async function buildContext(): Promise<DedupeContext> {
  const [prospects, affiliates, leads, suppressions] = await Promise.all([
    prisma.partnerProspect.findMany({ select: { websiteKey: true } }),
    prisma.affiliate.findMany({ select: { email: true } }),
    prisma.lead.findMany({
      where: { tags: { has: TAG_PARTNER_PROSPECT }, email: { not: null } },
      select: { email: true },
    }),
    prisma.emailSuppression.findMany({ select: { email: true } }),
  ]);
  return {
    existingWebsiteKeys: new Set(prospects.map((p) => p.websiteKey)),
    existingHosts: new Set(prospects.map((p) => hostOfKey(p.websiteKey))),
    affiliateEmails: new Set(affiliates.map((a) => a.email.toLowerCase())),
    partnerLeadEmails: new Set(leads.map((l) => l.email!.toLowerCase())),
    suppressedEmails: new Set(suppressions.map((s) => s.email.toLowerCase())),
  };
}

async function main(): Promise<void> {
  const vertical = argValue('--vertical');
  const city = argValue('--city') ?? 'Austin';
  const query = argValue('--query');
  if (!file || file.startsWith('--')) {
    throw new Error(
      'usage: npx tsx scripts/import-discovered-prospects.ts <file.json> --vertical <key> [--city Austin] [--query "..."] [--apply]'
    );
  }
  if (!vertical || !(vertical in PARTNER_VERTICAL_TAGS)) {
    throw new Error(`--vertical must be one of: ${Object.keys(PARTNER_VERTICAL_TAGS).join(', ')}`);
  }

  const parsed = z.array(DiscoveryCandidateSchema).safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) {
    console.error(parsed.error.issues.slice(0, 20));
    throw new Error('input failed DiscoveryCandidateSchema validation — nothing imported');
  }

  const ctx = await buildContext();
  let imported = 0;
  const skips: Record<string, number> = {};
  const seenThisBatch = new Set<string>();

  for (const candidate of parsed.data) {
    const verdict = classifyCandidate(candidate, ctx);
    const batchDupe = seenThisBatch.has(hostOfKey(verdict.websiteKey));
    const reason = !verdict.ok ? verdict.reason : batchDupe ? 'duplicate-in-batch' : null;
    if (reason) {
      skips[reason] = (skips[reason] ?? 0) + 1;
      console.log(`SKIP ${candidate.name} (${verdict.websiteKey}) — ${reason}`);
      continue;
    }
    seenThisBatch.add(hostOfKey(verdict.websiteKey));

    const warning = footprintWarning(candidate);
    console.log(
      `${APPLY ? 'IMPORT' : 'DRY'} ${candidate.name} → ${verdict.websiteKey}` +
        (candidate.email ? ` (${candidate.email})` : '') +
        (warning ? `  ⚠ ${warning}` : '')
    );
    if (!APPLY) {
      imported++;
      continue;
    }

    await prisma.partnerProspect.create({
      data: {
        vertical,
        city,
        name: candidate.name,
        website: candidate.website,
        websiteKey: verdict.websiteKey,
        propertiesEstimate: candidate.propertiesEstimate ?? null,
        email: candidate.email ?? null,
        phone: candidate.phone ?? null,
        socials: candidate.instagram ? { instagram: candidate.instagram } : {},
        description: candidate.whyFit,
        source: 'discovery',
        discoveredAt: new Date(),
        discoveryQuery: query,
        researchStatus: 'PENDING',
      },
    });
    imported++;
  }

  const skipSummary = Object.entries(skips)
    .map(([r, n]) => `${r}: ${n}`)
    .join(', ');
  console.log(
    `${APPLY ? 'Imported' : 'Would import'} ${imported}/${parsed.data.length} candidates (${vertical}, ${city}).` +
      (skipSummary ? ` Skipped — ${skipSummary}.` : '') +
      (APPLY ? '' : ' Re-run with --apply to write.')
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
