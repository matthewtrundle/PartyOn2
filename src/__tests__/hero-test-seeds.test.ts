/**
 * Hero-test seed validity — every seed must pass the same schema the admin
 * create route enforces, and the homepage seed must survive the legacy
 * name→content-id mapping (a rename silently renders control on both arms).
 */

import { describe, it, expect } from 'vitest';
import { HERO_TEST_SEEDS, WIRED_ROUTES } from '@/lib/experiments/hero-test-seeds';
import { CreateExperimentSchema } from '@/lib/experiments/experiment-schemas';
// The REAL mapping (shared by /api/experiments/assign + /track) — the legacy
// homepage pipeline resolves variant NAMES to hero-variants.ts content ids;
// anything unrecognized silently falls back to 'control' on both arms.
import { mapVariantNameToContentId } from '@/lib/experiments/hero-variants';

describe('hero-test seeds', () => {
  it('every seed passes the create-route schema', () => {
    for (const seed of HERO_TEST_SEEDS) {
      expect(() => CreateExperimentSchema.parse(seed)).not.toThrow();
    }
  });

  it('exactly 2 variants, weights 100, exactly one control, cta_click goal', () => {
    for (const seed of HERO_TEST_SEEDS) {
      expect(seed.variants, seed.page).toHaveLength(2);
      expect(seed.variants.reduce((s, v) => s + (v.weight ?? 0), 0), seed.page).toBe(100);
      expect(seed.variants.filter((v) => v.isControl).length, seed.page).toBe(1);
      expect(seed.goalMetric, seed.page).toBe('cta_click');
    }
  });

  it('pages are unique and all wired for hero experiments', () => {
    const pages = HERO_TEST_SEEDS.map((s) => s.page);
    expect(new Set(pages).size).toBe(pages.length);
    const wired = new Set<string>(WIRED_ROUTES);
    for (const page of pages) expect(wired.has(page), page).toBe(true);
  });

  it('covers every wired route exactly once', () => {
    expect(new Set(HERO_TEST_SEEDS.map((s) => s.page))).toEqual(new Set(WIRED_ROUTES));
  });

  it('controls never carry copy overrides (content empty)', () => {
    for (const seed of HERO_TEST_SEEDS) {
      const control = seed.variants.find((v) => v.isControl);
      expect(Object.keys(control?.content ?? {}), seed.page).toHaveLength(0);
    }
  });

  it('homepage variant names resolve through the legacy name mapping to DISTINCT content', () => {
    const home = HERO_TEST_SEEDS.find((s) => s.page === '/');
    expect(home).toBeDefined();
    const ids = home!.variants.map((v) => mapVariantNameToContentId(v.name));
    // Both must resolve (no silent fallback collision) and differ from each other.
    expect(new Set(ids).size).toBe(2);
    expect(ids).toContain('control');
    // Homepage copy lives in hero-variants.ts — the DB content must stay empty.
    for (const v of home!.variants) {
      expect(Object.keys(v.content ?? {})).toHaveLength(0);
    }
  });

  it('challenger on the SEO-keyword calculator page keeps the exact-match keyword', () => {
    const calc = HERO_TEST_SEEDS.find((s) => s.page === '/wedding-drink-calculator');
    const challenger = calc!.variants.find((v) => !v.isControl);
    expect(challenger?.content?.headline).toContain('Wedding Drink Calculator');
  });

  it('template-lander challengers never override the SEO eyebrow', () => {
    for (const seed of HERO_TEST_SEEDS) {
      for (const v of seed.variants) {
        expect(v.content?.eyebrow, `${seed.page} / ${v.name}`).toBeUndefined();
      }
    }
  });

  it('only wedding-weekend is flagged low-traffic', () => {
    const flagged = HERO_TEST_SEEDS.filter((s) => s.lowTraffic).map((s) => s.page);
    expect(flagged).toEqual(['/austin-wedding-weekend-delivery']);
  });
});
