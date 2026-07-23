/**
 * Lead → Affiliate resolution ("the later PR" the schema comment on
 * Lead.affiliateId promised). One shared helper so capture routes and the
 * backfill script agree on the rules:
 *
 *   1. An explicit partner slug (metadata.partner / partner landing pages)
 *      resolves via Affiliate.partnerSlug, falling back to code — with an
 *      alias map for funnels that aren't a partner page slug (the Premier
 *      concierge questionnaire belongs to Premier Party Cruises).
 *   2. The 30-day `ref_code` attribution cookie (middleware.ts) resolves the
 *      same way — previously it only ever attributed Orders at checkout.
 *
 * Fill-blank only: callers pass the result into upsertLead's ctx, which
 * never overwrites an existing Lead.affiliateId.
 */

import { getAffiliateBySlug } from '@/lib/affiliates/affiliate-service';

/** Funnel-partner strings that map to a real affiliate under another name. */
export const PARTNER_SLUG_ALIASES: Record<string, string> = {
  // The concierge questionnaire is Premier Party Cruises' funnel; its leads
  // carry metadata.partner='premier-concierge', not the partner-page slug.
  'premier-concierge': 'PREMIER',
};

/** Resolve a partner slug / ref_code value to an Affiliate id, or null. */
export async function resolveAffiliateId(
  slugOrCode: string | null | undefined,
): Promise<string | null> {
  const raw = (slugOrCode ?? '').trim();
  if (!raw) return null;
  const target = PARTNER_SLUG_ALIASES[raw.toLowerCase()] ?? raw;
  try {
    const affiliate = await getAffiliateBySlug(target);
    return affiliate?.id ?? null;
  } catch {
    // Attribution is best-effort — a lookup hiccup must never fail capture.
    return null;
  }
}
