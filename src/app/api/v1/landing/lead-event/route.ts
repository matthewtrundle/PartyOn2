/**
 * POST /api/v1/landing/lead-event
 *
 * Public endpoint called from the browser whenever a visitor:
 *   - types in a form field (FIELD_BLUR)
 *   - views a page (PAGE_VIEW — also handled by /visitor-pixel)
 *   - completes a step in a modal (STEP_COMPLETE)
 *   - submits a form (FORM_SUBMIT)
 *
 * Body is intentionally permissive: missing fields are OK. The endpoint:
 *   1. Ensures a `pod_vsid` cookie + VisitorSession row
 *   2. Upserts a Lead if any identifiable field (email/phone/name) is present
 *   3. Inserts a LeadEvent row
 *
 * Returns the leadId / sessionId so the client can stash them for later
 * cart-resume / chat-bubble flows.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getOrCreateSession,
  recordEvent,
  upsertLead,
  markLeadStatus,
} from '@/lib/leads/leadCapture';
import { ensureVisitorCookie, COOKIE_NAME } from '@/lib/leads/cookie';
import { enqueueJourney } from '@/lib/followups/enqueue';
import type {
  LeadEventType,
  LeadSourceWidget,
  LeadStatus,
} from '@prisma/client';

/** Widgets whose partial captures feed the abandoned-quote follow-up journey. */
const ABANDONED_QUOTE_WIDGETS = new Set(['DRINK_CALCULATOR', 'PACKAGE_BUILDER', 'QUICK_BUY']);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const widgetEnum = z.enum([
  'QUICK_BUY',
  'PACKAGE_BUILDER',
  'A_LA_CARTE',
  'CALL_BOOKING',
  'EMAIL_SIGNUP',
  'CONTACT_FORM',
  'DRINK_CALCULATOR',
  'OTHER',
]);

const eventTypeEnum = z.enum([
  'PAGE_VIEW',
  'FIELD_FOCUS',
  'FIELD_BLUR',
  'STEP_COMPLETE',
  'CART_ADD',
  'FORM_SUBMIT',
  'CHECKOUT_START',
  'CONVERSION',
  'CUSTOM',
]);

const statusEnum = z.enum([
  'ANONYMOUS',
  'PARTIAL',
  'SUBMITTED',
  'CONVERTED',
  'ARCHIVED',
]);

const bodySchema = z.object({
  type: eventTypeEnum,
  page: z.string().max(500).optional().nullable(),
  widget: widgetEnum.optional().nullable(),
  fieldName: z.string().max(80).optional().nullable(),
  fieldValue: z.string().max(2000).optional().nullable(),
  identify: z
    .object({
      email: z.string().max(200).optional().nullable(),
      phone: z.string().max(40).optional().nullable(),
      firstName: z.string().max(80).optional().nullable(),
      lastName: z.string().max(80).optional().nullable(),
    })
    .optional(),
  utm: z
    .object({
      utmSource: z.string().max(200).optional().nullable(),
      utmMedium: z.string().max(200).optional().nullable(),
      utmCampaign: z.string().max(200).optional().nullable(),
      utmContent: z.string().max(200).optional().nullable(),
      utmTerm: z.string().max(200).optional().nullable(),
      // Ad-platform click ids — persisted to Lead/VisitorSession metadata.
      gclid: z.string().max(200).optional().nullable(),
      gbraid: z.string().max(200).optional().nullable(),
      wbraid: z.string().max(200).optional().nullable(),
      fbclid: z.string().max(200).optional().nullable(),
      msclkid: z.string().max(200).optional().nullable(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  // For FORM_SUBMIT / CHECKOUT_START — promotes the lead status.
  setStatus: statusEnum.optional(),
  // Snapshot of the in-flight cart for "resume your order" flows.
  resumeCart: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', detail: String(err) },
      { status: 400 },
    );
  }

  const { cookieId, isNew } = ensureVisitorCookie(req);

  // Pull a few hints off the request.
  const referrer = req.headers.get('referer');
  const userAgent = req.headers.get('user-agent');
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;

  const session = await getOrCreateSession({
    cookieId,
    landingPage: parsed.page ?? null,
    referrer,
    ipAddress,
    userAgent,
    utm: parsed.utm ?? {},
  });

  const lead = await upsertLead(
    parsed.identify ?? {},
    {
      sourcePage: parsed.page ?? null,
      sourceWidget: (parsed.widget ?? null) as LeadSourceWidget | null,
      ...parsed.utm,
    },
    session,
  );

  await recordEvent({
    type: parsed.type as LeadEventType,
    sessionId: session.id,
    leadId: lead?.id ?? null,
    page: parsed.page ?? null,
    widget: parsed.widget ?? null,
    fieldName: parsed.fieldName ?? null,
    fieldValue: parsed.fieldValue ?? null,
    metadata: parsed.metadata ?? null,
  });

  if (lead && parsed.setStatus) {
    await markLeadStatus(lead.id, parsed.setStatus as LeadStatus, {
      resumeCart: parsed.resumeCart,
    });
  }

  // Abandoned-quote follow-up: an email captured in a quote-building widget
  // with no order behind it queues the +24h journey. Deduped on lead id, so
  // repeated field-blur events are no-ops; the engine re-checks lead status,
  // drafts, and orders with fresh reads before actually sending — and the
  // journey's feature flag stays off until Allan enables it.
  const email = lead?.email ?? parsed.identify?.email ?? null;
  const promotedBeyondPartial = parsed.setStatus && parsed.setStatus !== 'PARTIAL';
  if (
    lead &&
    email &&
    lead.status === 'PARTIAL' &&
    !promotedBeyondPartial &&
    !lead.draftOrderId &&
    !lead.orderId &&
    parsed.widget &&
    ABANDONED_QUOTE_WIDGETS.has(parsed.widget)
  ) {
    try {
      const metadata = (parsed.metadata ?? {}) as Record<string, unknown>;
      const rawGuestCount = String(metadata.guestCount ?? metadata.guests ?? '');
      await enqueueJourney('abandoned-quote', {
        email,
        entityId: lead.id,
        leadId: lead.id,
        phone: lead.phone ?? parsed.identify?.phone ?? null,
        payload: {
          firstName: lead.firstName ?? parsed.identify?.firstName ?? null,
          resumePath: parsed.page ?? '/order',
          // Digits only — this value is quoted verbatim inside email copy.
          guestCount: /^\d{1,4}$/.test(rawGuestCount) ? rawGuestCount : null,
        },
      });
    } catch (err) {
      // Follow-up queueing must never break lead capture.
      console.warn('[lead-event] abandoned-quote enqueue failed', err);
    }
  }

  const res = NextResponse.json({
    ok: true,
    sessionId: session.id,
    leadId: lead?.id ?? null,
  });
  if (isNew) {
    res.cookies.set(COOKIE_NAME, cookieId, {
      httpOnly: false, // readable by JS so the pixel can attach it to fetch headers
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }
  return res;
}
