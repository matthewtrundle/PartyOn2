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
}

/**
 * Registry of STR partners, keyed by route slug.
 *
 * NOTE: Five Star's `properties` below are PLACEHOLDERS — swap them for the real
 * roster (names + addresses) once Lucas sends it. Until then the picker still
 * works via the "enter your own address" path.
 */
const STR_PARTNERS: Record<string, StrPartnerConfig> = {
  'five-star': {
    code: 'FIVESTAR',
    slug: 'five-star',
    name: 'Five Star Vacation Home Rentals',
    deliveryContextType: 'HOUSE',
    allowCustomAddress: true,
    properties: [
      // --- PLACEHOLDER PROPERTIES — replace with Five Star's real listings ---
      {
        id: 'placeholder-lake-travis',
        label: 'PLACEHOLDER — Lake Travis Estate (replace me)',
        address1: '1 Example Ranch Rd',
        city: 'Austin',
        province: 'TX',
        zip: '78732',
      },
      {
        id: 'placeholder-hill-country',
        label: 'PLACEHOLDER — Hill Country Villa (replace me)',
        address1: '2 Example Vista Dr',
        city: 'Austin',
        province: 'TX',
        zip: '78738',
      },
    ],
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
