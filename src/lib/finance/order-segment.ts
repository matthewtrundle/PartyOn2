/**
 * Segment classification for the monthly rollup (Phase 5C).
 *
 * Thin wrappers over the existing analytics classifier so the trajectory uses
 * the SAME taxonomy as every other segment-aware metric (bach / wedding /
 * corporate / boat / kegs / general). Two entry points because the two revenue
 * eras carry different signals:
 *   - Order table (2026+): landing page + UTM campaign (best signal), with a
 *     group-order-name fallback for boat/wedding/bach events.
 *   - ShopifyOrderArchive (≤2025): no landing page (PII-gated) and empty tags
 *     on this store, so signal is weak — source_name + note keywords, else
 *     'general'. Historical segment data is therefore coarse by nature.
 */

import { classifySegment, type Segment } from '@/lib/analytics/segment-classifier';

export type { Segment };

/** Keyword → segment for the few free-text signals we can read. */
function keywordSegment(text: string | null | undefined): Segment | null {
  const t = (text ?? '').toLowerCase();
  if (!t) return null;
  if (/bachelor|bachelorette|\bbach\b/.test(t)) return 'bach';
  if (/wedding/.test(t)) return 'wedding';
  if (/corporate/.test(t)) return 'corporate';
  if (/\bboat\b|cruise|yacht|marina|lake\s*travis|pontoon/.test(t)) return 'boat';
  if (/\bkeg\b/.test(t)) return 'kegs';
  return null;
}

export interface OrderSegmentInput {
  landingPage: string | null;
  utmCampaign: string | null;
  /** Pre-stored Order.segment, if already classified (skip recompute when set). */
  storedSegment?: string | null;
  /** GroupOrderV2.name (boat manifest / event name), if the order is in a group. */
  groupName?: string | null;
}

/** Classify an Order-table row. */
export function segmentForOrder(input: OrderSegmentInput): Segment {
  // Trust a pre-stored non-general segment.
  if (input.storedSegment && input.storedSegment !== 'general') {
    if (isSegment(input.storedSegment)) return input.storedSegment;
  }
  const primary = classifySegment(input.landingPage, input.utmCampaign);
  if (primary !== 'general') return primary;
  // Group-order name is a strong event signal when the page/UTM are generic.
  return keywordSegment(input.groupName) ?? 'general';
}

export interface ArchiveSegmentInput {
  sourceName: string | null;
  note: string | null;
  tags: string[];
}

/** Classify a ShopifyOrderArchive row (weak signal — usually 'general'). */
export function segmentForArchive(input: ArchiveSegmentInput): Segment {
  for (const tag of input.tags) {
    const s = keywordSegment(tag);
    if (s) return s;
  }
  return keywordSegment(input.note) ?? keywordSegment(input.sourceName) ?? 'general';
}

function isSegment(s: string): s is Segment {
  return ['bach', 'wedding', 'corporate', 'boat', 'kegs', 'general'].includes(s);
}
