/**
 * Map a party type to a hero photo URL for the WelcomeHero banner.
 *
 * Returns null when no production photo exists yet -- the consumer falls back
 * to a warm CSS gradient (see WelcomeHero's WarmGradient layer).
 *
 * Photo specs (when authored):
 *   - Format: WebP or JPG
 *   - Min width: 1600px
 *   - Aspect: landscape (16:9 or wider crops well at the typical 140-180px
 *     hero height; the photo is full-bleed and the overlay grades darker
 *     toward the bottom)
 *   - Mood: warm, sunlit, lifestyle. "Saturday morning sunlight," not
 *     "midnight luxury."
 *   - Path: /public/images/dashboard-hero/{partyType}.jpg
 *     e.g. /public/images/dashboard-hero/boat.jpg
 *
 * When new photos drop in, flip the boolean for that party type to true and
 * the WelcomeHero will start rendering the image. Until then, the gradient
 * stand-in ships.
 */

import type { PartyType } from '@/lib/group-orders-v2/types';

const PHOTO_AVAILABLE: Record<PartyType, boolean> = {
  BOAT: false,
  WEDDING: false,
  BACH: false,
  BACHELOR: false,
  BACHELORETTE: false,
  CORPORATE: false,
  HOUSE_PARTY: false,
  OTHER: false,
};

export function heroImageForPartyType(partyType: PartyType | null): string | null {
  if (!partyType) return null;
  if (!PHOTO_AVAILABLE[partyType]) return null;
  return `/images/dashboard-hero/${partyType.toLowerCase()}.jpg`;
}
