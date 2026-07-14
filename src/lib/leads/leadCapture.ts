/**
 * Lead capture service.
 *
 * Server-side glue that the public lead-event API + checkout/quote flows
 * call into to record visitor activity. Three concerns:
 *
 *   1. Find-or-create a VisitorSession by cookie id
 *   2. Find-or-create a Lead from email / phone / name
 *   3. Append LeadEvent rows for partial submits, page views, conversions
 *
 * Intentionally tolerant — never throws on missing fields. Returns the
 * mutated rows so callers can decide whether to set a fresh cookie.
 */
import { prisma } from '@/lib/database/client';
import type {
  Lead,
  LeadEventType,
  LeadSourceWidget,
  LeadStatus,
  VisitorSession,
} from '@prisma/client';
import { normalizeEmail } from './email-validation';
import { normPhone } from './phone';
import { enrollLeadIfEligible, handleSubmitSignal } from './pipeline';

export type IdentifyInput = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type LeadContext = {
  sourcePage?: string | null;
  sourceWidget?: LeadSourceWidget | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  /** Ad-platform click ids (gclid/gbraid/wbraid = Google, fbclid = Meta,
      msclkid = Bing). Persisted into Lead.metadata.attribution +
      VisitorSession.metadata — no dedicated columns. */
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  msclkid?: string | null;
};

const CLICK_ID_FIELDS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'] as const;

/** Compact `{gclid: "..."}` object of the click ids present in ctx, or null. */
function clickIdsFrom(ctx: LeadContext): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const key of CLICK_ID_FIELDS) {
    const value = nonEmpty(ctx[key]);
    if (value) out[key] = truncate(value, 200);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Merge click ids into a Json metadata bag under `attribution`, preserving
 * everything else already stored there (e.g. unifiedQuote from /quote/start).
 */
function mergeAttributionMetadata(
  existing: unknown,
  clickIds: Record<string, string>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prev =
    base.attribution &&
    typeof base.attribution === 'object' &&
    !Array.isArray(base.attribution)
      ? { ...(base.attribution as Record<string, unknown>) }
      : {};
  base.attribution = { ...prev, ...clickIds };
  return base;
}

const MAX_FIELD_VALUE_LEN = 1000;

// Email completeness lives in ./email-validation (a Prisma-free module so the
// browser capture widgets can share the same rule). `normalizeEmail` rejects
// mid-typing fragments like `an@` / `@gmail.com`, so a Lead is only ever
// keyed/created on a syntactically complete address.

// normPhone lives in ./phone (shared with the Lead Flow pipeline + order matching).

function nonEmpty(v?: string | null) {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

function truncate(v: string, n = MAX_FIELD_VALUE_LEN) {
  return v.length > n ? v.slice(0, n) : v;
}

/**
 * Find or create the visitor session row for this cookie id.
 * Bumps lastSeenAt + eventCount on every call.
 */
export async function getOrCreateSession(opts: {
  cookieId: string;
  landingPage?: string | null;
  referrer?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  utm?: LeadContext;
}): Promise<VisitorSession> {
  const existing = await prisma.visitorSession.findUnique({
    where: { cookieId: opts.cookieId },
  });
  if (existing) {
    return prisma.visitorSession.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: new Date(),
        eventCount: { increment: 1 },
      },
    });
  }
  const clickIds = opts.utm ? clickIdsFrom(opts.utm) : null;
  return prisma.visitorSession.create({
    data: {
      cookieId: opts.cookieId,
      landingPage: nonEmpty(opts.landingPage),
      referrer: nonEmpty(opts.referrer),
      ipAddress: nonEmpty(opts.ipAddress),
      userAgent: nonEmpty(opts.userAgent),
      utmSource: nonEmpty(opts.utm?.utmSource),
      utmMedium: nonEmpty(opts.utm?.utmMedium),
      utmCampaign: nonEmpty(opts.utm?.utmCampaign),
      utmContent: nonEmpty(opts.utm?.utmContent),
      utmTerm: nonEmpty(opts.utm?.utmTerm),
      ...(clickIds ? { metadata: { attribution: clickIds } as never } : {}),
      eventCount: 1,
    },
  });
}

