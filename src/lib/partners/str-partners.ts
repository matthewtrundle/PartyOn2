/**
 * Short-term-rental (STR / "Airbnb") partner configuration.
 *
 * Each STR property-management partner (e.g. Five Star Vacation Home Rentals)
 * gets one config entry here. It powers the guest "property picker" rendered on
 * the partner's landing page (`/partners/<slug>`): a guest selects their
 * specific rental from `properties` — which pre-fills the delivery address on
 * the group-order dashboard — or enters their own address when the unit isn't
 * listed.
 *
 * Intentionally config-driven: adding a new STR partner (e.g. Neal's rentals)
 * is a single object here plus an Affiliate row with a matching `partnerSlug` —
 * no new page or component.
 */

import type { DeliveryContextType } from '@/lib/group-orders-v2/types';

/** One bookable rental property belonging to an STR partner. */
export interface StrProperty {
  /** Stable id used as the dropdown <option> value. */
  id: string;
  /** Guest-facing label, e.g. "Lake Travis Estate — 5BR". */
  label: string;
  address1: string;
  address2?: string;
  city: string;
  /** Two-letter state, e.g. "TX". */
  province: string;
  zip: string;
}

/**
 * Optional second tab on a partner page. Renders a tab bar above the
 * standard partner content: the left tab is the existing POD page, the
 * right tab embeds an external booking page (e.g. Premier Party Cruises'
 * /quote). Config-driven so rolling it out to every partner is one field.
 */
export interface PartnerSecondTab {
  /** Label for the existing POD partner page tab (left). */
  leftLabel: string;
  /** Label for the embedded tab (right). */
  label: string;
  /** External page to embed (must allow framing — verified for Premier). */
  embedUrl: string;
}

/** A short-term-rental partner and its bookable properties. */
export interface StrPartnerConfig {
  /** Affiliate code (normalized: uppercase, no dashes), e.g. "FIVESTAR". */
  code: string;
  /** Affiliate partnerSlug / route slug, e.g. "five-star" → /partners/five-star. */
  slug: string;
  /** Display name, e.g. "Five Star Vacation Home Rentals". */
  name: string;
  /** Delivery context stamped on the dashboard tab (rentals are HOUSE). */
  deliveryContextType: DeliveryContextType;
  /** When true, guests can enter a custom address if their unit isn't listed. */
  allowCustomAddress: boolean;
  /** Bookable properties shown in the dropdown. May be empty (custom-only). */
  properties: StrProperty[];
  /** Optional second tab (e.g. Premier Party Cruises boat-quote embed). */
  secondTab?: PartnerSecondTab;
}

/**
 * Registry of STR partners, keyed by route slug.
 *
 * Five Star's `properties` roster is intentionally EMPTY until Lucas sends the
 * real list — the picker then renders the "enter your address" path only, so
 * guests never see fake data. To add a property, follow this shape:
 *
 *   { id: 'lake-travis-estate', label: 'Lake Travis Estate — 5BR',
 *     address1: '123 Real St', city: 'Austin', province: 'TX', zip: '78732' }
 */
const STR_PARTNERS: Record<string, StrPartnerConfig> = {
  'five-star': {
    code: 'FIVESTAR',
    slug: 'five-star',
    name: 'Five Star Vacation Home Rentals',
    deliveryContextType: 'HOUSE',
    allowCustomAddress: true,
    properties: [],
  },
  // First bulk-researched STR partner (Brian, 2026-07-14). Properties stay
  // empty until Lynn sends the rental roster — guests enter their address.
  'lynns-lodging': {
    code: 'LYNNSLODGI41E7',
    slug: 'lynns-lodging',
    name: "Lynn's Lodging",
    deliveryContextType: 'HOUSE',
    allowCustomAddress: true,
    properties: [],
    // Pilot for the two-tab partner page (Brian 2026-07-21): POD delivery
    // on the left, Premier Party Cruises quote embed on the right. Once
    // approved, duplicate to the other STR/bartending partners.
    // Same-origin MIRROR of premierpartycruises.com/quote (Brian's own
    // site) — public/partners-embed/premier-quote.html serves the exact
    // page with a <base> tag so all assets/scripts (incl. the Xola
    // checkout slide-out) load live from Premier. Refresh the mirror by
    // re-running the curl+inject step in the PR that added it.
    secondTab: {
      leftLabel: 'Alcohol Delivery',
      label: 'Party Boat Rentals',
      embedUrl: '/partners-embed/premier-quote.html',
    },
  },
};

/** Normalize an affiliate code for comparison (uppercase, strip dashes). */
function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/-/g, '');
}

/** Look up an STR partner by its route slug (e.g. "five-star"). */
export function getStrPartnerBySlug(
  slug: string | null | undefined
): StrPartnerConfig | null {
  if (!slug) return null;
  return STR_PARTNERS[slug] ?? null;
}

/** Look up an STR partner by affiliate code (normalized match). */
export function getStrPartnerByCode(
  code: string | null | undefined
): StrPartnerConfig | null {
  if (!code) return null;
  const target = normalizeCode(code);
  return Object.values(STR_PARTNERS).find((p) => normalizeCode(p.code) === target) ?? null;
}

/** All configured STR partners (for iteration / tests). */
export function listStrPartners(): StrPartnerConfig[] {
  return Object.values(STR_PARTNERS);
}
