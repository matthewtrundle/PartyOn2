/**
 * Partner Outreach 2.0 — campaign-funnel aggregation for the workbench's
 * campaign panel (pattern: ab-results.ts — pure, no DB, unit-tested; the
 * route does the queries and hands rows in).
 *
 * UNIT IS THE PROSPECT, keyed by `leadId ?? email` (prospectKey): funnel
 * stages count distinct prospects, not jobs. Reply scoping reuses
 * campaign-status.ts's rule — an inbound only counts at-or-after the key's
 * first send — so the funnel can never disagree with the sync-map chips.
 *
 * SUCCESS cancels (replied / lead-won / already-active-partner) are the
 * campaign WORKING — they count as "ended (good)" in touch stats and are
 * never problem rows. Problems are strictly bounced / failed / suppressed.
 */

import { isCampaignReply, CAMPAIGN_TOTAL_TOUCHES } from './campaign-status';

/** Cancel reasons that mean the campaign succeeded for this prospect. */
export const SUCCESS_CANCEL_REASONS: readonly string[] = [
  'replied',
  'lead-won',
  'already-active-partner',
];

/** Below this many sent prospects, rates are counts, not conclusions. */
export const CAMPAIGN_SAMPLE_FLOOR = 30;

/** Full job row the aggregations work from (route selects exactly this). */
export interface CampaignStatsJob {
  leadId: string | null;
  email: string;
  step: number;
  /** scheduled | processing | sent | canceled | suppressed | failed */
  status: string;
  scheduledFor: Date | null;
  sentAt: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  lastError: string | null;
  emailLogId: string | null;
  updatedAt: Date;
}

/** Narrow EmailLog slice (id-joined via job.emailLogId — never address-keyed). */
export interface CampaignStatsLog {
  id: string;
  openedAt: Date | null;
  bouncedAt: Date | null;
  errorMessage: string | null;
}

export interface CampaignInboundRow {
  leadId: string | null;
  receivedAt: Date;
}

/** Prospect identity for problem/queue rows and drill-through. */
export interface CampaignProspectInfo {
  id: string;
  name: string;
  vertical: string;
  websiteKey: string;
}

export interface CampaignFunnel {
  enrolled: number;
  sent: number;
  opened: number;
  replied: number;
}

export interface CampaignTouchStat {
  step: number;
  sent: number;
  opened: number;
  /** Replies attributed to this touch (approximation — see attributeRepliesToTouches). */
  replies: number;
  /** Canceled for a SUCCESS reason — the campaign ended well here. */
  endedGood: number;
  canceledOther: number;
  failed: number;
  suppressed: number;
  /** Still queued: scheduled + processing. */
  scheduled: number;
}

export interface CampaignProblemRow {
  kind: 'bounced' | 'failed' | 'suppressed';
  step: number;
  email: string;
  reason: string;
  at: Date;
  prospect: CampaignProspectInfo | null;
}

export interface CampaignQueueRow {
  step: number;
  email: string;
  /** scheduled | processing */
  status: string;
  scheduledFor: Date | null;
  prospect: CampaignProspectInfo | null;
}

export interface CampaignOverview {
  funnel: CampaignFunnel;
  touches: CampaignTouchStat[];
  problems: CampaignProblemRow[];
  queue: CampaignQueueRow[];
  capToday: { used: number; cap: number };
  flagOn: boolean;
  smallSample: boolean;
  note: string | null;
}

/** The prospect-unit key: lead when linked, email as the legacy fallback. */
export function prospectKey(job: Pick<CampaignStatsJob, 'leadId' | 'email'>): string {
  return job.leadId ?? job.email;
}

/** Earliest sentAt per prospect key (the reply-scoping marker). */
function firstSentAtByKey(jobs: CampaignStatsJob[]): Map<string, Date> {
  const first = new Map<string, Date>();
  for (const job of jobs) {
    if (job.status !== 'sent' || !job.sentAt) continue;
    const key = prospectKey(job);
    const existing = first.get(key);
    if (!existing || job.sentAt < existing) first.set(key, job.sentAt);
  }
  return first;
}

