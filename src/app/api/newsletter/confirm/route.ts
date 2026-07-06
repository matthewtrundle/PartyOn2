/**
 * GET /api/newsletter/confirm?token=...
 *
 * Second half of the newsletter double opt-in. Verifies the single-use token
 * issued at signup, marks the Lead's newsletter opt-in as `confirmed`, and ONLY
 * THEN syncs the subscriber to GHL with the `newsletter` tag — so the CRM list
 * only ever receives confirmed, consented addresses.
 *
 * Always redirects to /newsletter/confirmed with a status flag (never returns
 * raw JSON — this URL is opened directly from an email client).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { recordEvent } from '@/lib/leads/leadCapture';
import { notifyNewsletterSignup } from '@/lib/webhooks/ghl';
import { prisma } from '@/lib/database/client';
import { enqueueJourney } from '@/lib/followups/enqueue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://partyondelivery.com';
const done = (status: string) =>
  NextResponse.redirect(`${BASE_URL}/newsletter/confirmed?status=${status}`);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) return done('invalid');

  try {
    const lead = await prisma.lead.findFirst({
      where: { metadata: { path: ['newsletter', 'token'], equals: token } },
    });
    if (!lead) return done('invalid');

    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const nl = (meta.newsletter as Record<string, unknown> | undefined) ?? {};

    // Idempotent: a second click on an already-confirmed link just succeeds.
    if (nl.status === 'confirmed') return done('ok');

    const confirmedAt = new Date().toISOString();
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'SUBMITTED',
        metadata: {
          ...meta,
          newsletter: { ...nl, status: 'confirmed', confirmedAt },
        } as never,
      },
    });

    await recordEvent({
      type: 'CONVERSION',
      leadId: lead.id,
      page: 'newsletter-confirm',
      widget: 'EMAIL_SIGNUP',
      fieldName: 'newsletter_confirmed',
      metadata: { flow: 'newsletter' },
    });

    // Sync the confirmed subscriber to GHL with the `newsletter` tag.
    // No-ops gracefully until GHL_NEWSLETTER_WEBHOOK_URL is configured.
    await notifyNewsletterSignup({
      event: 'newsletter.subscribed',
      first_name: lead.firstName ?? '',
      last_name: lead.lastName ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      tag: 'newsletter',
      source: typeof nl.source === 'string' ? nl.source : 'newsletter',
      confirmedAt,
    });

    // Queue the single welcome email (~1h after confirm; flag-gated,
    // deduped on the lead id so a re-used link never double-welcomes).
    if (lead.email) {
      try {
        await enqueueJourney('newsletter-welcome', {
          email: lead.email,
          entityId: lead.id,
          leadId: lead.id,
          phone: lead.phone ?? null,
          payload: { firstName: lead.firstName ?? null },
        });
      } catch (err) {
        console.warn('[newsletter] welcome enqueue failed', err);
      }
    }

    return done('ok');
  } catch (err) {
    console.error('[newsletter] confirm failed', err);
    return done('error');
  }
}
