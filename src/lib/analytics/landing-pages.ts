/**
 * Central registry of the marketing landing pages tracked in the
 * /admin/analytics hub. Single source of truth for: the hub's tab bar,
 * per-page metric queries (traffic / CTA / conversion), and A/B-test
 * scoping. Pure data + helpers — no Prisma or browser imports — so it's
 * safe to import on both the server and the client.
 *
 * A landing page maps to a canonical route plus any alias routes that are
 * really "the same page" for analytics purposes (e.g. the service page
 * /weddings and its Google-Ads twin /austin-wedding-weekend-delivery).
 * Every per-page metric query unions all of a page's paths via allPathsFor().
 */

import type { CtaSection } from './ga4-events';

export type LandingPageKey =
  // Primary — the tab bar.
  | 'home'
  | 'weddings'
  | 'boat-parties'
  | 'bachelor'
  | 'bachelorette'
  | 'corporate'
  | 'cocktail-kits'
  | 'order'
  // Secondary consumer landers — the "More pages" picker.
  | 'wedding-venue-boats'
  | 'event-quiz'
  | 'bachelor-ai-test'
  | 'bachelor-concierge'
  | 'bachelorette-concierge'
  | 'concierge'
  | 'byob-venues'
  | 'july-fourth'
  | 'full-moon'
  | 'kegs'
  | 'gift-cocktail-kits'
  | 'rentals'
  | 'plan-event'
  | 'custom-package'
  | 'corporate-holiday'
  | 'corporate-products'
  | 'ai-party-planner'
  | 'area-downtown'
  | 'area-east-austin'
  | 'area-lake-travis'
  | 'area-south-congress'
  | 'cocktail-recipes'
  // Secondary B2B / partner-recruitment pages.
  | 'partners-bartenders'
  | 'partners-vacation-rentals'
  | 'partners-hotels'
  | 'partners-property-management'
  | 'partners-pitch'
  | 'partners-hub';

/**
 * Where an entry appears in the hub's navigation. `primary` (the default)
 * is the tab bar — kept to the eight core funnels so the band stays one row.
 * The two `secondary-*` groups render as optgroups in the "More pages"
 * picker: every other marketing lander, so its numbers are visible without
 * crowding the tabs.
 */
export type LandingPageGroup = 'primary' | 'secondary-consumer' | 'secondary-b2b';

export interface CtaSectionDef {
  /** Matches a CtaSection value fired by trackCTAClick. */
  id: CtaSection;
  /** Human label shown in the CTA-click table. */
  label: string;
}

export interface LandingPageDef {
  key: LandingPageKey;
  /** Tab label in the hub. */
  displayName: string;
  /** Left-to-right order in the tab bar (and within a "More pages" group). */
  navOrder: number;
  /** Nav placement; omitted means 'primary' (a tab). */
  group?: LandingPageGroup;
  /** The primary public route for this page. */
  canonicalPath: string;
  /** Other routes that count as the same page for analytics. */
  aliasPaths: string[];
  /**
   * CTA sections we expect clicks in — documents the grouping in the
   * CTA-click table, which is built from the event data itself. Omit on
   * secondary pages: an uninstrumented page simply shows an empty table.
   */
  ctaSections?: CtaSectionDef[];
  /**
   * Pre-fills the "element" field when creating an A/B test for this page.
   * Defaults to 'hero' when omitted.
   */
  defaultExperimentElementId?: string;
  /**
   * Routes on this tab that render their OWN hero and can host a hero A/B
   * test. Defaults to [canonicalPath]. Only set when a tab unions several
   * physically different pages (weddings: the service page, the calculator,
   * and the ads lander each have a distinct hero). Redirect-only aliases
   * (/bach-parties, /corporate) never render a hero and don't belong here.
   */
  experimentPaths?: string[];
}

