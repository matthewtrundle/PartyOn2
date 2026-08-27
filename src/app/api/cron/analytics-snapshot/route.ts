/**
 * Nightly analytics snapshot cron.
 *
 * Pulls from GA4, Vercel Analytics, GBP, and internal DB, upserts a row on
 * AnalyticsSnapshot for today's date, and regenerates docs/WEBSITE-ANALYTICS.md.
 *
 * Auth: Bearer CRON_SECRET (matches pattern of generate-blog / affiliate-commissions).
 *
 * SEMrush is intentionally skipped in Phase 1 — no API key available. Add when
 * SEMRUSH_API_KEY becomes available.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/database/client';
import {
  getTrafficMetrics,
  getTrafficSources,
  getTopPages,
  getRevenueByChannel,
  getConversionByLandingPage,
  getCheckoutFunnel,
} from '@/lib/analytics/google-analytics';
import { getTopKeywords, getSEOMetrics } from '@/lib/analytics/search-console';
import { getWebVitals, getVercelTopPages } from '@/lib/analytics/vercel-analytics';
import { syncGbpReviews, getGbpInsights, getSegmentSentiment } from '@/lib/analytics/gbp';
import {
  getChannelRollup,
  getLandingPageRollup,
  getProductMargins,
  getSegmentRollup,
  getAffiliateRoi,
} from '@/lib/analytics/internal-rollups';
import { getRepeatRateBySegment, getLtvBySegment } from '@/lib/analytics/cohort-rollups';
import { mapChannelSessions } from '@/lib/analytics/channel-mapping';
import { putFileToRepo, type PutFileResult } from '@/lib/github/put-file';
import { buildSnapshotRecommendations } from '@/lib/analytics/snapshot-recommendations';
import { persistRecommendations, listRecommendations } from '@/lib/analytics/recommendation-store';
import { getPageEngagement } from '@/lib/analytics/variant-rollup';
import { pruneVercelEvents } from '@/lib/analytics/vercel-events';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Idempotent additive migrations — schema.prisma drift means we can't `prisma db push`,
  // so apply additive DDL inline. No-ops once columns/tables exist.
  await prisma.$executeRawUnsafe(
    `ALTER TABLE analytics_snapshots ADD COLUMN IF NOT EXISTS comparison_data JSONB`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS segment TEXT`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS orders_segment_idx ON orders(segment)`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS recommendation_items (
      id TEXT PRIMARY KEY,
      generated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      segment TEXT,
      metric TEXT,
      current_value TEXT,
      target_value TEXT,
      impact_dollars_monthly INTEGER,
      effort_tier TEXT,
      risk_tier TEXT NOT NULL DEFAULT 'recommend',
      status TEXT NOT NULL DEFAULT 'open',
      shipped_at TIMESTAMP(3),
      result_metric_before JSONB,
      result_metric_after JSONB,
      notes TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS rec_status_idx ON recommendation_items(status)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS rec_generated_idx ON recommendation_items(generated_at)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS rec_segment_idx ON recommendation_items(segment)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS rec_title_segment_idx ON recommendation_items(title, segment)`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE receiving_invoice_lines ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,4)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS margin_coverage_pct DECIMAL(5,2)`
  );

  const today = startOfDay(new Date());
  const endDate = new Date();
  const start7 = new Date();
  start7.setDate(start7.getDate() - 7);
  const start30 = new Date();
  start30.setDate(start30.getDate() - 30);

  // Prior 30-day window (for WoW/MoM deltas) — 30 days ending 30 days ago.
  const prior30End = new Date();
  prior30End.setDate(prior30End.getDate() - 30);
  const prior30Start = new Date();
  prior30Start.setDate(prior30Start.getDate() - 60);

  const errors: string[] = [];
  const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (err) {
      console.error(`[analytics-snapshot] ${label} failed:`, err);
      errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };

  // Raw Vercel request logs carry client IPs, so they are aged out here rather
  // than kept forever. Wrapped in `safe` so a prune failure never costs us the
  // night's snapshot.
  const prunedVercelEvents = await safe('prune-vercel-events', pruneVercelEvents);
  if (prunedVercelEvents) {
    console.log(`[analytics-snapshot] pruned ${prunedVercelEvents} vercel_events rows`);
  }

  // Parallel pulls across sources. GA4/GSC traffic & SEO metrics natively support
  // a compare period; for other slices we issue a parallel "prior" call below.
  const [
    traffic,
    trafficSources,
    topPages,
    revenueByChannel,
    revenueByChannelPrior,
    conversionByPage,
    conversionByPagePrior,
    funnel,
    seoMetrics,
    topKeywords,
    webVitals,
    vercelTopPages,
    channels,
    channelsPrior,
    landingRollup,
    landingRollupPrior,
    productMargins,
    productMarginsPrior,
  ] = await Promise.all([
    safe('ga4.traffic', () => getTrafficMetrics(start30, endDate, prior30Start, prior30End)),
    safe('ga4.sources', () => getTrafficSources(start30, endDate)),
    safe('ga4.top-pages', () => getTopPages(start30, endDate, 20)),
    safe('ga4.revenue-by-channel', () => getRevenueByChannel(start30, endDate)),
    safe('ga4.revenue-by-channel.prior', () => getRevenueByChannel(prior30Start, prior30End)),
    safe('ga4.conversion-by-page', () => getConversionByLandingPage(start30, endDate)),
    safe('ga4.conversion-by-page.prior', () => getConversionByLandingPage(prior30Start, prior30End)),
    safe('ga4.funnel', () => getCheckoutFunnel(start30, endDate)),
    safe('gsc.seo', () => getSEOMetrics(start30, endDate, prior30Start, prior30End)),
    safe('gsc.keywords', () => getTopKeywords(start30, endDate, 50)),
    safe('vercel.web-vitals', () => getWebVitals(start7, endDate)),
    safe('vercel.top-pages', () => getVercelTopPages(start30, endDate)),
    safe('internal.channels', () => getChannelRollup(30)),
    safe('internal.channels.prior', () => getChannelRollup(30, 30)),
    safe('internal.landing-pages', () => getLandingPageRollup(30)),
    safe('internal.landing-pages.prior', () => getLandingPageRollup(30, 30)),
    safe('internal.product-margins', () => getProductMargins(30)),
    safe('internal.product-margins.prior', () => getProductMargins(30, 25, 30)),
  ]);

  const pageEngagement = await safe('internal.page-engagement', () => getPageEngagement(30));
  const [segmentRollup, segmentRollupPrior, repeatRate, ltvBySegment, affiliateRoi] = await Promise.all([
    safe('internal.segments', () => getSegmentRollup(30)),
    safe('internal.segments.prior', () => getSegmentRollup(30, 30)),
    safe('internal.repeat-rate', () => getRepeatRateBySegment(30)),
    safe('internal.ltv', () => getLtvBySegment(12)),
    safe('internal.affiliate-roi', () => getAffiliateRoi(30)),
  ]);

  // GBP sync (writes to GbpReview table) + insights
  await safe('gbp.sync', () => syncGbpReviews());
  const gbpInsights = await safe('gbp.insights', () => getGbpInsights(30));
  const gbpSegments = await safe('gbp.segments', () => getSegmentSentiment(90));

  const comparisonPayload = {
    windowDays: 30,
    priorWindow: { startDate: prior30Start.toISOString(), endDate: prior30End.toISOString() },
    channels: channelsPrior,
    landingPages: landingRollupPrior,
    productMargins: productMarginsPrior,
    revenueByChannel: revenueByChannelPrior,
    conversionByPage: conversionByPagePrior,
    trafficDeltas: {
      sessionsChange: traffic?.sessionsChange ?? null,
      usersChange: traffic?.usersChange ?? null,
    },
    seoDeltas: {
      impressionsChange: seoMetrics?.impressionsChange ?? null,
      clicksChange: seoMetrics?.clicksChange ?? null,
    },
  };

  // Scalar order totals (30d window, matching the sessions scalar). These
  // columns were never written before — always 0 — which silently fed zeros
  // into measure-recommendations' resultMetricBefore/After captures.
  const totalOrders = (channels ?? []).reduce((sum, c) => sum + (c.orders ?? 0), 0);
  const totalRevenue = (channels ?? []).reduce((sum, c) => sum + (c.revenue ?? 0), 0);
  const orderScalars = {
    orders: totalOrders,
    revenue: totalRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
  };

  // Project the GA4 Default Channel Group rows (already fetched into
  // trafficSources / top_referrers) into the five scalar session columns.
  // These were permanently 0 until now because the upsert never wrote them.
  // NB: trafficSources is a top-10 pull, so channelSessions sums to ~3% under
  // total sessions — see channel-mapping.ts. `residual` is intentionally not
  // persisted to a column (no column exists); it stays visible in top_referrers.
  const channelSessions = mapChannelSessions(trafficSources ?? []);

  // Upsert snapshot
  const snapshot = await prisma.analyticsSnapshot.upsert({
    where: { date: today },
    update: {
      ...orderScalars,
      organicSessions: channelSessions.organic,
      directSessions: channelSessions.direct,
      referralSessions: channelSessions.referral,
      socialSessions: channelSessions.social,
      paidSessions: channelSessions.paid,
      sessions: traffic?.sessions ?? 0,
      users: traffic?.users ?? 0,
      pageviews: traffic?.pageviews ?? 0,
      bounceRate: traffic?.bounceRate != null ? traffic.bounceRate : null,
      avgSessionDuration: traffic?.avgSessionDuration != null ? traffic.avgSessionDuration : null,
      impressions: seoMetrics?.impressions ?? 0,
      clicks: seoMetrics?.clicks ?? 0,
      ctr: seoMetrics?.ctr != null ? seoMetrics.ctr : null,
      avgPosition: seoMetrics?.avgPosition != null ? seoMetrics.avgPosition : null,
      topPages: (topPages ?? []) as unknown as object,
      topKeywords: (topKeywords ?? []) as unknown as object,
      topReferrers: (trafficSources ?? []) as unknown as object,
      vercelData: { webVitals, topPages: vercelTopPages } as unknown as object,
      gbpData: { insights: gbpInsights, segments: gbpSegments } as unknown as object,
      marginData: { channels, productMargins, affiliateRoi } as unknown as object,
      segmentData: {
        landingPages: landingRollup,
        revenueByChannel,
        conversionByPage,
        funnel,
        pageEngagement,
        segments: segmentRollup,
        repeatRate,
        ltvBySegment,
      } as unknown as object,
      comparisonData: { ...comparisonPayload, segments: segmentRollupPrior } as unknown as object,
    },
    create: {
      date: today,
      ...orderScalars,
      organicSessions: channelSessions.organic,
      directSessions: channelSessions.direct,
      referralSessions: channelSessions.referral,
      socialSessions: channelSessions.social,
      paidSessions: channelSessions.paid,
      sessions: traffic?.sessions ?? 0,
      users: traffic?.users ?? 0,
      pageviews: traffic?.pageviews ?? 0,
      bounceRate: traffic?.bounceRate != null ? traffic.bounceRate : null,
      avgSessionDuration: traffic?.avgSessionDuration != null ? traffic.avgSessionDuration : null,
      impressions: seoMetrics?.impressions ?? 0,
      clicks: seoMetrics?.clicks ?? 0,
      ctr: seoMetrics?.ctr != null ? seoMetrics.ctr : null,
      avgPosition: seoMetrics?.avgPosition != null ? seoMetrics.avgPosition : null,
      topPages: (topPages ?? []) as unknown as object,
      topKeywords: (topKeywords ?? []) as unknown as object,
      topReferrers: (trafficSources ?? []) as unknown as object,
      vercelData: { webVitals, topPages: vercelTopPages } as unknown as object,
      gbpData: { insights: gbpInsights, segments: gbpSegments } as unknown as object,
      marginData: { channels, productMargins, affiliateRoi } as unknown as object,
      segmentData: {
        landingPages: landingRollup,
        revenueByChannel,
        conversionByPage,
        funnel,
        pageEngagement,
        segments: segmentRollup,
        repeatRate,
        ltvBySegment,
      } as unknown as object,
      comparisonData: { ...comparisonPayload, segments: segmentRollupPrior } as unknown as object,
    },
  });

  // Generate + persist recommendations from this snapshot's rollups, then pull the open queue
  // so the markdown can show what ops should pay attention to.
  const snapshotRecs = buildSnapshotRecommendations({
    segments: segmentRollup ?? [],
    segmentsPrior: segmentRollupPrior ?? [],
    affiliateRoi: affiliateRoi ?? [],
    productMargins: productMargins ?? [],
  });
  const persistResult = await safe('recs.persist', () =>
    persistRecommendations(snapshotRecs, 'auto-snapshot')
  );
  const openRecs = (await safe('recs.list-open', () =>
    listRecommendations({ status: ['open', 'approved'], limit: 25 })
  )) ?? [];

  // Regenerate human-readable markdown summary, then deliver it: local FS in
  // dev, GitHub commit in prod. Both delivery results are surfaced in the
  // response so a silent failure can't hide again.
  let fsWritten = false;
  let commit: PutFileResult = { committed: false, error: 'not attempted' };
  try {
    const md = renderMarkdown({
      date: today,
      traffic,
      channels: channels ?? [],
      channelsPrior: channelsPrior ?? [],
      landingRollup: landingRollup ?? [],
      landingRollupPrior: landingRollupPrior ?? [],
      revenueByChannel: revenueByChannel ?? [],
      revenueByChannelPrior: revenueByChannelPrior ?? [],
      conversionByPage: conversionByPage ?? [],
      conversionByPagePrior: conversionByPagePrior ?? [],
      funnel: funnel ?? [],
      productMargins: productMargins ?? [],
      productMarginsPrior: productMarginsPrior ?? [],
      segmentRollup: segmentRollup ?? [],
      segmentRollupPrior: segmentRollupPrior ?? [],
      repeatRate: repeatRate ?? [],
      ltvBySegment: ltvBySegment ?? [],
      affiliateRoi: affiliateRoi ?? [],
      openRecs,
      gbpInsights,
      gbpSegments: gbpSegments ?? [],
      webVitals,
      topKeywords: topKeywords ?? [],
      seoMetrics,
      pageEngagement: pageEngagement ?? [],
      errors,
    });

    // 1) Local filesystem write — only succeeds in dev; Vercel's FS is
    //    read-only outside /tmp. Kept first, in its own guard, so `npm run
    //    dev` still refreshes the local docs copy. This is why the doc went
    //    unwritten for 101 days: the throw here was caught into `errors` and
    //    the route still returned 200, and nobody reads cron response bodies.
    try {
      const docsDir = path.join(process.cwd(), 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'WEBSITE-ANALYTICS.md'), md);
      fsWritten = true;
    } catch {
      // Expected on Vercel (read-only FS) — the GitHub commit below is the
      // real delivery path in prod. Deliberately not pushed into `errors`:
      // a failed local write is not a partial-pull failure.
      fsWritten = false;
    }

    // 2) Commit to the repo so the marketing-director agent's
    //    docs/WEBSITE-ANALYTICS.md is actually fresh. `[skip ci]` keeps the
    //    nightly docs commit from re-running the Test & Lint GitHub Action
    //    (which does fire on push to main). NOTE: Vercel does NOT honor
    //    commit-message skip tokens, so this commit still triggers a prod
    //    redeploy — same as the existing weekly finance/operations/marketing
    //    briefing crons that also commit here. Suppressing that would need a
    //    vercel.json Ignored Build Step, deliberately not added (a wrong
    //    ignoreCommand blocks ALL deploys, and it'd change behavior for those
    //    other crons too). Fails soft — mirrors operations-briefing.
    const dateStr = today.toISOString().split('T')[0];
    commit = await putFileToRepo({
      path: 'docs/WEBSITE-ANALYTICS.md',
      content: md,
      message: `chore(analytics): nightly snapshot ${dateStr} [skip ci]`,
    }).catch((err) => ({
      committed: false,
      error: err instanceof Error ? err.message : String(err),
    }));
    if (!commit.committed && commit.error) {
      // A commit failure IS a real delivery failure (unlike the fs write), so
      // surface it in `errors` for the response. It can't reach the markdown
      // banner — that content was already frozen when renderMarkdown ran above.
      errors.push(`markdown-commit: ${commit.error}`);
    }
  } catch (err) {
    console.error('[analytics-snapshot] markdown render/deliver failed:', err);
    errors.push(`markdown: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({
    ok: true,
    snapshotId: snapshot.id,
    recommendations: persistResult,
    openRecCount: openRecs.length,
    fsWritten,
    commit,
    errors: errors.length ? errors : undefined,
  });
}

type ChannelRow = { channel: string; orders: number; revenue: number; margin: number | null; averageOrderValue: number; averageMarginPct: number | null; marginCoveragePct: number };
type SegmentRow = { segment: string; orders: number; revenue: number; margin: number | null; averageOrderValue: number; averageMarginPct: number | null; marginCoveragePct: number };
type LandingRow = { landingPage: string; orders: number; revenue: number; averageOrderValue: number };
type GaChannelRow = { channel: string; sessions: number; transactions: number; revenue: number; conversionRate: number };
type GaPageRow = { path: string; sessions: number; transactions: number; conversionRate: number };
type ProductMarginRow = { title: string; productId: string; unitsSold: number; revenue: number; margin: number; marginPct: number; marginCoveragePct: number };

/** "▲ 18%" / "▼ 7%" / "—" / "🆕". Prior=0 with current>0 is treated as new-from-zero. */
function fmtDelta(current: number, prior: number | null | undefined): string {
  if (prior == null) return '—';
  if (prior === 0 && current === 0) return '—';
  if (prior === 0) return '🆕';
  const pct = ((current - prior) / prior) * 100;
  if (Math.abs(pct) < 1) return '—';
  return `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%`;
}