/**
 * First qualifying (at-or-after first send) reply time per prospect key.
 * Inbound rows are lead-keyed, so email-only keys can never gain a reply.
 */
export function firstReplyAtByKey(
  jobs: CampaignStatsJob[],
  inbound: CampaignInboundRow[],
): Map<string, Date> {
  const firstSent = firstSentAtByKey(jobs);
  const firstReply = new Map<string, Date>();
  for (const row of inbound) {
    if (!row.leadId) continue;
    const key = row.leadId;
    if (!isCampaignReply(row.receivedAt, firstSent.get(key))) continue;
    const existing = firstReply.get(key);
    if (!existing || row.receivedAt < existing) firstReply.set(key, row.receivedAt);
  }
  return firstReply;
}

/** Distinct-prospect funnel: enrolled ⊇ sent ⊇ opened, replied ⊆ sent. */
export function computeCampaignFunnel(
  jobs: CampaignStatsJob[],
  logsById: Map<string, CampaignStatsLog>,
  inbound: CampaignInboundRow[],
): CampaignFunnel {
  const enrolled = new Set<string>();
  const sent = new Set<string>();
  const opened = new Set<string>();
  for (const job of jobs) {
    const key = prospectKey(job);
    enrolled.add(key);
    if (job.status === 'sent') {
      sent.add(key);
      const log = job.emailLogId ? logsById.get(job.emailLogId) : undefined;
      if (log?.openedAt) opened.add(key);
    }
  }
  const replied = firstReplyAtByKey(jobs, inbound).size;
  return { enrolled: enrolled.size, sent: sent.size, opened: opened.size, replied };
}

/**
 * Attribute each prospect's FIRST qualifying reply to the last touch sent
 * at-or-before it. An approximation (the reply may answer an earlier touch)
 * — the UI labels it as such.
 */
export function attributeRepliesToTouches(
  jobs: CampaignStatsJob[],
  inbound: CampaignInboundRow[],
): Map<number, number> {
  const firstReply = firstReplyAtByKey(jobs, inbound);
  const byStep = new Map<number, number>();
  for (const [key, replyAt] of firstReply) {
    let step: number | null = null;
    let latest: Date | null = null;
    for (const job of jobs) {
      if (prospectKey(job) !== key || job.status !== 'sent' || !job.sentAt) continue;
      if (job.sentAt <= replyAt && (!latest || job.sentAt > latest)) {
        latest = job.sentAt;
        step = job.step;
      }
    }
    if (step !== null) byStep.set(step, (byStep.get(step) ?? 0) + 1);
  }
  return byStep;
}

/** Per-touch table: always CAMPAIGN_TOTAL_TOUCHES zero-filled rows. */
export function computeTouchStats(
  jobs: CampaignStatsJob[],
  logsById: Map<string, CampaignStatsLog>,
  repliesByStep: Map<number, number>,
): CampaignTouchStat[] {
  const stats: CampaignTouchStat[] = [];
  for (let step = 1; step <= CAMPAIGN_TOTAL_TOUCHES; step++) {
    const rows = jobs.filter((j) => j.step === step);
    const sentRows = rows.filter((j) => j.status === 'sent');
    const canceled = rows.filter((j) => j.status === 'canceled');
    stats.push({
      step,
      sent: sentRows.length,
      opened: sentRows.filter((j) => {
        const log = j.emailLogId ? logsById.get(j.emailLogId) : undefined;
        return log?.openedAt != null;
      }).length,
      replies: repliesByStep.get(step) ?? 0,
      endedGood: canceled.filter(
        (j) => j.cancelReason !== null && SUCCESS_CANCEL_REASONS.includes(j.cancelReason),
      ).length,
      canceledOther: canceled.filter(
        (j) => j.cancelReason === null || !SUCCESS_CANCEL_REASONS.includes(j.cancelReason),
      ).length,
      failed: rows.filter((j) => j.status === 'failed').length,
      suppressed: rows.filter((j) => j.status === 'suppressed').length,
      scheduled: rows.filter((j) => j.status === 'scheduled' || j.status === 'processing').length,
    });
  }
  return stats;
}

