/**
 * Partner Outreach 2.0 — import runners for session-produced research data.
 *
 * The logic behind scripts/import-prospect-enrichment.ts and
 * scripts/import-prospect-drafts.ts, kept here so the safety rules are unit
 * tested: unknown ids reject the whole batch, APPROVED drafts are never
 * overwritten, suppressed emails are never written, and dry-run touches
 * nothing. The scripts are thin CLI wrappers (file read + arg parsing).
 */

import { prisma } from '@/lib/database/client';
import { isSuppressed } from '@/lib/followups/suppression';
import { lintDraft, type LintIssue } from './draft-lint';
import type { Draft, Enrichment } from './schemas';

export interface EnrichmentImportRecord {
  id: string;
  enrichment: Enrichment;
}

export interface EnrichmentImportResult {
  lines: string[];
  imported: number;
  emailsFilled: number;
  emailsSkippedSuppressed: number;
}

function assertKnownUniqueIds(ids: string[], known: Set<string>): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error('duplicate prospect ids in input — nothing imported');
  }
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length) {
    throw new Error(`unknown prospect ids: ${unknown.join(', ')} — nothing imported`);
  }
}

/** Import enrichment dossiers. Rejects the whole batch on any unknown id. */
export async function runEnrichmentImport(
  records: EnrichmentImportRecord[],
  opts: { apply: boolean }
): Promise<EnrichmentImportResult> {
  const rows = await prisma.partnerProspect.findMany({
    where: { id: { in: records.map((r) => r.id) } },
    select: { id: true, name: true, email: true, contactName: true, phone: true },
  });
  const rowById = new Map(rows.map((r) => [r.id, r]));
  assertKnownUniqueIds(records.map((r) => r.id), new Set(rowById.keys()));

  const result: EnrichmentImportResult = {
    lines: [],
    imported: 0,
    emailsFilled: 0,
    emailsSkippedSuppressed: 0,
  };
  for (const record of records) {
    const row = rowById.get(record.id)!;
    const contact = {
      ...record.enrichment.contact,
      // Normalize like the PATCH email edit does — one casing everywhere.
      email: record.enrichment.contact.email?.trim().toLowerCase() ?? null,
    };
    let fillEmail = false;
    if (contact.email !== null && row.email === null) {
      if (await isSuppressed(contact.email)) {
        result.emailsSkippedSuppressed++;
      } else {
        fillEmail = true;
        result.emailsFilled++;
      }
    }

    result.lines.push(
      `${opts.apply ? 'IMPORT' : 'DRY'} ${row.name} (${record.id}) — siteAccess=${record.enrichment.siteAccess}, hooks=${record.enrichment.hooks.length}` +
        (fillEmail ? `, email→${contact.email}` : '')
    );
    if (!opts.apply) continue;

    await prisma.partnerProspect.update({
      where: { id: record.id },
      data: {
        enrichment: record.enrichment,
        researchStatus: 'ENRICHED',
        enrichedAt: new Date(),
        researchError: null,
        researchModel: 'claude-code-session',
        ...(fillEmail ? { email: contact.email } : {}),
        ...(contact.contactName !== null && row.contactName === null
          ? { contactName: contact.contactName }
          : {}),
        ...(contact.phone !== null && row.phone === null ? { phone: contact.phone } : {}),
      },
    });
    result.imported++;
  }
  return result;
}

export interface DraftImportResult {
  lines: string[];
  imported: number;
  skippedApproved: number;
  strictRejected: number;
  lintIssues: Record<string, LintIssue[]>;
}

/**
 * Import 3-touch drafts. Rejects the whole batch on any unknown id; skips
 * (never overwrites) APPROVED rows; lints every record — issues are surfaced
 * and, with strict=true, records with lint ERRORS are rejected.
 */
export async function runDraftImport(
  records: Draft[],
  opts: { apply: boolean; strict?: boolean }
): Promise<DraftImportResult> {
  const rows = await prisma.partnerProspect.findMany({
    where: { id: { in: records.map((r) => r.id) } },
    select: { id: true, name: true, draftStatus: true },
  });
  const rowById = new Map(rows.map((r) => [r.id, r]));
  assertKnownUniqueIds(records.map((r) => r.id), new Set(rowById.keys()));

  const result: DraftImportResult = {
    lines: [],
    imported: 0,
    skippedApproved: 0,
    strictRejected: 0,
    lintIssues: {},
  };
  for (const record of records) {
    const row = rowById.get(record.id)!;
    if (row.draftStatus === 'APPROVED') {
      result.lines.push(`SKIP ${row.name} (${record.id}) — draft is APPROVED; un-approve first`);
      result.skippedApproved++;
      continue;
    }

    const issues = lintDraft(record);
    if (issues.length) result.lintIssues[record.id] = issues;
    for (const issue of issues) {
      result.lines.push(`  lint[${issue.severity}] ${row.name}.${issue.field}: ${issue.message}`);
    }
    if (opts.strict && issues.some((i) => i.severity === 'error')) {
      result.lines.push(`STRICT-REJECT ${row.name} (${record.id})`);
      result.strictRejected++;
      continue;
    }

    result.lines.push(
      `${opts.apply ? 'IMPORT' : 'DRY'} ${row.name} (${record.id}) — "${record.subject}" / "${record.altSubject}"`
    );
    if (!opts.apply) continue;

    await prisma.partnerProspect.update({
      where: { id: record.id },
      data: {
        draftStatus: 'DRAFTED',
        draftSubject: record.subject,
        draftAltSubject: record.altSubject,
        draftBody: record.body,
        draftFollowUpBody: record.followUpBody,
        draftTouch3Body: record.touch3Body,
        draftHook: record.hook,
        draftModel: 'claude-code-session',
        draftGeneratedAt: new Date(),
        draftError: null,
        draftRedoGuidance: null,
        // A/B test-arm label (the single draft above is already style-matched
        // to this arm; null clears any prior label on re-import).
        abArm: record.arm ?? null,
        experimentKey: record.experimentKey ?? null,
      },
    });
    result.imported++;
  }
  return result;
}
