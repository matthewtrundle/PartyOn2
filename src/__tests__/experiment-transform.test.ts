/**
 * transformExperiment — the pure transform behind GET /api/admin/experiments.
 * Pins the response shape (significance, decision, per-variant CIs) and the
 * goal-dependent success counting, using synthetic Prisma-shaped rows.
 */

import { describe, it, expect } from 'vitest';
import {
  transformExperiment,
  successCount,
  type TransformableExperiment,
} from '@/lib/analytics/experiment-transform';

const NOW = new Date('2026-07-15T00:00:00Z');

function makeExperiment(
  overrides: Partial<TransformableExperiment> = {}
): TransformableExperiment {
  return {
    id: 'exp-1',
    name: 'Hero test',
    page: '/boat-parties',
    elementId: 'hero',
    status: 'RUNNING',
    goalMetric: 'cta_click',
    startDate: new Date('2026-06-15T00:00:00Z'), // 30 days before NOW
    variants: [
      {
        id: 'v-control',
        name: 'Control',
        isControl: true,
        weight: 50,
        content: null,
        impressions: 1000,
        clicks: 100,
        conversions: 5,
        revenue: 0,
      },
      {
        id: 'v-b',
        name: 'Variant B',
        isControl: false,
        weight: 50,
        content: { headline: 'Challenger' },
        impressions: 1000,
        clicks: 140,
        conversions: 3,
        revenue: 0,
      },
    ],
    ...overrides,
  };
}

describe('successCount', () => {
  it('uses clicks for click-style goals, conversions otherwise', () => {
    const v = { clicks: 7, conversions: 2 };
    expect(successCount('cta_click', v)).toBe(7);
    expect(successCount('scroll_depth', v)).toBe(7);
    expect(successCount('conversion', v)).toBe(2);
    expect(successCount('revenue', v)).toBe(2);
  });
});

