/**
 * Welcome copy maps for the dashboard WelcomeHero.
 *
 * Each party type gets:
 *   - an uppercase eyebrow line (yellow accent text above the headline)
 *   - a Fraunces-italic subhead under the "Hey, {name}." headline
 *
 * Keys match the PartyType enum in prisma/schema.prisma -- BIRTHDAY, TAILGATE,
 * and HOLIDAY do NOT exist in the enum even though the original Direction E
 * handoff listed them, so they were dropped. If new party types are added to
 * Prisma later, add entries here too or the default fallback will fire.
 *
 * Eyebrow rule: ≤ ~30 chars, all caps, separated by " · " (middle dot).
 * Subhead rule: ≤ ~6 words, premium-playful, no exclamation overload.
 */

import type { PartyType } from '@/lib/group-orders-v2/types';

export interface WelcomeCopy {
  eyebrow: string;
  subhead: string;
}

const COPY: Record<PartyType, WelcomeCopy> = {
  BOAT: {
    eyebrow: 'BOAT DAY · LAKE TRAVIS',
    subhead: 'Your boat day kit, ready to load.',
  },
  WEDDING: {
    eyebrow: 'WEDDING WEEKEND · AUSTIN',
    subhead: 'Stocking your weekend in style.',
  },
  BACH: {
    eyebrow: 'BACHELOR/ETTE · AUSTIN',
    subhead: 'The party starts at delivery.',
  },
  BACHELOR: {
    eyebrow: 'BACHELOR · AUSTIN',
    subhead: 'The party starts at delivery.',
  },
  BACHELORETTE: {
    eyebrow: 'BACHELORETTE · AUSTIN',
    subhead: 'The party starts at delivery.',
  },
  CORPORATE: {
    eyebrow: 'CORPORATE · AUSTIN',
    subhead: "Bar's open. Send the calendar invite.",
  },
  HOUSE_PARTY: {
    eyebrow: 'HOUSE PARTY · AUSTIN',
    subhead: "Your guests don't know how lucky they are.",
  },
  OTHER: {
    eyebrow: 'PARTY ON · AUSTIN',
    subhead: "Let's get this started.",
  },
};

const FALLBACK: WelcomeCopy = COPY.OTHER;

/**
 * Look up welcome copy for a party type. Returns the OTHER fallback when the
 * party type is null (unset) or somehow not in the COPY map (defensive
 * against schema drift).
 */
export function welcomeCopyFor(partyType: PartyType | null): WelcomeCopy {
  if (!partyType) return FALLBACK;
  return COPY[partyType] ?? FALLBACK;
}

/**
 * Derive a usable first name from the host's full name. The Premier webhook
 * default ("Party Host") gets remapped to "there" so the greeting reads as
 * "Hey, there." instead of "Hey, Party Host."
 */
export function hostFirstName(hostName: string | null | undefined): string {
  if (!hostName || hostName.trim() === '' || hostName === 'Party Host') {
    return 'there';
  }
  return hostName.trim().split(/\s+/)[0];
}
