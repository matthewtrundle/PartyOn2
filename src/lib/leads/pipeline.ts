/**
 * Lead Flow board — pipeline service (single writer for stage changes).
 *
 * Design rules (2026-07-13 plan):
 *   - `pipelineStage` never touches `Lead.status` EXCEPT the verified won
 *     matcher, which sets CONVERTED (the semantically-correct existing
 *     meaning — it also cancels abandoned-quote follow-ups).
 *   - Won detection is a sweep with a guarded updateMany, NOT order-creation
 *     hooks (orders are created in 5 places; a hook would miss one).
 *   - Auto-moves are forward-only and never demote.
 *   - Every stage change appends a LeadEvent (kind: stage.changed) so the
 *     card timeline is a full audit trail.
 *
 * This module must not import leadCapture.ts (leadCapture imports us).
 */

import { Prisma, type Lead } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { computeLeadScore } from './scoring';
import {
  ACTIVE_STAGES,
  isPipelineStage,
  validateTransition,
  type PipelineStage,
  type StageChangeVia,
} from './pipeline-types';
import { phoneLast10 } from './phone';

/**
 * Metadata keys that mark a lead as a real party inquiry (vs newsletter).
 * `leadMagnet` is deliberately absent: an email-only lead-magnet capture must
 * stay newsletter-only (only phone-carrying magnet submits get the
 * LEAD_MAGNET sourceWidget, which is not EMAIL_SIGNUP and boards normally).
 */
const INQUIRY_META_KEYS = [
  'conciergeQuiz',
  'chatQuiz',
  'eventQuiz',
  'contactForm',
  'unifiedQuote',
  'quote',
  'groupDashboard',
  'partnerInquiry',
  'affiliateApplication',
  'opsInvoice',
] as const;

const SWEEP_BATCH = 200;

type LeadLite = Pick<Lead, 'status' | 'email' | 'phone' | 'sourceWidget' | 'metadata'>;

function hasInquiryMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false;
  const m = metadata as Record<string, unknown>;
  return INQUIRY_META_KEYS.some((k) => m[k] != null);
}

/** Newsletter subscribers are not party inquiries — they stay off the board. */
export function isNewsletterOnly(lead: Pick<LeadLite, 'sourceWidget' | 'metadata'>): boolean {
  return lead.sourceWidget === 'EMAIL_SIGNUP' && !hasInquiryMetadata(lead.metadata);
}

/**
 * Should this lead get a board card? Contactable + a real inquiry.
 * PARTIAL leads only enter via explicit paths (follow-up enqueue hook,
 * tray promotion) — `allowPartial` gates that.
 */
export function isBoardEligible(
  lead: LeadLite,
  opts: { allowPartial?: boolean } = {},
): boolean {
  if (!lead.email && !lead.phone) return false;
  if (isNewsletterOnly(lead)) return false;
  if (lead.status === 'SUBMITTED' || lead.status === 'CONVERTED') return true;
  return opts.allowPartial === true && lead.status === 'PARTIAL';
}

/** Fractional rank: newest on top (lower sorts first). Drags write midpoints. */
export function topSortOrder(now: Date = new Date()): number {
  return -Math.floor(now.getTime() / 1000);
}

/**
 * Earliest order/draft date that may count toward this lead's current
 * inquiry: the lead's creation, or its most recent reopen — a reopened
 * card's OLD order must not re-win it. Shared by the won matcher and the
 * quote-sent sweep.
 */
export function matchFloor(lead: { createdAt: Date; reopenedAt: Date | null }): Date {
  return lead.reopenedAt && lead.reopenedAt > lead.createdAt
    ? lead.reopenedAt
    : lead.createdAt;
}

async function appendStageEvent(
  db: Prisma.TransactionClient,
  leadId: string,
  from: PipelineStage | null,
  to: PipelineStage,
  via: StageChangeVia,
  extra?: Record<string, unknown>,
): Promise<void> {
  await db.leadEvent.create({
    data: {
      leadId,
      type: 'CUSTOM',
      metadata: { kind: 'stage.changed', from, to, via, ...extra } as never,
    },
  });
}

/**
 * Recompute + store the temperature score for one lead. Engagement counts
 * come from lead_events here (bounded per-lead), never at board read time.
 */