export const LANDING_PAGES: LandingPageDef[] = [
  {
    key: 'home',
    displayName: 'Home',
    navOrder: 1,
    canonicalPath: '/',
    aliasPaths: [],
    ctaSections: [
      { id: 'hero', label: 'Hero' },
      { id: 'choose_path', label: 'Choose path' },
      { id: 'services', label: 'Services' },
      { id: 'group_order_strip', label: 'Group-order strip' },
      { id: 'footer_cta', label: 'Footer' },
    ],
    defaultExperimentElementId: 'hero',
  },
  {
    key: 'weddings',
    displayName: 'Weddings',
    navOrder: 2,
    canonicalPath: '/weddings',
    // /wedding-drink-calculator is the paid-ad landing for the wedding-bar
    // calculator; its wedding_calc_* CTAs (and its traffic/conversion) are part
    // of the weddings funnel — without it here the wedding_calc_package /
    // wedding_calc_sticky sections declared below never receive any clicks
    // (they only fire on the calculator route, not on /weddings itself).
    aliasPaths: ['/austin-wedding-weekend-delivery', '/wedding-drink-calculator'],
    ctaSections: [
      { id: 'hero', label: 'Hero' },
      { id: 'packages', label: 'Packages' },
      { id: 'wedding_calc_hero', label: 'Calculator (hero)' },
      { id: 'wedding_calc_package', label: 'Calculator (package)' },
      { id: 'wedding_calc_sticky', label: 'Calculator (sticky)' },
      { id: 'final_cta', label: 'Final CTA' },
    ],
    defaultExperimentElementId: 'hero',
    experimentPaths: [
      '/weddings',
      '/wedding-drink-calculator',
      '/austin-wedding-weekend-delivery',
    ],
  },
  {
    key: 'boat-parties',
    displayName: 'Boat Parties',
    navOrder: 3,
    canonicalPath: '/boat-parties',
    aliasPaths: [],
    ctaSections: [
      { id: 'hero', label: 'Hero' },
      { id: 'services', label: 'Packages' },
      { id: 'packages', label: 'Package cards' },
      { id: 'final_cta', label: 'Final CTA' },
    ],
    defaultExperimentElementId: 'hero',
  },
  {
    key: 'bachelor',
    displayName: 'Bachelor',
    navOrder: 4,
    canonicalPath: '/austin-bachelor-party-delivery',
    aliasPaths: ['/bach-parties'],
    ctaSections: [
      { id: 'hero', label: 'Hero' },
      { id: 'package_card', label: 'Package card' },
      { id: 'quick_buy', label: 'Quick buy' },
      { id: 'package_builder', label: 'Package builder' },
      { id: 'final_cta', label: 'Final CTA' },
    ],
    defaultExperimentElementId: 'hero',
  },
  {
    key: 'bachelorette',
    displayName: 'Bachelorette',
    navOrder: 5,
    canonicalPath: '/austin-bachelorette-party-delivery',
    aliasPaths: [],
    ctaSections: [
      { id: 'hero', label: 'Hero' },
      { id: 'package_card', label: 'Package card' },
      { id: 'quick_buy', label: 'Quick buy' },
      { id: 'package_builder', label: 'Package builder' },
      { id: 'final_cta', label: 'Final CTA' },
    ],
    defaultExperimentElementId: 'hero',
  },
  {
    key: 'corporate',
    displayName: 'Corporate',
    navOrder: 6,
    // 2026-07-02 consolidation: /corporate (old custom page) now 301s to the
    // LandingPageTemplate lander; kept as alias so historical rows still count.
    canonicalPath: '/austin-corporate-event-delivery',
    aliasPaths: ['/corporate'],
    ctaSections: [
      { id: 'hero', label: 'Hero' },
      { id: 'package_card', label: 'Package card' },
      { id: 'quick_buy', label: 'Quick buy' },
      { id: 'package_builder', label: 'Package builder' },
      { id: 'final_cta', label: 'Final CTA' },
    ],
    defaultExperimentElementId: 'hero',
  },
  {
    key: 'cocktail-kits',
    displayName: 'Cocktail Kits',
    navOrder: 7,
    canonicalPath: '/cocktail-kits',
    aliasPaths: [],
    ctaSections: [
      { id: 'hero', label: 'Hero' },
      { id: 'packages', label: 'Kit cards' },
      { id: 'final_cta', label: 'Final CTA' },
    ],
    defaultExperimentElementId: 'hero',
  },
  {
    key: 'order',
    displayName: 'Order',
    navOrder: 8,
    canonicalPath: '/order',
    aliasPaths: [],
    ctaSections: [{ id: 'party_type_chip', label: 'Party-type chip' }],
    defaultExperimentElementId: 'hero',
  },

  // ── Secondary: consumer landers ────────────────────────────────────────
  // Traffic + engagement come free (PageViewTracker fires site-wide, GA4
  // matches on pagePath). CTA rows appear only where trackCTAClick is wired,
  // and conversion only where Order.landingPage records the route — an empty
  // panel here means "not instrumented", not "broken".
  {
    key: 'wedding-venue-boats',
    displayName: 'Wedding Venue Boats',
    navOrder: 101,
    group: 'secondary-consumer',
    canonicalPath: '/austin-wedding-venue-boats',
    aliasPaths: [],
  },
  {
    key: 'event-quiz',
    displayName: 'Event Quiz',
    navOrder: 102,
    group: 'secondary-consumer',
    canonicalPath: '/event-quiz',
    aliasPaths: [],
  },
  {
    key: 'bachelor-ai-test',
    displayName: 'Bachelor (AI test)',
    navOrder: 103,
    group: 'secondary-consumer',
    canonicalPath: '/austin-bachelor-party-delivery-ai-test',
    aliasPaths: [],
  },
  {
    key: 'bachelor-concierge',
    displayName: 'Bachelor Concierge',
    navOrder: 104,
    group: 'secondary-consumer',
    canonicalPath: '/austin-bachelor-concierge',
    aliasPaths: [],
  },
  {
    key: 'bachelorette-concierge',
    displayName: 'Bachelorette Concierge',
    navOrder: 105,
    group: 'secondary-consumer',
    canonicalPath: '/austin-bachelorette-concierge',
    aliasPaths: [],
  },
  {
    key: 'concierge',
    displayName: 'Concierge (routing)',
    navOrder: 106,
    group: 'secondary-consumer',
    canonicalPath: '/austin-concierge',
    aliasPaths: [],
  },
  {
    key: 'byob-venues',
    displayName: 'BYOB Venues',
    navOrder: 107,
    group: 'secondary-consumer',
    canonicalPath: '/austin-byob-venues',
    aliasPaths: [],
  },
  {
    key: 'july-fourth',
    displayName: '4th of July',
    navOrder: 108,
    group: 'secondary-consumer',
    canonicalPath: '/austin-4th-of-july-delivery',
    aliasPaths: [],
  },
  {
    key: 'full-moon',
    displayName: 'Full Moon Cruise',
    navOrder: 109,
    group: 'secondary-consumer',
    // Each cruise gets its own dated route. 2026-07-28: the Aug 1 date was
    // postponed (0 paid tickets) and rescheduled to Aug 28, so the canonical
    // moved. Both /full-moon and the retired /full-moon-aug1 301 here and stay
    // as aliases, so the Aug 1 traffic still rolls into this page's numbers.
    canonicalPath: '/full-moon-aug28',
    // /full-moon-drinks is the ticket-holder drink-ordering lander — its
    // traffic and CTA clicks roll into this tab.
    aliasPaths: ['/full-moon', '/full-moon-aug1', '/full-moon-drinks'],
    // Instrumented as of the Aug 28 rebuild — the Aug 1 run had no
    // trackCTAClick calls at all, so an empty CTA table was indistinguishable
    // from a page nobody clicked.
    ctaSections: [
      { id: 'hero', label: 'Hero — get your ticket' },
      { id: 'final_cta', label: 'Threshold widget — get your ticket' },
      { id: 'services', label: 'Drinks via POD — order now' },
    ],
  },
  {
    key: 'kegs',
    displayName: 'Kegs',
    navOrder: 110,
    group: 'secondary-consumer',
    canonicalPath: '/kegs',
    aliasPaths: [],
  },
  {
    key: 'gift-cocktail-kits',
    displayName: 'Gift Cocktail Kits',
    navOrder: 111,
    group: 'secondary-consumer',
    canonicalPath: '/gifts/cocktail-kits',
    aliasPaths: [],
  },
  {
    key: 'rentals',
    displayName: 'Rentals',
    navOrder: 112,
    group: 'secondary-consumer',
    // The three item pages are the same funnel as the hub for reporting.
    canonicalPath: '/rentals',
    aliasPaths: [
      '/rentals/chair-rentals-austin',
      '/rentals/cocktail-table-rentals-austin',
      '/rentals/cooler-rentals-austin',
    ],
  },
  {
    key: 'plan-event',
    displayName: 'Plan My Event',
    navOrder: 113,
    group: 'secondary-consumer',
    canonicalPath: '/plan-event',
    aliasPaths: [],
  },
  {
    key: 'custom-package',
    displayName: 'Custom Package',
    navOrder: 114,
    group: 'secondary-consumer',
    canonicalPath: '/custom-package',
    aliasPaths: [],
  },
  {
    key: 'corporate-holiday',
    displayName: 'Corporate Holiday Party',
    navOrder: 115,
    group: 'secondary-consumer',
    canonicalPath: '/corporate/holiday-party',
    aliasPaths: [],
  },
  {
    key: 'corporate-products',
    displayName: 'Corporate Products',
    navOrder: 116,
    group: 'secondary-consumer',
    canonicalPath: '/corporate/products',
    aliasPaths: [],
  },
  // NOTE: /fast-delivery is deliberately absent. The page exists at
  // src/app/(main)/fast-delivery/ but next.config.ts's '/fast-deliver:suffix(.*)'
  // rule 308s it to /delivery-areas, so it never serves and would always
  // report zero. Add it here only if that redirect is narrowed.
  {
    key: 'ai-party-planner',
    displayName: 'AI Party Planner',
    navOrder: 118,
    group: 'secondary-consumer',
    canonicalPath: '/ai-party-planner',
    aliasPaths: [],
  },
  {
    key: 'area-downtown',
    displayName: 'Area · Downtown',
    navOrder: 119,
    group: 'secondary-consumer',
    canonicalPath: '/areas/downtown',
    aliasPaths: [],
  },
  {
    key: 'area-east-austin',
    displayName: 'Area · East Austin',
    navOrder: 120,
    group: 'secondary-consumer',
    canonicalPath: '/areas/east-austin',
    aliasPaths: [],
  },
  {
    key: 'area-lake-travis',
    displayName: 'Area · Lake Travis',
    navOrder: 121,
    group: 'secondary-consumer',
    canonicalPath: '/areas/lake-travis',
    aliasPaths: [],
  },
  {
    key: 'area-south-congress',
    displayName: 'Area · South Congress',
    navOrder: 122,
    group: 'secondary-consumer',
    canonicalPath: '/areas/south-congress',
    aliasPaths: [],
  },
  {
    // Recipe-reference page for people who already have a kit. Traffic is
    // post-purchase + organic recipe searches, so the interesting numbers are
    // recipe_card opens and how many of those click through to buy again.
    key: 'cocktail-recipes',
    displayName: 'Cocktail Recipes',
    navOrder: 123,
    group: 'secondary-consumer',
    canonicalPath: '/cocktail-recipes',
    aliasPaths: [],
    ctaSections: [
      { id: 'recipe_card', label: 'Recipe card' },
      { id: 'recipe_modal', label: 'Recipe popup — get this kit' },
    ],
  },

  // ── Secondary: B2B / partner recruitment ───────────────────────────────
  // These recruit partners rather than sell orders, so expect real traffic
  // with zero conversion — the lead lands on /admin/leads, not in Order.
  {
    key: 'partners-bartenders',
    displayName: 'Partners · Bartenders',
    navOrder: 201,
    group: 'secondary-b2b',
    canonicalPath: '/partners/mobile-bartenders',
    aliasPaths: [],
  },
  {
    key: 'partners-vacation-rentals',
    displayName: 'Partners · Vacation Rentals',
    navOrder: 202,
    group: 'secondary-b2b',
    canonicalPath: '/partners/vacation-rentals',
    aliasPaths: [],
  },
  {
    key: 'partners-hotels',
    displayName: 'Partners · Hotels & Resorts',
    navOrder: 203,
    group: 'secondary-b2b',
    canonicalPath: '/partners/hotels-resorts',
    aliasPaths: [],
  },
  {
    key: 'partners-property-management',
    displayName: 'Partners · Property Mgmt',
    navOrder: 204,
    group: 'secondary-b2b',
    canonicalPath: '/partners/property-management',
    aliasPaths: [],
  },
  {
    key: 'partners-pitch',
    displayName: 'Partners · Pitch Deck',
    navOrder: 205,
    group: 'secondary-b2b',
    canonicalPath: '/partners/pitch',
    aliasPaths: [],
  },
  {
    key: 'partners-hub',
    displayName: 'Partners · Hub',
    navOrder: 206,
    group: 'secondary-b2b',
    canonicalPath: '/austin-partners',
    aliasPaths: [],
  },
];

