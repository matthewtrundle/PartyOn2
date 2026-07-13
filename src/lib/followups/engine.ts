/**
 * Follow-up email system — the engine.
 *
 * Runs every 15 minutes via /api/cron/follow-up-engine. One tick:
 *   1. Refuse to run without UNSUBSCRIBE_SECRET + FOLLOWUP_FROM_EMAIL.
 *   2. Master kill switch (followups_master) → early out.
 *   3. Reap stuck 'processing' jobs (>30min → back to scheduled; 3+ attempts → failed).
 *   4. Backstop sweeps for enabled journeys (dedupe_key makes re-sweeps free).
 *   5. Only send 9am–7pm America/Chicago — outside the window jobs stay queued.
 *   6. Claim ≤50 due jobs atomically (FOR UPDATE SKIP LOCKED), enabled journeys only.
 *   7. Per job, sequentially: fresh-read cancel checks → suppression → global
 *      paid-order guard → EmailLog jobId recovery lookup → render → send →
 *      stamp sent → enqueue the next step.
 *
 * Double-send protection is layered: the atomic claim, the UNIQUE dedupe_key,
 * and the pre-send EmailLog lookup. Residual risk is ≤1 duplicate, bounded by
 * the attempts cap.
 */

import { Prisma, EmailStatus, EmailType, type FollowUpJob } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { sendEmailDetailed } from '@/lib/email/resend-client';
import { FEATURE_FLAGS, isFeatureEnabled } from '@/lib/features/feature-flags';
import { enqueueJourney, enqueueNextStep } from './enqueue';
import { JOURNEYS } from './journeys';
import { getFollowUpCopyOverrides } from './copy-overrides';
import {
  buildOneClickUnsubscribeUrl,
  buildPreferencesUrl,
  isSuppressed,
} from './suppression';
import type { EngineRunResult, FollowUpCopyOverrides, JourneyDef, JourneyKey } from './types';
import { SITE_BASE_URL } from './types';
import { resolveSameOriginUrl } from './links';

const CLAIM_BATCH_SIZE = 50;
const STUCK_PROCESSING_MINUTES = 30;
const MAX_ATTEMPTS = 3;
/** Spacing between sends — stays under Resend's rate limit. */
const SEND_SPACING_MS = 600;

/** 9am–7pm America/Chicago, DST-safe via Intl. Exported for tests. */
export function isWithinSendWindow(date: Date, timeZone = 'America/Chicago'): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date)
  );
  return hour >= 9 && hour < 19;
}

/**
 * Global convert guard: has this email placed a paid order since the job was
 * created? Case-insensitive because Order.customerEmail is stored as-typed.
 * (No expression index — fine at current order volume; revisit if slow.)
 */
export async function hasPaidOrderSince(email: string, since: Date): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: {
      customerEmail: { equals: email, mode: 'insensitive' },
      financialStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return order !== null;
}

function firstNameFrom(fullName: string | null | undefined): string | null {
  const first = (fullName ?? '').trim().split(/\s+/)[0];
  return first || null;
}

function fmtDeliveryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

/**
 * Backstop sweep: unpaid invoices (SENT/VIEWED 24h–14d, non-group,
 * non-amendment). Route fast-paths enqueue most of these at send time; the
 * sweep catches invoices sent through other paths (e.g. /ops admin).
 */
async function sweepUnpaidInvoices(now: Date): Promise<number> {
  const drafts = await prisma.draftOrder.findMany({
    where: {
      status: { in: ['SENT', 'VIEWED'] },
      sentAt: {
        gte: new Date(now.getTime() - 14 * 24 * 3_600_000),
        lte: new Date(now.getTime() - 24 * 3_600_000),
      },
      paidAt: null,
      groupOrderId: null,
      amendmentForOrderId: null,
    },
    select: {
      id: true,
      customerEmail: true,
      customerName: true,
      sentAt: true,
      deliveryDate: true,
      token: true,
    },
    orderBy: { sentAt: 'desc' },
    take: 200,
  });

  let enqueued = 0;
  for (const draft of drafts) {
    const result = await enqueueJourney('unpaid-invoice', {
      email: draft.customerEmail,
      entityId: draft.id,
      draftOrderId: draft.id,
      baseTime: draft.sentAt ?? now,
      payload: {
        firstName: firstNameFrom(draft.customerName),
        deliveryDate: fmtDeliveryDate(draft.deliveryDate),
        invoicePath: `/invoice/${draft.token}`,
      },
    });
    if (result.enqueued) enqueued++;
  }
  return enqueued;
}

