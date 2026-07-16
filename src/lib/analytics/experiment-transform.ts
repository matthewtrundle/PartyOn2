/**
 * Pure per-experiment transform for GET /api/admin/experiments.
 *
 * Takes a DB experiment row (+ its variants' lifetime counters and trailing
 * exposure counts) and produces everything the admin UIs render: significance,
 * per-variant rates + Wilson CIs, and the decision block (verdict, projected
 * decision date, plain-English message). Pure so the response shape is unit-
 * testable without a route or database.
 */

import {
  computeSignificance,
  type VariantStat,
} from './experiment-significance';
import {
  deriveVerdict,
  projectDecision,
  requiredSampleSizePerVariant,
  resolveBaselineRate,
  defaultRelativeMde,
  wilsonInterval,
  type ExperimentDecision,
} from './experiment-planning';

/** Structural type covering the Prisma row shape the route feeds in. */
export interface TransformableVariant {
  id: string;
  name: string;
  isControl: boolean;
  weight: number;
  content: unknown;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface TransformableExperiment {
  id: string;
  name: string;
  page: string;
  elementId: string;
  status: string;
  goalMetric: string;
  startDate: Date | string | null;
  variants: TransformableVariant[];
  [key: string]: unknown;
}

export interface TransformedVariant extends TransformableVariant {
  clickRate: number;
  conversionRate: number;
  /** Wilson 95% CI on the goal rate, in PERCENT units (matches clickRate). */
  goalRateCi: { lo: number; hi: number };
}

/**
 * Per-variant success count for the significance test: for click-style goals
 * the "success" is a click; for conversion/revenue goals it's a conversion.
 */
export function successCount(
  goalMetric: string,
  v: { clicks: number; conversions: number }
): number {
  return goalMetric === 'cta_click' || goalMetric === 'scroll_depth'
    ? v.clicks
    : v.conversions;
}

export interface TrendPoint {
  /** ISO yyyy-mm-dd (UTC day). */
  date: string;
  exposures: number;
  clicks: number;
  cumExposures: number;
  cumClicks: number;
  /** Cumulative goal rate up to this day, PERCENT units (matches clickRate). */
  cumRate: number;
}

interface TrendInputRow {
  variantId: string;
  day: string;
  exposures: number;
  clicks: number;
}

/**
 * Build per-variant CUMULATIVE CTR trends from daily event counts. Cumulative
 * (not daily) because at this site's volumes a per-day rate is pure noise —
 * the converging/diverging cumulative lines are what an operator can read.
 * Days between the first and last observed day are gap-filled so the x-axis
 * is linear in time.
 */
export function buildVariantTrends(
  rows: TrendInputRow[],
  variantIds: string[]
): Record<string, TrendPoint[]> {
  const trends: Record<string, TrendPoint[]> = {};
  if (rows.length === 0) return trends;

  const days = rows.map((r) => r.day).sort();
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  const byKey = new Map<string, TrendInputRow>();
  for (const r of rows) byKey.set(`${r.variantId}:${r.day}`, r);

  for (const variantId of variantIds) {
    const points: TrendPoint[] = [];
    let cumExposures = 0;
    let cumClicks = 0;
    for (
      let t = new Date(`${firstDay}T00:00:00Z`).getTime();
      t <= new Date(`${lastDay}T00:00:00Z`).getTime();
      t += 86_400_000
    ) {
      const date = new Date(t).toISOString().slice(0, 10);
      const row = byKey.get(`${variantId}:${date}`);
      const exposures = row?.exposures ?? 0;
      const clicks = row?.clicks ?? 0;
      cumExposures += exposures;
      cumClicks += clicks;
      points.push({
        date,
        exposures,
        clicks,
        cumExposures,
        cumClicks,
        cumRate: cumExposures > 0 ? (cumClicks / cumExposures) * 100 : 0,
      });
    }
    trends[variantId] = points;
  }
  return trends;
}

/**
 * Cap the MDE so the target rate stays below 1 (high-baseline pages).
 * resolveBaselineRate clamps baselines to ≤0.95, so the cap here is always
 * ≥ ~0.04 — but guard the degenerate region anyway instead of letting a
 * positive floor override a negative cap (which would push p2 ≥ 1 and throw).
 */
function effectiveMde(baselineRate: number, mde: number): number {
  const cap = 0.99 / baselineRate - 1;
  if (cap <= 0.01) return Math.max(cap, 0.001);
  return Math.min(mde, cap);
}

export type TransformedExperiment = Omit<TransformableExperiment, 'variants'> & {
  totalImpressions: number;
  uplift: number;
  daysRunning: number;
  significance: ReturnType<typeof computeSignificance>;
  /** Absent when the decision math failed for this row (degraded, not fatal). */
  decision?: ExperimentDecision;
  /** Per-variant cumulative CTR trend (event-based, directional). */
  trends: Record<string, TrendPoint[]>;
  variants: TransformedVariant[];
};

/**
 * @param exposureCounts - trailing-window `experiment_exposure` counts keyed
 *   `${experimentId}:${variantId}` (see getTrailingExposureRates). Missing
 *   entries fall back to lifetime counters averaged over the run.
 * @param exposureWindowDays - the window the counts were collected over.
 * @param baselinePrior - page-level prior CTA rate used until the experiment
 *   has ≥200 impressions of its own.
 * @param seriesRows - this experiment's daily event counts (see
 *   getExperimentDailySeries); builds the per-variant cumulative CTR trend.
 */
export function transformExperiment(
  exp: TransformableExperiment,
  now: Date,
  exposureCounts: Map<string, number> = new Map(),
  exposureWindowDays = 7,
  baselinePrior = 0.1,
  seriesRows: TrendInputRow[] = []
): TransformedExperiment {
  const totalImpressions = exp.variants.reduce((sum, v) => sum + v.impressions, 0);

  const controlVariant = exp.variants.find((v) => v.isControl);
  const bestVariant = exp.variants.reduce<TransformableVariant | null>((best, v) => {
    if (v.isControl) return best;
    const vRate = v.impressions > 0 ? v.clicks / v.impressions : 0;
    const bestRate = best && best.impressions > 0 ? best.clicks / best.impressions : 0;
    return vRate > bestRate ? v : best;
  }, null);

  let uplift = 0;
  if (
    controlVariant &&
    bestVariant &&
    controlVariant.impressions > 0 &&
    bestVariant.impressions > 0
  ) {
    const controlRate = controlVariant.clicks / controlVariant.impressions;
    const bestRate = bestVariant.clicks / bestVariant.impressions;
    uplift = controlRate > 0 ? ((bestRate - controlRate) / controlRate) * 100 : 0;
  }

  const startDate = exp.startDate ? new Date(exp.startDate) : null;
  const daysRunning = startDate
    ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const sigStats: VariantStat[] = exp.variants.map((v) => ({
    id: v.id,
    name: v.name,
    isControl: v.isControl,
    impressions: v.impressions,
    conversions: successCount(exp.goalMetric, v),
  }));
  const significance = computeSignificance(sigStats);

  // ── Decision block ────────────────────────────────────────────────
  // Guarded: the counters behind this math come from a public tracking
  // endpoint, so treat them as hostile. If anything still throws, this row
  // ships without a decision instead of 500ing the whole tab.
  let decision: ExperimentDecision | undefined;
  try {
    const baselineRate = resolveBaselineRate(
      exp.variants.map((v) => ({
        impressions: v.impressions,
        successes: successCount(exp.goalMetric, v),
      })),
      baselinePrior
    );
    const mde = effectiveMde(baselineRate, defaultRelativeMde(baselineRate));
    const requiredPerVariant = requiredSampleSizePerVariant(baselineRate, mde);

    // Laggard variant drives the finish line; its trailing daily rate drives
    // the date. Window: min(7, days since start), floored at 1 (cold start).
    const windowDays = Math.min(exposureWindowDays, Math.max(daysRunning, 1));
    const perVariantDaily = exp.variants.map((v) => {
      const trailing = exposureCounts.get(`${exp.id}:${v.id}`);
      if (trailing != null && trailing > 0) return trailing / windowDays;
      // Fallback: lifetime counter averaged over the run (covers tracking gaps).
      return v.impressions > 0 ? v.impressions / Math.max(daysRunning, 1) : 0;
    });
    const minVariantImpressions =
      exp.variants.length > 0 ? Math.min(...exp.variants.map((v) => v.impressions)) : 0;
    const laggardDaily = perVariantDaily.length > 0 ? Math.min(...perVariantDaily) : 0;

    const projection = projectDecision(
      minVariantImpressions,
      requiredPerVariant,
      laggardDaily,
      now,
      daysRunning
    );
    decision = deriveVerdict({
      significance,
      projection,
      daysRunning,
      assumedBaselineRate: baselineRate,
      relativeMde: mde,
    });
  } catch (e) {
    console.error(`experiment-transform: decision math failed for ${exp.id}:`, e);
    decision = undefined;
  }

  return {
    ...exp,
    totalImpressions,
    uplift: Math.round(uplift * 10) / 10,
    daysRunning,
    significance,
    decision,
    trends: buildVariantTrends(seriesRows, exp.variants.map((v) => v.id)),
    variants: exp.variants.map((v) => {
      const successes = successCount(exp.goalMetric, v);
      const ci = wilsonInterval(successes, v.impressions);
      return {
        ...v,
        clickRate: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        conversionRate: v.impressions > 0 ? (v.conversions / v.impressions) * 100 : 0,
        goalRateCi: { lo: ci.lo * 100, hi: ci.hi * 100 },
      };
    }),
  };
}
