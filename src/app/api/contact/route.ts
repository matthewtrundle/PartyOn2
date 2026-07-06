/**
 * POST /api/contact — general contact form.
 *
 * Historically this ONLY forwarded to a Zapier webhook: if Zapier was down
 * or the env var missing, the message was lost with no trace. Now the
 * submission is stored as a Lead (source CONTACT_FORM, full message in
 * metadata.contactForm) FIRST, then forwarded to Zapier as before, and the
 * contact-form follow-up journey is queued (ack on the next engine tick,
 * "did my reply reach you?" at +72h — flag-gated, deduped per submission).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { upsertLead } from '@/lib/leads/leadCapture';
import { enqueueJourney } from '@/lib/followups/enqueue';
import { checkRateLimit } from '@/lib/security/rate-limit';

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Valid email is required').max(200),
  phone: z.string().trim().max(40).optional().default(''),
  eventType: z.string().trim().max(120).optional().default(''),
  eventDate: z.string().trim().max(60).optional().default(''),
  guestCount: z.union([z.string(), z.number()]).optional().default(''),
  message: z.string().trim().max(5000).optional().default(''),
});

export async function POST(request: NextRequest) {
  try {
    // Storage made this route do real DB work per request — throttle it.
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    if (!(await checkRateLimit('contact-form', ip, 5, 60))) {
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please try again in a minute.' },
        { status: 429 }
      );
    }
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid submission';
      return NextResponse.json(
        { success: false, error: firstIssue },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const submittedAt = new Date().toISOString();
    const [firstName, ...restName] = body.name.split(/\s+/);

    // 1. Store the submission — this is the system of record now; Zapier is
    // a best-effort mirror.
    let leadId: string | null = null;
    try {
      const lead = await upsertLead(
        {
          email: body.email,
          phone: body.phone || null,
          firstName: firstName || null,
          lastName: restName.join(' ') || null,
        },
        { sourcePage: '/contact', sourceWidget: 'CONTACT_FORM' }
      );
      if (lead) {
        leadId = lead.id;
        const existingMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            metadata: {
              ...existingMeta,
              contactForm: {
                eventType: body.eventType,
                eventDate: body.eventDate,
                guestCount: String(body.guestCount ?? ''),
                message: body.message,
                submittedAt,
              },
            },
          },
        });
      }
    } catch (storageError) {
      // Storage must not block the customer — but log loudly, this was the
      // whole point of the fix.
      console.error('[Contact] FAILED to store lead:', storageError);
    }

    // 2. Forward to Zapier (kept for the existing GHL/notification flow).
    const zapierWebhookUrl = process.env.ZAPIER_CONTACT_WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL;

    if (zapierWebhookUrl) {
      try {
        const zapierResponse = await fetch(zapierWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: body.name,
            email: body.email,
            phone: body.phone || '',
            eventType: body.eventType || '',
            eventDate: body.eventDate || '',
            guestCount: String(body.guestCount ?? ''),
            message: body.message || '',
            submittedAt,
            formType: 'contact'
          }),
        });

        if (!zapierResponse.ok) {
          console.error('Zapier webhook failed:', await zapierResponse.text());
        } else {
          console.log('Contact form sent to Zapier successfully');
        }
      } catch (zapierError) {
        console.error('Error sending to Zapier:', zapierError);
        // Don't fail the request if Zapier fails
      }
    } else {
      console.warn('ZAPIER_CONTACT_WEBHOOK_URL not configured');
    }

    // 3. Queue the follow-up journey (flag-gated; deduped on the lead id so
    // repeat submissions never double-ack).
    if (leadId) {
      try {
        await enqueueJourney('contact-form', {
          email: body.email,
          entityId: leadId,
          leadId,
          phone: body.phone || null,
          payload: { firstName: firstName || null },
        });
      } catch (err) {
        console.warn('[Contact] follow-up enqueue failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us! We\'ll get back to you within 24 hours.',
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit form. Please try again.'
      },
      { status: 500 }
    );
  }
}
