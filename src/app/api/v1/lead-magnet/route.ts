/**
 * POST /api/v1/lead-magnet
 *
 * Server endpoint called from the LeadMagnetModal when someone submits
 * the popup. Three jobs:
 *
 *   1. Own the Lead row (2026-07-13 audit gap): a phone-carrying submit is
 *      real party intent → sourceWidget LEAD_MAGNET + SUBMITTED (boards);
 *      an email-only submit stays EMAIL_SIGNUP (newsletter-only, off-board —
 *      'leadMagnet' is deliberately NOT an inquiry metadata key). The client
 *      pixel previously owned this and misfiled everything as EMAIL_SIGNUP.
 *   2. Send the welcome email via Resend (delivers the reward link)
 *   3. Return ok=true so the modal can transition to the success state
 *
 * Silent failure mode: if Resend isn't configured (no RESEND_API_KEY),
 * we log and return ok=true anyway so the UX still completes. The lead
 * row is still created — Brian can manually follow up.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/resend-client';
import { leadMagnetEmail } from '@/lib/email/templates/lead-magnet';
import { markLeadStatus, upsertLead } from '@/lib/leads/leadCapture';
import { enrollLeadIfEligible } from '@/lib/leads/pipeline';
import { attributionSchema, compactAttribution } from '@/lib/leads/attribution-schema';
import { prisma } from '@/lib/database/client';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { EmailType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  firstName: z.string().min(1).max(80),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  magnetId: z.string().max(80),
  magnetTitle: z.string().max(200),
  rewardUrl: z.string().max(500),
  rewardCta: z.string().max(80).optional().nullable(),
  // Discount code lands in the welcome-email HTML — constrain to a safe
  // charset so it can't smuggle markup into the template.
  rewardCode: z
    .string()
    .regex(/^[A-Z0-9_-]{2,40}$/)
    .optional()
    .nullable(),
  /** First-touch UTM + ad click ids captured client-side (optional). */
  attribution: attributionSchema,
});

export async function POST(req: NextRequest) {
  // Public + unauthenticated: this route both writes a Lead and sends real
  // email to a caller-supplied address. Without a cap it's an email-bomb
  // primitive (via our own Resend domain) + a board-spam vector. Same
  // helper/shape as /api/contact and /api/v1/landing/lead-event.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (!(await checkRateLimit('lead-magnet', ip, 5, 60))) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'invalid_body', detail: String(err) },
      { status: 400 },
    );
  }

  // ─── Own the Lead row (before the email — system of record first) ────
  try {
    const hasPhone = Boolean(body.phone && body.phone.trim());
    const lead = await upsertLead(
      { email: body.email, phone: body.phone ?? null, firstName: body.firstName },
      {
        sourcePage: '/lead-magnet',
        sourceWidget: hasPhone ? 'LEAD_MAGNET' : 'EMAIL_SIGNUP',
        // UTM columns blank-fill + click ids merge into metadata.attribution.
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
      },
    );
    if (lead) {
      const prevMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
      const prevAttribution: Record<string, string> =
        prevMeta.attribution &&
        typeof prevMeta.attribution === 'object' &&
        !Array.isArray(prevMeta.attribution)
          ? (prevMeta.attribution as Record<string, string>)
          : {};
      // Phone present ⇒ claim provenance even over EMAIL_SIGNUP (the client
      // pixel stamps that on this very lead while they type) — but never
      // over a real inquiry widget.
      const upgradeWidget =
        hasPhone &&
        (lead.sourceWidget === null ||
          lead.sourceWidget === 'OTHER' ||
          lead.sourceWidget === 'EMAIL_SIGNUP');
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          ...(upgradeWidget ? { sourceWidget: 'LEAD_MAGNET' } : {}),
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
            leadMagnet: {
              magnetId: body.magnetId,
              magnetTitle: body.magnetTitle,
              submittedAt: new Date().toISOString(),
              ...(body.rewardCode ? { rewardCode: body.rewardCode } : {}),
            },
          },
        },
      });
      if (hasPhone) {
        if (lead.status === 'PARTIAL' || lead.status === 'ANONYMOUS') {
          await markLeadStatus(lead.id, 'SUBMITTED');
        } else {
          await enrollLeadIfEligible(lead.id);
        }
      }
    }
  } catch (err) {
    console.warn('[lead-magnet] lead mirror failed', err);
  }

  const { subject, html, text } = leadMagnetEmail({
    firstName: body.firstName,
    magnetTitle: body.magnetTitle,
    rewardUrl: body.rewardUrl,
    rewardCta: body.rewardCta ?? undefined,
    rewardCode: body.rewardCode ?? undefined,
  });

  try {
    // Reuse the existing WELCOME EmailType so we don't have to migrate
    // the EmailType enum. Metadata tags this as a lead-magnet send for
    // analytics + opt-out tracking.
    await sendEmail({
      to: body.email,
      subject,
      html,
      text,
      type: EmailType.WELCOME,
      metadata: {
        flow: 'lead-magnet',
        magnetId: body.magnetId,
        rewardUrl: body.rewardUrl,
        ...(body.rewardCode ? { rewardCode: body.rewardCode } : {}),
      },
      tags: [
        { name: 'flow', value: 'lead_magnet' },
        { name: 'magnet_id', value: body.magnetId.replace(/[^a-zA-Z0-9_-]/g, '_') },
      ],
    });
  } catch (err) {
    console.error('[lead-magnet] email send failed', err);
    // Don't 500 — the lead row is already created on the client; we just
    // failed to deliver the email. Brian can retry manually.
  }

  return NextResponse.json({ ok: true });
}