describe('transformExperiment', () => {
  it('produces the full response shape', () => {
    const t = transformExperiment(makeExperiment(), NOW);

    expect(t.totalImpressions).toBe(2000);
    expect(t.daysRunning).toBe(30);
    expect(t.uplift).toBeCloseTo(40, 1); // 14% vs 10% clicks

    // significance uses clicks for cta_click goal
    const challenger = t.significance.variants.find((v) => v.id === 'v-b');
    expect(challenger?.conversionRate).toBeCloseTo(0.14, 10);

    // per-variant rates in percent + Wilson CI in percent
    const vb = t.variants.find((v) => v.id === 'v-b');
    expect(vb?.clickRate).toBeCloseTo(14, 5);
    expect(vb?.goalRateCi.lo).toBeGreaterThan(11);
    expect(vb?.goalRateCi.hi).toBeLessThan(17);

    // decision block present with the concrete verdict for this fixture
    // (pooled baseline 12% → required 555/variant; 1000 ≥ 555, day 30 ≥ 14,
    // 40% lift at ~99.4% confidence → a legitimate winner).
    expect(t.decision!.verdict).toBe('winner');
    expect(typeof t.decision!.message).toBe('string');
    expect(t.decision!.requiredPerVariant).toBeGreaterThan(0);
  });

  it('is order-independent: challenger listed before control gives the same result', () => {
    const reversed = makeExperiment();
    reversed.variants = [...reversed.variants].reverse(); // challenger first
    const t = transformExperiment(reversed, NOW);
    expect(t.uplift).toBeCloseTo(40, 1); // control still found by isControl flag
    expect(t.decision!.verdict).toBe('winner');
    expect(t.significance.control?.id).toBe('v-control');
  });

  it('anti-peeking flows through: confident early lead is collecting/trending', () => {
    // 8% vs 5% at n=1000: ~99.3% confident, but the pooled baseline (6.5%)
    // requires 1109/variant → short of the horizon → trending, not winner.
    const early = makeExperiment({
      variants: makeExperiment().variants.map((v) => ({
        ...v,
        clicks: v.id === 'v-control' ? 50 : 80,
      })),
    });
    const t = transformExperiment(early, NOW, new Map(), 7, 0.1);
    expect(t.decision!.verdict).toBe('collecting');
    expect(t.decision!.trendingVariantId).toBe('v-b');
  });

  it('conversion-goal experiments count conversions, not clicks', () => {
    const t = transformExperiment(makeExperiment({ goalMetric: 'conversion' }), NOW);
    const control = t.significance.variants.find((v) => v.id === 'v-control');
    expect(control?.conversionRate).toBeCloseTo(0.005, 10);
  });

  it('uses trailing exposure counts for the projection when present', () => {
    const exposures = new Map([
      ['exp-1:v-control', 70], // 10/day over the 7-day window
      ['exp-1:v-b', 70],
    ]);
    const t = transformExperiment(makeExperiment(), NOW, exposures, 7, 0.1);
    expect(t.decision!.dailyExposurePerVariant).toBeCloseTo(10, 5);
  });

  it('falls back to lifetime counters when the event stream is empty', () => {
    const t = transformExperiment(makeExperiment(), NOW, new Map(), 7, 0.1);
    // 1000 impressions over 30 days ≈ 33.3/day
    expect(t.decision!.dailyExposurePerVariant).toBeCloseTo(1000 / 30, 3);
  });

  it('handles a DRAFT with no startDate and zero data without exploding', () => {
    const t = transformExperiment(
      makeExperiment({
        status: 'DRAFT',
        startDate: null,
        variants: makeExperiment().variants.map((v) => ({
          ...v,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        })),
      }),
      NOW
    );
    expect(t.daysRunning).toBe(0);
    expect(t.decision!.verdict).toBe('no-traffic');
  });

  it('survives clicks > impressions (public counters are unchecked increments)', () => {
    // An attacker can POST more click events than impressions; the pooled
    // baseline would be ≥ 1 and the power formula would throw if unclamped.
    const t = transformExperiment(
      makeExperiment({
        variants: [
          { id: 'c', name: 'Control', isControl: true, weight: 50, content: null, impressions: 200, clicks: 350, conversions: 0, revenue: 0 },
          { id: 'v', name: 'Variant B', isControl: false, weight: 50, content: null, impressions: 200, clicks: 180, conversions: 0, revenue: 0 },
        ],
      }),
      NOW
    );
    expect(t.decision).toBeDefined();
    expect(Number.isFinite(t.decision!.requiredPerVariant)).toBe(true);
  });

  it('survives organic near-100% goal rates without throwing', () => {
    // e.g. a scroll_depth goal where nearly everyone completes: 99.5% pooled.
    const t = transformExperiment(
      makeExperiment({
        goalMetric: 'scroll_depth',
        variants: [
          { id: 'c', name: 'Control', isControl: true, weight: 50, content: null, impressions: 400, clicks: 398, conversions: 0, revenue: 0 },
          { id: 'v', name: 'Variant B', isControl: false, weight: 50, content: null, impressions: 400, clicks: 399, conversions: 0, revenue: 0 },
        ],
      }),
      NOW
    );
    expect(t.decision).toBeDefined();
    expect(Number.isFinite(t.decision!.requiredPerVariant)).toBe(true);
  });

  it('caps the MDE for very high baselines instead of throwing', () => {
    const t = transformExperiment(
      makeExperiment({
        variants: [
          { id: 'c', name: 'Control', isControl: true, weight: 50, content: null, impressions: 500, clicks: 295, conversions: 0, revenue: 0 },
          { id: 'v', name: 'Variant B', isControl: false, weight: 50, content: null, impressions: 500, clicks: 300, conversions: 0, revenue: 0 },
        ],
      }),
      NOW
    );
    // baseline ≈ 0.595 → default MDE 0.15 keeps p2 < 1; must not throw and
    // must produce a sane requirement.
    expect(t.decision!.requiredPerVariant).toBeGreaterThan(100);
    expect(Number.isFinite(t.decision!.requiredPerVariant)).toBe(true);
  });
});