/**
 * Backstop sweep: delivered orders with no review request yet. Bounded to
 * deliveries in the last 14 days so flipping the flag on never blasts the
 * whole history. Mutual dedupe with the manual GHL route via
 * Order.reviewRequestSentAt (checked again at send time).
 */
async function sweepPostPurchaseReviews(now: Date): Promise<number> {
  const orders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      reviewRequestSentAt: null,
      deliveryDate: {
        gte: new Date(now.getTime() - 14 * 24 * 3_600_000),
        lte: now,
      },
    },
    select: {
      id: true,
      customerEmail: true,
      customerName: true,
      deliveryDate: true,
    },
    orderBy: { deliveryDate: 'desc' },
    take: 200,
  });

  let enqueued = 0;
  for (const order of orders) {
    const result = await enqueueJourney('post-purchase-review', {
      email: order.customerEmail,
      entityId: order.id,
      orderId: order.id,
      baseTime: order.deliveryDate,
      payload: { firstName: firstNameFrom(order.customerName) },
    });
    if (result.enqueued) enqueued++;
  }
  return enqueued;
}

/** Journey-key → sweep function. Only enabled journeys sweep. */
const SWEEPS: Partial<Record<JourneyKey, (now: Date) => Promise<number>>> = {
  'unpaid-invoice': sweepUnpaidInvoices,
  'post-purchase-review': sweepPostPurchaseReviews,
};

/** Reap stuck processing jobs. Returns how many were touched. */
async function reapStuckJobs(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - STUCK_PROCESSING_MINUTES * 60_000);
  const failed = await prisma.followUpJob.updateMany({
    where: {
      status: 'processing',
      claimedAt: { lt: cutoff },
      attempts: { gte: MAX_ATTEMPTS },
    },
    data: { status: 'failed', lastError: 'stuck-in-processing (reaped)' },
  });
  const rescheduled = await prisma.followUpJob.updateMany({
    where: { status: 'processing', claimedAt: { lt: cutoff } },
    data: { status: 'scheduled' },
  });
  return failed.count + rescheduled.count;
}

/**
 * Atomically claim due jobs for the enabled journeys. FOR UPDATE SKIP LOCKED
 * makes concurrent ticks (cron overlap, manual runs) claim disjoint sets.
 * Claiming counts as an attempt.
 */
