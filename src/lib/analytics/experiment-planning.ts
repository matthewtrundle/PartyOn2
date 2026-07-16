/**
 * A/B test planning + decision layer — sample size, confidence intervals, and
 * "when can we call it" projections.
 *
 * Sits alongside experiment-significance.ts (which stays untouched — Brian's
 * funnel route imports it). This module answers the PLANNING questions:
 *   - How many visitors per variant do we need? (two-proportion power formula)
 *   - What range is each variant's true rate in? (Wilson score interval)
 *   - When, at current traffic, can we make the call? (projected decision date)
 *   - What should the operator do right now? (verdict + plain-English message)
 *
 * Everything here is pure — no Prisma, no fetch — so it unit-tests against
 * textbook values.
 */

import type { SignificanceResult } from './experiment-significance';

/** Every variant must reach the required sample AND the test must run this many
 * days before a winner is declared. Two full weekly cycles — party traffic is
 * heavily weekend-skewed, so shorter runs overweight one kind of visitor. */
export const MIN_RUN_DAYS = 14;

/** Projections beyond this are reported as unreachable — the honest answer is
 * "this page can't support an A/B test at current traffic". */
export const UNREACHABLE_DAYS = 90;

/** Winner threshold. Uniform 95% everywhere — one number, one mental model. */
export const DEFAULT_CONFIDENCE_LEVEL = 0.95;

// Standard normal quantiles Φ⁻¹(p), exact to double precision (R qnorm values).
// A lookup beats a rational-approximation inverse: the product only ever uses
// these few points, the values are exact, and there are no magic coefficients.
const Z_TABLE: ReadonlyArray<readonly [number, number]> = [
  [0.8, 0.8416212335729143], // power 0.80
  [0.85, 1.0364333894937898],
  [0.9, 1.2815515655446004], // power 0.90
  [0.95, 1.6448536269514722], // alpha 0.10 two-sided
  [0.975, 1.9599639845400545], // alpha 0.05 two-sided
  [0.995, 2.5758293035489004], // alpha 0.01 two-sided
];

function zQuantile(p: number): number {
  const hit = Z_TABLE.find(([key]) => Math.abs(p - key) < 1e-9);
  if (!hit) throw new RangeError(`Unsupported quantile ${p}; add it to Z_TABLE`);
  return hit[1];
}

/**
 * Visitors needed PER VARIANT to detect a relative lift over the baseline rate
 * (two-sided two-proportion z-test — same test family the readout uses, so the
 * plan and the analysis agree). Fleiss formula without continuity correction.
 *
 * @param baselineRate - control's success rate, in (0,1)
 * @param relativeMde - minimum detectable effect as a relative lift (0.5 = +50%)
 */
export function requiredSampleSizePerVariant(
  baselineRate: number,
  relativeMde: number,
  alpha = 0.05,
  power = 0.8
): number {
  if (baselineRate <= 0 || baselineRate >= 1) {
    throw new RangeError('baselineRate must be in (0,1)');
  }
  if (relativeMde <= 0) throw new RangeError('relativeMde must be > 0');
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + relativeMde);
  if (p2 >= 1) throw new RangeError(`target rate ${p2} >= 1 — lower the MDE`);
  const delta = p2 - p1;
  const pBar = (p1 + p2) / 2;
  const zAlpha = zQuantile(1 - alpha / 2);
  const zBeta = zQuantile(power);
  const n =
    Math.pow(
      zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
        zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
      2
    ) /
    (delta * delta);
  return Math.ceil(n);
}

/**
 * Wilson score interval on a proportion. Chosen over Wald because our variants
 * live at n < 100 for weeks — Wald collapses to zero width at 0 successes and
 * dips negative at small n; Wilson keeps near-nominal coverage and stays in [0,1].
 *
 * NOTE: overlapping per-variant intervals do NOT imply non-significance — the
 * winner verdict stays driven by the z-test; these are for operator intuition.
 */
export function wilsonInterval(
  successes: number,
  trials: number,
  confidenceLevel = 0.95
): { lo: number; hi: number } {
  if (trials <= 0) return { lo: 0, hi: 1 };
  const z = zQuantile(1 - (1 - confidenceLevel) / 2);
  // Clamp: the counters are independent public increments, so successes CAN
  // exceed trials — p > 1 would put NaN (sqrt of a negative) into the JSON.
  const p = Math.min(1, Math.max(0, successes / trials));
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denom;
  const halfWidth =
    (z / denom) * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));
  return {
    // At p̂ = 0 (or 1) the exact Wilson bound is 0 (or 1); float noise can land
    // an epsilon inside, so pin the boundary cases.
    lo: p === 0 ? 0 : Math.max(0, center - halfWidth),
    hi: p === 1 ? 1 : Math.min(1, center + halfWidth),
  };
}

