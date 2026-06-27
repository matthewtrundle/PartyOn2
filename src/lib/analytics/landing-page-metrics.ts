/**
 * Per-landing-page metrics for the /admin/analytics hub.
 *
 * Combines three independent sources, joined by URL path:
 *   - GA4            → traffic (pageviews + unique visitors, daily/weekly/monthly)
 *   - AnalyticsEvent → CTA-click breakdown + engagement (bounce / scroll)
 *   - Order          → conversion + revenue (via Order.landingPage, first-touch)
 *
 * A landing page = a canonical route plus alias routes (see landing-pages.ts);
 * every query unions all of the page's paths.
 *
 * Caveat: GA4 (server-validated) and AnalyticsEvent (first-party, unfiltered)
 * are separate sources joined only by path. Conversion uses first-touch
 * Order.landingPage, which has known attribution leaks — treat CVR as
 * approximate, not exact.
 *
 * Group-order caveat: ~95% of orders flow through the group dashboard, where every
 * Order inherits the HOST's first-touch landing page (set on GroupOrderV2 at create,
 * propagated in group-v2-payments.ts). This is accurate for REVENUE attribution — the
 * page that drove the party gets credit for the whole party's spend, each Order counted
 * once. But it can INFLATE conversion RATE (orders ÷ GA4 visitors): share-link
 * participants pay without ever visiting the host's landing page, so a viral group can
 * push orders above the page's visitor count. Read per-page revenue as solid, CVR as
 * directional.
 */

import { prisma } from '@/lib/database/client';
import {
  getPageTrafficTimeseries,
  getPageTrafficTotals,
  type PageTrafficPoint,
  type PageTrafficTotals,
} from './google-analytics';
import { getLandingPageRollupForPaths } from './internal-rollups';
import { getPageEngagement } from './variant-rollup';
import { allPathsFor, landingPageByKey, type LandingPageKey } from './landing-pages';

// Re-exported so client components can import these traffic types from this
// module (type-only — no server/googleapis runtime is pulled into the bundle).
export type { PageTrafficTotals, PageTrafficPoint } from './google-analytics';

export type TrafficGranularity = 'day' | 'week' | 'month';
export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y';

/** Map a period token to a day count. */
export function periodToDays(period: AnalyticsPeriod): number {
  switch (period) {
    case '7d':
      return 7;
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return 30;
  }
}

