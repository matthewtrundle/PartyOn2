/**
 * POST /api/v1/concierge/lead
 *
 * Premier Concierge bachelor-party planning lead capture.
 *
 * Pipeline (all fire-and-forget except the Lead upsert, which we await
 * because the caller needs the leadId back):
 *
 *   1. Validate payload with Zod.
 *   2. upsertLead() — creates or updates the Postgres Lead row, promotes
 *      status to SUBMITTED, stamps metadata.conciergeQuiz with the full
 *      questionnaire.
 *   3. recordEvent(FORM_SUBMIT) — atomic audit trail.
 *   4. notifyConciergeLead() — fires the GHL concierge webhook with the
 *      tags array (premier-concierge, bachelor-party, activity tags,
 *      budget bucket, headcount bucket). No-ops silently if
 *      GHL_CONCIERGE_LEAD_WEBHOOK_URL is not set.
 *   5. appendLeadToPodLeadsSheet() — writes a row to the "POD Leads"
 *      tab of the PPC Booking App Time Slots Google Sheet. Best-effort;
 *      never blocks the response.
 *
 * CORS: this endpoint is intentionally OPEN (no origin check) so the
 * same page can eventually be hosted on premierconcierge.co and POST
 * cross-domain. If we ever need to lock it down we'd add an allowlist
 * here.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { upsertLead, recordEvent } from '@/lib/leads/leadCapture';
import { attributionSchema, compactAttribution } from '@/lib/leads/attribution-schema';
import { notifyConciergeLead } from '@/lib/webhooks/ghl';
import { mirrorLeadToCrm } from '@/lib/leads/crm-mirror';
import {
  appendLeadToPodLeadsSheet,
  formatCentralTimestamp,
} from '@/lib/premier/pod-leads-sheet';
import { sendEmail } from '@/lib/email/resend-client';
import { conciergeQuoteEmail } from '@/lib/email/templates/concierge-quote';
import { buildInitialQuote, type Quote } from '@/lib/concierge/quote';
import { EmailType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIVITIES = [
  'drink-delivery',
  'boat-rental',
  'golf-brewery-tour',
  'atv-tour',
  'gun-range',
  'transportation',
  'not-sure',
] as const;

const bodySchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional().default(''),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().default(''),
  headcount: z.number().int().min(1).max(500),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partyType: z.enum(['bachelor', 'bachelorette', 'weekend', 'corporate', 'other']),
  /** Selected budget tier per person, dollars — sent as a chip label from the UI. */
  budgetPerPerson: z.string().max(24),
  activities: z.array(z.enum(ACTIVITIES)).min(1).max(ACTIVITIES.length),
  notes: z.string().max(2000).optional().default(''),
  /** Which page fired the form. Enables sending the same form from
   *  premierconcierge.co later. */
  source: z.string().max(80).optional().default('premier-concierge-bachelor'),
  /** First-touch UTM + ad click ids captured client-side — same shape
   *  every other lead surface sends. Optional so older cached bundles
   *  never 400. */
  attribution: attributionSchema,
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Preflight for cross-domain form submits (once premierconcierge.co ships).
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'invalid_body', detail: String(err) },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // ─── 1) Lead upsert + metadata stamp ────────────────────────────
  let leadId: string | null = null;
  try {
    const lead = await upsertLead(
      {
        firstName: body.firstName,
        lastName: body.lastName || null,
        email: body.email,
        phone: body.phone || null,
      },
      {
        sourcePage: `/${body.source}`,
        // No specific enum for concierge yet — the existing
        // PARTNER_LANDING_PAGE value semantically covers it, and the
        // structured payload lives in metadata so admin UIs can filter
        // by `metadata.partner`.
        sourceWidget: 'PARTNER_LANDING_PAGE',
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
      leadId = lead.id;
      const prevMeta =
        (lead.metadata as Record<string, unknown> | null) ?? {};

      // Build the initial quote from the questionnaire answers so the
      // customer sees a starting plan when they open the quote link.
      const conciergeVariant: 'bachelor' | 'bachelorette' =
        body.partyType === 'bachelorette' ? 'bachelorette' : 'bachelor';
      const initialQuote: Quote = buildInitialQuote({
        variant: conciergeVariant,
        headcount: body.headcount,
        arrivalDate: body.arrivalDate,
        departureDate: body.departureDate,
        requestedActivities: body.activities.filter((a) => a !== 'not-sure'),
      });

      // Merge attribution into metadata (latest ad click wins), same
      // pattern as quote/start.
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
          // Last-touch stamp: a fresh submit should own the source
          // columns even when the email matched an old lead row (the
          // founder's test upserted onto a May '26 /flyer row and the
          // admin table showed stale provenance).
          sourcePage: `/${body.source}`,
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
            partner: 'premier-concierge',
            conciergeQuiz: {
              source: body.source,
              partyType: body.partyType,
              headcount: body.headcount,
              arrivalDate: body.arrivalDate,
              departureDate: body.departureDate,
              budgetPerPerson: body.budgetPerPerson,
              activities: body.activities,
              notes: body.notes,
              submittedAt: new Date().toISOString(),
            },
            quote: initialQuote,
          } as never,
        },
      });

      await recordEvent({
        type: 'FORM_SUBMIT',
        trustedSubmit: true, // server-validated form (zod) — may reopen closed board cards
        leadId: lead.id,
        page: `/${body.source}`,
        widget: 'PARTNER_LANDING_PAGE',
        fieldName: 'concierge-submit',
        metadata: {
          flow: 'premier-concierge',
          partyType: body.partyType,
          headcount: body.headcount,
          budget: body.budgetPerPerson,
          activities: body.activities,
        },
      });
    }
  } catch (err) {
    console.error('[concierge/lead] upsertLead failed', err);
  }

  // ─── 2) Compose the tag array for GHL ────────────────────────────
  const tags = buildTags(body);
  const now = new Date();
  // Deep link to the Lead Flow board (old brians-stuff URLs in GHL history
  // still work — the leads tab forwards ?lead= to the board).
  const leadUrl = leadId
    ? `https://partyondelivery.com/admin/leads?lead=${leadId}`
    : 'https://partyondelivery.com/admin/leads';

  // ─── 3) Side effects — ALL AWAITED ───────────────────────────────
  // GHL + email + sheet MUST be awaited before the response returns:
  // Vercel freezes the serverless function on return, and a
  // fire-and-forget promise gets killed mid-flight. That's exactly how
  // the founder's first bachelorette test lead vanished from the sheet.
  const sideEffects: Promise<unknown>[] = [];

  // CoreLinq CRM lead mirror (inert until CORELINQ_INGEST_URL is set;
  // internally never-throwing).
  sideEffects.push(mirrorLeadToCrm({ leadId }, body.source));

  // GHL webhook (no-op until GHL_CONCIERGE_LEAD_WEBHOOK_URL is set;
  // internally never-throwing).
  sideEffects.push(
    notifyConciergeLead({
      event: 'concierge.lead',
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      phone: body.phone,
      source: body.source,
      partyType: body.partyType,
      headcount: body.headcount,
      arrivalDate: body.arrivalDate,
      departureDate: body.departureDate,
      budgetPerPerson: body.budgetPerPerson,
      activities: body.activities,
      notes: body.notes,
      tags,
      leadUrl,
      submittedAt: now.toISOString(),
    }).catch((err) => {
      console.error('[concierge/lead] GHL notify failed (non-blocking)', err);
    }),
  );

  // ─── 4) Quote email ──────────────────────────────────────────────
  // Combines the old welcome email with the summary + View Quote CTA
  // that opens the interactive quote page. Only fires if we managed to
  // create a Lead (need the ID for the quote URL).

  if (leadId) {
    const capturedLeadId = leadId;
    const conciergeVariant: 'bachelor' | 'bachelorette' =
      body.partyType === 'bachelorette' ? 'bachelorette' : 'bachelor';
    const emailQuote: Quote = buildInitialQuote({
      variant: conciergeVariant,
      headcount: body.headcount,
      arrivalDate: body.arrivalDate,
      departureDate: body.departureDate,
      requestedActivities: body.activities.filter((a) => a !== 'not-sure'),
    });
    const quoteUrl = `https://partyondelivery.com/concierge-quote/${capturedLeadId}`;
    const tpl = conciergeQuoteEmail({
      firstName: body.firstName,
      variant: conciergeVariant,
      quote: emailQuote,
      quoteUrl,
    });
    sideEffects.push(
      sendEmail({
        to: body.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        type: EmailType.WELCOME,
        metadata: {
          flow: 'premier-concierge',
          leadId: capturedLeadId,
          partyType: body.partyType,
          headcount: body.headcount,
          budget: body.budgetPerPerson,
          activities: body.activities,
          quoteUrl,
        },
        tags: [
          { name: 'flow', value: 'premier-concierge' },
          { name: 'party_type', value: body.partyType },
        ],
      }).catch((err) => {
        console.error('[concierge/lead] quote email failed (non-blocking)', err);
      }),
    );
  }

  // ─── 5) Google Sheet append — AWAITED ────────────────────────────
  sideEffects.push(
    appendLeadToPodLeadsSheet({
      submittedAt: formatCentralTimestamp(now),
      source: body.source,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      headcount: String(body.headcount),
      arrivalDate: body.arrivalDate,
      departureDate: body.departureDate,
      partyType: body.partyType,
      budgetPerPerson: body.budgetPerPerson,
      activities: body.activities.join(', '),
      notes: body.notes,
      leadUrl,
    }),
  );

  // Run email + sheet in parallel; both are internally never-throwing.
  await Promise.allSettled(sideEffects);

  return NextResponse.json(
    { ok: true, leadId },
    { status: 200, headers: CORS_HEADERS },
  );
}

/**
 * Build the GHL tag array from the questionnaire answers. Every tag
 * here is a signal the receiving GHL workflow can route on (assign
 * pipeline stage, route to a specific rep, trigger different follow-up
 * sequences, etc.).
 */
function buildTags(body: z.infer<typeof bodySchema>): string[] {
  const tags: string[] = ['premier-concierge', 'bachelor-party-inquiry'];
  tags.push(`party-type:${body.partyType}`);
  tags.push(`budget:${body.budgetPerPerson.replace(/\s+/g, '').toLowerCase()}`);
  tags.push(`headcount:${headcountBucket(body.headcount)}`);
  for (const a of body.activities) tags.push(`activity:${a}`);
  return tags;
}

function headcountBucket(n: number): string {
  if (n <= 6) return '2-6';
  if (n <= 12) return '7-12';
  if (n <= 20) return '13-20';
  return '20-plus';
}
