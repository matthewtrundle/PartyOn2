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
  | 'home'
  | 'weddings'
  | 'boat-parties'
  | 'bachelor'
  | 'bachelorette'
  | 'corporate'
  | 'cocktail-kits'
  | 'order';

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
  /** Left-to-right order in the tab bar. */
  navOrder: number;
  /** The primary public route for this page. */
  canonicalPath: string;
  /** Other routes that count as the same page for analytics. */
  aliasPaths: string[];
  /** CTA sections we expect clicks in — drives the CTA-click table grouping. */
  ctaSections: CtaSectionDef[];
  /** Pre-fills the "element" field when creating an A/B test for this page. */
  defaultExperimentElementId: string;
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
    aliasPaths: ['/austin-wedding-weekend-delivery'],
    ctaSections: [
      { id: 'hero', label: 'Hero' },
      { id: 'packages', label: 'Packages' },
      { id: 'wedding_calc_hero', label: 'Calculator (hero)' },
      { id: 'wedding_calc_package', label: 'Calculator (package)' },
      { id: 'wedding_calc_sticky', label: 'Calculator (sticky)' },
      { id: 'final_cta', label: 'Final CTA' },
    ],
    defaultExperimentElementId: 'hero',
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
];

/** Normalize a pathname for comparison: strip query/hash + trailing slash (keep root). */
export function normalizePath(path: string): string {
  const clean = (path.split('?')[0] ?? '').split('#')[0] ?? '';
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1);
  return clean || '/';
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

/** Type guard: is this string a known landing-page key? */
export function isLandingPageKey(value: string): value is LandingPageKey {
  return LANDING_PAGES.some((p) => p.key === value);
}

/** All landing-page keys, in tab order. */
export const LANDING_PAGE_KEYS: LandingPageKey[] = [...LANDING_PAGES]
  .sort((a, b) => a.navOrder - b.navOrder)
  .map((p) => p.key);
