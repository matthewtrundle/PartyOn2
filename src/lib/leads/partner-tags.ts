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
 * ('Mobile Bartender', 'Vacation Rental', a hotel/property dropdown value…).
 * Order matters: first match wins. Deliberately conservative — an unmatched
 * business type gets NO tag rather than a wrong one.
 */
const VERTICAL_PATTERNS: ReadonlyArray<readonly [RegExp, PartnerVertical]> = [
  [/bartend|mobile\s*bar\b|bar\s*service/i, 'bartender'],
  // 'property' on its own is the /austin-partners dropdown's property-management option.
  [/vacation\s*rental|short[-\s]*term|\bstr\b|airbnb|\bproperty\b|lodging|hotel|resort/i, 'str'],
  [/venue|event\s*space|ballroom|byob/i, 'venue'],
];

/**
 * Classify an inbound partner inquiry's business type into a prospect vertical
 * so the board's PARTNER filter and labels can tell a bartender apart from an
 * STR manager. Returns null when nothing matches confidently.
 *
 * NOTE: this only produces the VERTICAL tag. Never derive
 * `partner-prospect` / `partner-active` from an inbound form — those mean
 * "in the outbound prospect database" and "signed affiliate" respectively.
 */
export function verticalForBusinessType(
  businessType: string | null | undefined
): PartnerVertical | null {
  if (!businessType) return null;
  for (const [pattern, vertical] of VERTICAL_PATTERNS) {
    if (pattern.test(businessType)) return vertical;
  }
  return null;
}
