/**
 * Operations recommendation mirror — renders an OperationsRecommendation as
 * Obsidian-shaped markdown (frontmatter + body + Updates log) and commits to
 * GitHub at docs/operations/recommendations/<period>-<slug>.md.
 *
 * Triggered on every status change via the unified [id] endpoints. Fails soft
 * so an unconfigured GITHUB_REPO_TOKEN doesn't block the DB update or the
 * triage queue.
 *
 * Parallels src/lib/analytics/recommendation-mirror.ts. Kept separate rather
 * than abstracted because the two models (OperationsRecommendation vs.
 * RecommendationItem) carry different columns — forcing a shared shape now
 * would leak detail.
 */

import type { OperationsRecommendation } from '@prisma/client';
import { putFileToRepo } from '@/lib/github/put-file';
import { slugifyTitle } from '@/lib/analytics/recommendation-mirror';
import type { ActionLogEntry, OpsSeverity, SignalKind } from './types';

export interface MirrorResult {
  mirrored: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export interface StatusChangeEvent {
  date: string;
  fromStatus: string | null;
  toStatus: string;
  notes?: string;
  actor?: string;
}

function isoWeekFromDate(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function mapDbStatusToObsidian(s: string): string {
  switch (s) {
    case 'open': return 'proposed';
    case 'approved': return 'accepted';
    case 'shipped': return 'executed';
    case 'rejected': return 'dismissed';
    case 'invalidated': return 'superseded';
    case 'snoozed': return 'snoozed';
    default: return s;
  }
}

function severityFrom(value: string): OpsSeverity {
  return value === 'urgent' || value === 'high' ? value : 'normal';
}

interface EvidenceRow {
  metricName?: string;
  metricValue?: string | number;
  note?: string;
  sourceLinks?: Array<{ label: string; href: string }>;
}

function evidenceLines(rec: OperationsRecommendation): string[] {
  const evidence = Array.isArray(rec.evidence) ? (rec.evidence as unknown as EvidenceRow[]) : [];
  const lines: string[] = [];
  for (const row of evidence) {
    if (row?.note) lines.push(`- ${row.note}`);
    if (row?.metricName && row.metricValue !== undefined && row.metricValue !== null) {
      lines.push(`- **${row.metricName}**: ${row.metricValue}`);
    }
    if (row?.sourceLinks) {
      for (const link of row.sourceLinks) {
        lines.push(`  - [${link.label}](${link.href})`);
      }
    }
  }
  return lines;
}

function actionLogLines(rec: OperationsRecommendation): string[] {
  const log = Array.isArray(rec.actionLog) ? (rec.actionLog as unknown as ActionLogEntry[]) : [];
  if (log.length === 0) return [];
  const lines: string[] = ['', '## Action log', ''];
  for (const entry of log) {
    const ts = entry.timestamp?.slice(0, 19).replace('T', ' ') ?? '?';
    const err = entry.errorMessage ? ` — ${entry.errorMessage}` : '';
    lines.push(`- ${ts} · \`${entry.actionKind ?? '?'}\` · ${entry.result} · ${entry.actionLabel}${err}`);
  }
  return lines;
}

/**
 * Render the operations recommendation as the canonical markdown doc, with
 * a synthesized creation entry + optionally a new status-change entry.
 */
export function renderOperationsRecommendationMarkdown(
  rec: OperationsRecommendation,
  newEvent?: StatusChangeEvent
): string {
  const slug = slugifyTitle(rec.title);
  const period = isoWeekFromDate(rec.createdAt);
  const severity = severityFrom(rec.severity);
  const dateAccepted = rec.status === 'approved' || rec.status === 'shipped' ? rec.createdAt : null;
  const dateExecuted = rec.status === 'shipped' ? rec.shippedAt : null;

  const fm: Array<[string, string | number | null]> = [
    ['title', JSON.stringify(rec.title)],
    ['period_proposed', period],
    ['date_proposed', rec.createdAt.toISOString().slice(0, 10)],
    ['date_accepted', dateAccepted ? dateAccepted.toISOString().slice(0, 10) : 'null'],
    ['date_executed', dateExecuted ? dateExecuted.toISOString().slice(0, 10) : 'null'],
    ['date_measured', rec.measuredAt ? rec.measuredAt.toISOString().slice(0, 10) : 'null'],
    ['status', mapDbStatusToObsidian(rec.status)],
    ['severity', severity],
    ['signal_kind', rec.signalKind as SignalKind],
    ['target_entity_type', rec.targetEntityType],
    ['target_entity_id', rec.targetEntityId],
    ['source', rec.source],
    ['related_briefing', period],
    ['db_id', rec.id],
    ['dedupe_key', rec.dedupeKey],
    ['tags', '[recommendation, operations]'],
  ];

  const fmBlock = fm.map(([k, v]) => `${k}: ${v}`).join('\n');

  const evidence = evidenceLines(rec);
  const evidenceBlock = evidence.length ? evidence.join('\n') : '_(no evidence recorded)_';

  const dismissReason = (rec.dismissReason ?? '').trim();
  const reasonBlock = dismissReason ? `\n## Dismiss reason\n\n${dismissReason}\n` : '';

  // Updates log: synthesize creation + (if provided) the new event.
  const updates: string[] = [];
  updates.push(
    `- ${rec.createdAt.toISOString().slice(0, 10)} — Created with status \`${mapDbStatusToObsidian(rec.status)}\` (severity \`${severity}\`) from \`${rec.source}\`.`
  );
  if (newEvent) {
    const noteSuffix = newEvent.notes ? ` Notes: ${newEvent.notes}` : '';
    const actor = newEvent.actor ?? 'operator';
    const transition = newEvent.fromStatus
      ? `${newEvent.fromStatus} → ${newEvent.toStatus}`
      : `set to ${newEvent.toStatus}`;
    updates.push(`- ${newEvent.date} — Status ${transition} (${actor}).${noteSuffix}`);
  }

  const actionLog = actionLogLines(rec).join('\n');

  return `---
${fmBlock}
---

# ${rec.title}

## Signal

\`${rec.signalKind}\` · severity \`${severity}\` · target \`${rec.targetEntityType}:${rec.targetEntityId}\`

## Evidence

${evidenceBlock}
${reasonBlock}
## Updates

${updates.join('\n')}
${actionLog}

---
_Mirror file. Edited automatically by the triage queue when status changes. Source of truth is the database (id: \`${rec.id}\`, dedupe key: \`${rec.dedupeKey}\`). Slug: \`${slug}\`._
`;
}

/**
 * Commit the operations rec mirror to GitHub. Path:
 *   docs/operations/recommendations/<period>-<slug>.md
 *
 * Returns soft-fail result; never throws.
 */
export async function mirrorOperationsRecommendation(
  rec: OperationsRecommendation,
  event?: StatusChangeEvent
): Promise<MirrorResult> {
  try {
    const slug = slugifyTitle(rec.title);
    const period = isoWeekFromDate(rec.createdAt);
    const path = `docs/operations/recommendations/${period}-${slug}.md`;
    const message = event
      ? `chore(operations): rec "${rec.title.slice(0, 50)}" → ${event.toStatus}`
      : `chore(operations): mirror rec "${rec.title.slice(0, 50)}"`;
    const content = renderOperationsRecommendationMarkdown(rec, event);
    const result = await putFileToRepo({ path, content, message });
    return {
      mirrored: result.committed,
      path,
      url: result.htmlUrl,
      error: result.error,
    };
  } catch (err) {
    return { mirrored: false, error: err instanceof Error ? err.message : String(err) };
  }
}
