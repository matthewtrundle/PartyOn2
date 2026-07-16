/**
 * First-party rollups over `AnalyticsEvent` for A/B testing + per-page stats.
 *
 * The stats pipeline:
 *   AnalyticsEvent (raw)
 *     → variant exposure/conversion counts
 *     → `computeSignificance` from experiment-significance.ts
 *     → winner / p-value / lift
 */

import { prisma } from '@/lib/database/client';
import { computeSignificance, type VariantStat, type SignificanceResult } from './experiment-significance';

export interface ExperimentRollup extends SignificanceResult {
  experimentId: string;
  windowDays: number;
}

/**
 * Aggregate exposures + conversions for an experiment over the last N days,
 * then compute significance. Uses AnalyticsEvent rows — no GA4 dependency.
 */
export async function getExperimentRollup(
  experimentId: string,
  windowDays = 30
): Promise<ExperimentRollup> {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  // Fetch variant metadata (so we know which is control and get display names)
  const exp = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { variants: { select: { id: true, name: true, isControl: true } } },
  });
  if (!exp) {
    return {
      experimentId,
      windowDays,
      variants: [],
      winner: null,
      control: null,
      hasEnoughData: false,
    };
  }

  const exposures = await prisma.analyticsEvent.groupBy({
    by: ['variantId'],
    where: {
      experimentId,
      name: 'experiment_exposure',
      occurredAt: { gte: since },
      variantId: { not: null },
    },
    _count: { _all: true },
  });

  // Count unique sessions that reached conversion per variant (so a user
  // converting twice still counts as one).
  const conversionRows = await prisma.$queryRawUnsafe<
    Array<{ variant_id: string; session_count: bigint }>
  >(
    `
    SELECT variant_id, COUNT(DISTINCT session_id)::bigint AS session_count
    FROM analytics_events
    WHERE experiment_id = $1
      AND name = 'experiment_conversion'
      AND occurred_at >= $2
      AND variant_id IS NOT NULL
    GROUP BY variant_id
  `,
    experimentId,
    since
  );

  const exposureMap = new Map(exposures.map((e) => [e.variantId ?? '', e._count._all]));
  const conversionMap = new Map(conversionRows.map((r) => [r.variant_id, Number(r.session_count)]));

  const stats: VariantStat[] = exp.variants.map((v) => ({
    id: v.id,
    name: v.name,
    isControl: v.isControl,
    impressions: exposureMap.get(v.id) ?? 0,
    conversions: conversionMap.get(v.id) ?? 0,
  }));

  const sig = computeSignificance(stats);
  return { experimentId, windowDays, ...sig };
}

/**
 * Per-variant trailing exposure counts for a set of experiments — feeds the
 * "projected decision date" math (experiment-planning.ts). Counts
 * `experiment_exposure` AnalyticsEvents in the trailing window; the caller
 * divides by windowDays (and falls back to lifetime counters / daysRunning
 * when the event stream is empty for an experiment).
 *
 * @returns Map keyed `${experimentId}:${variantId}` → exposure count in window.
 */
export async function getTrailingExposureRates(
  experimentIds: string[],
  windowDays = 7
): Promise<Map<string, number>> {
  if (experimentIds.length === 0) return new Map();
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const rows = await prisma.analyticsEvent.groupBy({
    by: ['experimentId', 'variantId'],
    where: {
      experimentId: { in: experimentIds },
      name: 'experiment_exposure',
      occurredAt: { gte: since },
      variantId: { not: null },
    },
    _count: { _all: true },
  });

  return new Map(
    rows
      .filter((r) => r.experimentId && r.variantId)
      .map((r) => [`${r.experimentId}:${r.variantId}`, r._count._all])
  );
}

export interface DailySeriesRow {
  experimentId: string;
  variantId: string;
  /** ISO yyyy-mm-dd (UTC day). */
  day: string;
  exposures: number;
  clicks: number;
}

/**
 * Per-day, per-variant exposure + hero-CTA click counts for a set of
 * experiments — feeds the CTR-over-time trend chart in the analytics hub.
 * Sourced from AnalyticsEvent rows (experiment_exposure / cta_click stamped
 * with experiment_id + variant_id). NOTE: the trend is directional — the
 * DECISION numbers stay on the lifetime variant counters, and the two
 * pipelines can differ slightly (ad blockers, beacon loss).
 */
