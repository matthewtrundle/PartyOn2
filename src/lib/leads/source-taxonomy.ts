/**
 * Lead provenance taxonomy — three independent answers to "where did this
 * lead come from", derived from the row we already store:
 *
 *   key      the FROZEN board filter value (saved filters/URLs depend on it)
 *   label    what a card shows, free to gain detail
 *   channel  how they reached us (paid / partner / organic / …)
 *   formKey  which form they actually filled in
 *
 * Deliberately Prisma-free: the board computes this server-side, and the
 * drawer computes it in the browser from the full lead row. Both must import
 * the SAME module or the card and the drawer drift apart, which is the bug
 * this replaced.
 *
 * `formKey` is a FOURTH metadata registry alongside INQUIRY_META_KEYS
 * (board eligibility), SUBMISSION_SURFACES (drawer display) and
 * CONTACT_FORM_SURFACES (source splitting). They are deliberately not merged:
 * each answers a different question, and `leadMagnet` is intentionally in one
 * and not another.
 */

import { SOURCE_LABELS } from './board-types';

/**
 * How the lead reached us. Not a funnel stage and not an audience — a lead
 * has exactly one channel, resolved by the precedence in `channelFor`.
 */
export const LEAD_CHANNELS = [
  'paid',
  'partner',
  'outbound',
  'ops',
  'inbound',
  'referral',
  'organic',
  'direct',
] as const;

export type LeadChannel = (typeof LEAD_CHANNELS)[number];

export const CHANNEL_LABELS: Record<LeadChannel, string> = {
  paid: 'Paid ads',
  partner: 'Partner',
  outbound: 'Our outreach',
  ops: 'Staff created',
  inbound: 'Reached out to us',
  referral: 'Referral',
  organic: 'Organic search',
  direct: 'Direct',
};

export interface SourceTaxonomy {
  /** Frozen board filter key — never gains detail. */
  key: string;
  /** Card label — may gain detail freely. */
  label: string;
  channel: LeadChannel;
  /** Stable per-form id, or null when nothing recorded the form. */
  formKey: string | null;
  formLabel: string | null;
}

export interface SourceTaxonomyInput {
  sourceWidget: string | null;
  utmMedium?: string | null;
  metadata: unknown;
  /** Lead's own affiliate stamp, or its dashboard's resolved affiliate. */
  hasAffiliate?: boolean;
}

/**
 * CONTACT_FORM is one widget covering four distinct capture flows — split it
 * by the metadata surface so the card shows the real intent (a quote request
 * reads very differently from a quiz). Precedence follows scoring's intent
 * order. Every other widget passes through to its SOURCE_LABELS name. `key`
 * is what the board filter matches on; `label` is what the card shows.
 */
const CONTACT_FORM_SURFACES: ReadonlyArray<{ meta: string; key: string; label: string }> = [
  { meta: 'unifiedQuote', key: 'CONTACT_FORM:quote', label: 'Quote Request' },
  { meta: 'chatQuiz', key: 'CONTACT_FORM:chat', label: 'Chat' },
  { meta: 'eventQuiz', key: 'CONTACT_FORM:quiz', label: 'Event Quiz' },
  { meta: 'contactForm', key: 'CONTACT_FORM:contact', label: 'Contact Form' },
];

/**
 * unifiedQuote.source (quote/start zod enum) → sub-flow display label.
 *
 * Every lookup table keyed on stored metadata is a Map, never an object
 * literal: `{}['constructor']` returns a function rather than undefined, so a
 * plain-object lookup silently defeats an `?? fallback` and can put a function
 * where a string belongs — which React then throws on when it renders.
 */
const QUOTE_FLOW_LABELS = new Map<string, string>([
  ['chat', 'Quote · Chat'],
  ['package-builder', 'Quote · Builder'],
  ['event-quiz', 'Quote · Quiz'],
  ['landing-quote', 'Quote · Landing'],
]);