/**
 * Find an existing Lead by email or phone, or null. Used to dedupe before
 * creating a new lead from a partial submit.
 */
export async function findLead(input: IdentifyInput): Promise<Lead | null> {
  const email = normalizeEmail(input.email);
  const phone = normPhone(input.phone);
  if (!email && !phone) return null;
  return prisma.lead.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean) as Array<{ email: string } | { phone: string }>,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Upsert a Lead from the given identification fields + context. Will:
 *   - look up by email or phone
 *   - update any newly-provided fields without overwriting existing ones
 *   - link the session row to the lead
 *
 * Returns null if there's no identifying info to anchor a lead on.
 */
export async function upsertLead(
  identify: IdentifyInput,
  ctx: LeadContext,
  session?: VisitorSession | null,
): Promise<Lead | null> {
  const email = normalizeEmail(identify.email);
  const phone = normPhone(identify.phone);
  const firstName = nonEmpty(identify.firstName);
  const lastName = nonEmpty(identify.lastName);
  if (!email && !phone && !firstName && !lastName) return null;

  // If we have email or phone, try to find an existing lead first.
  let lead: Lead | null = null;
  if (email || phone) {
    lead = await findLead({ email, phone });
  }

  // Fragment merge: no exact match, but a recent PARTIAL lead's email is
  // a strict prefix of this one ("x@gmail.co" captured while the visitor
  // was still typing "x@gmail.com"). Reuse that row and upgrade its
  // email to the fuller value instead of creating a keystroke sibling.
  // Bounded to PARTIAL rows from the last 24h with ≥6-char emails so a
  // short fragment can never hijack an unrelated address.
  let matchedByPrefix = false;
  if (!lead && email) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = await prisma.lead.findMany({
      where: {
        status: 'PARTIAL',
        createdAt: { gte: dayAgo },
        email: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    lead =
      candidates.find(
        (c) =>
          c.email != null &&
          c.email.length >= 6 &&
          c.email.length < email.length &&
          email.startsWith(c.email),
      ) ?? null;
    matchedByPrefix = lead != null;
  }

  const status: LeadStatus = 'PARTIAL';
  const clickIds = clickIdsFrom(ctx);

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        email,
        phone,
        firstName,
        lastName,
        status,
        sourcePage: nonEmpty(ctx.sourcePage),
        sourceWidget: ctx.sourceWidget ?? null,
        lastPage: nonEmpty(ctx.sourcePage),
        utmSource: nonEmpty(ctx.utmSource),
        utmMedium: nonEmpty(ctx.utmMedium),
        utmCampaign: nonEmpty(ctx.utmCampaign),
        utmContent: nonEmpty(ctx.utmContent),
        utmTerm: nonEmpty(ctx.utmTerm),
        ...(clickIds
          ? { metadata: { attribution: clickIds } as never }
          : {}),
      },
    });
  } else {
    // Only fill in blanks — never blow away existing data. Two exceptions:
    // click ids (latest ad click wins, merged under metadata.attribution)
    // and prefix-matched fragments (the fuller email replaces the fragment).
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        email: matchedByPrefix ? email : (lead.email ?? email),
        phone: lead.phone ?? phone,
        firstName: lead.firstName ?? firstName,
        lastName: lead.lastName ?? lastName,
        lastPage: nonEmpty(ctx.sourcePage) ?? lead.lastPage,
        sourceWidget: lead.sourceWidget ?? ctx.sourceWidget ?? null,
        utmSource: lead.utmSource ?? nonEmpty(ctx.utmSource),
        utmMedium: lead.utmMedium ?? nonEmpty(ctx.utmMedium),
        utmCampaign: lead.utmCampaign ?? nonEmpty(ctx.utmCampaign),
        utmContent: lead.utmContent ?? nonEmpty(ctx.utmContent),
        utmTerm: lead.utmTerm ?? nonEmpty(ctx.utmTerm),
        ...(clickIds
          ? {
              metadata: mergeAttributionMetadata(
                lead.metadata,
                clickIds,
              ) as never,
            }
          : {}),
      },
    });
  }

  // Link session ↔ lead.
  if (session && session.leadId !== lead.id) {
    await prisma.visitorSession.update({
      where: { id: session.id },
      data: { leadId: lead.id },
    });
  }

  return lead;
}