export async function recomputeLeadScore(leadId: string): Promise<number | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;
  const [checkoutStarts, formSubmits] = await Promise.all([
    prisma.leadEvent.count({ where: { leadId, type: 'CHECKOUT_START' } }),
    prisma.leadEvent.count({ where: { leadId, type: 'FORM_SUBMIT' } }),
  ]);
  const { score, breakdown } = computeLeadScore({
    sourceWidget: lead.sourceWidget,
    metadata: lead.metadata,
    resumeCart: lead.resumeCart,
    createdAt: lead.createdAt,
    lastActivityAt: lead.lastActivityAt,
    engagement: {
      hasCheckoutStart: checkoutStarts > 0,
      formSubmitCount: formSubmits,
    },
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { leadScore: score, scoreBreakdown: breakdown as never },
  });
  return score;
}

export interface TransitionOptions {
  via: StageChangeVia;
  /** Auto-moves pass the stages they may move FROM — anything else no-ops. */
  onlyFrom?: readonly PipelineStage[];
  lostReason?: string | null;
  /** Board drags pass an explicit rank; defaults to top of the column. */
  sortOrder?: number;
  /** Extra audit payload for the stage.changed event. */
  eventExtra?: Record<string, unknown>;
  now?: Date;
}

export interface TransitionResult {
  ok: boolean;
  moved: boolean;
  reason?: string;
  lead?: Lead;
}

/** Field updates that entering/leaving a stage implies. */
function stageSideEffects(
  from: PipelineStage | null,
  to: PipelineStage,
  opts: TransitionOptions,
  now: Date,
): Prisma.LeadUpdateManyMutationInput {
  const data: Prisma.LeadUpdateManyMutationInput = {
    pipelineStage: to,
    stageChangedAt: now,
    boardSortOrder: opts.sortOrder ?? topSortOrder(now),
  };
  if (to === 'WON') data.wonAt = now;
  if (to === 'LOST') {
    data.lostAt = now;
    data.lostReason = opts.lostReason ?? null;
  }
  if (from === 'WON' && to !== 'WON') {
    data.wonAt = null;
    data.reopenedAt = now; // floor for the won matcher — old orders can't re-win
  }
  if (from === 'LOST' && to !== 'LOST') {
    data.lostAt = null;
    data.lostReason = null;
    data.reopenedAt = now;
  }
  return data;
}

/**
 * Move a lead to a stage. Race-safe: the UPDATE is guarded on the stage we
 * read, so a concurrent move wins cleanly and this returns moved:false.
 */
export async function transitionStage(
  leadId: string,
  to: PipelineStage,
  opts: TransitionOptions,
): Promise<TransitionResult> {
  const now = opts.now ?? new Date();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, moved: false, reason: 'lead-not-found' };

  const from = isPipelineStage(lead.pipelineStage) ? lead.pipelineStage : null;
  const invalid = validateTransition(from, to);
  if (invalid === 'same-stage') return { ok: true, moved: false, reason: invalid, lead };
  if (invalid) return { ok: false, moved: false, reason: invalid };
  if (opts.onlyFrom && (!from || !opts.onlyFrom.includes(from))) {
    return { ok: true, moved: false, reason: 'not-in-from-stage', lead };
  }

  // Stage write + audit event commit together — a crash between them must
  // not leave a stage change with no stage.changed event (deferred review
  // finding). Rescore stays OUTSIDE: it is deliberately best-effort and must
  // not roll back a landed move.
  const moved = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.updateMany({
      where: { id: leadId, pipelineStage: lead.pipelineStage },
      data: stageSideEffects(from, to, opts, now),
    });
    if (updated.count === 0) return false;
    await appendStageEvent(tx, leadId, from, to, opts.via, opts.eventExtra);
    return true;
  });
  if (!moved) {
    return { ok: true, moved: false, reason: 'concurrent-change' };
  }

  await recomputeLeadScore(leadId).catch(() => undefined);
  const fresh = await prisma.lead.findUnique({ where: { id: leadId } });
  return { ok: true, moved: true, lead: fresh ?? undefined };
}

/**
 * Put an off-board lead onto the board as NEW (no-op if already on it).
 * Used by the submit-signal hook, the follow-up enqueue hook, and sweeps.
 */
export async function enrollLeadIfEligible(
  leadId: string,
  opts: { allowPartial?: boolean; via?: StageChangeVia; now?: Date } = {},
): Promise<boolean> {
  const now = opts.now ?? new Date();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.pipelineStage !== null) return false;
  if (!isBoardEligible(lead, { allowPartial: opts.allowPartial })) return false;

  // Same atomicity rule as transitionStage: enroll + its audit event commit
  // together.
  const enrolled = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.updateMany({
      where: { id: leadId, pipelineStage: null },
      data: {
        pipelineStage: 'NEW',
        stageChangedAt: now,
        boardSortOrder: topSortOrder(now),
      },
    });
    if (updated.count === 0) return false;
    await appendStageEvent(tx, leadId, null, 'NEW', opts.via ?? 'enroll');
    return true;
  });
  if (!enrolled) return false;
  await recomputeLeadScore(leadId).catch(() => undefined);
  return true;
}

