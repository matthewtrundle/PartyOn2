/**
 * Hero-headline A/B test seeds — one 2-variant test per landing page.
 *
 * Copy follows the Hormozi headline framework (dream outcome + timeframe +
 * effort/risk minimizer) with BOLD swings: at this site's traffic (20–660
 * views/page/month) only large effects can reach significance, so challengers
 * change the angle, not a word. Control is ALWAYS the current live copy
 * (content: {} = render the page's defaults).
 *
 * Rules encoded here (enforced by src/__tests__/hero-test-seeds.test.ts):
 * - Exactly 2 variants per test, 50/50, exactly one control. Headline-only —
 *   CTA text unchanged so the test measures the headline.
 * - Template landers (/austin-*): challenger sets headline + headlineAccent;
 *   the SEO eyebrow (H1) is never varied (and the resolver ignores it anyway).
 * - Homepage: variant names MUST be exactly 'Control' / 'Variant C' — the
 *   legacy homepage pipeline maps names → hero-variants.ts content, and any
 *   other name silently falls back to control copy on both arms. Copy fields
 *   stay empty; Variant C ("Austin's Premium / Alcohol Delivery" + luxury
 *   imagery) lives in code. Note: it changes images too, so the homepage test
 *   reads as a premium-positioning test, not a pure copy test.
 * - /wedding-drink-calculator: the H1 is the exact-match paid keyword — the
 *   challenger keeps "Wedding Drink Calculator" as a substring.
 */

import type { CreateExperimentInput } from './experiment-schemas';

export interface HeroTestSeed extends CreateExperimentInput {
  /** Under ~5 views/month — seeded only with --include-low-traffic. */
  lowTraffic?: boolean;
}

/** Routes with a working hero-experiment integration (System B or legacy). */
export const WIRED_ROUTES = [
  '/',
  '/weddings',
  '/boat-parties',
  '/cocktail-kits',
  '/austin-bachelor-party-delivery',
  '/austin-bachelorette-party-delivery',
  '/austin-corporate-event-delivery',
  '/austin-wedding-weekend-delivery',
  '/wedding-drink-calculator',
  '/order',
] as const;

function twoVariants(
  challenger: Record<string, string>
): CreateExperimentInput['variants'] {
  return [
    { name: 'Control', isControl: true, weight: 50, content: {} },
    { name: 'Variant B', isControl: false, weight: 50, content: challenger },
  ];
}

export const HERO_TEST_SEEDS: HeroTestSeed[] = [
  {
    name: 'Home hero — animated control vs premium positioning (v1)',
    description:
      'Legacy in-code variants: Control = animated hero; Variant C = static "Austin\'s Premium / Alcohol Delivery" + luxury imagery. Positioning test (copy + images swap together).',
    page: '/',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: [
      { name: 'Control', isControl: true, weight: 50, content: {} },
      { name: 'Variant C', isControl: false, weight: 50, content: {} },
    ],
  },
  {
    name: 'Weddings hero — quality claim vs vendor-relief (v1)',
    description:
      'Control: "Your Austin Wedding, PERFECTLY SERVED". Challenger reframes as risk/effort relief for an overwhelmed couple.',
    page: '/weddings',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: twoVariants({
      headline: 'One Less Wedding Vendor To Worry About',
    }),
  },
  {
    name: 'Boat hero — product attribute vs timeframe (v1)',
    description:
      'Control: "Cold Drinks to Your BOAT—ON TIME". Challenger sells the moment it matters: stocked before departure.',
    page: '/boat-parties',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: twoVariants({
      headline: 'Stocked Before You Leave the Marina',
    }),
  },
  {
    name: 'Cocktail kits hero — product name vs outcome (v1)',
    description:
      'Control: "Premium Cocktail Kits, Delivered to Your Door". Challenger leads with the outcome + effort eliminated.',
    page: '/cocktail-kits',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: twoVariants({
      headline: 'Bar-Quality Cocktails at Home — No Bartender Needed',
    }),
  },
  {
    name: 'Bachelor hero — timeframe vs one-link effort (v1)',
    description:
      'Control: "Stocked & Ice-Cold / Before The Groom Lands." Challenger sells the split-pay, one-link organizer relief.',
    page: '/austin-bachelor-party-delivery',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: twoVariants({
      headline: "The Whole Weekend's Alcohol —",
      headlineAccent: 'One Link. Split Pay. Done.',
    }),
  },
  {
    name: 'Bachelorette hero — timeframe vs vivid outcome (v1)',
    description:
      'Control: "Champagne Popped / Before The Bride Lands." Challenger paints the arrival moment for the MOH.',
    page: '/austin-bachelorette-party-delivery',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: twoVariants({
      headline: 'The Airbnb Is Stocked —',
      headlineAccent: 'Girls, Just Show Up.',
    }),
  },
  {
    name: 'Corporate hero — premium claim vs planner risk-relief (v1)',
    description:
      'Control: "Premium Bar Service. / Delivered To Your Boardroom." Challenger de-risks the event planner\'s job.',
    page: '/austin-corporate-event-delivery',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: twoVariants({
      headline: 'Your Event, Fully Stocked —',
      headlineAccent: 'Invoiced, Insured, On Time.',
    }),
  },
  {
    name: 'Wedding-weekend hero — abstraction vs specificity (v1)',
    description:
      'Control: "Every Toast Of The Weekend." Challenger makes the scope concrete: five events, one coordinator. LOW TRAFFIC (~3 views/mo).',
    page: '/austin-wedding-weekend-delivery',
    elementId: 'hero',
    goalMetric: 'cta_click',
    lowTraffic: true,
    variants: twoVariants({
      headline: 'Five Events. One Coordinator.',
      headlineAccent: 'Zero Bar Runs All Weekend.',
    }),
  },
  {
    name: 'Calculator hero — keyword vs keyword+benefit (v1)',
    description:
      'Control: "Wedding Drink Calculator" (exact-match paid keyword — challenger must keep it as a substring).',
    page: '/wedding-drink-calculator',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: twoVariants({
      headline: 'Wedding Drink Calculator — Exact Counts in 2 Minutes',
    }),
  },
  {
    name: 'Order chips — question vs action framing (v1)',
    description:
      'Control: "What are we celebrating?" Challenger tells the visitor exactly what happens next.',
    page: '/order',
    elementId: 'hero',
    goalMetric: 'cta_click',
    variants: twoVariants({
      headline: "Pick the party — we'll stock the bar.",
    }),
  },
];