/** Format a precomputed change (e.g. from GA4/GSC's built-in compare) the same way. */
function fmtChangePct(change: number | null | undefined): string {
  if (change == null) return '—';
  if (Math.abs(change) < 1) return '—';
  return `${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(0)}%`;
}

function findBy<T>(arr: T[] | undefined, keyFn: (t: T) => string, key: string): T | undefined {
  return arr?.find((x) => keyFn(x) === key);
}

function renderMarkdown(s: {
  date: Date;
  traffic:
    | { sessions: number; users: number; pageviews: number; sessionsChange?: number; usersChange?: number }
    | null;
  channels: ChannelRow[];
  channelsPrior: ChannelRow[];
  landingRollup: LandingRow[];
  landingRollupPrior: LandingRow[];
  revenueByChannel: GaChannelRow[];
  revenueByChannelPrior: GaChannelRow[];
  conversionByPage: GaPageRow[];
  conversionByPagePrior: GaPageRow[];
  funnel: Array<{ eventName: string; users: number; dropOffFromPrevious: number | null }>;
  productMargins: ProductMarginRow[];
  productMarginsPrior: ProductMarginRow[];
  segmentRollup: SegmentRow[];
  segmentRollupPrior: SegmentRow[];
  repeatRate: Array<{ segment: string; orders: number; repeatOrders: number; repeatRatePct: number }>;
  ltvBySegment: Array<{ segment: string; customers: number; totalRevenue: number; averageLtv: number }>;
  affiliateRoi: Array<{ code: string; businessName: string; orders: number; revenue: number; margin: number | null; commissionPaid: number; netMargin: number | null; roiPct: number | null; marginCoveragePct: number }>;
  openRecs: Array<{ id: string; title: string; segment: string | null; impactDollarsMonthly: number | null; effortTier: string | null; riskTier: string; status: string; generatedAt: Date }>;
  gbpInsights: { reviewCount: number; averageRating: number; fiveStarPct: number; oneStarPct: number } | null;
  gbpSegments: Array<{ segment: string; count: number; averageRating: number }>;
  webVitals: { lcp: number | null; inp: number | null; cls: number | null } | null;
  topKeywords: Array<{ keyword: string; clicks: number; impressions: number; position: number }>;
  seoMetrics:
    | { impressions: number; clicks: number; ctr: number; avgPosition: number; impressionsChange?: number; clicksChange?: number }
    | null;
  pageEngagement: Array<{ path: string; sessions: number; pageviews: number; bounceRate: number; avgScrollDepth: number; ctaClicks: number; ctaClickRate: number }>;
  errors: string[];
}): string {
  const lines: string[] = [];
  lines.push(`# Website Analytics Snapshot`);
  lines.push('');
  lines.push(`_Generated: ${s.date.toISOString().split('T')[0]} — regenerated nightly by \`/api/cron/analytics-snapshot\`_`);
  lines.push('');

  if (s.errors.length) {
    lines.push(`> ⚠️ Partial pull: ${s.errors.length} source(s) failed. Check cron logs.`);
    lines.push('');
  }

  lines.push('## Open recommendations');
  if (s.openRecs.length) {
    lines.push('| Status | Risk | Effort | Impact $/mo | Segment | Title |');
    lines.push('|---|---|---|---:|---|---|');
    for (const r of s.openRecs) {
      const impact = r.impactDollarsMonthly != null ? `$${r.impactDollarsMonthly.toLocaleString()}` : '—';
      lines.push(
        `| ${r.status} | ${r.riskTier} | ${r.effortTier ?? '—'} | ${impact} | ${r.segment ?? '—'} | ${r.title} |`
      );
    }
    lines.push('');
    lines.push('_Update status via `POST /api/admin/analytics/recommendations` with `{ id, status, notes? }`._');
  } else {
    lines.push('_no open recommendations — heuristics may not have flagged anything yet, or this is the first snapshot run_');
  }
  lines.push('');

  lines.push('## Traffic (last 30 days)');
  if (s.traffic) {
    const sCh = fmtChangePct(s.traffic.sessionsChange);
    const uCh = fmtChangePct(s.traffic.usersChange);
    lines.push(
      `- Sessions: **${s.traffic.sessions.toLocaleString()}** (${sCh})  •  Users: **${s.traffic.users.toLocaleString()}** (${uCh})  •  Pageviews: **${s.traffic.pageviews.toLocaleString()}**`
    );
  } else {
    lines.push('- _GA4 data unavailable_');
  }
  lines.push('');

  lines.push('## SEO (Search Console, 30d)');
  if (s.seoMetrics) {
    const iCh = fmtChangePct(s.seoMetrics.impressionsChange);
    const cCh = fmtChangePct(s.seoMetrics.clicksChange);
    lines.push(
      `- Impressions: **${s.seoMetrics.impressions.toLocaleString()}** (${iCh})  •  Clicks: **${s.seoMetrics.clicks.toLocaleString()}** (${cCh})  •  CTR: ${s.seoMetrics.ctr}%  •  Avg position: ${s.seoMetrics.avgPosition}`
    );
  } else {
    lines.push('- _Search Console data unavailable_');
  }
  lines.push('');

  lines.push('## Revenue by internal channel (30d, vs prior 30d)');
  if (s.channels.length) {
    lines.push('| Channel | Orders | Revenue | AOV | Margin % | Cost coverage | Rev WoW |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const c of s.channels) {
      const prior = findBy(s.channelsPrior, (x) => x.channel, c.channel);
      lines.push(
        `| ${c.channel} | ${c.orders} | $${c.revenue.toLocaleString()} | $${c.averageOrderValue} | ${c.averageMarginPct ?? '—'}% | ${c.marginCoveragePct.toFixed(0)}% | ${fmtDelta(c.revenue, prior?.revenue ?? null)} |`
      );
    }
  } else {
    lines.push('_no orders_');
  }
  lines.push('');

  lines.push('## Revenue & margin by customer segment (30d, vs prior 30d)');
  if (s.segmentRollup.length) {
    lines.push('| Segment | Orders | Revenue | AOV | Margin % | Cost coverage | Rev WoW |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const r of s.segmentRollup) {
      const prior = findBy(s.segmentRollupPrior, (x) => x.segment, r.segment);
      lines.push(
        `| ${r.segment} | ${r.orders} | $${r.revenue.toLocaleString()} | $${r.averageOrderValue} | ${r.averageMarginPct ?? '—'}% | ${r.marginCoveragePct.toFixed(0)}% | ${fmtDelta(r.revenue, prior?.revenue ?? null)} |`
      );
    }
  } else {
    lines.push('_no segment data — run `npx tsx scripts/backfill-order-segments.ts` to populate Order.segment_');
  }
  lines.push('');

  lines.push('## Repeat purchase rate by segment (30d)');
  if (s.repeatRate.length) {
    lines.push('| Segment | Orders | Repeat orders | Repeat rate |');
    lines.push('|---|---:|---:|---:|');
    for (const r of s.repeatRate) {
      lines.push(`| ${r.segment} | ${r.orders} | ${r.repeatOrders} | ${r.repeatRatePct}% |`);
    }
  } else {
    lines.push('_no orders in window_');
  }
  lines.push('');

  lines.push('## LTV by entry segment (customers whose first order was in last 12 months)');
  if (s.ltvBySegment.length) {
    lines.push('| Entry segment | Customers | Total revenue | Avg LTV |');
    lines.push('|---|---:|---:|---:|');
    for (const r of s.ltvBySegment) {
      lines.push(`| ${r.segment} | ${r.customers} | $${r.totalRevenue.toLocaleString()} | $${r.averageLtv.toLocaleString()} |`);
    }
  } else {
    lines.push('_no customer data_');
  }
  lines.push('');

  lines.push('## Landing page → orders (30d, our DB, vs prior 30d)');
  if (s.landingRollup.length) {
    lines.push('| Landing page | Orders | Revenue | AOV | Rev WoW |');
    lines.push('|---|---:|---:|---:|---:|');
    for (const r of s.landingRollup.slice(0, 15)) {
      const prior = findBy(s.landingRollupPrior, (x) => x.landingPage, r.landingPage);
      lines.push(
        `| ${r.landingPage} | ${r.orders} | $${r.revenue.toLocaleString()} | $${r.averageOrderValue} | ${fmtDelta(r.revenue, prior?.revenue ?? null)} |`
      );
    }
  } else {
    lines.push('_no attribution data yet — new orders will populate this_');
  }
  lines.push('');

  lines.push('## GA4 revenue by channel (30d, vs prior 30d)');
  if (s.revenueByChannel.length) {
    lines.push('| Channel | Sessions | Transactions | Revenue | Conv rate | Rev WoW |');
    lines.push('|---|---:|---:|---:|---:|---:|');
    for (const r of s.revenueByChannel) {
      const prior = findBy(s.revenueByChannelPrior, (x) => x.channel, r.channel);
      lines.push(
        `| ${r.channel} | ${r.sessions} | ${r.transactions} | $${r.revenue.toLocaleString()} | ${(r.conversionRate * 100).toFixed(2)}% | ${fmtDelta(r.revenue, prior?.revenue ?? null)} |`
      );
    }
  } else {
    lines.push('_GA4 data unavailable_');
  }
  lines.push('');

  lines.push('## Conversion by landing page (GA4, 30d, vs prior 30d)');
  if (s.conversionByPage.length) {
    lines.push('| Path | Sessions | Transactions | Conv rate | Conv WoW |');
    lines.push('|---|---:|---:|---:|---:|');
    for (const r of s.conversionByPage.slice(0, 15)) {
      const prior = findBy(s.conversionByPagePrior, (x) => x.path, r.path);
      lines.push(
        `| ${r.path} | ${r.sessions} | ${r.transactions} | ${(r.conversionRate * 100).toFixed(2)}% | ${fmtDelta(r.conversionRate, prior?.conversionRate ?? null)} |`
      );
    }
  }
  lines.push('');

  lines.push('## Checkout funnel (30d)');
  if (s.funnel.length) {
    lines.push('| Step | Users | Drop-off |');
    lines.push('|---|---:|---:|');
    for (const f of s.funnel) {
      lines.push(`| ${f.eventName} | ${f.users} | ${f.dropOffFromPrevious == null ? '—' : (f.dropOffFromPrevious * 100).toFixed(1) + '%'} |`);
    }
  }
  lines.push('');

  lines.push('## Affiliate ROI (30d) — top 10 by net margin');
  if (s.affiliateRoi.length) {
    lines.push('| Affiliate | Orders | Revenue | Margin | Commission | Net margin | ROI | Cost coverage |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
    for (const a of s.affiliateRoi.slice(0, 10)) {
      const margin = a.margin == null ? '—' : `$${a.margin.toLocaleString()}`;
      const netMargin = a.netMargin == null ? '—' : `$${a.netMargin.toLocaleString()}`;
      const roi = a.roiPct == null ? '—' : `${a.roiPct}%`;
      lines.push(
        `| ${a.businessName} (${a.code}) | ${a.orders} | $${a.revenue.toLocaleString()} | ${margin} | $${a.commissionPaid.toLocaleString()} | ${netMargin} | ${roi} | ${a.marginCoveragePct.toFixed(0)}% |`
      );
    }
    const negativeReliable = s.affiliateRoi.filter((a) => a.netMargin != null && a.netMargin < 0 && a.marginCoveragePct >= 70);
    const negativeUnreliable = s.affiliateRoi.filter((a) => a.netMargin != null && a.netMargin < 0 && a.marginCoveragePct < 70);
    if (negativeReliable.length) {
      lines.push('');
      lines.push('**⚠️ Negative-ROI partners (commission > margin, ≥70% cost coverage — reliable):**');
      for (const a of negativeReliable) {
        lines.push(`- ${a.businessName} (${a.code}): commission $${a.commissionPaid.toLocaleString()} > margin $${a.margin?.toLocaleString() ?? '—'} — coverage ${a.marginCoveragePct.toFixed(0)}%`);
      }
    }
    if (negativeUnreliable.length) {
      lines.push('');
      lines.push('**⚠️ Possibly negative-ROI partners (low cost coverage — verify before acting):**');
      for (const a of negativeUnreliable) {
        lines.push(`- ${a.businessName} (${a.code}): cost coverage ${a.marginCoveragePct.toFixed(0)}% — populate variant costs (Receive Shipment) before evaluating.`);
      }
    }
  } else {
    lines.push('_no affiliate orders in window_');
  }
  lines.push('');

  lines.push('## Top product margins (30d, vs prior 30d)');
  if (s.productMargins.length) {
    lines.push('| Product | Units | Revenue | Margin | Margin % | Cost coverage | Units WoW |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const p of s.productMargins.slice(0, 15)) {
      const prior = findBy(s.productMarginsPrior, (x) => x.title, p.title);
      lines.push(
        `| ${p.title} | ${p.unitsSold} | $${p.revenue.toLocaleString()} | $${p.margin.toLocaleString()} | ${p.marginPct}% | ${p.marginCoveragePct.toFixed(0)}% | ${fmtDelta(p.unitsSold, prior?.unitsSold ?? null)} |`
      );
    }
  }
  lines.push('');

  lines.push('## Google Business Profile (30d)');
  if (s.gbpInsights) {
    lines.push(`- Reviews: **${s.gbpInsights.reviewCount}**  •  Avg rating: **${s.gbpInsights.averageRating}**  •  5-star: ${s.gbpInsights.fiveStarPct}%  •  1-star: ${s.gbpInsights.oneStarPct}%`);
  } else {
    lines.push('_GBP not configured — set GBP_* env vars_');
  }
  if (s.gbpSegments.length) {
    lines.push('');
    lines.push('Segment sentiment (90d):');
    lines.push('| Segment | Reviews | Avg rating |');
    lines.push('|---|---:|---:|');
    for (const seg of s.gbpSegments) {
      lines.push(`| ${seg.segment} | ${seg.count} | ${seg.averageRating} |`);
    }
  }
  lines.push('');

  lines.push('## Web Vitals (7d)');
  if (s.webVitals) {
    lines.push(`- LCP: ${s.webVitals.lcp ?? '—'}ms  •  INP: ${s.webVitals.inp ?? '—'}ms  •  CLS: ${s.webVitals.cls ?? '—'}`);
  } else {
    lines.push('_Vercel Analytics not configured — set VERCEL_ANALYTICS_TOKEN_');
  }
  lines.push('');

  lines.push('## Per-page engagement (our tracker, 30d)');
  if (s.pageEngagement.length) {
    lines.push('| Path | Sessions | Pageviews | Bounce | Avg scroll | CTA clicks | CTA rate |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const p of s.pageEngagement.slice(0, 20)) {
      lines.push(`| ${p.path} | ${p.sessions} | ${p.pageviews} | ${(p.bounceRate * 100).toFixed(0)}% | ${p.avgScrollDepth}% | ${p.ctaClicks} | ${(p.ctaClickRate * 100).toFixed(1)}% |`);
    }
  } else {
    lines.push('_no first-party event data yet — will populate after first session_');
  }
  lines.push('');

  lines.push('## Top search queries (GSC, 30d)');
  if (s.topKeywords.length) {
    lines.push('| Query | Clicks | Impressions | Avg position |');
    lines.push('|---|---:|---:|---:|');
    for (const k of s.topKeywords.slice(0, 20)) {
      lines.push(`| ${k.keyword} | ${k.clicks} | ${k.impressions} | ${k.position.toFixed(1)} |`);
    }
  }
  lines.push('');

  // Static footer — the ops instructions the original hand-written stub carried,
  // preserved here so the first real generated write doesn't destroy them.
  lines.push('---');
  lines.push('');
  lines.push('## Regenerate manually');
  lines.push('');
  lines.push('```bash');
  lines.push('curl -H "Authorization: Bearer $CRON_SECRET" \\');
  lines.push('  https://partyondelivery.com/api/cron/analytics-snapshot');
  lines.push('```');
  lines.push('');
  lines.push(
    '_This file is regenerated nightly (cron `0 7 * * *` UTC) and committed by ' +
      'the analytics bot — do not hand-edit; changes are overwritten. The full ' +
      'structured snapshot (with `marginData` / `vercelData` / `gbpData` / ' +
      '`segmentData` JSON columns) lives on the `AnalyticsSnapshot` row for each ' +
      'date; this document is the human-readable projection of it._');
  lines.push('');

  return lines.join('\n');
}