/**
 * Default minimum detectable effect for a new test, from the baseline rate.
 * At this site's traffic (20–660 views/page/month) only large effects are
 * fundable, so default to bold: +50% relative on typical ~10% CTRs. For
 * already-high baselines (e.g. /order's ~59% chip rate) +50% is arithmetically
 * impossible, so 15% is the honest large-effect analog.
 */
export function defaultRelativeMde(baselineRate: number): number {
  return baselineRate >= 0.3 ? 0.15 : 0.5;
}

/**
 * Baseline for the sample-size calc: pooled observed rate once we have real
 * data (≥200 total impressions), else the caller's prior (page-level CTA rate).
 */
export function resolveBaselineRate(
  variants: Array<{ impressions: number; successes: number }>,
  prior: number
): number {
  const totalImpressions = variants.reduce((s, v) => s + v.impressions, 0);
  const totalSuccesses = variants.reduce((s, v) => s + v.successes, 0);
  if (totalImpressions >= 200 && totalSuccesses > 0) {
    // Clamp the pooled branch too: the counters are independent unchecked
    // increments (a public track endpoint), so successes CAN exceed
    // impressions — an unclamped rate ≥ 1 would make the power formula throw.
    return clampRate(totalSuccesses / totalImpressions);
  }
  return clampRate(prior);
}

function clampRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0.1;
  return Math.min(rate, 0.95);
}