function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Monday (UTC) of the week containing the given YYYY-MM-DD, as YYYY-MM-DD. */
function weekStart(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

export interface TrafficPoint {
  bucket: string;
  pageviews: number;
  visitors: number;
}

/**
 * Roll daily GA4 points up to the requested granularity. Pageviews sum exactly;
 * visitors are daily-uniques summed within the bucket (a slight over-count for
 * week/month) — fine for trend shape, exact totals come from getTrafficTotals.
 */
function bucketize(points: PageTrafficPoint[], g: TrafficGranularity): TrafficPoint[] {
  if (g === 'day') {
    return points.map((p) => ({ bucket: p.date, pageviews: p.pageviews, visitors: p.visitors }));
  }
  const map = new Map<string, { pageviews: number; visitors: number }>();
  for (const p of points) {
    const key = g === 'month' ? p.date.slice(0, 7) : weekStart(p.date);
    const b = map.get(key) ?? { pageviews: 0, visitors: 0 };
    b.pageviews += p.pageviews;
    b.visitors += p.visitors;
    map.set(key, b);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([bucket, v]) => ({ bucket, ...v }));
}

export interface TrafficTotals {
  daily: PageTrafficTotals | null;
  weekly: PageTrafficTotals | null;
  monthly: PageTrafficTotals | null;
}

/** Daily (1d) / weekly (7d) / monthly (30d) traffic totals, exact unique visitors. */
async function getTrafficTotals(paths: string[]): Promise<TrafficTotals> {
  const end = new Date();
  const [daily, weekly, monthly] = await Promise.all([
    getPageTrafficTotals(paths, daysAgoDate(1), end),
    getPageTrafficTotals(paths, daysAgoDate(7), end),
    getPageTrafficTotals(paths, daysAgoDate(30), end),
  ]);
  return { daily, weekly, monthly };
}

export interface CtaRow {
  section: string;
  buttonText: string;
  clicks: number;
  clickSessions: number;
  clickRate: number;
}

/** Per-button / per-section CTA click counts from the first-party event stream. */
async function getCtaBreakdown(
  paths: string[],
  windowDays: number,
  sessionsDenominator: number
): Promise<CtaRow[]> {
  if (paths.length === 0) return [];
  const since = daysAgoDate(windowDays);
  const rows = await prisma.$queryRawUnsafe<
    Array<{ section: string; button_text: string; clicks: bigint; click_sessions: bigint }>
  >(
    `
    SELECT
      COALESCE(properties->>'section', '(none)')       AS section,
      COALESCE(properties->>'button_text', '(unnamed)') AS button_text,
      COUNT(*)::bigint                                  AS clicks,
      COUNT(DISTINCT session_id)::bigint                AS click_sessions
    FROM analytics_events
    WHERE name = 'cta_click' AND occurred_at >= $1 AND path = ANY($2::text[])
    GROUP BY 1, 2
    ORDER BY clicks DESC
  `,
    since,
    paths
  );
  return rows.map((r) => {
    const clickSessions = Number(r.click_sessions);
    return {
      section: r.section,
      buttonText: r.button_text,
      clicks: Number(r.clicks),
      clickSessions,
      clickRate: sessionsDenominator > 0 ? clickSessions / sessionsDenominator : 0,
    };
  });
}

export interface EngagementSummary {
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgScrollDepth: number;
  ctaClicks: number;
  ctaClickRate: number;
}

/** First-party engagement (bounce / scroll / CTA) aggregated across the page's paths. */
async function getEngagementSummary(paths: string[], windowDays: number): Promise<EngagementSummary> {
  const empty: EngagementSummary = {
    sessions: 0,
    pageviews: 0,
    bounceRate: 0,
    avgScrollDepth: 0,
    ctaClicks: 0,
    ctaClickRate: 0,
  };
  const rows = await getPageEngagement(windowDays, 200, paths);
  if (rows.length === 0) return empty;

  let sessions = 0;
  let pageviews = 0;
  let bouncedWeighted = 0;
  let scrollWeighted = 0;
  let ctaClicks = 0;
  for (const r of rows) {
    sessions += r.sessions;
    pageviews += r.pageviews;
    bouncedWeighted += r.bounceRate * r.sessions;
    scrollWeighted += r.avgScrollDepth * r.sessions;
    ctaClicks += r.ctaClicks;
  }
  return {
    sessions,
    pageviews,
    bounceRate: sessions > 0 ? bouncedWeighted / sessions : 0,
    avgScrollDepth: sessions > 0 ? Number((scrollWeighted / sessions).toFixed(1)) : 0,
    ctaClicks,
    ctaClickRate: sessions > 0 ? ctaClicks / sessions : 0,
  };
}

export interface ConversionSummary {
  orders: number;
  revenue: number;
  averageOrderValue: number;
  /** GA4 unique visitors over the window — conversion denominator. */
  sessions: number;
  /** orders / sessions (first-touch attributed, approximate). */
  conversionRate: number;
  windowDays: number;
  /** First-party sessions over the window, for cross-checking the GA4 denominator. */
  firstPartySessions: number;
}

/** Orders + revenue from Order.landingPage, divided by GA4 visitors for CVR. */
async function getConversionSummary(
  paths: string[],
  windowDays: number,
  gaSessions: number,
  firstPartySessions: number
): Promise<ConversionSummary> {
  const rollup = await getLandingPageRollupForPaths(paths, windowDays);
  const denom = gaSessions > 0 ? gaSessions : firstPartySessions;
  return {
    orders: rollup.orders,
    revenue: rollup.revenue,
    averageOrderValue: rollup.averageOrderValue,
    sessions: gaSessions,
    conversionRate: denom > 0 ? rollup.orders / denom : 0,
    windowDays,
    firstPartySessions,
  };
}

export interface LandingPagePayload {
  key: LandingPageKey;
  displayName: string;
  paths: string[];
  period: AnalyticsPeriod;
  granularity: TrafficGranularity;
  traffic: {
    source: 'ga4';
    /** false when GA4 isn't configured / returned no data. */
    available: boolean;
    totals: TrafficTotals;
    timeseries: TrafficPoint[];
  };
  ctas: CtaRow[];
  engagement: EngagementSummary;
  conversion: ConversionSummary;
}

/** Build the full combined per-page payload the hub API returns. */
export async function getLandingPagePayload(
  key: LandingPageKey,
  period: AnalyticsPeriod,
  granularity: TrafficGranularity
): Promise<LandingPagePayload> {
  const def = landingPageByKey(key);
  const paths = allPathsFor(key);
  const windowDays = periodToDays(period);
  const end = new Date();

  const [totals, points, engagement, windowTotals] = await Promise.all([
    getTrafficTotals(paths),
    getPageTrafficTimeseries(paths, daysAgoDate(windowDays), end),
    getEngagementSummary(paths, windowDays),
    getPageTrafficTotals(paths, daysAgoDate(windowDays), end),
  ]);

  const gaSessions = windowTotals?.visitors ?? 0;
  const ctaDenominator = engagement.sessions || gaSessions;

  const [ctas, conversion] = await Promise.all([
    getCtaBreakdown(paths, windowDays, ctaDenominator),
    getConversionSummary(paths, windowDays, gaSessions, engagement.sessions),
  ]);

  const available = totals.monthly !== null || windowTotals !== null || points.length > 0;

  return {
    key,
    displayName: def?.displayName ?? key,
    paths,
    period,
    granularity,
    traffic: { source: 'ga4', available, totals, timeseries: bucketize(points, granularity) },
    ctas,
    engagement,
    conversion,
  };
}