/** Normalize a pathname for comparison: strip query/hash + trailing slash (keep root). */
export function normalizePath(path: string): string {
  const clean = (path.split('?')[0] ?? '').split('#')[0] ?? '';
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1);
  return clean || '/';
}

/** Routes on a tab that can host a hero A/B test (canonical path by default). */
export function experimentPathsFor(def: LandingPageDef): string[] {
  return def.experimentPaths ?? [def.canonicalPath];
}

/** Canonical path + all alias paths for a landing page (empty if key unknown). */
export function allPathsFor(key: LandingPageKey): string[] {
  const def = LANDING_PAGES.find((p) => p.key === key);
  if (!def) return [];
  return [def.canonicalPath, ...def.aliasPaths];
}

/** Look up a landing page by its registry key. */
export function landingPageByKey(key: string): LandingPageDef | undefined {
  return LANDING_PAGES.find((p) => p.key === key);
}

/** Find which landing page (if any) a given pathname belongs to. */
export function landingPageForPath(path: string): LandingPageDef | undefined {
  const norm = normalizePath(path);
  return LANDING_PAGES.find(
    (p) =>
      normalizePath(p.canonicalPath) === norm ||
      p.aliasPaths.some((a) => normalizePath(a) === norm)
  );
}

/** Nav placement for an entry ('primary' when unset). */
export function groupOf(def: LandingPageDef): LandingPageGroup {
  return def.group ?? 'primary';
}