export async function getExperimentDailySeries(
  experimentIds: string[],
  maxDays = 90
): Promise<DailySeriesRow[]> {
  if (experimentIds.length === 0) return [];
  const since = new Date();
  since.setDate(since.getDate() - maxDays);

  const rows = await prisma.$queryRawUnsafe<
    Array<{ experiment_id: string; variant_id: string; day: Date; exposures: bigint; clicks: bigint }>
  >(
    `
    SELECT experiment_id, variant_id,
           date_trunc('day', occurred_at)::date AS day,
           COUNT(*) FILTER (WHERE name = 'experiment_exposure')::bigint AS exposures,
           COUNT(*) FILTER (WHERE name = 'cta_click')::bigint           AS clicks
    FROM analytics_events
    WHERE experiment_id = ANY($1::text[])
      AND variant_id IS NOT NULL
      AND name IN ('experiment_exposure', 'cta_click')
      AND occurred_at >= $2
    GROUP BY experiment_id, variant_id, day
    ORDER BY day
  `,
    experimentIds,
    since
  );

  return rows.map((r) => ({
    experimentId: r.experiment_id,
    variantId: r.variant_id,
    day: r.day.toISOString().slice(0, 10),
    exposures: Number(r.exposures),
    clicks: Number(r.clicks),
  }));
}

export interface PageEngagement {
  path: string;
  sessions: number;
  pageviews: number;
  bounceRate: number; // single-pageview sessions / total sessions
  avgScrollDepth: number;
  ctaClicks: number;
  ctaClickRate: number;
}

/**
 * Per-page engagement summary for landing-page diagnostics.
 * Bounce rate = % of sessions that only saw this one page and left without scrolling.
 *
 * @param paths - When provided, restrict results to these exact pathnames
 *   (e.g. a landing page's canonical + alias routes). Bounce is still computed
 *   against the session's full path set, so a visitor who continued to another
 *   page is correctly counted as not-bounced.
 */
export async function getPageEngagement(
  windowDays = 30,
  limit = 25,
  paths?: string[]
): Promise<PageEngagement[]> {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const pathFilter = paths && paths.length > 0 ? paths : null;

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      path: string;
      sessions: bigint;
      pageviews: bigint;
      bounced_sessions: bigint;
      avg_scroll: number | null;
      cta_clicks: bigint;
    }>
  >(
    `
    WITH page_sessions AS (
      SELECT
        path,
        session_id,
        COUNT(*) FILTER (WHERE name = 'page_view')       AS page_views_in_path,
        MAX(CASE WHEN name = 'scroll_depth'
                 THEN (properties->>'percent_scrolled')::int
                 ELSE 0 END)                             AS max_scroll
      FROM analytics_events
      WHERE occurred_at >= $1 AND path IS NOT NULL
        AND ($3::text[] IS NULL OR path = ANY($3::text[]))
      GROUP BY path, session_id
    ),
    session_path_counts AS (
      SELECT session_id, COUNT(DISTINCT path) AS distinct_paths
      FROM analytics_events
      WHERE occurred_at >= $1 AND path IS NOT NULL
      GROUP BY session_id
    )
    SELECT
      ps.path,
      COUNT(DISTINCT ps.session_id)::bigint                                      AS sessions,
      SUM(ps.page_views_in_path)::bigint                                         AS pageviews,
      COUNT(DISTINCT ps.session_id) FILTER (
        WHERE spc.distinct_paths = 1 AND ps.max_scroll < 25
      )::bigint                                                                   AS bounced_sessions,
      AVG(ps.max_scroll)                                                         AS avg_scroll,
      (SELECT COUNT(*) FROM analytics_events ae
        WHERE ae.path = ps.path AND ae.name = 'cta_click' AND ae.occurred_at >= $1
      )::bigint                                                                   AS cta_clicks
    FROM page_sessions ps
    JOIN session_path_counts spc USING (session_id)
    GROUP BY ps.path
    ORDER BY sessions DESC
    LIMIT $2
  `,
    since,
    limit,
    pathFilter
  );

  return rows.map((r) => {
    const sessions = Number(r.sessions);
    const bounced = Number(r.bounced_sessions);
    return {
      path: r.path,
      sessions,
      pageviews: Number(r.pageviews),
      bounceRate: sessions > 0 ? bounced / sessions : 0,
      avgScrollDepth: Math.round((r.avg_scroll ?? 0) * 10) / 10,
      ctaClicks: Number(r.cta_clicks),
      ctaClickRate: sessions > 0 ? Number(r.cta_clicks) / sessions : 0,
    };
  });
}
