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