/**
 * Record an atomic event. Always succeeds with at least a sessionId or
 * leadId attached; if neither is provided this is a no-op.
 */
export async function recordEvent(opts: {
  type: LeadEventType;
  sessionId?: string | null;
  leadId?: string | null;
  page?: string | null;
  widget?: string | null;
  fieldName?: string | null;
  fieldValue?: string | null;
  metadata?: Record<string, unknown> | null;
  /**
   * Set ONLY by server-validated submit routes (chat, concierge, event-quiz,
   * quote/start). The public pixel route must never set this: event `type`
   * is client-chosen there, and a trusted submit is what re-opens WON/LOST
   * board cards — an anonymous caller must not be able to do that with a
   * victim's email (security review HIGH-1, 2026-07-13).
   */
  trustedSubmit?: boolean;
}) {
  if (!opts.sessionId && !opts.leadId) return null;
  const isSubmitType = opts.type === 'FORM_SUBMIT' || opts.type === 'CHECKOUT_START';
  const trusted = opts.trustedSubmit === true && isSubmitType;
  const event = await prisma.leadEvent.create({
    data: {
      type: opts.type,
      sessionId: opts.sessionId ?? null,
      leadId: opts.leadId ?? null,
      page: nonEmpty(opts.page),
      widget: nonEmpty(opts.widget),
      fieldName: nonEmpty(opts.fieldName),
      fieldValue: opts.fieldValue ? truncate(opts.fieldValue) : null,
      // Trusted submits are stamped so the reopen cron sweep can require
      // server-originated proof, not just a client-claimed FORM_SUBMIT.
      metadata: (trusted
        ? { ...(opts.metadata ?? {}), trustedSubmit: true }
        : (opts.metadata ?? null)) as never,
    },
  });
  // Lead Flow board bookkeeping — must never break capture (module contract:
  // intentionally tolerant).
  if (opts.leadId) {
    try {
      // Board cards + scoring read this instead of scanning lead_events.
      await prisma.lead.update({
        where: { id: opts.leadId },
        data: { lastActivityAt: new Date() },
      });
      // A real (server-validated) submit enrolls a new card / re-opens a
      // WON-LOST one as NEW.
      if (trusted) {
        await handleSubmitSignal(opts.leadId);
      }
    } catch (err) {
      console.warn('[leadCapture] pipeline bookkeeping failed', err);
    }
  }
  return event;
}

/**
 * Mark a lead as SUBMITTED (full form sent) or CONVERTED (paid).
 * Stamps resume-cart payload if provided so AI chat can offer "finish your
 * order" later.
 */
export async function markLeadStatus(
  leadId: string,
  status: LeadStatus,
  extras?: {
    resumeCart?: unknown;
    draftOrderId?: string | null;
    orderId?: string | null;
  },
) {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      resumeCart:
        extras?.resumeCart !== undefined ? (extras.resumeCart as never) : undefined,
      draftOrderId: extras?.draftOrderId ?? undefined,
      orderId: extras?.orderId ?? undefined,
    },
  });
  // Lead Flow board: a pixel-driven SUBMITTED promotion happens AFTER its
  // recordEvent call (see landing/lead-event), so enroll here too. Idempotent;
  // never breaks the caller.
  if (status === 'SUBMITTED') {
    try {
      await enrollLeadIfEligible(leadId);
    } catch (err) {
      console.warn('[leadCapture] board enroll failed', err);
    }
  }
  return lead;
}
