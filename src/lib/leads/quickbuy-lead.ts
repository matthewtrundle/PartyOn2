/**
 * QuickBuy / Package-Builder → Lead Flow board mirror.
 *
 * /api/v1/landing/quote creates a DraftOrder but never wrote a Lead — the
 * board card came only from the client pixel with a bare QUICK_BUY widget,
 * so the occasion (quickbuy:wedding vs :bachelorette) and the submitted
 * attribution reached the ops Sheet but never the board. This helper is the
 * dashboard-lead.ts pattern applied to that route: called try/catch-wrapped
 * and awaited after the draft order exists.
 *
 * Deliberate rules (same as the dashboard mirror):
 * - Explicit act ⇒ column card: PARTIAL/ANONYMOUS promote to SUBMITTED;
 *   already-classified leads only get enrollLeadIfEligible.
 * - NO trustedSubmit anywhere — this can never reopen a WON/LOST card.
 * - Never throws: quote creation must not break on board bookkeeping.
 */

import { enrollLeadIfEligible } from './pipeline';
import { markLeadStatus, recordEvent, upsertLead } from './leadCapture';
import { prisma } from '@/lib/database/client';
import { compactAttribution, type AttributionInput } from './attribution-schema';

export interface QuickBuyLeadRef {
  occasion: string;
  mode: 'quote' | 'pay-now';
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  groupSize: number;
  /** ISO yyyy-mm-dd — feeds event-proximity scoring via extractEventDate. */
  deliveryDate: string;
  draftOrderId: string;
  total: number;
  attribution?: AttributionInput | null;
  /** Affiliate stamp (ref_code cookie resolved by the route) — fill-blank. */
  affiliateId?: string | null;
}

/** Mirror a QuickBuy submitter onto the Lead Flow board. Safe to repeat. */
export async function mirrorQuickBuyLead(ref: QuickBuyLeadRef): Promise<void> {
  try {
    const nameParts = ref.customerName.trim().split(/\s+/);
    const lead = await upsertLead(
      {
        email: ref.customerEmail,
        phone: ref.customerPhone || null,
        firstName: nameParts[0] || null,
        lastName: nameParts.slice(1).join(' ') || null,
      },
      {
        sourcePage: ref.attribution?.landingPage ?? `quickbuy:${ref.occasion}`,
        sourceWidget: 'QUICK_BUY',
        utmSource: ref.attribution?.utmSource,
        utmMedium: ref.attribution?.utmMedium,
        utmCampaign: ref.attribution?.utmCampaign,
        utmContent: ref.attribution?.utmContent,
        utmTerm: ref.attribution?.utmTerm,
        gclid: ref.attribution?.gclid,
        gbraid: ref.attribution?.gbraid,
        wbraid: ref.attribution?.wbraid,
        fbclid: ref.attribution?.fbclid,
        msclkid: ref.attribution?.msclkid,
        affiliateId: ref.affiliateId ?? null,
      },
    );
    if (!lead) return;

    // quickBuy surface (drives the board label + facts + INQUIRY_META_KEYS)
    // + the full attribution snapshot (landingPage/referrer live only here —
    // Lead has no columns for them). Merge preserves what's already stored.
    const meta =
      lead.metadata && typeof lead.metadata === 'object' && !Array.isArray(lead.metadata)
        ? { ...(lead.metadata as Record<string, unknown>) }
        : {};
    meta.quickBuy = {
      occasion: ref.occasion,
      mode: ref.mode,
      groupSize: ref.groupSize,
      deliveryDate: ref.deliveryDate,
      draftOrderId: ref.draftOrderId,
      total: ref.total,
      submittedAt: new Date().toISOString(),
    };
    if (ref.attribution) {
      const prev =
        meta.attribution && typeof meta.attribution === 'object' && !Array.isArray(meta.attribution)
          ? (meta.attribution as Record<string, unknown>)
          : {};
      meta.attribution = { ...prev, ...compactAttribution(ref.attribution) };
    }
    const upgradeWidget = lead.sourceWidget === null || lead.sourceWidget === 'OTHER';
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        metadata: meta as never,
        ...(upgradeWidget ? { sourceWidget: 'QUICK_BUY' } : {}),
      },
    });

    // Explicit act ⇒ column card. Guarded: never downgrade SUBMITTED/CONVERTED.
    if (lead.status === 'PARTIAL' || lead.status === 'ANONYMOUS') {
      await markLeadStatus(lead.id, 'SUBMITTED');
    } else {
      await enrollLeadIfEligible(lead.id);
    }

    // Timeline + activity bump. NO trustedSubmit — cannot reopen closed cards.
    await recordEvent({
      type: 'CHECKOUT_START',
      leadId: lead.id,
      page: ref.attribution?.landingPage ?? `quickbuy:${ref.occasion}`,
      widget: 'QUICK_BUY',
      fieldName: `landing-quote-${ref.mode}`,
      metadata: {
        occasion: ref.occasion,
        mode: ref.mode,
        draftOrderId: ref.draftOrderId,
        total: ref.total,
      },
    });
  } catch (err) {
    console.warn('[quickbuy-lead] mirror failed', err);
  }
}
