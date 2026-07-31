/**
 * Follow-up email system — journey registry.
 *
 * Single source of truth for every follow-up journey (registry pattern like
 * src/lib/analytics/landing-pages.ts). Each journey: a feature flag, up to
 * two steps for consumer journeys (Allan's locked 2-touch max; B2B
 * partner-outreach runs 3), and a shouldCancel check the engine runs with
 * FRESH database reads just before sending — the enqueue-time state of the
 * world is never trusted at send time.
 *
 * Cancel reasons are short kebab-case strings stored on the job for the admin
 * dashboard (Phase 4).
 */

import type { FollowUpJob } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { FEATURE_FLAGS } from '@/lib/features/feature-flags';
import { entityIdFromDedupeKey, type JourneyDef, type JourneyKey } from './types';
import { PARTNER_OUTREACH_SIGNATURE, buildStepEmail, renderFollowUpEmail } from './copy';
import { getSendableDraft } from '@/lib/partners/prospect-store';

/**
 * Step renderer: default copy lives in copy.ts (DEFAULT_COPY); admin
 * overrides arrive via ctx.copyOverrides (fetched once per engine tick).
 */
const step = (journeyKey: JourneyKey, n: number) => (ctx: Parameters<typeof buildStepEmail>[2]) =>
  buildStepEmail(journeyKey, n, ctx);

/** Draft statuses that mean "this email is already in an active sales motion". */
const ACTIVE_DRAFT_STATUSES = ['SENT', 'VIEWED', 'PAID', 'CONVERTED'] as const;

