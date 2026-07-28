/**
 * Registry invariants. The hub's tabs, every per-page metric query, and the
 * API's zod enum all derive from this array, so a duplicate key or a path
 * claimed by two entries silently mis-attributes traffic.
 */

import { describe, it, expect } from 'vitest';
import {
  LANDING_PAGES,
  LANDING_PAGE_KEYS,
  allPathsFor,
  groupOf,
  isLandingPageKey,
  primaryLandingPages,
  secondaryLandingPageGroups,
} from '../landing-pages';

describe('landing-page registry', () => {
  it('has unique keys', () => {
    const keys = LANDING_PAGES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('never claims the same path twice', () => {
    const paths = LANDING_PAGES.flatMap((p) => [p.canonicalPath, ...p.aliasPaths]);
    const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
    expect(dupes).toEqual([]);
  });

  it('uses absolute paths', () => {
    for (const p of LANDING_PAGES) {
      for (const path of [p.canonicalPath, ...p.aliasPaths]) {
        expect(path.startsWith('/')).toBe(true);
      }
    }
  });

  it('keeps the tab bar to the core funnels', () => {
    // The band is one row by design; new landers go in "More pages".
    expect(primaryLandingPages().map((p) => p.key)).toEqual([
      'home',
      'weddings',
      'boat-parties',
      'bachelor',
      'bachelorette',
      'corporate',
      'cocktail-kits',
      'order',
    ]);
  });

  it('partitions every entry into exactly one nav group', () => {
    const secondary = secondaryLandingPageGroups().flatMap((g) => g.pages);
    const primary = primaryLandingPages();
    expect(primary.length + secondary.length).toBe(LANDING_PAGES.length);
    // No entry appears in both halves.
    const primaryKeys = new Set(primary.map((p) => p.key));
    expect(secondary.some((p) => primaryKeys.has(p.key))).toBe(false);
  });

  it('sorts each group by navOrder', () => {
    for (const pages of [primaryLandingPages(), ...secondaryLandingPageGroups().map((g) => g.pages)]) {
      const orders = pages.map((p) => p.navOrder);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it('defaults an unset group to primary', () => {
    const home = LANDING_PAGES.find((p) => p.key === 'home');
    expect(home?.group).toBeUndefined();
    expect(groupOf(home!)).toBe('primary');
  });

  it('exposes every key to the API enum and the type guard', () => {
    expect(LANDING_PAGE_KEYS).toHaveLength(LANDING_PAGES.length);
    for (const p of LANDING_PAGES) expect(isLandingPageKey(p.key)).toBe(true);
    expect(isLandingPageKey('not-a-page')).toBe(false);
  });

  it('unions alias paths into the metric query', () => {
    // Rentals rolls its three item pages into the hub's numbers.
    expect(allPathsFor('rentals')).toEqual([
      '/rentals',
      '/rentals/chair-rentals-austin',
      '/rentals/cocktail-table-rentals-austin',
      '/rentals/cooler-rentals-austin',
    ]);
    expect(allPathsFor('partners-bartenders')).toEqual(['/partners/mobile-bartenders']);
  });
});