/**
 * Delivery problems only — bounced sends, failed jobs, suppressed jobs.
 * Success cancels never appear here. Sorted newest first.
 */
export function buildProblemRows(
  jobs: CampaignStatsJob[],
  logsById: Map<string, CampaignStatsLog>,
  suppressionsByEmail: Map<string, string>,
  prospectsByLeadId: Map<string, CampaignProspectInfo>,
): CampaignProblemRow[] {
  const rows: CampaignProblemRow[] = [];
  for (const job of jobs) {
    const prospect = (job.leadId && prospectsByLeadId.get(job.leadId)) || null;
    const log = job.emailLogId ? logsById.get(job.emailLogId) : undefined;
    if (job.status === 'sent' && log?.bouncedAt) {
      rows.push({
        kind: 'bounced',
        step: job.step,
        email: job.email,
        reason: log.errorMessage ?? 'bounced',
        at: log.bouncedAt,
        prospect,
      });
    } else if (job.status === 'failed') {
      rows.push({
        kind: 'failed',
        step: job.step,
        email: job.email,
        reason: job.lastError ?? 'failed',
        at: job.updatedAt,
        prospect,
      });
    } else if (job.status === 'suppressed') {
      rows.push({
        kind: 'suppressed',
        step: job.step,
        email: job.email,
        reason: suppressionsByEmail.get(job.email) ?? job.cancelReason ?? 'suppressed',
        at: job.canceledAt ?? job.updatedAt,
        prospect,
      });
    }
  }
  return rows.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** What sends next: scheduled/processing jobs, soonest first. */
export function buildQueueRows(
  jobs: CampaignStatsJob[],
  prospectsByLeadId: Map<string, CampaignProspectInfo>,
): CampaignQueueRow[] {
  return jobs
    .filter((j) => j.status === 'scheduled' || j.status === 'processing')
    .map((j) => ({
      step: j.step,
      email: j.email,
      status: j.status,
      scheduledFor: j.scheduledFor,
      prospect: (j.leadId && prospectsByLeadId.get(j.leadId)) || null,
    }))
    .sort((a, b) => {
      const at = a.scheduledFor?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bt = b.scheduledFor?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
}

/** "4/9 · 44%" funnel-rate label; zero denominator renders as an em dash. */
export function rateLabel(count: number, denom: number): string {
  if (denom <= 0) return `${count}/${denom} · —`;
  return `${count}/${denom} · ${Math.round((count / denom) * 100)}%`;
}

/** Honesty note for small samples — never imply conclusions n can't support. */
export function campaignSampleNote(sent: number): { smallSample: boolean; note: string | null } {
  if (sent === 0) {
    return {
      smallSample: true,
      note: 'No sends yet — the funnel fills in once the campaign starts sending.',
    };
  }
  if (sent < CAMPAIGN_SAMPLE_FLOOR) {
    return {
      smallSample: true,
      note: `Directional — n=${sent} prospects sent; rates are counts, not conclusions.`,
    };
  }
  return { smallSample: false, note: null };
}

/** Stitch everything the route fetched into the panel's response shape. */
export function computeCampaignOverview(input: {
  jobs: CampaignStatsJob[];
  logs: CampaignStatsLog[];
  inbound: CampaignInboundRow[];
  suppressionsByEmail: Map<string, string>;
  prospectsByLeadId: Map<string, CampaignProspectInfo>;
  capToday: { used: number; cap: number };
  flagOn: boolean;
}): CampaignOverview {
  const logsById = new Map(input.logs.map((l) => [l.id, l]));
  const funnel = computeCampaignFunnel(input.jobs, logsById, input.inbound);
  const repliesByStep = attributeRepliesToTouches(input.jobs, input.inbound);
  const { smallSample, note } = campaignSampleNote(funnel.sent);
  return {
    funnel,
    touches: computeTouchStats(input.jobs, logsById, repliesByStep),
    problems: buildProblemRows(input.jobs, logsById, input.suppressionsByEmail, input.prospectsByLeadId),
    queue: buildQueueRows(input.jobs, input.prospectsByLeadId),
    capToday: input.capToday,
    flagOn: input.flagOn,
    smallSample,
    note,
  };
}