async function activeDraftExistsForEmail(
  email: string,
  since?: Date
): Promise<boolean> {
  const draft = await prisma.draftOrder.findFirst({
    where: {
      customerEmail: { equals: email, mode: 'insensitive' },
      status: { in: [...ACTIVE_DRAFT_STATUSES] },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: { id: true },
  });
  return draft !== null;
}

/**
 * NOTE: group-order-host journey is intentionally ABSENT. Deferred in the
 * approved plan (Phase-3 decision): hosts already convert to Orders, the
 * journey overlaps post-purchase-review, and there is no Lead integration —
 * needs a precedence rule from Allan before it exists.
 */
export const JOURNEYS: JourneyDef[] = [
  {
    key: 'abandoned-quote',
    label: 'Abandoned quote',
    description:
      'Email captured in the drink calculator / package builder / quick buy, but no draft or order followed. Saved-numbers resume at +24h, personal offer at +96h.',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_ABANDONED_QUOTE,
    phase: 1,
    steps: [
      { delayHours: 24, buildEmail: step('abandoned-quote', 1) },
      { delayHours: 96, buildEmail: step('abandoned-quote', 2) },
    ],
    shouldCancel: async (job: FollowUpJob) => {
      if (job.leadId) {
        const lead = await prisma.lead.findUnique({ where: { id: job.leadId } });
        if (!lead) return 'lead-missing';
        if (lead.status !== 'PARTIAL') return `lead-${lead.status.toLowerCase()}`;
        if (lead.draftOrderId || lead.orderId) return 'lead-linked-to-order';
      }
      // Recent drafts only — a repeat customer's converted draft from months
      // ago is not an active conversation and must not kill this journey.
      const recentDraftSince = new Date(job.createdAt.getTime() - 30 * 24 * 3_600_000);
      if (await activeDraftExistsForEmail(job.email, recentDraftSince)) return 'draft-exists';
      // Precedence: if an unpaid-invoice conversation is running for this
      // email, that journey owns the thread.
      const invoiceJob = await prisma.followUpJob.findFirst({
        where: {
          journeyKey: 'unpaid-invoice',
          email: job.email,
          status: { in: ['scheduled', 'processing', 'sent'] },
        },
        select: { id: true },
      });
      if (invoiceJob) return 'unpaid-invoice-precedence';
      return null;
    },
  },
  {
    key: 'unpaid-invoice',
    label: 'Unpaid invoice',
    description:
      'Quote/invoice sent but not paid (non-group, non-amendment). "Holding your date?" at +24h from send, "closing this out?" at +120h.',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_UNPAID_INVOICE,
    phase: 1,
    steps: [
      { delayHours: 24, buildEmail: step('unpaid-invoice', 1) },
      { delayHours: 120, buildEmail: step('unpaid-invoice', 2) },
    ],
    shouldCancel: async (job: FollowUpJob) => {
      if (!job.draftOrderId) return 'missing-draft-ref';
      const draft = await prisma.draftOrder.findUnique({
        where: { id: job.draftOrderId },
      });
      if (!draft) return 'draft-missing';
      if (['PAID', 'CONVERTED', 'CANCELLED', 'EXPIRED'].includes(draft.status)) {
        return `draft-${draft.status.toLowerCase()}`;
      }
      if (draft.groupOrderId || draft.amendmentForOrderId) return 'group-or-amendment';
      return null; // paid order under another email → engine's global guard
    },
  },
  {
    key: 'partner-inquiry',
    label: 'Partner inquiry',
    description:
      'B2B partnership inquiry: personal ack on the next tick, calendar nudge at +96h. Vacation-rental one-pager placements start at step 2 (the one-pager email already sends).',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_PARTNER_INQUIRY,
    phase: 2,
    // B2B thread — an unrelated consumer order from the same person must not
    // kill the partnership conversation.
    skipGlobalPaidGuard: true,
    steps: [
      { delayHours: 0, buildEmail: step('partner-inquiry', 1) },
      { delayHours: 96, buildEmail: step('partner-inquiry', 2) },
    ],
    shouldCancel: async (job: FollowUpJob) => {
      if (!job.partnerInquiryId) return 'missing-inquiry-ref';
      const inquiry = await prisma.partnerInquiry.findUnique({
        where: { id: job.partnerInquiryId },
      });
      if (!inquiry) return 'inquiry-missing';
      if (inquiry.meetingBooked) return 'meeting-booked';
      if (inquiry.status !== 'new') return `inquiry-${inquiry.status.toLowerCase()}`;
      return null;
    },
  },
  {
    key: 'contact-form',
    label: 'Contact form',
    description:
      'General /contact submissions: ack on the next tick, "did my reply reach you?" at +72h. Step 2 cannot see Allan\'s real replies — copy tolerates that, and the admin cancel button exists.',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_CONTACT_FORM,
    phase: 2,
    steps: [
      { delayHours: 0, buildEmail: step('contact-form', 1) },
      { delayHours: 72, buildEmail: step('contact-form', 2) },
    ],
    shouldCancel: async (job: FollowUpJob) => {
      if (job.leadId) {
        const lead = await prisma.lead.findUnique({ where: { id: job.leadId } });
        if (lead?.status === 'CONVERTED') return 'lead-converted';
      }
      // A draft sent after they wrote in means the conversation moved to the
      // invoice flow.
      if (await activeDraftExistsForEmail(job.email, job.createdAt)) {
        return 'draft-in-flight';
      }
      return null;
    },
  },
  {
    key: 'newsletter-welcome',
    label: 'Newsletter welcome',
    description:
      'Single welcome ~1h after double-opt-in confirmation. Cancels only on suppression.',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_NEWSLETTER_WELCOME,
    phase: 2,
    steps: [{ delayHours: 1, buildEmail: step('newsletter-welcome', 1) }],
    shouldCancel: async () => null,
  },
  {
    key: 'affiliate-apply',
    label: 'Affiliate application',
    description:
      'Partner program application: ack on the next tick, check-in at +120h while still pending.',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_AFFILIATE_APPLY,
    phase: 2,
    // B2B thread, same rationale as partner-inquiry.
    skipGlobalPaidGuard: true,
    steps: [
      { delayHours: 0, buildEmail: step('affiliate-apply', 1) },
      { delayHours: 120, buildEmail: step('affiliate-apply', 2) },
    ],
    shouldCancel: async (job: FollowUpJob) => {
      const applicationId = entityIdFromDedupeKey(job.dedupeKey);
      const application = await prisma.partnerApplication.findUnique({
        where: { id: applicationId },
      });
      if (!application) return 'application-missing';
      if (application.status !== 'PENDING') {
        return `application-${application.status.toLowerCase()}`;
      }
      return null;
    },
  },
  {
    key: 'event-quiz',
    label: 'Event quiz nudge',
    description:
      'Quiz submitters already get an instant welcome — this journey is the +96h "did the plan land?" nudge only (jobs start at step 2).',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_EVENT_QUIZ,
    phase: 3,
    steps: [
      // Step 1 slot exists for shape consistency but is never enqueued —
      // the instant welcome in /api/v1/event-quiz/submit is touch #1.
      { delayHours: 0, buildEmail: () => null },
      { delayHours: 96, buildEmail: step('event-quiz', 2) },
    ],
    shouldCancel: async (job: FollowUpJob) => {
      if (job.leadId) {
        const lead = await prisma.lead.findUnique({ where: { id: job.leadId } });
        if (lead?.status === 'CONVERTED') return 'lead-converted';
      }
      return null;
    },
  },
  {
    key: 'post-purchase-review',
    label: 'Post-purchase review ask',
    description:
      'Single review ask +48h after delivery. Mutually deduped with the manual GHL review route via Order.reviewRequestSentAt — whichever sends first stamps it.',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_POST_PURCHASE_REVIEW,
    phase: 3,
    // The trigger IS a paid order — the global paid guard would cancel every job.
    skipGlobalPaidGuard: true,
    steps: [{ delayHours: 48, buildEmail: step('post-purchase-review', 1) }],
    shouldCancel: async (job: FollowUpJob) => {
      if (!job.orderId) return 'missing-order-ref';
      const order = await prisma.order.findUnique({ where: { id: job.orderId } });
      if (!order) return 'order-missing';
      if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
        return `order-${order.status.toLowerCase()}`;
      }
      if (order.reviewRequestSentAt) return 'review-already-requested';
      return null;
    },
    afterSend: async (job: FollowUpJob) => {
      if (!job.orderId) return;
      // Stamp only if still unstamped — the manual GHL route may have won the race.
      await prisma.order.updateMany({
        where: { id: job.orderId, reviewRequestSentAt: null },
        data: { reviewRequestSentAt: new Date() },
      });
    },
  },
  {
    key: 'partner-outreach',
    label: 'Partner outreach',
    description:
      'B2B campaign to the partner-prospect database: approved personalized email on enroll, open-branched touch 2 at +5d (no open → resend under the alternate subject; opened → substantive bump), standalone close at +12d. ≤10 sends/day (all touches). Flag OFF until Allan or Brian approves sends.',
    featureFlag: FEATURE_FLAGS.FOLLOWUPS_PARTNER_OUTREACH,
    phase: 3,
    // Prospects may also be past customers — a paid order says nothing
    // about this B2B conversation.
    skipGlobalPaidGuard: true,
    from: {
      email: process.env.PARTNER_OUTREACH_FROM_EMAIL || 'info@partyondelivery.com',
      name: 'Allan at Party On Delivery',
    },
    steps: [
      {
        delayHours: 0,
        // Step 1 = the APPROVED draft from partner_prospects, read fresh at
        // send time so edits ship without re-enrolling (payloads are clamped
        // to 200 chars — copy can never ride in the payload). Drafts are
        // stored signature-free; the renderer signs as Allan. The generic
        // template only ever fires for legacy jobs with no website payload —
        // shouldCancel kills anything whose draft is no longer approved.
        buildEmail: async (ctx) => {
          const website = typeof ctx.payload.website === 'string' ? ctx.payload.website : null;
          const draft = website ? await getSendableDraft(website) : null;
          if (draft) {
            return renderFollowUpEmail(draft.subject, draft.body, ctx.unsubscribeUrl, PARTNER_OUTREACH_SIGNATURE);
          }
          return buildStepEmail('partner-outreach', 1, ctx);
        },
      },
      {
        // +5 days, open-branched: no open recorded on touch 1 → resend the
        // SAME body under the alternate subject (fresh thread); opened but
        // unanswered → the substantive bump as a reply. Opens are directional
        // (MPP inflates, image-blocking hides) — both branches are safe.
        delayHours: 120,
        buildEmail: async (ctx) => {
          const website = typeof ctx.payload.website === 'string' ? ctx.payload.website : null;
          const draft = website ? await getSendableDraft(website) : null;
          if (!draft) return buildStepEmail('partner-outreach', 2, ctx);

          const step1 = ctx.job.leadId
            ? await prisma.followUpJob.findFirst({
                where: {
                  journeyKey: 'partner-outreach',
                  step: 1,
                  leadId: ctx.job.leadId,
                  status: 'sent',
                },
                select: { emailLogId: true },
              })
            : null;
          const log = step1?.emailLogId
            ? await prisma.emailLog.findUnique({
                where: { id: step1.emailLogId },
                select: { openedAt: true },
              })
            : null;

          if (!log?.openedAt) {
            // No open recorded (or no log at all) — fresh-thread resend.
            return renderFollowUpEmail(
              draft.altSubject ?? draft.subject,
              draft.body,
              ctx.unsubscribeUrl,
              PARTNER_OUTREACH_SIGNATURE
            );
          }
          if (!draft.followUpBody) return null;
          return renderFollowUpEmail(
            `Re: ${draft.subject}`,
            draft.followUpBody,
            ctx.unsubscribeUrl,
            PARTNER_OUTREACH_SIGNATURE
          );
        },
      },
      {
        // +7 more days (= day 12): standalone ≤90-word soft close.
        delayHours: 168,
        buildEmail: async (ctx) => {
          const website = typeof ctx.payload.website === 'string' ? ctx.payload.website : null;
          const draft = website ? await getSendableDraft(website) : null;
          if (!draft?.touch3Body) return null;
          return renderFollowUpEmail(
            draft.subject,
            draft.touch3Body,
            ctx.unsubscribeUrl,
            PARTNER_OUTREACH_SIGNATURE
          );
        },
      },
    ],
    shouldCancel: async (job: FollowUpJob) => {
      if (!job.leadId) return 'missing-lead-ref';
      const lead = await prisma.lead.findUnique({
        where: { id: job.leadId },
        select: { pipelineStage: true, tags: true },
      });
      if (!lead) return 'lead-missing';
      if (lead.pipelineStage === 'WON') return 'lead-won';
      if (lead.pipelineStage === 'LOST') return 'lead-lost';
      if (lead.tags.includes('partner-active')) return 'already-active-partner';
      // They replied — a human owns the thread now. Deliberately ANY inbound
      // ever, NOT the campaign-scoped rule the UI/metrics use
      // (src/lib/partners/campaign-status.ts): this is a send-safety guard,
      // and over-canceling (skipping an automated touch because the prospect
      // once emailed us about something else) is the safe direction.
      const reply = await prisma.inboundEmail.findFirst({
        where: { leadId: job.leadId },
        select: { id: true },
      });
      if (reply) return 'replied';
      // Un-approved between enroll and send (edit, request-redraft, …) —
      // every remaining touch dies until it is re-approved.
      const payload = (job.payload ?? {}) as Record<string, unknown>;
      const website = typeof payload.website === 'string' ? payload.website : null;
      if (website && !(await getSendableDraft(website))) return 'draft-not-approved';
      return null;
    },
  },
];

const JOURNEY_MAP = new Map(JOURNEYS.map((j) => [j.key, j]));

/** Look up a journey definition; undefined for unknown keys. */
export function getJourney(key: string): JourneyDef | undefined {
  return JOURNEY_MAP.get(key as JourneyKey);
}

export const JOURNEY_KEYS: JourneyKey[] = JOURNEYS.map((j) => j.key);
