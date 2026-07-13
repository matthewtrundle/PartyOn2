/**
 * POST /api/v1/event-quiz/submit
 *
 * Endpoint behind the /event-quiz final step. Three responsibilities:
 *
 *   1. Promote the in-flight Lead row to SUBMITTED status with full quiz
 *      payload baked into metadata (so Brian's Stuff → Leads shows the
 *      complete picture, not just contact info)
 *   2. Send the personalized welcome email via Resend
 *   3. Return the resume URL so the client can hard-redirect to the
 *      correct landing page (?welcome=1 query param tells the landing
 *      page to render the "Step one: ..." header)
 *
 * Lead capture is idempotent — same email coming through twice updates
 * the existing Lead (the LeadEvent rows from earlier in the flow are
 * still attached). Email send failure is non-blocking; the redirect
 * still fires so the user doesn't get stuck.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/resend-client';
import { eventQuizWelcomeEmail } from '@/lib/email/templates/event-quiz-welcome';
import { upsertLead, recordEvent } from '@/lib/leads/leadCapture';
import { targetUrlFor } from '@/lib/eventQuiz/routing';
import { enqueueJourney } from '@/lib/followups/enqueue';
import { mirrorLeadToSheet } from '@/lib/premier/pod-leads-sheet';
import { EmailType } from '@prisma/client';
import { prisma } from '@/lib/database/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional().nullable(),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  partyType: z.enum([
    'just-deliver',
    'bachelor',
    'bachelorette',
    'corporate',
    'wedding',
    'boat',
    'house',
    'hotel',
  ]),
  timing: z.enum(['today', 'tomorrow', 'future']),
  needs: z
    .array(
      z.enum([
        'stock-drinks',
        'transportation',
        'party-boat',
        'tour',
        'event-rentals',
      ]),
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'invalid_body', detail: String(err) },
      { status: 400 },
    );
  }

  const resumePath = targetUrlFor(body.partyType);
  const resumeUrlAbs = `https://partyondelivery.com${resumePath}`;

  // ─── Create / upsert the Lead and stamp full quiz answers ──────────
  let leadId: string | null = null;
  try {
    const lead = await upsertLead(
      {
        firstName: body.firstName,
        lastName: body.lastName ?? null,
        email: body.email,
        phone: body.phone ?? null,
      },
      {
        sourcePage: '/event-quiz',
        sourceWidget: 'CONTACT_FORM',
      },
    );

    if (lead) {
      leadId = lead.id;
      // Promote to SUBMITTED + stamp the quiz answers in metadata so
      // the Leads dashboard can render them.
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'SUBMITTED',
          // Last-touch stamp: a fresh submit owns the source columns
          // even when the email matched an older lead row.
          sourcePage: '/event-quiz',
          sourceWidget: 'CONTACT_FORM',
          metadata: {
            ...((lead.metadata as Record<string, unknown> | null) ?? {}),
            eventQuiz: {
              partyType: body.partyType,
              timing: body.timing,
              needs: body.needs,
              submittedAt: new Date().toISOString(),
              resumePath,
            },
          },
        },
      });

      // Record an explicit FORM_SUBMIT event for the funnel/tracker.
      await recordEvent({
        type: 'FORM_SUBMIT',
        leadId: lead.id,
        page: '/event-quiz',
        widget: 'CONTACT_FORM',
        fieldName: 'event-quiz-submit',
        metadata: {
          flow: 'event-quiz',
          partyType: body.partyType,
          timing: body.timing,
          needs: body.needs,
        },
      });
    }
  } catch (err) {
    // Don't fail the request — the email and redirect are still useful.
    console.error('[event-quiz] lead upsert failed', err);
  }

  // ─── Send the welcome email ────────────────────────────────────────
  try {
    const tpl = eventQuizWelcomeEmail({
      firstName: body.firstName,
      partyType: body.partyType,
      timing: body.timing,
      needs: body.needs,
      resumeUrl: resumeUrlAbs,
    });
    await sendEmail({
      to: body.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      type: EmailType.WELCOME,
      metadata: {
        flow: 'event-quiz',
        partyType: body.partyType,
        timing: body.timing,
        leadId,
      },
      tags: [
        { name: 'flow', value: 'event_quiz' },
        { name: 'party_type', value: body.partyType },
      ],
    });
  } catch (err) {
    console.error('[event-quiz] email send failed', err);
  }

  // Queue the +96h "did the plan land?" nudge. The instant welcome above is
  // touch #1, so this journey starts at step 2 (flag-gated, deduped on lead).
  if (leadId) {
    try {
      await enqueueJourney('event-quiz', {
        email: body.email,
        entityId: leadId,
        leadId,
        phone: body.phone ?? null,
        startAtStep: 2,
        payload: { firstName: body.firstName, resumePath },
      });
    } catch (err) {
      console.warn('[event-quiz] follow-up enqueue failed', err);
    }
  }

  // Mirror to the POD Leads Google Sheet. AWAITED — Vercel kills
  // un-awaited promises when the response returns. Never throws.
  await mirrorLeadToSheet({
    source: 'event-quiz',
    firstName: body.firstName,
    lastName: body.lastName ?? '',
    email: body.email,
    phone: body.phone ?? '',
    partyType: body.partyType,
    activities: body.needs.join(', '),
    notes: `timing: ${body.timing}`,
    leadUrl: leadId
      ? `https://partyondelivery.com/admin/brians-stuff?tab=leads&lead=${leadId}`
      : '',
  });

  return NextResponse.json({
    ok: true,
    leadId,
    redirectTo: resumePath,
  });
}
