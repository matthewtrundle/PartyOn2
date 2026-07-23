/**
 * POST /api/v1/partner/lead
 *
 * Cross-domain lead intake for partner websites (Premier Party Cruises
 * first; any future partner site can use it with its own `partner`
 * slug). When a visitor fills out a form on the partner's site, the
 * partner's frontend POSTs here and the lead lands in POD's Brian's
 * Stuff → Leads exactly like a native form submit.
 *
 * Pipeline (side effects AWAITED — Vercel kills un-awaited promises on
 * response return):
 *   1. Honeypot + rate limit + Zod validation.
 *   2. upsertLead — sourceWidget PARTNER_LANDING_PAGE, metadata.partner
 *      = the partner slug, metadata.partnerLead = the raw form payload.
 *      Status → SUBMITTED (a partner form submit is a full submit).
 *   3. recordEvent(FORM_SUBMIT).
 *   4. Mirror to the "POD Leads" Google Sheet (source `partner:<slug>`).
 *
 * CORS is intentionally open (same policy as /api/v1/concierge/lead) so
 * partner sites on their own domains can POST directly from the
 * browser. Honeypot + per-IP rate limit are the abuse controls.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { upsertLead, recordEvent } from '@/lib/leads/leadCapture';
import { attributionSchema, compactAttribution } from '@/lib/leads/attribution-schema';
import { resolveAffiliateId } from '@/lib/leads/affiliate-resolve';
import { isHoneypotTripped } from '@/lib/forms/honeypot';
import { checkRateLimit } from '@/lib/security/rate-limit';
import {
  mirrorLeadToSheet,
} from '@/lib/premier/pod-leads-sheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Partners allowed to post leads. Add a slug here when a new partner
 *  site integrates — keeps random third parties from tagging leads
 *  with arbitrary partner names. */
const KNOWN_PARTNERS = new Set(['premier-party-cruises', 'premier-concierge-site']);

const bodySchema = z.object({
  /** Which partner site sent this — must be in KNOWN_PARTNERS. */
  partner: z.string().min(1).max(60),
  /** Which form on the partner site (e.g. 'boat-booking', 'contact'). */
  formName: z.string().max(80).optional().default('contact'),
  /** Path on the partner site where the form lives. */
  sourcePage: z.string().max(300).optional().default(''),
  firstName: z.string().max(80).optional().default(''),
  lastName: z.string().max(80).optional().default(''),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  /** Event details — all optional; send what the form collects. */
  eventDate: z.string().max(40).optional().default(''),
  eventType: z.string().max(80).optional().default(''),
  headcount: z.union([z.number().int().min(0).max(5000), z.string().max(20)]).optional(),
  message: z.string().max(4000).optional().default(''),
  /** First-touch UTMs/click ids if the partner site captures them. */
  attribution: attributionSchema,
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  // ─── Abuse controls ───────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (!(await checkRateLimit('partner-lead', ip, 5, 60))) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const hp = isHoneypotTripped(raw as Record<string, unknown>);
  if (hp.tripped) {
    // Pretend success so bots don't learn which field tripped.
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid_body', issues: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const body = parsed.data;

  if (!KNOWN_PARTNERS.has(body.partner)) {
    return NextResponse.json(
      { ok: false, error: 'unknown_partner' },
      { status: 403, headers: CORS_HEADERS },
    );
  }
  // A lead we can't contact is noise — require email or phone.
  if (!body.email && !body.phone) {
    return NextResponse.json(
      { ok: false, error: 'email_or_phone_required' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const sourcePage = `partner:${body.partner}${body.sourcePage || ''}`;

  // ─── Lead upsert + metadata ───────────────────────────────────
  let leadId: string | null = null;
  try {
    const lead = await upsertLead(
      {
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        email: body.email ?? null,
        phone: body.phone ?? null,
      },
      {
        sourcePage,
        sourceWidget: 'PARTNER_LANDING_PAGE',
        utmSource: body.attribution?.utmSource,
        utmMedium: body.attribution?.utmMedium,
        utmCampaign: body.attribution?.utmCampaign,
        utmContent: body.attribution?.utmContent,
        utmTerm: body.attribution?.utmTerm,
        gclid: body.attribution?.gclid,
        gbraid: body.attribution?.gbraid,
        wbraid: body.attribution?.wbraid,
        fbclid: body.attribution?.fbclid,
        msclkid: body.attribution?.msclkid,
        // Partner slug → Affiliate stamp (fill-blank; premier-party-cruises
        // etc. resolve via Affiliate.partnerSlug).
        affiliateId: await resolveAffiliateId(body.partner),
      },
    );
    if (lead) {
      leadId = lead.id;
      const prevMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
      const prevAttribution =
        prevMeta.attribution &&
        typeof prevMeta.attribution === 'object' &&
        !Array.isArray(prevMeta.attribution)
          ? (prevMeta.attribution as Record<string, unknown>)
          : {};
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'SUBMITTED',
          sourcePage,
          sourceWidget: 'PARTNER_LANDING_PAGE',
          metadata: {
            ...prevMeta,
            ...(body.attribution
              ? {
                  attribution: {
                    ...prevAttribution,
                    ...compactAttribution(body.attribution),
                  },
                }
              : {}),
            partner: body.partner,
            partnerLead: {
              formName: body.formName,
              sourcePage: body.sourcePage,
              eventDate: body.eventDate,
              eventType: body.eventType,
              headcount: body.headcount ?? null,
              message: body.message,
              submittedAt: new Date().toISOString(),
            },
          } as never,
        },
      });
      await recordEvent({
        type: 'FORM_SUBMIT',
        leadId: lead.id,
        page: sourcePage,
        widget: 'PARTNER_LANDING_PAGE',
        fieldName: `partner-${body.formName}`,
        metadata: {
          flow: 'partner-lead',
          partner: body.partner,
          formName: body.formName,
        },
      });
    }
  } catch (err) {
    console.error('[partner/lead] upsertLead failed', err);
  }

  // ─── Sheet mirror — AWAITED ───────────────────────────────────
  await mirrorLeadToSheet({
    source: `partner:${body.partner}`,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email ?? '',
    phone: body.phone ?? '',
    arrivalDate: body.eventDate,
    partyType: body.eventType,
    headcount: body.headcount != null ? String(body.headcount) : '',
    notes: [body.formName ? `form: ${body.formName}` : '', body.message.slice(0, 300)]
      .filter(Boolean)
      .join(' · '),
    leadUrl: leadId
      ? `https://partyondelivery.com/admin/brians-stuff?tab=leads&lead=${leadId}`
      : '',
  });

  return NextResponse.json({ ok: true, leadId }, { headers: CORS_HEADERS });
}
