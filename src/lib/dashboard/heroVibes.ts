/**
 * Hero vibe catalog -- the list of background "moods" a customer can pick
 * for their dashboard hero.
 *
 * Today each vibe is a CSS gradient (zero licensing/storage cost, ships
 * immediately). When real photography is authored later, an entry can
 * gain an optional `photoUrl` and the WelcomeHero renders the photo in
 * place of the gradient with no other code changes needed.
 *
 * The `affinity` field is a soft hint that lets the picker surface a
 * "Recommended for your {partyType}" section at the top. Vibes can match
 * multiple party types; the OTHER fallback shows all vibes.
 *
 * Keys are stable identifiers (kebab-case). Renaming a key would orphan
 * existing dashboards' selections, so prefer adding new keys + deprecating
 * old ones over renaming.
 */

import type { PartyType } from '@/lib/group-orders-v2/types';

export interface HeroVibe {
  key: string;
  label: string;
  /** Soft party-type hints. Picker surfaces matches first; non-matches still selectable. */
  affinity: PartyType[];
  /** Full CSS background value (gradient, image, or composite). */
  gradient: string;
  /** Optional real photo URL (CDN). When set, takes precedence over `gradient`. */
  photoUrl?: string;
}

/**
 * The catalog. Add freely; don't rename existing keys.
 *
 * Gradient design notes:
 *  - Each one is a top-to-bottom gradient with 3-4 stops, mood-tuned per label.
 *  - Bottom edge is always reasonably dark so the welcome copy (white text)
 *    stays legible. The WelcomeHero adds its own dark scrim too.
 */
export const HERO_VIBES: HeroVibe[] = [
  {
    key: 'sunrise-lake',
    label: 'Sunrise on the Lake',
    affinity: ['BOAT'],
    gradient: 'linear-gradient(180deg, #FFE3B0 0%, #F2D34F 45%, #D4AF37 80%, #8B6914 100%)',
    photoUrl: '/images/dashboards/sunrise-lake.jpg',
  },
  {
    key: 'golden-hour',
    label: 'Golden Hour',
    affinity: ['BOAT', 'WEDDING', 'HOUSE_PARTY'],
    gradient: 'linear-gradient(180deg, #FFD78B 0%, #E8A45C 50%, #B85C28 100%)',
    photoUrl: '/images/dashboards/golden-hour.jpg',
  },
  {
    key: 'pool-blue',
    label: 'Pool Blue',
    affinity: ['HOUSE_PARTY', 'BACH', 'BACHELORETTE'],
    gradient: 'linear-gradient(180deg, #B8E0F5 0%, #5BB3D9 50%, #0B74B8 100%)',
    photoUrl: '/images/dashboards/pool-blue.jpg',
  },
  {
    key: 'champagne-morn',
    label: 'Champagne Morning',
    affinity: ['WEDDING'],
    gradient: 'linear-gradient(180deg, #FFF5E1 0%, #F5DCB0 45%, #D4AF8C 100%)',
    photoUrl: '/images/dashboards/champagne-morn.jpg',
  },
  {
    key: 'rose-petal',
    label: 'Rose Petal',
    affinity: ['WEDDING', 'BACHELORETTE'],
    gradient: 'linear-gradient(180deg, #FFE0E0 0%, #F5A0B5 50%, #B8456A 100%)',
    photoUrl: '/images/dashboards/rose-petal.jpg',
  },
  {
    key: 'midnight-neon',
    label: 'Midnight Neon',
    affinity: ['BACH', 'BACHELOR', 'BACHELORETTE'],
    gradient: 'linear-gradient(180deg, #2D1B4E 0%, #5B2C8C 40%, #E83E8C 100%)',
    // photoUrl pending -- no image generated yet; drops to gradient fallback.
  },
  {
    key: 'rooftop-sunset',
    label: 'Rooftop Sunset',
    affinity: ['CORPORATE', 'HOUSE_PARTY'],
    gradient: 'linear-gradient(180deg, #FFA86A 0%, #E85F4C 50%, #6A2C5C 100%)',
    // photoUrl pending -- no image generated yet; drops to gradient fallback.
  },
  {
    key: 'boardroom-clean',
    label: 'Clean Daylight',
    affinity: ['CORPORATE'],
    gradient: 'linear-gradient(180deg, #F0F4F8 0%, #B8C6D6 50%, #5A6B82 100%)',
    photoUrl: '/images/dashboards/boardroom-clean.jpg',
  },
  {
    key: 'beach-day',
    label: 'Beach Day',
    affinity: ['BOAT', 'BACH', 'HOUSE_PARTY'],
    gradient: 'linear-gradient(180deg, #B5E1F0 0%, #F5E0B0 60%, #D4A05C 100%)',
    photoUrl: '/images/dashboards/beach-day.jpg',
  },
  {
    key: 'lake-pines',
    label: 'Lake & Pines',
    affinity: ['BOAT'],
    gradient: 'linear-gradient(180deg, #C4E1D5 0%, #5C8F75 50%, #2A4F3F 100%)',
    photoUrl: '/images/dashboards/lake-pines.jpg',
  },
  {
    key: 'desert-dusk',
    label: 'Desert Dusk',
    affinity: ['BACH', 'BACHELOR', 'BACHELORETTE', 'WEDDING'],
    gradient: 'linear-gradient(180deg, #F5C28C 0%, #D67E55 45%, #6A2E3C 100%)',
    photoUrl: '/images/dashboards/desert-dusk.jpg',
  },
  {
    key: 'simple-cream',
    label: 'Simple Cream',
    affinity: ['CORPORATE', 'OTHER'],
    gradient: 'linear-gradient(180deg, #FAF6EE 0%, #E8DCC0 60%, #B8A78C 100%)',
    photoUrl: '/images/dashboards/simple-cream.jpg',
  },
];

const VIBES_BY_KEY: Record<string, HeroVibe> = Object.fromEntries(
  HERO_VIBES.map((v) => [v.key, v])
);

/**
 * Look up a vibe by its stored key. Returns null if the key isn't in the
 * catalog (e.g. a vibe was deprecated and an old dashboard still references
 * it). The caller falls back to the party-type default in that case.
 */
export function heroVibeByKey(key: string | null): HeroVibe | null {
  if (!key) return null;
  return VIBES_BY_KEY[key] ?? null;
}

/**
 * Partition vibes into "recommended for this party type" and "all others"
 * for the picker UI. When partyType is null, returns all in catalog order.
 */
export function vibesForPicker(partyType: PartyType | null): {
  recommended: HeroVibe[];
  others: HeroVibe[];
} {
  if (!partyType) {
    return { recommended: [], others: HERO_VIBES };
  }
  const recommended: HeroVibe[] = [];
  const others: HeroVibe[] = [];
  for (const v of HERO_VIBES) {
    if (v.affinity.includes(partyType)) recommended.push(v);
    else others.push(v);
  }
  return { recommended, others };
}
