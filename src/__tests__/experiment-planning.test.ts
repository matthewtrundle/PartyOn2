/**
 * Experiment planning math — sample size, Wilson CIs, decision projection,
 * and the anti-peeking verdict gate. Expected values are textbook/reference
 * numbers computed independently of the implementation.
 */

import { describe, it, expect } from 'vitest';
import {
  requiredSampleSizePerVariant,
  wilsonInterval,
  projectDecision,
  deriveVerdict,
  defaultRelativeMde,
  resolveBaselineRate,
  MIN_RUN_DAYS,
  type DecisionInputs,
} from '@/lib/analytics/experiment-planning';
import {
  computeSignificance,
  twoProportionZTest,
  type VariantStat,
} from '@/lib/analytics/experiment-significance';

const NOW = new Date('2026-07-15T00:00:00Z');

describe('requiredSampleSizePerVariant', () => {
  it('matches reference values (alpha 0.05, power 0.8)', () => {
    expect(requiredSampleSizePerVariant(0.1, 0.3)).toBe(1774);
    expect(requiredSampleSizePerVariant(0.1, 0.2)).toBe(3841);
    expect(requiredSampleSizePerVariant(0.5, 0.2)).toBe(388); // textbook 0.5→0.6
    expect(requiredSampleSizePerVariant(0.1, 0.5)).toBe(686);
    expect(requiredSampleSizePerVariant(0.59, 0.15)).toBe(464); // the /order case
  });

  it('supports alpha 0.10', () => {
    expect(requiredSampleSizePerVariant(0.1, 0.3, 0.1)).toBe(1398);
  });

  it('rejects degenerate inputs', () => {
    expect(() => requiredSampleSizePerVariant(0, 0.3)).toThrow(RangeError);
    expect(() => requiredSampleSizePerVariant(1, 0.3)).toThrow(RangeError);
    expect(() => requiredSampleSizePerVariant(0.1, 0)).toThrow(RangeError);
    // target rate p2 >= 1
    expect(() => requiredSampleSizePerVariant(0.7, 0.5)).toThrow(RangeError);
    // unsupported quantile
    expect(() => requiredSampleSizePerVariant(0.1, 0.3, 0.037)).toThrow(RangeError);
  });
});

describe('wilsonInterval', () => {
  it('matches reference values at 95%', () => {
    const a = wilsonInterval(5, 50);
    expect(a.lo).toBeCloseTo(0.043476, 4);
    expect(a.hi).toBeCloseTo(0.213602, 4);

    const zero = wilsonInterval(0, 20);
    expect(zero.lo).toBe(0);
    expect(zero.hi).toBeCloseTo(0.161125, 4);

    const all = wilsonInterval(20, 20);
    expect(all.lo).toBeCloseTo(0.838875, 4);
    expect(all.hi).toBe(1);

    const home = wilsonInterval(65, 661); // realistic homepage hero CTR
    expect(home.lo).toBeCloseTo(0.077904, 4);
    expect(home.hi).toBeCloseTo(0.12341, 4);
  });

  it('returns [0,1] with no data and is symmetric', () => {
    expect(wilsonInterval(0, 0)).toEqual({ lo: 0, hi: 1 });
    const a = wilsonInterval(5, 50);
    const b = wilsonInterval(45, 50);
    expect(a.lo).toBeCloseTo(1 - b.hi, 12);
  });

  it('clamps successes > trials instead of returning NaN', () => {
    // Public counters increment independently — clicks CAN exceed impressions.
    const over = wilsonInterval(350, 200);
    expect(Number.isFinite(over.lo)).toBe(true);
    expect(over.hi).toBe(1);
  });
});

describe('projectDecision', () => {
  it('projects a reachable date', () => {
    const p = projectDecision(300, 686, 11, NOW);
    expect(p.remainingDays).toBe(36); // ceil(386/11)
    expect(p.projectedDecisionDate).toBe('2026-08-20');
    expect(p.reachable).toBe(true);
  });

  it('marks long projections unreachable (no date)', () => {
    const p = projectDecision(300, 1774, 11, NOW);
    expect(p.remainingDays).toBe(134);
    expect(p.reachable).toBe(false);
    expect(p.projectedDecisionDate).toBeNull();
  });

  it('handles zero traffic', () => {
    const p = projectDecision(300, 686, 0, NOW);
    expect(p.remainingDays).toBeNull();
    expect(p.projectedDecisionDate).toBeNull();
    expect(p.reachable).toBe(false);
  });

  it('handles already-sufficient samples', () => {
    const done = projectDecision(700, 686, 11, NOW);
    expect(done.remainingDays).toBe(0);
    expect(done.projectedDecisionDate).toBe('2026-07-15');

    const edge = projectDecision(685, 686, 11, NOW);
    expect(edge.remainingDays).toBe(1);
    expect(edge.projectedDecisionDate).toBe('2026-07-16');
  });

  it('floors the projected date at the MIN_RUN_DAYS horizon', () => {
    // Sample reached on day 5 — the date must point at day 14, never "today",
    // or the banner would say "hold until ~today" and invite an early conclude.
    const fast = projectDecision(700, 686, 50, NOW, 5);
    expect(fast.remainingDays).toBe(MIN_RUN_DAYS - 5);
    expect(fast.projectedDecisionDate).toBe('2026-07-24');

    // Sample NOT reached: remaining days also floored at the horizon.
    const near = projectDecision(680, 686, 50, NOW, 5);
    expect(near.remainingDays).toBe(MIN_RUN_DAYS - 5);

    // Past the horizon, behavior is unchanged.
    const past = projectDecision(700, 686, 50, NOW, 20);
    expect(past.remainingDays).toBe(0);
    expect(past.projectedDecisionDate).toBe('2026-07-15');
  });
});

