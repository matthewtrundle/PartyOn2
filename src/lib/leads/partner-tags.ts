/**
 * Tag vocabulary separating partner leads from consumer leads.
 *
 * Tags live in `Lead.tags` (TEXT[], GIN-indexed —
 * 2026-07-21-lead-tags-partner-outreach.sql). Partner-prospect leads are
 * additionally stamped `sourceWidget: PARTNER_OUTREACH`, so either axis
 * can filter them; consumer views exclude on the tag.
 */

/** Every synced partner-prospect lead carries this tag. */
export const TAG_PARTNER_PROSPECT = 'partner-prospect';

/** Added once the company is a signed, ACTIVE affiliate. */
export const TAG_PARTNER_ACTIVE = 'partner-active';

/** Vertical tags — match the prospect database the lead came from. */
export const PARTNER_VERTICAL_TAGS = {
  str: 'str',
  bartender: 'bartender',
  venue: 'venue',
} as const;

export type PartnerVertical = keyof typeof PARTNER_VERTICAL_TAGS;

/** True when a lead's tags mark it as a partner lead (not a consumer). */
export function isPartnerLead(tags: string[] | null | undefined): boolean {
  return (tags ?? []).includes(TAG_PARTNER_PROSPECT);
}

/**
 * Patterns matched against the inbound inquiry form's free-text business type
 * ('Mobile Bartender', 'Vacation Rental', a dropdown value…). Order matters:
 * first match wins. Deliberately narrow — these three tags mean "belongs in
 * that outbound prospect vertical", so hotels, resorts, and multifamily
 * property management match NONE of them: a hotel is not a short-term-rental
 * company, and /partners/property-management sells to apartment buildings.
 * An unmatched business type gets no tag rather than a wrong one.
 */
const VERTICAL_PATTERNS: ReadonlyArray<readonly [RegExp, PartnerVertical]> = [
  [/bartend|mobile\s*bar\b|bar\s*service/i, 'bartender'],
  [/vacation\s*rental|short[-\s]*term|\bstr\b|airbnb/i, 'str'],
  [/venue|event\s*space|ballroom|byob|country\s*club/i, 'venue'],
];

/**
 * Business types that are a company reaching out even though they map to no
 * prospect vertical — hotels, apartments, restaurants, corporate offices.
 * Used only to sort the board's PARTNER vs CONSUMER views.
 */
const OTHER_B2B_RE = /hotel|resort|lodging|\bproperty\b|apartment|multifamily|restaurant|\bbar\b|corporate\s*office|\bclub\b/i;

/**
 * `/api/partners/inquiry` is a SHARED endpoint: consumer landers post to it
 * too, so `sourceWidget: PARTNER_INQUIRY` alone does not mean "a business".
 * These are the consumer forms that use it — they must stay on the consumer
 * board. Matched before any B2B pattern.
 */
const CONSUMER_INQUIRY_RE = /holiday\s*party|wedding|birthday|bachelor/i;

/**
 * Classify an inbound partner inquiry's business type into a prospect vertical
 * so the board and the CRM mirror can tell a bartender apart from an STR
 * company. Returns null when nothing matches confidently.
 *
 * NOTE: this only produces the VERTICAL tag. Never derive
 * `partner-prospect` / `partner-active` from an inbound form — those mean
 * "in the outbound prospect database" and "signed affiliate" respectively.
 */
export function verticalForBusinessType(
  businessType: string | null | undefined
): PartnerVertical | null {
  if (!businessType) return null;
  if (CONSUMER_INQUIRY_RE.test(businessType)) return null;
  for (const [pattern, vertical] of VERTICAL_PATTERNS) {
    if (pattern.test(businessType)) return vertical;
  }
  return null;
}

/**
 * Is this inquiry a BUSINESS reaching out, rather than a customer who happened
 * to submit through the shared partner endpoint (e.g. the corporate
 * holiday-party quote form)? Conservative by design: an unrecognized business
 * type stays on the consumer board, which is where every PARTNER_INQUIRY lead
 * sat before this existed.
 */
export function isB2bBusinessType(businessType: string | null | undefined): boolean {
  if (!businessType) return false;
  if (CONSUMER_INQUIRY_RE.test(businessType)) return false;
  return verticalForBusinessType(businessType) !== null || OTHER_B2B_RE.test(businessType);
}