/**
 * Called by recordEvent on FORM_SUBMIT / CHECKOUT_START: a fresh inquiry
 * re-opens a closed (WON/LOST) card as NEW, or enrolls a new lead.
 * Never throws — capture paths must not break on board bookkeeping.
 */
export async function handleSubmitSignal(leadId: string): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { pipelineStage: true },
    });
    if (!lead) return;
    if (lead.pipelineStage === 'WON' || lead.pipelineStage === 'LOST') {
      await transitionStage(leadId, 'NEW', { via: 'reopen' });
      return;
    }
    if (lead.pipelineStage === null) {
      await enrollLeadIfEligible(leadId);
    }
  } catch (err) {
    console.warn('[lead-pipeline] submit signal failed', err);
  }
}

/**
 * Stage↔status sync for the existing conversion writers (concierge deposit
 * webhook + success page): a CONVERTED lead must show as WON on the board.
 * Forward-only; never throws.
 */
export async function syncStageFromConversion(leadId: string): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { pipelineStage: true, status: true, orderId: true },
    });
    if (!lead || lead.pipelineStage === 'WON') return;
    if (lead.status !== 'CONVERTED' && !lead.orderId) return;
    await transitionStage(leadId, 'WON', { via: 'order' });
  } catch (err) {
    console.warn('[lead-pipeline] conversion sync failed', err);
  }
}

/** Cron sweep: board-eligible SUBMITTED leads that never got a card. */
export async function sweepEnrollSubmitted(): Promise<number> {
  const candidates = await prisma.lead.findMany({
    where: {
      pipelineStage: null,
      status: 'SUBMITTED',
      OR: [{ email: { not: null } }, { phone: { not: null } }],
      // Newsletter signups stay off-board and would otherwise accumulate as
      // permanent rejects that starve the batch (review #5). A signup that
      // later submits a real inquiry enrolls via the realtime hooks.
      NOT: { sourceWidget: 'EMAIL_SIGNUP' },
    },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
    take: SWEEP_BATCH,
  });
  let enrolled = 0;
  for (const { id } of candidates) {
    if (await enrollLeadIfEligible(id)) enrolled++;
  }
  return enrolled;
}

/**
 * Cron sweep: an outstanding (SENT/VIEWED) non-group, non-amendment draft
 * for the lead's email moves NEW/CONTACTED/QUALIFIED → QUOTE_SENT.
 * Same draft filters as the follow-up engine's sweepUnpaidInvoices.
 */
