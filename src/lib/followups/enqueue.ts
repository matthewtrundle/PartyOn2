/**
 * Follow-up email system — job queueing.
 *
 * enqueueJourney is called from route hooks (lead-event, quote, contact, ...)
 * and from the engine's backstop sweeps. The UNIQUE dedupe_key
 * ("<journey>:<step>:<entityId>") makes re-enqueues free: the second insert
 * is a no-op, so sweeps can re-scan the same drafts every 15 minutes safely.
 *
 * A canceled/suppressed job also blocks re-enqueue of that step by design —
 * "we decided not to send this touch" is a final answer for that entity.
 */

import { Prisma, type FollowUpJob } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { getJourney } from './journeys';
import { normalizeEmail } from './suppression';
import { isCompleteEmail } from '@/lib/leads/email-validation';
import { enrollLeadIfEligible } from '@/lib/leads/pipeline';
import { entityIdFromDedupeKey, type JourneyKey } from './types';

const MAX_JITTER_MS = 45 * 60 * 1000;
const MAX_PAYLOAD_STRING = 200;
const MAX_PAYLOAD_DEPTH = 3;

/**
 * Clamp untrusted payload values before storage: route hooks snapshot
 * public-form input here, and copy.ts interpolates it into outbound email.
 * Truncating strings bounds both stored-JSON bloat and what a visitor can
 * make "Allan" say in a follow-up.
 */
function clampPayload(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.slice(0, MAX_PAYLOAD_STRING);
  if (Array.isArray(value)) {
    return depth >= MAX_PAYLOAD_DEPTH ? [] : value.slice(0, 50).map((v) => clampPayload(v, depth + 1));
  }
  if (value && typeof value === 'object') {
    if (depth >= MAX_PAYLOAD_DEPTH) return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
      out[k.slice(0, 100)] = clampPayload(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Send time for a step: base + delay + 0–45min jitter so sends don't all fire
 * on the same cron tick (deliverability). Immediate steps (delayHours 0) get
 * no jitter — acks should go out on the next in-window tick.
 * jitterMs is injectable for tests.
 */
export function computeSendAt(
  base: Date,
  delayHours: number,
  jitterMs?: number
): Date {
  const jitter =
    delayHours <= 0
      ? 0
      : Math.max(0, Math.min(jitterMs ?? Math.random() * MAX_JITTER_MS, MAX_JITTER_MS));
  return new Date(base.getTime() + delayHours * 3_600_000 + jitter);
}

export interface EnqueueJourneyOptions {
  /** Recipient — lowercased before storage. */
  email: string;
  /** Stable id of the triggering entity (lead/draft/inquiry/order id) — drives dedupe. */
  entityId: string;
  /** 1 (default) or 2 — e.g. journeys whose first touch already exists elsewhere. */
  startAtStep?: number;
  /** Delay anchor. Defaults to now; pass e.g. DraftOrder.sentAt for unpaid-invoice. */
  baseTime?: Date;
  phone?: string | null;
  smsConsent?: boolean;
  leadId?: string;
  draftOrderId?: string;
  partnerInquiryId?: string;
  orderId?: string;
  /** Render context snapshot for copy.ts (names, links, numbers). */
  payload?: Record<string, unknown>;
}

export interface EnqueueResult {
  enqueued: boolean;
  jobId?: string;
  /** duplicate | invalid-email | unknown-journey | no-such-step */
  reason?: string;
}

/**
 * Queue one journey step for an entity. Safe to call repeatedly — duplicates
 * are absorbed by dedupe_key. Never throws on duplicate; rethrows real errors.
 */
export async function enqueueJourney(
  journeyKey: JourneyKey,
  opts: EnqueueJourneyOptions
): Promise<EnqueueResult> {
  const journey = getJourney(journeyKey);
  if (!journey) return { enqueued: false, reason: 'unknown-journey' };

  const step = opts.startAtStep ?? 1;
  const stepDef = journey.steps[step - 1];
  if (!stepDef) return { enqueued: false, reason: 'no-such-step' };

  const email = normalizeEmail(opts.email);
  // Completeness backstop: only a full address may anchor an email-sending
  // journey, regardless of caller. Stops keystroke fragments / garbage from
  // being queued (they'd hard-bounce) even if a future caller skips the
  // route-level pre-check. `normalizeEmail` here (from ./suppression) only
  // trims + lowercases + checks for '@'; isCompleteEmail is the strict gate.
  if (!email || !isCompleteEmail(email)) return { enqueued: false, reason: 'invalid-email' };

  const scheduledFor = computeSendAt(opts.baseTime ?? new Date(), stepDef.delayHours);

  try {
    const job = await prisma.followUpJob.create({
      data: {
        journeyKey,
        step,
        email,
        phone: opts.phone ?? null,
        smsConsent: opts.smsConsent ?? false,
        leadId: opts.leadId,
        draftOrderId: opts.draftOrderId,
        partnerInquiryId: opts.partnerInquiryId,
        orderId: opts.orderId,
        payload: opts.payload
          ? (JSON.parse(JSON.stringify(clampPayload(opts.payload))) as Prisma.InputJsonValue)
          : undefined,
        dedupeKey: `${journeyKey}:${step}:${opts.entityId}`,
        scheduledFor,
      },
    });
    // Lead Flow board: anything flagged for a follow-up belongs on the board
    // (Allan's rule) — this is how abandoned-quote PARTIAL leads surface.
    // Best-effort; a board hiccup must not fail the enqueue.
    if (opts.leadId) {
      await enrollLeadIfEligible(opts.leadId, { allowPartial: true }).catch(() => undefined);
    }
    return { enqueued: true, jobId: job.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { enqueued: false, reason: 'duplicate' };
    }
    throw error;
  }
}

/**
 * Queue the next touch after a step sends. Called by the engine only —
 * step N+1 is never enqueued before step N has actually gone out.
 */
export async function enqueueNextStep(
  job: FollowUpJob,
  now: Date = new Date()
): Promise<EnqueueResult> {
  return enqueueJourney(job.journeyKey as JourneyKey, {
    email: job.email,
    entityId: entityIdFromDedupeKey(job.dedupeKey),
    startAtStep: job.step + 1,
    baseTime: now,
    phone: job.phone,
    smsConsent: job.smsConsent,
    leadId: job.leadId ?? undefined,
    draftOrderId: job.draftOrderId ?? undefined,
    partnerInquiryId: job.partnerInquiryId ?? undefined,
    orderId: job.orderId ?? undefined,
    payload: (job.payload as Record<string, unknown> | null) ?? undefined,
  });
}

/**
 * Cancel scheduled jobs for an email (all journeys, or one journey).
 * Advisory call-sites: Stripe payment webhook, suppression, quote fast-path.
 * Returns how many jobs were canceled.
 */
export async function cancelJobsForEmail(
  email: string,
  reason: string,
  journeyKey?: JourneyKey
): Promise<number> {
  const result = await prisma.followUpJob.updateMany({
    where: {
      email: normalizeEmail(email),
      status: 'scheduled',
      ...(journeyKey ? { journeyKey } : {}),
    },
    data: { status: 'canceled', canceledAt: new Date(), cancelReason: reason },
  });
  return result.count;
}

/** Cancel scheduled jobs tied to a draft order (e.g. invoice paid/cancelled). */
export async function cancelJobsForDraft(
  draftOrderId: string,
  reason: string
): Promise<number> {
  const result = await prisma.followUpJob.updateMany({
    where: { draftOrderId, status: 'scheduled' },
    data: { status: 'canceled', canceledAt: new Date(), cancelReason: reason },
  });
  return result.count;
}