async function claimDueJobs(enabledKeys: string[]): Promise<FollowUpJob[]> {
  if (enabledKeys.length === 0) return [];
  const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE follow_up_jobs
    SET status = 'processing', claimed_at = now(), attempts = attempts + 1, updated_at = now()
    WHERE id IN (
      SELECT id FROM follow_up_jobs
      WHERE status = 'scheduled'
        AND scheduled_for <= now()
        AND journey_key IN (${Prisma.join(enabledKeys)})
      ORDER BY scheduled_for ASC
      LIMIT ${CLAIM_BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `;
  if (claimed.length === 0) return [];
  return prisma.followUpJob.findMany({
    where: { id: { in: claimed.map((row) => row.id) } },
    orderBy: { scheduledFor: 'asc' },
  });
}

type JobOutcome = 'sent' | 'canceled' | 'suppressed' | 'failed' | 'recovered';

async function markCanceled(job: FollowUpJob, reason: string, status = 'canceled'): Promise<void> {
  await prisma.followUpJob.update({
    where: { id: job.id },
    data: { status, canceledAt: new Date(), cancelReason: reason },
  });
}

/** Process one claimed job through the full pre-send pipeline. Exported for tests. */
export async function processJob(
  job: FollowUpJob,
  journey: JourneyDef,
  copyOverrides?: FollowUpCopyOverrides
): Promise<JobOutcome> {
  // 1. Suppression list (unsubscribe/bounce/complaint).
  if (await isSuppressed(job.email)) {
    await markCanceled(job, 'suppressed', 'suppressed');
    return 'suppressed';
  }

  // 2. Journey-specific fresh-DB cancel checks.
  const cancelReason = await journey.shouldCancel(job);
  if (cancelReason) {
    await markCanceled(job, cancelReason);
    return 'canceled';
  }

  // 2b. Lead Flow board guard: a lead explicitly closed on the board (WON or
  // LOST) is a finished conversation — a board-Lost lead must never get a
  // follow-up email when the flags flip on. Only jobs anchored to a lead are
  // affected (B2B journeys carry no leadId).
  if (job.leadId) {
    const boardLead = await prisma.lead.findUnique({
      where: { id: job.leadId },
      select: { pipelineStage: true },
    });
    if (boardLead?.pipelineStage === 'LOST') {
      await markCanceled(job, 'pipeline-lost');
      return 'canceled';
    }
    if (boardLead?.pipelineStage === 'WON') {
      await markCanceled(job, 'pipeline-won');
      return 'canceled';
    }
  }

  // 3. Global guard: they became a paying customer since this was queued.
  if (!journey.skipGlobalPaidGuard && (await hasPaidOrderSince(job.email, job.createdAt))) {
    await markCanceled(job, 'converted-order');
    return 'canceled';
  }

  // 4. Retry recovery: if a previous attempt already produced an EmailLog for
  // this job, do NOT send again. Anything except FAILED (including PENDING,
  // where the outcome is unknowable) counts as sent — err on no-duplicate.
  const priorLog = await prisma.emailLog.findFirst({
    where: {
      metadata: { path: ['jobId'], equals: job.id },
      status: { not: EmailStatus.FAILED },
    },
    select: { id: true },
  });
  if (priorLog) {
    await prisma.followUpJob.update({
      where: { id: job.id },
      data: { status: 'sent', sentAt: new Date(), emailLogId: priorLog.id },
    });
    await enqueueNextStepIfAny(job, journey);
    return 'recovered';
  }

  // 5. Render.
  const stepDef = journey.steps[job.step - 1];
  if (!stepDef) {
    await prisma.followUpJob.update({
      where: { id: job.id },
      data: { status: 'failed', lastError: `no step ${job.step} on ${journey.key}` },
    });
    return 'failed';
  }
  const rendered = stepDef.buildEmail({
    job,
    payload: (job.payload as Record<string, unknown> | null) ?? {},
    link: (path: string) => {
      // Open-redirect guard (CWE-601): resolveSameOriginUrl rejects any path
      // that escapes our origin — the payload path echoes public,
      // unauthenticated route input. See links.ts + link-safety.test.ts.
      const url = resolveSameOriginUrl(path, SITE_BASE_URL);
      url.searchParams.set('utm_source', 'email');
      url.searchParams.set('utm_medium', 'followup');
      url.searchParams.set('utm_campaign', journey.key);
      url.searchParams.set('utm_content', `step-${job.step}`);
      return url.toString();
    },
    unsubscribeUrl: buildPreferencesUrl(job.email),
    copyOverrides,
  });
  if (!rendered) {
    await markCanceled(job, 'no-content');
    return 'canceled';
  }

  // 6. Send — personal from-address, RFC 8058 one-click unsubscribe headers.
  const result = await sendEmailDetailed({
    to: job.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    type: EmailType.FOLLOW_UP,
    orderId: job.orderId ?? undefined,
    draftOrderId: job.draftOrderId ?? undefined,
    metadata: { jobId: job.id, journeyKey: journey.key, step: job.step },
    tags: [
      { name: 'journey', value: journey.key.replace(/[^a-zA-Z0-9_-]/g, '_') },
      { name: 'step', value: String(job.step) },
    ],
    headers: {
      'List-Unsubscribe': `<${buildOneClickUnsubscribeUrl(job.email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    from: {
      email: process.env.FOLLOWUP_FROM_EMAIL as string,
      name: process.env.FOLLOWUP_FROM_NAME || 'Allan at Party On Delivery',
    },
    respectSuppression: true,
  });

  if (result.suppressed) {
    await markCanceled(job, 'suppressed', 'suppressed');
    return 'suppressed';
  }

  if (!result.sent) {
    const exhausted = job.attempts >= MAX_ATTEMPTS;
    await prisma.followUpJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? 'failed' : 'scheduled',
        lastError: result.error ?? 'send failed',
      },
    });
    return 'failed';
  }

  // 7. Stamp + follow-on work.
  await prisma.followUpJob.update({
    where: { id: job.id },
    data: { status: 'sent', sentAt: new Date(), emailLogId: result.emailLogId },
  });
  if (journey.afterSend) {
    await journey.afterSend(job);
  }
  await enqueueNextStepIfAny(job, journey);
  return 'sent';
}