export async function sweepQuoteSent(): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: {
      pipelineStage: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] },
      email: { not: null },
    },
    select: { id: true, email: true, createdAt: true, reopenedAt: true, draftOrderId: true },
    take: SWEEP_BATCH,
  });
  let moved = 0;
  for (const lead of leads) {
    const draft = await prisma.draftOrder.findFirst({
      where: {
        customerEmail: { equals: lead.email as string, mode: 'insensitive' },
        status: { in: ['SENT', 'VIEWED'] },
        createdAt: { gte: matchFloor(lead) },
        groupOrderId: null,
        amendmentForOrderId: null,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!draft) continue;
    const result = await transitionStage(lead.id, 'QUOTE_SENT', {
      via: 'auto',
      onlyFrom: ['NEW', 'CONTACTED', 'QUALIFIED'],
      eventExtra: { draftOrderId: draft.id },
    });
    if (result.moved) {
      moved++;
      if (!lead.draftOrderId) {
        await prisma.lead.update({ where: { id: lead.id }, data: { draftOrderId: draft.id } });
      }
    }
  }
  return moved;
}

/**
 * Identity clauses + date floor for the won-order match, extracted pure so
 * the SQL inputs are testable without a database: email matches
 * case-insensitively, phone matches on the last 10 digits, and a lead with
 * neither yields no clauses (the caller must then skip the query).
 */
export function wonOrderIdentity(lead: {
  email: string | null;
  phone: string | null;
  createdAt: Date;
  reopenedAt: Date | null;
}): { floor: Date; identity: Prisma.Sql[] } {
  const identity: Prisma.Sql[] = [];
  if (lead.email) identity.push(Prisma.sql`LOWER(customer_email) = LOWER(${lead.email})`);
  const last10 = phoneLast10(lead.phone);
  if (last10) {
    identity.push(
      Prisma.sql`RIGHT(REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g'), 10) = ${last10}`,
    );
  }
  return { floor: matchFloor(lead), identity };
}

/**
 * High-confidence paid-order match for one lead: email (case-insensitive) or
 * last-10-digit phone, created on/after the lead (or its reopen), and NOT a
 * GroupOrderV2 participant payment (a $40 guest chip-in is not a won party —
 * risk R1). Uses the idx_orders_customer_phone_last10 expression index.
 */
async function findWonOrder(lead: {
  email: string | null;
  phone: string | null;
  createdAt: Date;
  reopenedAt: Date | null;
}): Promise<{ id: string } | null> {
  const { floor, identity } = wonOrderIdentity(lead);
  if (identity.length === 0) return null;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM orders
    WHERE financial_status IN ('PAID', 'PARTIALLY_REFUNDED')
      AND group_order_v2_id IS NULL
      AND created_at >= ${floor}
      AND (${Prisma.join(identity, ' OR ')})
    ORDER BY created_at ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Cron sweep: move active-stage leads with a verified paid order to WON.
 * Also back-links Lead.orderId and sets status CONVERTED (the one sanctioned
 * status write — cancels abandoned-quote follow-ups correctly).
 */
export async function sweepWonMatches(): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: { pipelineStage: { in: [...ACTIVE_STAGES] } },
    select: {
      id: true,
      email: true,
      phone: true,
      createdAt: true,
      reopenedAt: true,
      pipelineStage: true,
    },
    take: SWEEP_BATCH,
  });
  let won = 0;
  const now = new Date();
  for (const lead of leads) {
    const order = await findWonOrder(lead);
    if (!order) continue;
    const from = isPipelineStage(lead.pipelineStage) ? lead.pipelineStage : null;
    // Guarded update — concurrent sweeps / a staff drag serialize on the row
    // and the loser's WHERE no longer matches (READ COMMITTED re-check).
    // Wrapped with its audit event so the two commit together.
    const wonMove = await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.updateMany({
        where: { id: lead.id, pipelineStage: { in: [...ACTIVE_STAGES] } },
        data: {
          pipelineStage: 'WON',
          stageChangedAt: now,
          wonAt: now,
          orderId: order.id,
          status: 'CONVERTED',
          boardSortOrder: topSortOrder(now),
        },
      });
      if (updated.count === 0) return false;
      await appendStageEvent(tx, lead.id, from, 'WON', 'order', { orderId: order.id });
      return true;
    });
    if (!wonMove) continue;
    won++;
    await recomputeLeadScore(lead.id).catch(() => undefined);
  }
  return won;
}

/**
 * Cron backstop for handleSubmitSignal: a WON/LOST lead whose activity
 * timestamp moved after the stage change AND has a fresh FORM_SUBMIT /
 * CHECKOUT_START event re-opens as NEW.
 */
export async function sweepReopens(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM leads
    WHERE pipeline_stage IN ('WON', 'LOST')
      AND last_activity_at IS NOT NULL
      AND stage_changed_at IS NOT NULL
      AND last_activity_at > stage_changed_at
    LIMIT 100
  `;
  let reopened = 0;
  for (const { id } of rows) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { stageChangedAt: true },
    });
    if (!lead?.stageChangedAt) continue;
    const freshSubmit = await prisma.leadEvent.findFirst({
      where: {
        leadId: id,
        type: { in: ['FORM_SUBMIT', 'CHECKOUT_START'] },
        occurredAt: { gt: lead.stageChangedAt },
        // Server-originated submits only — a client-claimed pixel
        // FORM_SUBMIT must not be able to reopen a closed card.
        metadata: { path: ['trustedSubmit'], equals: true },
      },
      select: { id: true },
    });
    if (!freshSubmit) continue;
    const result = await transitionStage(id, 'NEW', {
      via: 'reopen',
      onlyFrom: ['WON', 'LOST'],
    });
    if (result.moved) reopened++;
  }
  return reopened;
}

/** Rescore every boarded, still-open lead (daily decay). */
export async function sweepRescoreActive(): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: { pipelineStage: { in: [...ACTIVE_STAGES] } },
    select: { id: true },
    take: 500,
  });
  for (const { id } of leads) {
    await recomputeLeadScore(id).catch(() => undefined);
  }
  return leads.length;
}

export interface PipelineTickResult {
  enrolled: number;
  reopened: number;
  quoteSent: number;
  won: number;
  rescored: number;
}

/** One daily-cron tick. Order matters: enroll → reopen → quote → won → score. */
export async function runLeadPipelineTick(): Promise<PipelineTickResult> {
  const enrolled = await sweepEnrollSubmitted();
  const reopened = await sweepReopens();
  const quoteSent = await sweepQuoteSent();
  const won = await sweepWonMatches();
  const rescored = await sweepRescoreActive();
  return { enrolled, reopened, quoteSent, won, rescored };
}
