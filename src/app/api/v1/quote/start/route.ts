/**
 * POST /api/v1/quote/start
 *
 * UNIFIED ENTRY POINT for the three lead-capture surfaces (chat,
 * landing-page Build-My-Package modal, /event-quiz) to converge into the
 * existing universal dashboard at /dashboard/<shareCode>.
 *
 * What it does:
 *   1. Creates a Lead row (same shape as the chat + quiz endpoints) so
 *      Brian's Stuff → Leads stays the source-of-truth funnel view
 *   2. Sends the welcome email
 *   3. Creates a GroupOrderV2 dashboard (universal order shell with
 *      tabs, sharing, split-pay, etc.) — same one used by
 *      /order/last-minute
 *   4. Pre-populates the host's first tab with the items from the
 *      recommendation that came in on the request
 *   5. Returns { shareCode, hostParticipantId, redirectTo, ... } so
 *      the client can stash the participant id in localStorage and
 *      hard-redirect to /dashboard/<shareCode>
 *
 * Pre-loading recipe items: for each recommendation row we look up the
 * canonical Product + first active Variant by handle and add it as a
 * DraftCartItem. Handles that don't resolve to an active product are
 * silently skipped (they appear in `unresolvedHandles` in the response
 * for debugging). The host can always browse the full catalog inside
 * the dashboard and add more.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/resend-client';
import { eventQuizWelcomeEmail } from '@/lib/email/templates/event-quiz-welcome';
import { upsertLead, recordEvent } from '@/lib/leads/leadCapture';
import { attributionSchema, compactAttribution } from '@/lib/leads/attribution-schema';
import { resolveAffiliateId } from '@/lib/leads/affiliate-resolve';
import { targetUrlFor } from '@/lib/eventQuiz/routing';
import { createDashboardOrder, addDraftItem } from '@/lib/group-orders-v2/service';
import { isLastMinuteDate } from '@/lib/lastMinute/dates';
import { mirrorLeadToSheet } from '@/lib/premier/pod-leads-sheet';
import { mirrorLeadToCrm } from '@/lib/leads/crm-mirror';
import { prisma } from '@/lib/database/client';
import { EmailType } from '@prisma/client';
import type { PartyType as DashboardPartyType, DeliveryContextType } from '@/lib/group-orders-v2/types';
import {
  allowLeadCaptureEmail,
  allowLeadCaptureIp,
  LEAD_CAPTURE_THROTTLED,
} from '@/lib/security/lead-capture-throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const recommendedItemSchema = z.object({
  handle: z.string().min(1),
  qty: z.number().int().min(1),
});

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
  headcount: z.number().int().min(1).max(500),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Items to pre-load into the host's first tab. Caller (chat /
   *  package builder / event quiz) is responsible for building this
   *  list — typically the package recipe from the recommendation. */
  recommendedItems: z.array(recommendedItemSchema).default([]),
  /** Where the user came from (for analytics + Lead metadata). */
  source: z.enum(['chat', 'package-builder', 'event-quiz', 'landing-quote']).default('chat'),
  /** First-touch UTM + ad click ids captured client-side. */
  attribution: attributionSchema,
});

// Quiz party types → dashboard PartyType enum. Anything outside the
// dashboard enum falls back to OTHER.
const PARTY_TO_DASHBOARD: Record<string, DashboardPartyType | undefined> = {
  bachelor: 'BACHELOR',
  bachelorette: 'BACHELORETTE',
  corporate: 'CORPORATE',
  wedding: 'WEDDING',
  boat: 'BOAT',
  house: 'HOUSE_PARTY',
  hotel: 'OTHER',
  'just-deliver': 'OTHER',
};

// Loose mapping for delivery context (used by the dashboard to surface
// the right venue prompts). Defaults to HOUSE.
const PARTY_TO_DELIVERY: Record<string, DeliveryContextType | undefined> = {
  boat: 'BOAT',
  hotel: 'HOTEL',
  corporate: 'VENUE',
  wedding: 'VENUE',
  bachelor: 'HOUSE',
  bachelorette: 'HOUSE',
  house: 'HOUSE',
  'just-deliver': 'HOUSE',
};

