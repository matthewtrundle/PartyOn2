/**
 * GroupOrderV2 host → Lead Flow board mirror (lead-capture gap closure).
 *
 * A built-but-unpaid dashboard is the strongest sales signal on the site,
 * but dashboard creation never wrote a Lead — hosts were invisible to
 * /admin/leads. This helper is called (try/catch-wrapped, awaited) from the
 * group-orders service after any write that lands host contact info:
 * create flows, dashboard settings, and the send-link route. Service-level
 * hooks cover every ingress: /order, /order/last-minute, /group/create, the
 * Premier cruise webhook, and affiliate-created dashboards.
 *
 * Deliberate rules:
 * - Host must be contactable (email or phone) — a bare name never anchors a
 *   lead. The 'Party Host' placeholder name is dropped.
 * - Explicit act ⇒ column card: PARTIAL/ANONYMOUS leads promote to SUBMITTED
 *   (which enrolls); already-classified leads only get enrollLeadIfEligible.
 *   Neither path can reopen a WON/LOST card (no trustedSubmit — that power
 *   stays with the server-zod submit routes).
 * - Group GUESTS are never mirrored (attendees, not planners) — no call site
 *   exists for joins, and none should be added.
 * - Never throws: dashboard creation must not break on board bookkeeping.
 */

import { enrollLeadIfEligible } from './pipeline';
import { markLeadStatus, recordEvent, upsertLead, type LeadContext } from './leadCapture';
import { prisma } from '@/lib/database/client';

const PLACEHOLDER_HOST_NAME = 'Party Host';

export interface DashboardHostRef {
  groupOrderId: string;
  shareCode: string;
  hostName?: string | null;
  hostEmail?: string | null;
  hostPhone?: string | null;
  partyType?: string | null;
  /** First (or only) delivery date — feeds event-proximity scoring. */
  deliveryDate?: Date | string | null;
  /** GroupOrderV2.source (DIRECT / PARTNER_PAGE / WEBHOOK / ...). */
  source?: string | null;
  /** GroupOrderV2.affiliateId — stamps Lead.affiliateId (fill-blank), so a
      Premier-webhook host is affiliate-attributed the moment they board. */
  affiliateId?: string | null;
  /** Which flow landed the contact info (create / settings / send-link...). */
  createdVia: string;
  /** Host first-touch attribution when the create flow captured it. UTM +
      click ids flow into upsertLead's ctx (columns + metadata.attribution);
      landingPage/referrer fill-blank into metadata.attribution (Lead has no
      columns for them). */
  attribution?:
    | (Pick<
        LeadContext,
        | 'utmSource'
        | 'utmMedium'
        | 'utmCampaign'
        | 'utmContent'
        | 'utmTerm'
        | 'gclid'
        | 'gbraid'
        | 'wbraid'
        | 'fbclid'
        | 'msclkid'
      > & { landingPage?: string | null; referrer?: string | null })
    | null;
}

function splitName(hostName?: string | null): { firstName: string | null; lastName: string | null } {
  const name = (hostName ?? '').trim();
  if (!name || name === PLACEHOLDER_HOST_NAME) return { firstName: null, lastName: null };
  const parts = name.split(/\s+/);
  return { firstName: parts[0] ?? null, lastName: parts.slice(1).join(' ') || null };
}

function isoDateOnly(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Existence-check an affiliate id (lightweight select); null if unknown. */
async function verifyAffiliateId(id?: string | null): Promise<string | null> {
  if (!id) return null;
  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    select: { id: true },
  });
  return affiliate?.id ?? null;
}

/**
 * Mirror a dashboard host onto the Lead Flow board. Safe to call repeatedly
 * (upsert by email/phone; metadata.groupDashboard is last-write-wins so the
 * card always reflects the host's latest dashboard).
 */
export async function mirrorDashboardHostLead(ref: DashboardHostRef): Promise<void> {
  try {
    if (!ref.hostEmail && !ref.hostPhone) return;

    const { firstName, lastName } = splitName(ref.hostName);
    // landingPage/referrer aren't LeadContext fields — split them off for the
    // metadata merge below; everything else flows into upsertLead's ctx.
    const { landingPage, referrer, ...utmAndClickIds } = ref.attribution ?? {};
    // Verify the affiliate actually exists before stamping it onto the Lead.
    // GroupOrderV2.affiliateId can be set with an UNVALIDATED client value via
    // the unauthenticated POST /api/v2/group-orders/dashboard route (a
    // pre-existing hole — security review 2026-07-23, HIGH), so a junk/spoofed
    // id must never poison the fill-blank Lead.affiliateId. This makes the
    // dashboard-mirror path consistent with the resolveAffiliateId capture
    // routes, which already only ever forward a real affiliate id.
    const verifiedAffiliateId = await verifyAffiliateId(ref.affiliateId);
    const lead = await upsertLead(
      { email: ref.hostEmail, phone: ref.hostPhone, firstName, lastName },
      {
        sourcePage: `/dashboard/${ref.shareCode}`,
        sourceWidget: 'GROUP_DASHBOARD',
        affiliateId: verifiedAffiliateId,
        ...utmAndClickIds,
      },
    );
    if (!lead) return;

    // Link the dashboard + upgrade weak provenance. upsertLead only fills
    // blanks, so a watcher-created OTHER lead keeps OTHER — fix that here,
    // but never overwrite a real widget (e.g. CONTACT_FORM from the chat).
    const meta =
      lead.metadata && typeof lead.metadata === 'object' && !Array.isArray(lead.metadata)
        ? { ...(lead.metadata as Record<string, unknown>) }
        : {};
    meta.groupDashboard = {
      groupOrderId: ref.groupOrderId,
      shareCode: ref.shareCode,
      partyType: ref.partyType ?? null,
      deliveryDate: isoDateOnly(ref.deliveryDate),
      source: ref.source ?? null,
      createdVia: ref.createdVia,
      linkedAt: new Date().toISOString(),
    };
    // First-touch landing page + referrer — fill-blank into the attribution
    // bag (upsertLead already merged any click ids into it just above).
    if (landingPage || referrer) {
      const attr =
        meta.attribution && typeof meta.attribution === 'object' && !Array.isArray(meta.attribution)
          ? { ...(meta.attribution as Record<string, unknown>) }
          : {};
      if (landingPage && attr.landingPage == null) attr.landingPage = landingPage.slice(0, 500);
      if (referrer && attr.referrer == null) attr.referrer = referrer.slice(0, 500);
      meta.attribution = attr;
    }
    const upgradeWidget = lead.sourceWidget === null || lead.sourceWidget === 'OTHER';
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        metadata: meta as never,
        ...(upgradeWidget ? { sourceWidget: 'GROUP_DASHBOARD' } : {}),
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
      type: 'FORM_SUBMIT',
      leadId: lead.id,
      page: `/dashboard/${ref.shareCode}`,
      widget: 'GROUP_DASHBOARD',
      fieldName: `dashboard-${ref.createdVia}`,
      metadata: {
        groupOrderId: ref.groupOrderId,
        shareCode: ref.shareCode,
        via: ref.createdVia,
      },
    });
  } catch (err) {
    console.warn('[dashboard-lead] host mirror failed', err);
  }
}
