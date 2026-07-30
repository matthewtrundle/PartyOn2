/**
 * Partner Outreach 2.0 — vertical registry (registry pattern like
 * src/lib/analytics/landing-pages.ts).
 *
 * One entry per prospect vertical: what to research, how to discover new
 * prospects, and the per-vertical OFFER BLOCK the Hormozi drafter builds
 * the value-equation sentence from. Adding a vertical = one entry here
 * plus a tag in PARTNER_VERTICAL_TAGS.
 */

import { PARTNER_VERTICAL_TAGS, type PartnerVertical } from '@/lib/leads/partner-tags';

export interface VerticalDef {
  key: PartnerVertical;
  label: string;
  /** Tag stamped on the synced Lead (mirror of PARTNER_VERTICAL_TAGS). */
  leadTag: string;
  /** What an enrichment session should dig for, beyond the standard dossier. */
  researchFocus: string;
  /** Query seeds for "discover <city> <vertical>" sessions (× city). */
  discoveryQueryHints: string[];
  /**
   * The offer, Hormozi-framed: dream outcome + likelihood + low effort.
   * The drafter compresses this into ONE offer sentence per email.
   */
  offer: string;
}

export const VERTICALS: VerticalDef[] = [
  {
    key: 'str',
    label: 'Short-term rentals',
    leadTag: PARTNER_VERTICAL_TAGS.str,
    researchFocus:
      'Portfolio size and property types, largest sleeps-N group capacity, guest demographic (bachelorette/birthday/family), management team names, guest-review themes mentioning arrival experience or stocking, whether they already offer add-ons or concierge services.',
    discoveryQueryHints: [
      'vacation rental management company',
      'short term rental property management',
      'luxury airbnb management',
      'bachelorette airbnb rentals',
    ],
    offer:
      // Two doors: the co-branded page tabs between alcohol delivery and a
      // Premier Party Cruises boat quote.
      //
      // COMP WORDING — this sentence has flipped three times in two days; read
      // this before changing it again. #327 (07-28) "commission on both" →
      // #331 (07-29 compliance pass) "flat per-order bounty on drinks" →
      // CURRENT (Allan, 07-29, after #331): back to "commission" on both,
      // his reasoning being that "commission" does not necessarily mean a
      // percentage. What is NOT negotiable and survives every flip: never a
      // percentage, rate, tier, or dollar figure while counsel Q1–Q2 are open.
      // Boat bookings are not alcohol and settle through Premier's own system.
      'Their co-branded ordering page is ALREADY BUILT (or built same-day): guests get free alcohol delivery to the rental as an advertised perk OR can book a boat through our partner Premier Party Cruises, every group gets a private split-pay dashboard, and the company earns a commission on the drink orders AND on every booked boat — zero staff time, no inventory, no liability.',
  },
  {
    key: 'bartender',
    label: 'Bartending services',
    leadTag: PARTNER_VERTICAL_TAGS.bartender,
    researchFocus:
      'Service model (dry-hire vs packages), TABC status, typical event size, who buys the alcohol today (client-shops-themselves pain), gig areas, review themes about setup/supply runs, owner names.',
    discoveryQueryHints: [
      'bartending service events',
      'mobile bartender weddings',
      'dry hire bartending company',
      'event bar service',
    ],
    offer:
      'POD becomes their supply chain: the alcohol, ice, mixers, and cups arrive stocked and iced at the gig (clients must buy the alcohol themselves in TX dry-hire setups — we make that a link instead of a Costco run), unopened returns up to 25% take the over-buy risk off the client, and referrals flow both ways.',
  },
  {
    key: 'venue',
    label: 'BYOB event venues',
    leadTag: PARTNER_VERTICAL_TAGS.venue,
    researchFocus:
      'BYOB / open-vendor alcohol policy specifics (TABC bartender required?), capacity, event types (weddings/corporate), how clients source alcohol today, venue coordinator or events-manager contact (the CSV seeds have NO emails — finding a direct address is the top priority), preferred-vendor list existence.',
    discoveryQueryHints: [
      'BYOB wedding venue',
      'event venue open vendor alcohol policy',
      'BYOB event space',
      'wedding venue bring your own alcohol',
    ],
    offer:
      'Their BYOB policy becomes a selling point instead of homework: clients get a venue-branded ordering page with delivery timed to the event (iced, arranged, unopened returns), the venue lands on our directory as a featured BYOB space, and coordinators stop fielding "where do we buy the alcohol" — zero lift, and a commission on the orders.',
  },
];

const VERTICAL_MAP = new Map(VERTICALS.map((v) => [v.key, v]));

/** Look up a vertical definition; undefined for unknown keys. */
export function getVertical(key: string): VerticalDef | undefined {
  return VERTICAL_MAP.get(key as PartnerVertical);
}

export const VERTICAL_KEYS = VERTICALS.map((v) => v.key);
