/**
 * Partner Outreach 2.0 — campaign-state derivation, shared by every place
 * that answers "where is this prospect in the campaign?" (sync GET's
 * campaign map, the metrics strip, A/B results, the drawer touch timeline).
 *
 * Pure module (no prisma imports) so the reply-scoping rule is unit-tested
 * once and cannot drift between read sites.
 *
 * THE REPLY RULE: an inbound email only counts as a campaign reply when it
 * arrived at-or-after the lead's FIRST campaign send. Partner prospects are
 * local businesses that may have emailed info@ years ago — that history must
 * not paint a never-contacted prospect as REPLIED. The one deliberate
 * exception is the journey's own shouldCancel (src/lib/followups/journeys.ts),
 * which treats ANY inbound as "a human owns this thread" — that is a
 * send-safety guard where over-canceling is the safe direction.
 */

/** The three campaign touches (day 0 / +5d / +12d). */
export const CAMPAIGN_TOTAL_TOUCHES = 3;

/** Minimal job row every helper here works from. */
export interface CampaignJobLike {
  leadId: string | null;
  /** scheduled | processing | sent | canceled | suppressed | failed */
  status: string;
  sentAt: Date | null;
}

/** Job row for the touch timeline — the fields the drawer renders. */
export interface CampaignTouchJob extends CampaignJobLike {
  step: number;
  scheduledFor: Date | null;
  cancelReason: string | null;
  lastError: string | null;
  emailLogId: string | null;
}

/** Narrow EmailLog slice joined onto a touch (never `to`, never metadata). */
export interface CampaignTouchEmail {
  status: string;
  openedAt: Date | null;
  bouncedAt: Date | null;
  errorMessage: string | null;
}

/** One row of the 3-touch timeline. `status: 'pending'` = job not created yet. */
export interface CampaignTouch {
  step: number;
  /** Job status, or 'pending' when the engine hasn't enqueued this step yet. */
  status: string;
  scheduledFor: Date | null;
  sentAt: Date | null;
  cancelReason: string | null;
  lastError: string | null;
  email: CampaignTouchEmail | null;
}

export type CampaignState = 'none' | 'enrolled' | 'sent' | 'replied';

/**
 * Earliest sentAt of each lead's sent jobs — the campaign start marker
 * replies are scoped against. Leads with no sent job are absent.
 */
export function firstSentAtByLead(jobs: CampaignJobLike[]): Map<string, Date> {
  const first = new Map<string, Date>();
  for (const job of jobs) {
    if (job.status !== 'sent' || !job.sentAt || !job.leadId) continue;
    const existing = first.get(job.leadId);
    if (!existing || job.sentAt < existing) first.set(job.leadId, job.sentAt);
  }
  return first;
}

/**
 * Does an inbound email count as a reply to the campaign? Only when a first
 * send exists and the mail arrived at-or-after it.
 */
export function isCampaignReply(
  receivedAt: Date,
  firstSentAt: Date | null | undefined,
): boolean {
  return firstSentAt != null && receivedAt >= firstSentAt;
}

/**
 * Derive the campaign chip for one prospect's lead.
 *
 * 'replied' requires an inbound AT-OR-AFTER the first send — a lead with
 * zero jobs (or only unsent jobs) and an old inbound is 'none'/'enrolled',
 * not 'replied'. Canceled-only jobs still mean 'enrolled': the prospect
 * entered the campaign; the chip's job is history, not send-eligibility.
 */
export function deriveCampaignState({
  jobStatuses,
  latestInboundAt,
  firstSentAt,
}: {
  jobStatuses: string[];
  latestInboundAt: Date | null;
  firstSentAt: Date | null | undefined;
}): CampaignState {
  if (latestInboundAt && isCampaignReply(latestInboundAt, firstSentAt)) return 'replied';
  if (jobStatuses.includes('sent')) return 'sent';
  if (jobStatuses.length > 0) return 'enrolled';
  return 'none';
}

/**
 * Build the drawer's 3-row touch timeline from one lead's partner-outreach
 * jobs + their EmailLog rows (keyed by EmailLog id).
 *
 * Always returns exactly CAMPAIGN_TOTAL_TOUCHES rows: the engine only
 * enqueues step N+1 after step N sends, so later steps often have NO job
 * row yet — those render as status 'pending' ("queued after touch N−1").
 */
export function buildCampaignTouches(
  jobs: CampaignTouchJob[],
  logsById: Map<string, CampaignTouchEmail>,
): CampaignTouch[] {
  const byStep = new Map<number, CampaignTouchJob>();
  for (const job of jobs) byStep.set(job.step, job);

  const touches: CampaignTouch[] = [];
  for (let step = 1; step <= CAMPAIGN_TOTAL_TOUCHES; step++) {
    const job = byStep.get(step);
    if (!job) {
      touches.push({
        step,
        status: 'pending',
        scheduledFor: null,
        sentAt: null,
        cancelReason: null,
        lastError: null,
        email: null,
      });
      continue;
    }
    touches.push({
      step,
      status: job.status,
      scheduledFor: job.scheduledFor,
      sentAt: job.sentAt,
      cancelReason: job.cancelReason,
      lastError: job.lastError,
      email: (job.emailLogId && logsById.get(job.emailLogId)) || null,
    });
  }
  return touches;
}
