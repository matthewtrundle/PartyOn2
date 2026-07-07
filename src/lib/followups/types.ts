/**
 * Follow-up email system — shared types.
 *
 * The follow-up engine sends personal, plain-text follow-ups (2-touch max)
 * for every email capture on the site. Journeys are defined in journeys.ts,
 * copy in copy.ts, queueing in enqueue.ts, and the cron-driven send loop in
 * engine.ts. See docs in the Phase-0 migration:
 * prisma/migrations/manual/2026-07-06-followups-phase-0.sql
 */

import type { FollowUpJob } from '@prisma/client';
import type { FeatureFlagKey } from '@/lib/features/feature-flags';

/** Absolute base URL for links in follow-up emails and unsubscribe URLs. */
export const SITE_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com'
).replace(/\/+$/, '');

/** The entity id a job was deduped on (dedupe_key = "<journey>:<step>:<entityId>"). */
export function entityIdFromDedupeKey(dedupeKey: string): string {
  return dedupeKey.split(':').slice(2).join(':');
}

/** Every journey the follow-up system knows about. */
export type JourneyKey =
  | 'abandoned-quote'
  | 'unpaid-invoice'
  | 'partner-inquiry'
  | 'contact-form'
  | 'newsletter-welcome'
  | 'affiliate-apply'
  | 'event-quiz'
  | 'post-purchase-review';

/** Follow-up job lifecycle states (mirrors the CHECK constraint on follow_up_jobs.status). */
export type FollowUpJobStatus =
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'canceled'
  | 'suppressed'
  | 'failed';

/** A fully rendered email ready to hand to Resend. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Admin override for one journey step's copy (empty/missing = use default). */
export interface StepCopyOverride {
  subject?: string;
  body?: string;
}

/**
 * All copy overrides, keyed by journey then step number (1-based).
 * Stored in EmailTemplateContent under templateType 'followups' and edited
 * at /admin/emails/followups.
 */
export type FollowUpCopyOverrides = Partial<
  Record<JourneyKey, Record<number, StepCopyOverride>>
>;

/** Context handed to a journey step's buildEmail at send time. */
export interface JourneyEmailContext {
  job: FollowUpJob;
  /** job.payload parsed as an object ({} when null). Values are untrusted — read defensively. */
  payload: Record<string, unknown>;
  /** Turns a site path into an absolute URL with follow-up UTM params appended. */
  link: (path: string) => string;
  /** Token-signed /email/preferences URL for the job's email (CAN-SPAM footer). */
  unsubscribeUrl: string;
  /** Admin copy overrides, fetched once per engine tick. Absent = defaults. */
  copyOverrides?: FollowUpCopyOverrides;
}

/** One touch in a journey (2-touch max per Allan's locked decision). */
export interface JourneyStep {
  /** Hours after the trigger (step 1) or after the previous send (step 2). */
  delayHours: number;
  /** Render the email, or return null to cancel the send (e.g. payload too thin to say anything useful). */
  buildEmail: (ctx: JourneyEmailContext) => RenderedEmail | null;
}

/**
 * A journey definition. Registered in journeys.ts (registry pattern like
 * src/lib/analytics/landing-pages.ts).
 */
export interface JourneyDef {
  key: JourneyKey;
  label: string;
  description: string;
  /** Per-journey kill switch — auto-created disabled by the flags system. */
  featureFlag: FeatureFlagKey;
  /** Rollout phase from the build plan (1 = revenue, 2 = acks, 3 = post-purchase). */
  phase: 1 | 2 | 3;
  /** Max length 2. */
  steps: JourneyStep[];
  /**
   * Fresh-DB-read cancellation check, run by the engine just before sending.
   * Returns a short cancel reason, or null to proceed.
   */
  shouldCancel: (job: FollowUpJob) => Promise<string | null>;
  /**
   * Opt out of the engine's global "customer paid since job creation" guard.
   * Only for journeys where a paid order is part of the trigger itself
   * (post-purchase-review) or irrelevant to the conversation (partner-inquiry).
   */
  skipGlobalPaidGuard?: boolean;
  /** Optional hook run after a step sends (e.g. stamp Order.reviewRequestSentAt). */
  afterSend?: (job: FollowUpJob) => Promise<void>;
}

/** Result summary returned by one engine run (cron tick). */
export interface EngineRunResult {
  ok: boolean;
  /** Set when the engine refused to run (missing env). */
  reason?: string;
  /** True when the master kill switch is off. */
  paused?: boolean;
  /** False when outside the 9am–7pm America/Chicago send window (jobs stay queued). */
  inWindow?: boolean;
  reaped: number;
  /** Jobs enqueued by backstop sweeps this tick, per journey. */
  swept: Record<string, number>;
  claimed: number;
  sent: number;
  canceled: number;
  suppressed: number;
  failed: number;
  /** Jobs recovered as already-sent via the EmailLog jobId pre-send lookup. */
  recovered: number;
  at: string;
}