describe('defaultRelativeMde / resolveBaselineRate', () => {
  it('steps the MDE by baseline', () => {
    expect(defaultRelativeMde(0.1)).toBe(0.5);
    expect(defaultRelativeMde(0.29)).toBe(0.5);
    expect(defaultRelativeMde(0.3)).toBe(0.15);
    expect(defaultRelativeMde(0.59)).toBe(0.15);
  });

  it('uses the prior until 200 impressions, then pools', () => {
    expect(
      resolveBaselineRate(
        [
          { impressions: 50, successes: 10 },
          { impressions: 50, successes: 5 },
        ],
        0.12
      )
    ).toBe(0.12);
    expect(
      resolveBaselineRate(
        [
          { impressions: 150, successes: 15 },
          { impressions: 150, successes: 30 },
        ],
        0.12
      )
    ).toBeCloseTo(0.15, 10);
    // degenerate priors are clamped to something sane
    expect(resolveBaselineRate([], 0)).toBe(0.1);
    expect(resolveBaselineRate([], NaN)).toBe(0.1);
  });
});

function makeVariants(
  control: { imp: number; succ: number },
  challenger: { imp: number; succ: number }
): VariantStat[] {
  return [
    { id: 'c', name: 'Control', isControl: true, impressions: control.imp, conversions: control.succ },
    { id: 'v', name: 'Variant B', isControl: false, impressions: challenger.imp, conversions: challenger.succ },
  ];
}

function decisionFor(
  variants: VariantStat[],
  opts: { required: number; daily: number; daysRunning: number }
): ReturnType<typeof deriveVerdict> {
  const minImpressions = Math.min(...variants.map((v) => v.impressions));
  const inputs: DecisionInputs = {
    significance: computeSignificance(variants),
    projection: projectDecision(minImpressions, opts.required, opts.daily, NOW),
    daysRunning: opts.daysRunning,
    assumedBaselineRate: 0.1,
    relativeMde: 0.5,
  };
  return deriveVerdict(inputs);
}

describe('deriveVerdict', () => {
  it('declares a winner only past the full horizon', () => {
    // z = 4.70, p ≈ 2.6e-6 — decisive, and sample/horizon both satisfied.
    const d = decisionFor(
      makeVariants({ imp: 5000, succ: 500 }, { imp: 5000, succ: 650 }),
      { required: 1774, daily: 50, daysRunning: 30 }
    );
    expect(d.verdict).toBe('winner');
    expect(d.message).toContain('Variant B');
  });

  it('anti-peeking: an early 95% crossing is trending, NOT a winner', () => {
    // 14.0% vs 10.0% at n=1000: p ≈ 0.0059 (conf ≈ 99.4%) but n < 1774.
    const d = decisionFor(
      makeVariants({ imp: 1000, succ: 100 }, { imp: 1000, succ: 140 }),
      { required: 1774, daily: 50, daysRunning: 30 }
    );
    expect(d.verdict).toBe('collecting');
    expect(d.trendingVariantId).toBe('v');
    expect(d.message).toContain('trending');
  });

  it('declares no-difference at the horizon without significance', () => {
    const d = decisionFor(
      makeVariants({ imp: 5000, succ: 500 }, { imp: 5000, succ: 510 }),
      { required: 1774, daily: 50, daysRunning: 30 }
    );
    expect(d.verdict).toBe('no-difference');
  });

  it('holds the winner until MIN_RUN_DAYS even with the full sample', () => {
    const d = decisionFor(
      makeVariants({ imp: 5000, succ: 500 }, { imp: 5000, succ: 650 }),
      { required: 1774, daily: 500, daysRunning: MIN_RUN_DAYS - 9 }
    );
    expect(d.verdict).toBe('collecting');
  });

  it('reports underpowered pages honestly', () => {
    // bachelorette-ish: 1.3 exposures/day/variant against n=1774
    const d = decisionFor(
      makeVariants({ imp: 300, succ: 27 }, { imp: 300, succ: 33 }),
      { required: 1774, daily: 1.3, daysRunning: 30 }
    );
    expect(d.verdict).toBe('underpowered');
    expect(d.message).toContain('bolder');
  });

  it('reports no-traffic', () => {
    const d = decisionFor(
      makeVariants({ imp: 10, succ: 1 }, { imp: 10, succ: 2 }),
      { required: 1774, daily: 0, daysRunning: 5 }
    );
    expect(d.verdict).toBe('no-traffic');
  });

  it('control-wins message when challenger is significantly worse at horizon', () => {
    const d = decisionFor(
      makeVariants({ imp: 5000, succ: 650 }, { imp: 5000, succ: 500 }),
      { required: 1774, daily: 50, daysRunning: 30 }
    );
    expect(d.verdict).toBe('no-difference');
    expect(d.message).toContain('Control wins');
  });
});

describe('regression pins on the existing z-test (file untouched)', () => {
  it('matches known values', () => {
    const a = twoProportionZTest(50, 500, 65, 500);
    expect(Math.abs(a.z)).toBeCloseTo(1.4869, 2);
    expect(a.pValue).toBeCloseTo(0.1371, 2);

    const b = twoProportionZTest(500, 5000, 650, 5000);
    expect(b.pValue).toBeLessThan(1e-5);
  });
});
