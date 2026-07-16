/**
 * Hero Section Variant Configurations
 * Defines content variants for A/B testing the homepage hero
 */

export interface HeroImage {
  src: string;
  alt: string;
}

export interface CTAButton {
  text: string;
  url: string;
  style: 'primary' | 'secondary' | 'text-link';
}

export interface HeroVariantContent {
  id: string;
  name: string;
  headline: {
    line1: string;
    line2: string;
    rotatingWords?: string[];
  };
  tagline: string;
  trustBadges: string;
  images?: HeroImage[];
  ctaButtons: CTAButton[];
}

/**
 * Control variant - Current production hero content
 * This matches the existing HeroSection.tsx exactly
 */
export const heroControl: HeroVariantContent = {
  id: 'control',
  name: 'Control (Current)',
  headline: {
    line1: 'Drinks, Ice, Bar Setups',
    line2: 'Delivered on Time',
    rotatingWords: ['Drinks', 'Ice', 'Cocktails', 'Bar Supplies', 'Party Rentals', 'Beer', 'Seltzers'],
  },
  tagline: 'Concierge planning for Airbnbs, weddings, and corporate events\u2014plus a split-pay Group Order so everyone can add what they want and pay their portion.',
  trustBadges: 'Licensed • Insured • TABC-certified • 5.0★ on Google',
  ctaButtons: [
    { text: 'START ORDER', url: '/order', style: 'primary' },
  ],
};

/**
 * Variant A - Action-oriented CTA copy
 * Tests more direct call-to-action language
 */
export const heroVariantA: HeroVariantContent = {
  id: 'variant-a',
  name: 'Variant A (Action CTAs)',
  headline: {
    line1: 'Drinks, Ice, Bar Setups',
    line2: 'Delivered on Time',
    rotatingWords: ['Drinks', 'Ice', 'Cocktails', 'Bar Supplies', 'Party Rentals', 'Beer', 'Seltzers'],
  },
  tagline: 'From house parties to Lake Travis weddings—everything arrives cold with ice, cups, and mixers handled.',
  trustBadges: 'Licensed • Insured • TABC-certified • 5.0★ on Google',
  images: [
    { src: '/images/hero/austin-skyline-hero.webp', alt: 'Austin Skyline' },
    { src: '/images/hero/homepage-hero-sunset.webp', alt: 'Austin sunset from Lady Bird Lake' },
    { src: '/images/hero/homepage-hero-rooftop.webp', alt: 'Rooftop bar in downtown Austin' },
    { src: '/images/hero/homepage-hero-luxury.webp', alt: 'Luxury penthouse bar setup' },
  ],
  ctaButtons: [
    { text: 'START ORDER', url: '/order', style: 'primary' },
  ],
};

/**
 * Variant B - Simplified headline
 * Tests different value proposition messaging
 */
export const heroVariantB: HeroVariantContent = {
  id: 'variant-b',
  name: 'Variant B (Simple Headline)',
  headline: {
    line1: 'Party Supplies',
    line2: 'Delivered to Your Door',
    rotatingWords: ['Drinks', 'Ice', 'Cocktails', 'Bar Supplies', 'Party Rentals', 'Beer', 'Seltzers'],
  },
  tagline: 'Beer, spirits, ice, cups & more—Austin same-day delivery for any event.',
  trustBadges: 'Licensed • Insured • TABC-certified • 5.0★ on Google',
  images: [
    { src: '/images/hero/austin-skyline-hero.webp', alt: 'Austin Skyline' },
    { src: '/images/hero/homepage-hero-sunset.webp', alt: 'Austin sunset from Lady Bird Lake' },
    { src: '/images/hero/homepage-hero-rooftop.webp', alt: 'Rooftop bar in downtown Austin' },
    { src: '/images/hero/homepage-hero-luxury.webp', alt: 'Luxury penthouse bar setup' },
  ],
  ctaButtons: [
    { text: 'START ORDER', url: '/order', style: 'primary' },
  ],
};

/**
 * Variant C - Premium/Luxury focus
 * Tests emphasizing the premium service aspect
 */
export const heroVariantC: HeroVariantContent = {
  id: 'variant-c',
  name: 'Variant C (Premium Focus)',
  headline: {
    line1: "Austin's Premium",
    line2: 'Alcohol Delivery',
    rotatingWords: ['Drinks', 'Ice', 'Cocktails', 'Bar Supplies', 'Party Rentals', 'Beer', 'Seltzers'],
  },
  tagline: 'Full bar setups delivered—spirits, beer, wine, ice, and all the essentials for your event.',
  trustBadges: 'Licensed • Insured • TABC-certified • 5.0★ on Google',
  images: [
    { src: '/images/hero/homepage-hero-luxury.webp', alt: 'Luxury penthouse bar setup' },
    { src: '/images/hero/austin-skyline-hero.webp', alt: 'Austin Skyline' },
    { src: '/images/hero/homepage-hero-rooftop.webp', alt: 'Rooftop bar in downtown Austin' },
    { src: '/images/hero/homepage-hero-sunset.webp', alt: 'Austin sunset from Lady Bird Lake' },
  ],
  ctaButtons: [
    { text: 'START ORDER', url: '/order', style: 'primary' },
  ],
};

/**
 * Registry of all available variants
 * Used to look up variant content by ID
 */
export const heroVariantRegistry: Record<string, HeroVariantContent> = {
  control: heroControl,
  'variant-a': heroVariantA,
  'variant-b': heroVariantB,
  'variant-c': heroVariantC,
};

/**
 * Map a DB variant NAME to a hero content id in this registry — the legacy
 * homepage pipeline stores copy here (not in ExperimentVariant.content) and
 * resolves it by name. Unknown names fall back to 'control', which silently
 * renders control copy on BOTH arms of a test — so homepage experiment
 * variants must be named exactly Control / Variant A / Variant B / Variant C.
 * Single source of truth for /api/experiments/assign, /api/experiments/track,
 * and the seed-validity tests.
 */
export function mapVariantNameToContentId(variantName: string): string {
  const normalized = variantName.toLowerCase().trim();

  if (normalized === 'control') return 'control';
  if (normalized === 'variant a') return 'variant-a';
  if (normalized === 'variant b') return 'variant-b';
  if (normalized === 'variant c') return 'variant-c';

  // Default to control for unknown names
  return 'control';
}

/**
 * Get variant content by ID
 * Falls back to control if variant not found
 */
export function getHeroVariantById(variantId: string): HeroVariantContent {
  return heroVariantRegistry[variantId] || heroControl;
}

/**
 * Get all available variant IDs
 */
export function getAvailableVariantIds(): string[] {
  return Object.keys(heroVariantRegistry);
}
