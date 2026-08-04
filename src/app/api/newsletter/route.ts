/**
 * POST /api/newsletter
 *
 * Backs the footer + blog "Subscribe" forms with a DOUBLE OPT-IN flow:
 *   1. Persist the email as a Lead (canonical lead store), EMAIL_SIGNUP widget.
 *   2. Stamp a `metadata.newsletter` opt-in record with status 'pending' + a
 *      single-use confirm token.
 *   3. Email the subscriber a confirmation link. They are NOT marked confirmed
 *      and NOT synced to the CRM until they click it (see ./confirm).
 *
 * Idempotent: re-subscribing updates the existing Lead; an already-confirmed
 * address is acknowledged without re-sending.
 *
 * (Previously this route was a stub that only console.log'd the email, so every
 * newsletter signup from the live site was silently discarded.)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { upsertLead, recordEvent } from '@/lib/leads/leadCapture';
import { attributionSchema } from '@/lib/leads/attribution-schema';
import { sendEmail } from '@/lib/email/resend-client';
import { newsletterConfirmEmail } from '@/lib/email/templates/newsletter-confirm';
import { prisma } from '@/lib/database/client';
import { EmailType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://partyondelivery.com';

const schema = z.object({
  email: z.string().email().max(200),
  /** Which form the signup came from (e.g. "footer", "blog"). */
  source: z.string().max(60).optional(),
  /** First-touch UTM + ad click ids captured client-side (optional). */
  attribution: attributionSchema,
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const source = body.source?.trim() || 'newsletter';

  try {
    const lead = await upsertLead(
      { email: body.email },
      {
        sourcePage: source,
        sourceWidget: 'EMAIL_SIGNUP',
        // Blank-fill only: a newsletter signup should never overwrite the
        // campaign that first brought someone to the site.
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
    if (!lead) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const nl = meta.newsletter as { status?: string } | undefined;

    // Already confirmed — nothing to do, don't re-send.
    if (nl?.status === 'confirmed') {
      return NextResponse.json({
        success: true,
        message: "You're already subscribed — thanks!",
      });
    }

    // (Re)issue a single-use pending opt-in token.
    const token = randomBytes(16).toString('hex');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        metadata: {
          ...meta,
          newsletter: {
            status: 'pending',
            token,
            source,
            optedInAt: new Date().toISOString(),
          },
        } as never,
      },
    });

    await recordEvent({
      type: 'FORM_SUBMIT',
      leadId: lead.id,
      page: source,
      widget: 'EMAIL_SIGNUP',
      fieldName: 'newsletter_optin',
      fieldValue: body.email,
      metadata: { flow: 'newsletter', source, status: 'pending' },
    });

    // Send the double opt-in confirmation email (non-blocking on failure).
    const confirmUrl = `${BASE_URL}/api/newsletter/confirm?token=${token}`;
    const tpl = newsletterConfirmEmail({ confirmUrl });
    await sendEmail({
      to: body.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      type: EmailType.WELCOME,
      metadata: { flow: 'newsletter_confirm', leadId: lead.id, source },
      tags: [{ name: 'flow', value: 'newsletter_confirm' }],
    });

    return NextResponse.json({
      success: true,
      message: 'Almost there! Check your email to confirm your subscription.',
    });
  } catch (err) {
    console.error('[newsletter] signup failed', err);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