/**
 * groupDashboard.source (DashboardSource enum) → CARD label. DIRECT and
 * INTERNAL are deliberately absent: they keep the familiar "Party Dashboard"
 * base label the operator already reads. They are still separated for
 * analytics — see DASHBOARD_FORM_LABELS.
 */
const DASHBOARD_SOURCE_LABELS = new Map<string, string>([
  ['WEBHOOK', 'Dashboard · Boat Webhook'],
  ['PARTNER_PAGE', 'Dashboard · Partner'],
]);

/**
 * The same four sources as FORM labels. Self-serve dashboards convert at a
 * fraction of the partner ones, so the Sources panel has to tell them apart
 * even though the card doesn't.
 */
const DASHBOARD_FORM_LABELS = new Map<string, string>([
  ['WEBHOOK', 'Dashboard · Boat Webhook'],
  ['PARTNER_PAGE', 'Dashboard · Partner Page'],
  ['INTERNAL', 'Dashboard · Staff Created'],
  ['DIRECT', 'Dashboard · Self-serve'],
]);

/** The three pages that all post to /api/contact. */
const CONTACT_FORM_LABELS = new Map<string, string>([
  ['contact', 'Contact Form'],
  ['plan-event-page', 'Contact · Plan Event'],
  ['book-now', 'Contact · Book Now'],
]);

export const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'] as const;
const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search']);
const OWNED_MEDIUMS = new Set(['referral', 'email', 'sms', 'social']);
const SEARCH_HOSTS = ['google.', 'bing.', 'duckduckgo.', 'yahoo.', 'ecosia.', 'search.brave'];
const OWN_HOST = 'partyondelivery.com';

export function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * Read a label out of a plain-object table without inheriting from the
 * prototype. `SOURCE_LABELS['constructor']` is a function, not undefined, and
 * a function reaching a React child is a render crash.
 */