export interface DecisionProjection {
  requiredPerVariant: number;
  /** The laggard variant's impressions — it drives the finish line. */
  minVariantImpressions: number;
  /** Trailing exposures/day for the laggard variant. */
  dailyExposurePerVariant: number;
  /** Days until the laggard reaches the required sample; null when no traffic. */
  remainingDays: number | null;
  /** ISO yyyy-mm-dd; null when unreachable or no traffic. */
  projectedDecisionDate: string | null;
  /** remainingDays is known and within UNREACHABLE_DAYS. */
  reachable: boolean;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Project when the laggard variant reaches the required sample size.
 *
 * @param daysRunning - when provided, the projected date is floored at the
 *   MIN_RUN_DAYS horizon so a fast test never shows "hold until ~today"
 *   while the 14-day gate is still closed (which would invite exactly the
 *   early conclude the gate exists to prevent).
 */
export function projectDecision(
  minVariantImpressions: number,
  requiredPerVariant: number,
  dailyExposurePerVariant: number,
  now: Date,
  daysRunning?: number
): DecisionProjection {
  const minDaysLeft =
    daysRunning != null ? Math.max(0, MIN_RUN_DAYS - daysRunning) : 0;
  const remaining = Math.max(0, requiredPerVariant - minVariantImpressions);
  if (remaining === 0) {
    const days = minDaysLeft;
    return {
      requiredPerVariant,
      minVariantImpressions,
      dailyExposurePerVariant,
      remainingDays: days,
      projectedDecisionDate: isoDate(new Date(now.getTime() + days * 86_400_000)),
      reachable: true,
    };
  }
  if (dailyExposurePerVariant <= 0) {
    return {
      requiredPerVariant,
      minVariantImpressions,
      dailyExposurePerVariant: 0,
      remainingDays: null,
      projectedDecisionDate: null,
      reachable: false,
    };
  }
  const remainingDays = Math.max(
    Math.ceil(remaining / dailyExposurePerVariant),
    minDaysLeft
  );
  const reachable = remainingDays <= UNREACHABLE_DAYS;
  const date = new Date(now.getTime() + remainingDays * 86_400_000);
  return {
    requiredPerVariant,
    minVariantImpressions,
    dailyExposurePerVariant,
    remainingDays,
    projectedDecisionDate: reachable ? isoDate(date) : null,
    reachable,
  };
}

export type ExperimentVerdict =
  | 'winner'
  | 'no-difference'
  | 'collecting'
  | 'underpowered'
  | 'no-traffic';

export interface ExperimentDecision extends DecisionProjection {
  verdict: ExperimentVerdict;
  /** A challenger that crossed the confidence threshold BEFORE the horizon. */
  trendingVariantId: string | null;
  assumedBaselineRate: number;
  relativeMde: number;
  confidenceLevel: number;
  /** Plain-English operator guidance, pre-baked server-side. */
  message: string;
}

export interface DecisionInputs {
  significance: SignificanceResult;
  projection: DecisionProjection;
  daysRunning: number;
  confidenceThreshold?: number;
  assumedBaselineRate: number;
  relativeMde: number;
}

/**
 * Layer the anti-peeking gate on top of computeSignificance:
 * a WINNER requires the full sample (every variant ≥ requiredPerVariant),
 * the 14-day minimum run, AND ≥95% confidence. A 95% crossing before the
 * horizon renders as "trending" — checked daily, an early call at 95% inflates
 * false positives badly (effective type-I error toward 20-30% over a long test).
 * This is a fixed-horizon readout, not formal alpha-spending sequential testing.
 */
export function deriveVerdict(inputs: DecisionInputs): ExperimentDecision {
  const {
    significance,
    projection,
    daysRunning,
    confidenceThreshold = DEFAULT_CONFIDENCE_LEVEL,
    assumedBaselineRate,
    relativeMde,
  } = inputs;

  const base = {
    ...projection,
    assumedBaselineRate,
    relativeMde,
    confidenceLevel: confidenceThreshold,
  };

  const horizonReached =
    projection.minVariantImpressions >= projection.requiredPerVariant &&
    daysRunning >= MIN_RUN_DAYS;

  const challengers = significance.variants.filter(
    (v) => significance.control && v.id !== significance.control.id
  );
  const confidentChallenger = challengers.find(
    (v) => v.confidence != null && v.confidence >= confidenceThreshold
  );

  if (horizonReached) {
    if (significance.winner) {
      const w = significance.winner;
      const lift = w.liftPct != null ? `${w.liftPct >= 0 ? '+' : ''}${w.liftPct.toFixed(0)}%` : '';
      return {
        ...base,
        verdict: 'winner',
        trendingVariantId: null,
        message: `${w.name} wins at ${Math.round((w.confidence ?? 0) * 100)}% confidence (${lift} vs control). Safe to conclude.`,
      };
    }
    // Full sample, no winner. A confident challenger BELOW control means the
    // challenger lost — control wins. Otherwise the difference is just noise.
    const controlRate = significance.control?.conversionRate ?? 0;
    const confidentLoser = challengers.find(
      (v) =>
        v.confidence != null &&
        v.confidence >= confidenceThreshold &&
        v.conversionRate < controlRate
    );
    return {
      ...base,
      verdict: 'no-difference',
      trendingVariantId: null,
      message: confidentLoser
        ? `Control wins — the challenger performed significantly worse. Keep the current copy and conclude.`
        : `Sample reached with no significant difference — pick either copy and move to the next test.`,
    };
  }

  if (projection.dailyExposurePerVariant <= 0 && projection.remainingDays === null) {
    return {
      ...base,
      verdict: 'no-traffic',
      trendingVariantId: null,
      message: 'No recent traffic — can’t project a decision date.',
    };
  }

  if (!projection.reachable) {
    const days = projection.remainingDays;
    const daysLabel = days != null && days <= 365 ? `~${days} days` : 'over a year';
    return {
      ...base,
      verdict: 'underpowered',
      trendingVariantId: confidentChallenger?.id ?? null,
      message: `At current traffic this test needs ${daysLabel} to conclude — this page can’t support an A/B test right now. Consider a bolder variant, or just ship the better copy and watch the trend.`,
    };
  }

  const dateLabel = projection.projectedDecisionDate ?? 'soon';
  const trending = confidentChallenger ?? null;
  return {
    ...base,
    verdict: 'collecting',
    trendingVariantId: trending?.id ?? null,
    message: trending
      ? `${trending.name} trending ahead at ${Math.round((trending.confidence ?? 0) * 100)}% — hold until ~${dateLabel} to call it (early calls inflate false positives).`
      : projection.remainingDays != null && projection.remainingDays > 45
        ? `Collecting data — slow at current traffic; decision expected around ${dateLabel} (~${projection.remainingDays} days). More traffic to this page would speed it up.`
        : `Collecting data — decision expected around ${dateLabel}${projection.remainingDays != null ? ` (~${projection.remainingDays} days)` : ''}.`,
  };
}