export async function POST(req: NextRequest) {
  // Volumetric guard first, before we even read the body: this route is public
  // and unauthenticated, so a flood should cost as little as possible.
  if (!(await allowLeadCaptureIp(req))) {
    return NextResponse.json(LEAD_CAPTURE_THROTTLED, { status: 429 });
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

  // The limit that actually matters: the abuse here is mailing one victim over
  // and over, which a rotating-IP attacker does without tripping the check
  // above. Shared across the sibling capture routes so cycling them buys nothing.
  if (!(await allowLeadCaptureEmail(body.email))) {
    return NextResponse.json(LEAD_CAPTURE_THROTTLED, { status: 429 });
  }

  // ─── Last-minute decision ──────────────────────────────────────────
  const isLastMinute = isLastMinuteDate(body.deliveryDate);

  // ─── Lead row + status promote ─────────────────────────────────────
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
        sourcePage: `/${body.source}`,
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
        affiliateId: await resolveAffiliateId(req.cookies.get('ref_code')?.value),
      },
    );
    if (lead) {
      leadId = lead.id;
      // upsertLead returned the freshly-updated row, so prevMeta already
      // includes metadata.attribution — spreading it preserves the merge.
      const prevMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
      const prevAttribution =
        prevMeta.attribution &&
        typeof prevMeta.attribution === 'object' &&
        !Array.isArray(prevMeta.attribution)
          ? (prevMeta.attribution as Record<string, unknown>)
          : {};
      const nextMeta: Record<string, unknown> = {
        ...prevMeta,
        unifiedQuote: {
          source: body.source,
          partyType: body.partyType,
          headcount: body.headcount,
          deliveryDate: body.deliveryDate,
          recommendedHandles: body.recommendedItems.map((r) => r.handle),
          submittedAt: new Date().toISOString(),
        },
      };
      if (body.attribution) {
        nextMeta.attribution = {
          ...prevAttribution,
          ...compactAttribution(body.attribution),
        };
      }
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'SUBMITTED',
          // Last-touch stamp: a fresh submit owns the source columns
          // even when the email matched an older lead row.
          sourcePage: `/${body.source}`,
          sourceWidget: 'CONTACT_FORM',
          metadata: nextMeta as never,
        },
      });
      await recordEvent({
        type: 'CHECKOUT_START',
        trustedSubmit: true, // server-validated quote request — may reopen closed board cards
        leadId: lead.id,
        page: `/${body.source}`,
        widget: 'CONTACT_FORM',
        fieldName: 'quote-start',
        metadata: {
          flow: body.source,
          partyType: body.partyType,
          headcount: body.headcount,
          deliveryDate: body.deliveryDate,
          ...(body.attribution?.gclid && { gclid: body.attribution.gclid }),
          ...(body.attribution?.utmCampaign && {
            utmCampaign: body.attribution.utmCampaign,
          }),
        },
      });
    }
  } catch (err) {
    console.error('[quote/start] lead upsert failed', err);
  }

  // ─── Create the dashboard ──────────────────────────────────────────
  let shareCode: string | null = null;
  let hostParticipantId: string | null = null;
  const unresolvedHandles: string[] = [];
  try {
    const group = await createDashboardOrder({
      hostName: `${body.firstName}${body.lastName ? ` ${body.lastName}` : ''}`,
      hostEmail: body.email,
      hostPhone: body.phone ?? undefined,
      partyType: PARTY_TO_DASHBOARD[body.partyType] ?? 'OTHER',
      deliveryContextType: PARTY_TO_DELIVERY[body.partyType] ?? 'HOUSE',
      source: 'DIRECT',
      name: `${body.firstName}'s Order`,
      deliveryDate: body.deliveryDate,
      isLastMinute,
      // Carry the lead's first-touch attribution onto the group so its Orders
      // attribute back to the landing page (extra click-id/capturedAt fields ignored).
      attribution: body.attribution ?? undefined,
    });
    shareCode = group.shareCode;
    const host = group.participants.find((p) => p.isHost);
    hostParticipantId = host?.id ?? null;
    const firstTab = group.tabs[0];

    // ─── Pre-load recommended items as DraftCartItems ────────────────
    if (firstTab && hostParticipantId && body.recommendedItems.length > 0) {
      // Resolve each handle to a live Product + first active Variant.
      const handles = body.recommendedItems.map((r) => r.handle);
      const products = await prisma.product.findMany({
        where: { handle: { in: handles }, status: 'ACTIVE' },
        include: {
          variants: {
            where: { availableForSale: true },
            orderBy: { price: 'asc' },
            take: 1,
          },
          images: { take: 1, orderBy: { position: 'asc' } },
        },
      });
      const byHandle = new Map(products.map((p) => [p.handle, p]));

      for (const item of body.recommendedItems) {
        const product = byHandle.get(item.handle);
        const variant = product?.variants[0];
        if (!product || !variant) {
          unresolvedHandles.push(item.handle);
          continue;
        }
        try {
          await addDraftItem(firstTab.id, {
            participantId: hostParticipantId,
            productId: product.id,
            variantId: variant.id,
            title: product.title,
            variantTitle: variant.title === 'Default' ? undefined : variant.title,
            price: Number(variant.price),
            imageUrl: product.images[0]?.url,
            quantity: item.qty,
          });
        } catch (err) {
          console.warn(`[quote/start] addDraftItem failed for ${item.handle}`, err);
          unresolvedHandles.push(item.handle);
        }
      }
    }
  } catch (err) {
    console.error('[quote/start] dashboard create failed', err);
  }

  // ─── Welcome email — same template as the existing flows ───────────
  if (shareCode) {
    const dashboardUrl = `https://partyondelivery.com/dashboard/${shareCode}`;
    try {
      const tpl = eventQuizWelcomeEmail({
        firstName: body.firstName,
        partyType: body.partyType,
        timing: isLastMinute ? 'today' : 'future',
        needs: [],
        resumeUrl: dashboardUrl,
      });
      await sendEmail({
        to: body.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        type: EmailType.WELCOME,
        metadata: {
          flow: body.source,
          partyType: body.partyType,
          headcount: body.headcount,
          deliveryDate: body.deliveryDate,
          leadId,
          shareCode,
        },
        tags: [
          { name: 'flow', value: body.source },
          { name: 'party_type', value: body.partyType },
        ],
      });
    } catch (err) {
      console.error('[quote/start] email send failed', err);
    }
  }

  // Mirror to the POD Leads Google Sheet + CoreLinq CRM. AWAITED — Vercel
  // kills un-awaited promises when the response returns. Never throw.
  await Promise.allSettled([
    mirrorLeadToSheet({
      source: `quote-start:${body.source}`,
      firstName: body.firstName,
      lastName: body.lastName ?? '',
      email: body.email,
      phone: body.phone ?? '',
      arrivalDate: body.deliveryDate,
      partyType: body.partyType,
      headcount: body.headcount,
      activities: body.recommendedItems.map((r) => r.handle).join(', '),
      notes: shareCode ? `dashboard: ${shareCode}` : '',
      leadUrl: leadId ? `https://partyondelivery.com/admin/leads?lead=${leadId}` : '',
    }),
    mirrorLeadToCrm({ leadId }, `quote-start:${body.source}`),
  ]);

  // Always return a redirectTo. If the dashboard create failed we fall
  // back to the matching landing page so the user isn't stranded.
  const redirectTo = shareCode
    ? `/dashboard/${shareCode}`
    : `${targetUrlFor(body.partyType)}&date=${body.deliveryDate}&people=${body.headcount}`;

  return NextResponse.json({
    ok: true,
    leadId,
    shareCode,
    hostParticipantId,
    redirectTo,
    isLastMinute,
    unresolvedHandles,
  });
}
