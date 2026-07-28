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
import { PREMIER_QUOTE_EMBED_PATH } from '@/lib/partners/premier-embed';
import { STR_PROSPECT_SLUGS } from '@/lib/partners/str-prospect-slugs';

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
  /**
   * Page to embed. Must be same-origin: Premier's bundle loads `/assets/*`
   * root-relative with no CORS headers, so it can only boot from a POD path
   * (see PREMIER_QUOTE_EMBED_PATH).
   */
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
 * Lynn's Lodging is THE template for partner-page replication (Brian,
 * 2026-07-21): the two-tab layout with the POD delivery page on the left
 * and the Premier Party Cruises quote page on the right. Every STR partner
 * page not explicitly configured below inherits this via
 * defaultStrConfigFor().
 *
 * `embedUrl` is a POD route that proxies Premier's live `/quote` shell —
 * NOT a committed copy of it. See `src/lib/partners/premier-embed.ts`: a
 * frozen snapshot went blank every time Premier redeployed, because their
 * bundle filenames are content-hashed.
 */
export const LYNNS_TEMPLATE_SECOND_TAB: PartnerSecondTab = {
  leftLabel: 'Alcohol Delivery',
  label: 'Party Boat Rentals',
  embedUrl: PREMIER_QUOTE_EMBED_PATH,
};

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
    secondTab: LYNNS_TEMPLATE_SECOND_TAB,
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
    // on the left, Premier Party Cruises quote embed on the right.
    secondTab: LYNNS_TEMPLATE_SECOND_TAB,
  },
  // The MODEL page — identical to the Lynn's Lodging layout but with the
  // placeholder business name "Company Name" (backed by a DRAFT affiliate
  // with partnerSlug 'partner-template'). Reference/demo only; never send
  // this URL to a real partner.
  'partner-template': {
    code: 'PARTNERTEMPLATE',
    slug: 'partner-template',
    name: 'Company Name',
    deliveryContextType: 'HOUSE',
    allowCustomAddress: true,
    properties: [],
    secondTab: LYNNS_TEMPLATE_SECOND_TAB,
  },
};

/** Normalize an affiliate code for comparison (uppercase, strip dashes). */
function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/-/g, '');
}

/**
 * Build the Lynn's-template config for an STR prospect that has a live
 * partner page (partnerSlug) but no hand-written registry entry. Keeps
 * "add an STR partner" down to: bulk-import the affiliate + slug in the
 * prospect JSON — no code change per partner.
 */
function defaultStrConfigFor(slug: string): StrPartnerConfig | null {
  const name = STR_PROSPECT_SLUGS[slug];
  if (!name) return null;
  return {
    code: normalizeCode(slug),
    slug,
    name,
    deliveryContextType: 'HOUSE',
    allowCustomAddress: true,
    properties: [],
    secondTab: LYNNS_TEMPLATE_SECOND_TAB,
  };
}

/** Look up an STR partner by its route slug (e.g. "five-star"). */
export function getStrPartnerBySlug(
  slug: string | null | undefined
): StrPartnerConfig | null {
  if (!slug) return null;
  return STR_PARTNERS[slug] ?? defaultStrConfigFor(slug);
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