/** Tab-bar entries, in nav order. */
export function primaryLandingPages(): LandingPageDef[] {
  return [...LANDING_PAGES]
    .filter((p) => groupOf(p) === 'primary')
    .sort((a, b) => a.navOrder - b.navOrder);
}

/**
 * "More pages" picker contents: the secondary groups with their optgroup
 * labels, each sorted by navOrder. Empty groups are dropped.
 */
export function secondaryLandingPageGroups(): Array<{
  group: Exclude<LandingPageGroup, 'primary'>;
  label: string;
  pages: LandingPageDef[];
}> {
  const labels: Record<Exclude<LandingPageGroup, 'primary'>, string> = {
    'secondary-consumer': 'Other landing pages',
    'secondary-b2b': 'Partner pages (B2B)',
  };
  return (['secondary-consumer', 'secondary-b2b'] as const)
    .map((group) => ({
      group,
      label: labels[group],
      pages: [...LANDING_PAGES]
        .filter((p) => groupOf(p) === group)
        .sort((a, b) => a.navOrder - b.navOrder),
    }))
    .filter((g) => g.pages.length > 0);
}

/** Type guard: is this string a known landing-page key? */
export function isLandingPageKey(value: string): value is LandingPageKey {
  return LANDING_PAGES.some((p) => p.key === value);
}

/** All landing-page keys, in tab order. */
export const LANDING_PAGE_KEYS: LandingPageKey[] = [...LANDING_PAGES]
  .sort((a, b) => a.navOrder - b.navOrder)
  .map((p) => p.key);