async function enqueueNextStepIfAny(job: FollowUpJob, journey: JourneyDef): Promise<void> {
  if (journey.steps[job.step]) {
    await enqueueNextStep(job);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function emptyResult(now: Date): EngineRunResult {
  return {
    ok: true,
    reaped: 0,
    swept: {},
    claimed: 0,
    sent: 0,
    canceled: 0,
    suppressed: 0,
    failed: 0,
    recovered: 0,
    at: now.toISOString(),
  };
}

/**
 * One engine tick. Called by the cron route; also directly invocable from
 * tests and the admin test-send path.
 */
export async function runFollowUpEngine(opts: { now?: Date } = {}): Promise<EngineRunResult> {
  const now = opts.now ?? new Date();
  const result = emptyResult(now);

  if (!process.env.UNSUBSCRIBE_SECRET || !process.env.FOLLOWUP_FROM_EMAIL) {
    return {
      ...result,
      ok: false,
      reason: 'missing env: UNSUBSCRIBE_SECRET and/or FOLLOWUP_FROM_EMAIL',
    };
  }

  if (!(await isFeatureEnabled(FEATURE_FLAGS.FOLLOWUPS_MASTER))) {
    return { ...result, paused: true };
  }

  result.reaped = await reapStuckJobs(now);

  // Per-journey flags — checked once per tick.
  const enabled: JourneyDef[] = [];
  for (const journey of JOURNEYS) {
    if (await isFeatureEnabled(journey.featureFlag)) enabled.push(journey);
  }

  // Backstop sweeps for enabled journeys (dedupe_key absorbs repeats).
  for (const journey of enabled) {
    const sweep = SWEEPS[journey.key];
    if (sweep) {
      try {
        result.swept[journey.key] = await sweep(now);
      } catch (error) {
        console.error(`[followups] sweep failed for ${journey.key}:`, error);
      }
    }
  }

  if (!isWithinSendWindow(now)) {
    return { ...result, inWindow: false };
  }
  result.inWindow = true;

  const jobs = await claimDueJobs(enabled.map((j) => j.key));
  result.claimed = jobs.length;

  // Admin copy overrides — one read per tick, so a save in the dashboard
  // affects the very next send.
  const copyOverrides = jobs.length > 0 ? await getFollowUpCopyOverrides() : undefined;

  const journeyByKey = new Map(enabled.map((j) => [j.key as string, j]));
  for (const job of jobs) {
    const journey = journeyByKey.get(job.journeyKey);
    if (!journey) {
      // Shouldn't happen (claim filters on enabled keys) — release the claim.
      await prisma.followUpJob.update({
        where: { id: job.id },
        data: { status: 'scheduled' },
      });
      continue;
    }
    try {
      const outcome = await processJob(job, journey, copyOverrides);
      if (outcome === 'sent') result.sent++;
      else if (outcome === 'canceled') result.canceled++;
      else if (outcome === 'suppressed') result.suppressed++;
      else if (outcome === 'recovered') result.recovered++;
      else result.failed++;
      if (outcome === 'sent') await sleep(SEND_SPACING_MS);
    } catch (error) {
      console.error(`[followups] job ${job.id} crashed:`, error);
      result.failed++;
      const message = error instanceof Error ? error.message : 'unknown error';
      await prisma.followUpJob
        .update({
          where: { id: job.id },
          data: {
            status: job.attempts >= MAX_ATTEMPTS ? 'failed' : 'scheduled',
            lastError: message,
          },
        })
        .catch(() => undefined); // reaper will pick it up if even this fails
    }
  }

  return result;
}