function safeLabel(table: Record<string, string>, key: string): string {
  const value = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
  return typeof value === 'string' ? value : 'Site';
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** 'premier-party-cruises' → 'Premier Party Cruises' (badge/label casing). */
export function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Paid-traffic detector for the card's "Ads" chip: an ad-platform click id
 * in metadata.attribution, or a paid utm_medium. Pure; exported for tests.
 */
export function isAdsLead(lead: { utmMedium: string | null; metadata: unknown }): boolean {
  if (lead.utmMedium && PAID_MEDIUMS.has(lead.utmMedium.toLowerCase())) return true;
  const attribution = asRecord(asRecord(lead.metadata)?.attribution);
  if (!attribution) return false;
  return CLICK_ID_KEYS.some((k) => typeof attribution[k] === 'string' && attribution[k]);
}

/**
 * Card source label with sheet-level precision. Filter KEYS are frozen (saved
 * filters/URLs keep working); only LABELS gain detail from the metadata the
 * capture routes already store (operator ask 2026-07-23: the board must show
 * exactly where a lead came from, like the ops sheet does).
 */
export function refineSource(
  sourceWidget: string | null,
  metadata: unknown,
): { key: string; label: string } {
  const widget = sourceWidget ?? 'OTHER';
  const m = asRecord(metadata);
  if (m) {
    if (widget === 'CONTACT_FORM') {
      for (const s of CONTACT_FORM_SURFACES) {
        if (m[s.meta] == null) continue;
        if (s.meta === 'unifiedQuote') {
          const flow = asRecord(m.unifiedQuote)?.source;
          const flowLabel = typeof flow === 'string' ? QUOTE_FLOW_LABELS.get(flow) : undefined;
          return { key: s.key, label: flowLabel ?? s.label };
        }
        if (s.meta === 'contactForm') {
          // Three separate pages post to /api/contact — show which one.
          const formSource = str(asRecord(m.contactForm)?.source);
          const label = formSource ? CONTACT_FORM_LABELS.get(formSource) : undefined;
          return { key: s.key, label: label ?? s.label };
        }
        return { key: s.key, label: s.label };
      }
    }
    if (widget === 'QUICK_BUY') {
      const occasion = asRecord(m.quickBuy)?.occasion;
      if (typeof occasion === 'string' && occasion) {
        return { key: widget, label: `Quick Buy · ${titleCaseSlug(occasion)}` };
      }
    }
    if (widget === 'PARTNER_LANDING_PAGE') {
      // Premier concierge quiz beats the partner-slug fallback: those leads
      // carry BOTH partner='premier-concierge' and the quiz surface.
      const quizParty = asRecord(m.conciergeQuiz)?.partyType;
      if (typeof quizParty === 'string' && quizParty) {
        return { key: widget, label: `Concierge · ${titleCaseSlug(quizParty)}` };
      }
      if (typeof m.partner === 'string' && m.partner && m.partner !== 'premier-concierge') {
        return { key: widget, label: `Partner · ${titleCaseSlug(m.partner)}` };
      }
    }
    if (widget === 'GROUP_DASHBOARD') {
      const src = asRecord(m.groupDashboard)?.source;
      const label = typeof src === 'string' ? DASHBOARD_SOURCE_LABELS.get(src) : undefined;
      if (label) return { key: widget, label };
    }
    if (widget === 'PARTNER_INQUIRY') {
      // businessType is free text from the inquiry form ('Mobile Bartender',
      // 'Vacation Rental', a hotel/property dropdown value…) — show it so a
      // bartender doesn't read identically to an STR manager on the board.
      const businessType = asRecord(m.partnerInquiry)?.businessType;
      if (typeof businessType === 'string' && businessType.trim()) {
        return { key: widget, label: `B2B · ${titleCaseSlug(businessType)}` };
      }
    }
  }
  return { key: widget, label: safeLabel(SOURCE_LABELS, widget) };
}

/**
 * Which channel brought this lead in. First match wins, and the order is the
 * whole design:
 *
 *  1. ops       — we made it, so nothing else about it is meaningful
 *  2. outbound  — WE contacted THEM; keyed on the widget, never the
 *                 `partner-prospect` tag, so a prospect who later enquires on
 *                 their own is free to reclassify as inbound
 *  3. inbound   — a business reaching in (B2B inquiry, affiliate application,
 *                 email to info@); that is biz-dev, not marketing traffic
 *  4. paid      — outranks partner on purpose: an affiliate-stamped lead that
 *                 arrived on an ad click is still bought traffic. Webhook and
 *                 partner-page dashboards never carry click ids, so the
 *                 Premier flood cannot leak in here
 *  5. partner   — arrived through a partner surface or carries an affiliate
 *  6. organic   — an organic medium, or a search-engine referrer
 *  7. referral  — any other external referrer, or an owned non-paid medium
 *  8. direct    — everything else
 */
function channelFor(input: SourceTaxonomyInput, m: Record<string, unknown>): LeadChannel {
  const widget = input.sourceWidget ?? 'OTHER';
  const attribution = asRecord(m.attribution) ?? {};
  const dashboardSource = str(asRecord(m.groupDashboard)?.source);
  const medium = (input.utmMedium ?? '').trim().toLowerCase();

  if (widget === 'OPS_INVOICE' || m.opsInvoice != null || dashboardSource === 'INTERNAL') {
    return 'ops';
  }
  if (widget === 'PARTNER_OUTREACH') return 'outbound';
  if (
    widget === 'INBOUND_EMAIL' ||
    m.inboundEmail != null ||
    widget === 'PARTNER_INQUIRY' ||
    m.partnerInquiry != null ||
    m.affiliateApplication != null
  ) {
    return 'inbound';
  }
  if (PAID_MEDIUMS.has(medium)) return 'paid';
  if (CLICK_ID_KEYS.some((k) => str(attribution[k]))) return 'paid';
  if (
    input.hasAffiliate === true ||
    widget === 'PARTNER_LANDING_PAGE' ||
    widget === 'PARTNER_FAREHARBOR_WEBHOOK' ||
    widget === 'PARTNER_EMAIL_OPTIN' ||
    m.partner != null ||
    dashboardSource === 'WEBHOOK' ||
    dashboardSource === 'PARTNER_PAGE'
  ) {
    return 'partner';
  }

  // Our own host is nulled at capture time, but be defensive — a same-site
  // referrer is not a referral.
  const referrer = str(attribution.referrer);
  const externalReferrer =
    referrer && !referrer.toLowerCase().includes(OWN_HOST) ? referrer.toLowerCase() : null;

  if (medium === 'organic') return 'organic';
  if (externalReferrer && SEARCH_HOSTS.some((h) => externalReferrer.includes(h))) {
    return 'organic';
  }
  if (externalReferrer || OWNED_MEDIUMS.has(medium)) return 'referral';
  return 'direct';
}

/**
 * Which form was filled in. First surface present wins, in the same intent
 * order scoring uses. Returns null when nothing recorded a form — which is
 * itself the signal that a capture surface needs fixing.
 */
function formFor(
  input: SourceTaxonomyInput,
  m: Record<string, unknown>,
): { formKey: string; formLabel: string } | null {
  const widget = input.sourceWidget ?? 'OTHER';

  const concierge = asRecord(m.conciergeQuiz);
  if (concierge) {
    const party = str(concierge.partyType);
    return {
      formKey: 'concierge-quiz',
      formLabel: party ? `Concierge Quiz · ${titleCaseSlug(party)}` : 'Concierge Quiz',
    };
  }
  const quote = asRecord(m.unifiedQuote);
  if (quote) {
    const src = str(quote.source) ?? 'unknown';
    return {
      formKey: `quote:${src}`,
      formLabel: QUOTE_FLOW_LABELS.get(src) ?? `Quote · ${titleCaseSlug(src)}`,
    };
  }
  if (m.chatQuiz != null) return { formKey: 'chat-quiz', formLabel: 'Chat Quiz' };
  if (m.eventQuiz != null) return { formKey: 'event-quiz', formLabel: 'Event Quiz' };

  const contact = asRecord(m.contactForm);
  if (contact) {
    const src = str(contact.source) ?? 'contact';
    return {
      formKey: `contact:${src}`,
      formLabel: CONTACT_FORM_LABELS.get(src) ?? `Contact · ${titleCaseSlug(src)}`,
    };
  }
  const quickBuy = asRecord(m.quickBuy);
  if (quickBuy) {
    const occasion = str(quickBuy.occasion) ?? 'general';
    return { formKey: `quickbuy:${occasion}`, formLabel: `Quick Buy · ${titleCaseSlug(occasion)}` };
  }
  const inquiry = asRecord(m.partnerInquiry);
  if (inquiry) {
    const src = str(inquiry.source) ?? str(inquiry.businessType) ?? 'general';
    return { formKey: `partner-inquiry:${src}`, formLabel: `B2B · ${titleCaseSlug(src)}` };
  }
  if (m.affiliateApplication != null) {
    return { formKey: 'affiliate-apply', formLabel: 'Affiliate Application' };
  }
  const magnet = asRecord(m.leadMagnet);
  if (magnet) {
    const id = str(magnet.magnetId) ?? 'unknown';
    return {
      formKey: `lead-magnet:${id}`,
      formLabel: `Lead Magnet · ${str(magnet.magnetTitle) ?? titleCaseSlug(id)}`,
    };
  }
  const dashboard = asRecord(m.groupDashboard);
  if (dashboard) {
    const src = str(dashboard.source) ?? 'DIRECT';
    return {
      formKey: `dashboard:${src.toLowerCase()}`,
      formLabel: DASHBOARD_FORM_LABELS.get(src) ?? `Dashboard · ${titleCaseSlug(src)}`,
    };
  }
  if (m.abandonedCart != null) {
    return { formKey: 'event-rsvp-cart', formLabel: 'Event RSVP Cart' };
  }
  if (m.opsInvoice != null) return { formKey: 'ops-invoice', formLabel: 'Ops Invoice' };
  if (m.inboundEmail != null || widget === 'INBOUND_EMAIL') {
    return { formKey: 'inbound-email', formLabel: 'Inbound Email' };
  }
  if (widget === 'PARTNER_OUTREACH') {
    return { formKey: 'outbound-prospect', formLabel: 'Outbound Prospect' };
  }
  if (widget === 'WAYNE_CHAT') return { formKey: 'wayne-chat', formLabel: 'Wayne Chat' };
  const newsletter = asRecord(m.newsletter);
  if (newsletter) {
    const src = str(newsletter.source) ?? 'unknown';
    return { formKey: `newsletter:${src}`, formLabel: `Newsletter · ${titleCaseSlug(src)}` };
  }
  return null;
}

/** Full provenance for one lead. Never throws on malformed metadata. */
export function classifyLeadSource(input: SourceTaxonomyInput): SourceTaxonomy {
  const m = asRecord(input.metadata) ?? {};
  const { key, label } = refineSource(input.sourceWidget, input.metadata);
  const form = formFor(input, m);
  return {
    key,
    label,
    channel: channelFor(input, m),
    formKey: form?.formKey ?? null,
    formLabel: form?.formLabel ?? null,
  };
}

/**
 * The board's source dropdown. Grouped so the audience pseudo-filters, the
 * channels and the raw widgets don't read as one flat list. Channel values
 * are prefixed `channel:` and resolved to the `channel` filter by the bar.
 *
 * Removing an option is safe: the API takes `source` as a free string and
 * matches it against sourceKey, so an old saved URL keeps working.
 */
export const SOURCE_FILTER_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  group: 'audience' | 'channel' | 'source';
}> = [
  { value: 'CONSUMER', label: 'Consumers only', group: 'audience' },
  { value: 'PARTNER', label: 'Partner prospects', group: 'audience' },
  ...LEAD_CHANNELS.map((c) => ({
    value: `channel:${c}`,
    label: CHANNEL_LABELS[c],
    group: 'channel' as const,
  })),
  { value: 'GROUP_DASHBOARD', label: 'Party Dashboard', group: 'source' },
  { value: 'PARTNER_LANDING_PAGE', label: 'Concierge', group: 'source' },
  { value: 'CONTACT_FORM:quote', label: 'Quote Request', group: 'source' },
  { value: 'CONTACT_FORM:chat', label: 'Chat', group: 'source' },
  { value: 'CONTACT_FORM:quiz', label: 'Event Quiz', group: 'source' },
  { value: 'CONTACT_FORM:contact', label: 'Contact Form', group: 'source' },
  { value: 'PARTNER_INQUIRY', label: 'B2B / Partner', group: 'source' },
  { value: 'OPS_INVOICE', label: 'Ops Invoice', group: 'source' },
  { value: 'INBOUND_EMAIL', label: 'Inbound Email', group: 'source' },
  { value: 'QUICK_BUY', label: 'Quick Buy', group: 'source' },
  { value: 'PACKAGE_BUILDER', label: 'Package Builder', group: 'source' },
  { value: 'A_LA_CARTE', label: 'A La Carte', group: 'source' },
  { value: 'DRINK_CALCULATOR', label: 'Calculator', group: 'source' },
  { value: 'LEAD_MAGNET', label: 'Lead Magnet', group: 'source' },
  { value: 'WAYNE_CHAT', label: 'Wayne Chat', group: 'source' },
  { value: 'EMAIL_SIGNUP', label: 'Email Signup', group: 'source' },
  { value: 'OTHER', label: 'Site', group: 'source' },
];
