/**
 * Customer segment classifier — derives a segment label from landing page + UTM campaign.
 * The site serves three primary value propositions (bach, wedding, corporate) plus boat parties,
 * kegs, and a general-order flow. Every other segment-aware metric (conversion-by-segment,
 * repeat-rate-by-segment, AOV-by-segment) joins through this label.
 */

export type Segment =
  | 'bach'
  | 'wedding'
  | 'corporate'
  | 'boat'
  | 'kegs'
  | 'general';

export const SEGMENTS: readonly Segment[] = ['bach', 'wedding', 'corporate', 'boat', 'kegs', 'general'];

/**
 * Path-prefix based classification with a UTM-campaign fallback. The prefix list is intentionally
 * narrow — any path that doesn't match an explicit segment falls through to 'general'. Update this
 * list when new segment landing pages are added.
 */
export function classifySegment(
  landingPage: string | null | undefined,
  utmCampaign: string | null | undefined
): Segment {
  const path = (landingPage || '').toLowerCase().split('?')[0];

  // The '/austin-…-delivery' prefixes are the paid landers; without them, organic
  // and direct visits to those pages fell through to 'general' (the UTM fallback
  // only rescued campaign traffic).
  if (
    path.startsWith('/bach-parties') ||
    path.startsWith('/bachelor') ||
    path.startsWith('/bachelorette') ||
    path.startsWith('/austin-bachelor') // covers -bachelor- and -bachelorette-
  ) {
    return 'bach';
  }
  if (path.startsWith('/weddings') || path.startsWith('/wedding') || path.startsWith('/austin-wedding')) {
    return 'wedding';
  }
  if (path.startsWith('/corporate') || path.startsWith('/austin-corporate')) {
    return 'corporate';
  }
  if (path.startsWith('/boat-parties') || path.startsWith('/boat')) {
    return 'boat';
  }
  if (path.startsWith('/kegs')) {
    return 'kegs';
  }

  // UTM fallback when the visitor lands on a non-segment page (e.g. /order) but came from
  // a segment-tagged campaign.
  const campaign = (utmCampaign || '').toLowerCase();
  if (campaign.includes('bach')) return 'bach';
  if (campaign.includes('wedding')) return 'wedding';
  if (campaign.includes('corporate')) return 'corporate';
  if (campaign.includes('boat')) return 'boat';
  if (campaign.includes('keg')) return 'kegs';

  return 'general';
}
