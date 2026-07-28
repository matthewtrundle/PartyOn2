/**
 * Registry invariants. The hub's tabs, every per-page metric query, and the
 * API's zod enum all derive from this array, so a duplicate key or a path
 * claimed by two entries silently mis-attributes traffic.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
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

  it('points every path at a route that actually exists', () => {
    // A typo'd or deleted route reports zero forever and looks like a traffic
    // collapse. Route groups like (main) don't appear in the URL, so check
    // both the literal path and the grouped variants.
    const appDir = join(process.cwd(), 'src', 'app');
    const groups = ['', '(main)'];
    const missing: string[] = [];

    for (const p of LANDING_PAGES) {
      for (const path of [p.canonicalPath, ...p.aliasPaths]) {
        const segments = path === '/' ? [] : path.slice(1).split('/');
        const found = groups.some((g) =>
          existsSync(join(appDir, g, ...segments, 'page.tsx')),
        );
        // Redirect-only aliases (e.g. /corporate, /bach-parties, /full-moon)
        // have no page of their own — they're covered by the redirect test.
        if (!found) missing.push(path);
      }
    }

    expect(missing).toEqual(['/bach-parties', '/corporate', '/full-moon']);
  });

  it('does not register a path that a redirect swallows', async () => {
    // /fast-delivery is the cautionary tale: '/fast-deliver:suffix(.*)' in
    // next.config.ts 308s it away, so the page never serves. A registry entry
    // for a shadowed route silently reports zero.
    const { readFileSync } = await import('node:fs');
    const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    const sources = [...config.matchAll(/source:\s*'([^']+)'/g)].map((m) => m[1]!);
    // Only prefix-ish wildcard rules can swallow a sibling route.
    const wildcards = sources.filter((s) => s.includes(':suffix') || s.endsWith('(.*)'));

    const swallowed: string[] = [];
    for (const p of LANDING_PAGES) {
      for (const path of [p.canonicalPath, ...p.aliasPaths]) {
        for (const w of wildcards) {
          const prefix = w.split(':')[0]!.replace(/\(\.\*\)$/, '');
          if (prefix.length > 1 && path.startsWith(prefix)) {
            swallowed.push(`${path} ← ${w}`);
          }
        }
      }
    }

    expect(swallowed).toEqual([]);
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
