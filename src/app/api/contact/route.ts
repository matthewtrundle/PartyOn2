/**
 * POST /api/contact — general contact form.
 *
 * Historically this ONLY forwarded to a Zapier webhook: if Zapier was down
 * or the env var missing, the message was lost with no trace. Now the
 * submission is stored as a Lead (source CONTACT_FORM, full message in
 * metadata.contactForm) FIRST — promoted to SUBMITTED with a trusted
 * FORM_SUBMIT so it lands on the /admin/leads board in realtime (one of the
 * 5 server-zod trusted routes) — then forwarded to Zapier as before, and the
 * contact-form follow-up journey is queued (ack on the next engine tick,
 * "did my reply reach you?" at +72h — flag-gated, deduped per submission).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { recordEvent, upsertLead } from '@/lib/leads/leadCapture';
import { resolveAffiliateId } from '@/lib/leads/affiliate-resolve';
import { attributionSchema, compactAttribution } from '@/lib/leads/attribution-schema';
import { enqueueJourney } from '@/lib/followups/enqueue';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { mirrorLeadToSheet } from '@/lib/premier/pod-leads-sheet';
import { mirrorLeadToCrm } from '@/lib/leads/crm-mirror';

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Valid email is required').max(200),
  phone: z.string().trim().max(40).optional().default(''),
  eventType: z.string().trim().max(120).optional().default(''),
  eventDate: z.string().trim().max(60).optional().default(''),
  guestCount: z.union([z.string(), z.number()]).optional().default(''),
  message: z.string().trim().max(5000).optional().default(''),
  /** First-touch UTM + ad click ids captured client-side (optional). */
  attribution: attributionSchema,
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
        {
          sourcePage: '/contact',
          sourceWidget: 'CONTACT_FORM',
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
          // 30-day affiliate attribution cookie (middleware) — fill-blank.
          affiliateId: await resolveAffiliateId(request.cookies.get('ref_code')?.value),
        }
      );
      if (lead) {
        leadId = lead.id;
        const existingMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
        const prevAttribution: Record<string, string> =
          existingMeta.attribution &&
          typeof existingMeta.attribution === 'object' &&
          !Array.isArray(existingMeta.attribution)
            ? (existingMeta.attribution as Record<string, string>)
            : {};
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            // A full contact-form send is a real inquiry — promote so the
            // lead gets a board card instead of sitting PARTIAL in the tray
            // forever (2026-07-13 audit gap #10). Last-touch source stamp:
            // this submission is now the lead's active surface.
            status: 'SUBMITTED',
            sourcePage: '/contact',
            sourceWidget: 'CONTACT_FORM',
            metadata: {
              ...existingMeta,
              ...(body.attribution
                ? {
                    attribution: {
                      ...prevAttribution,
                      ...compactAttribution(body.attribution),
                    },
                  }
                : {}),
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
        // 5th trusted route (server-zod-validated + rate-limited): enrolls a
        // new card in realtime and may reopen a closed one — a fresh contact
        // message from a WON/LOST lead is a new conversation.
        await recordEvent({
          type: 'FORM_SUBMIT',
          leadId: lead.id,
          page: '/contact',
          widget: 'CONTACT_FORM',
          fieldName: 'contact-form-submit',
          metadata: { eventType: body.eventType || null, submittedAt },
          trustedSubmit: true,
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

    // Mirror to the POD Leads Google Sheet + CoreLinq CRM. AWAITED — Vercel
    // kills un-awaited promises when the response returns. Never throw.
    await Promise.allSettled([
      mirrorLeadToSheet({
        source: 'contact-form',
        firstName: firstName || '',
        lastName: restName.join(' '),
        email: body.email,
        phone: body.phone || '',
        arrivalDate: body.eventDate || '',
        partyType: body.eventType || '',
        headcount: body.guestCount ?? '',
        notes: body.message.slice(0, 500),
        leadUrl: leadId ? `https://partyondelivery.com/admin/leads?lead=${leadId}` : '',
      }),
      mirrorLeadToCrm({ leadId }, 'contact-form'),
    ]);

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
