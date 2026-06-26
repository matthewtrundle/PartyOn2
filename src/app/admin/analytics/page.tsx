'use client';

import { ReactElement, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LandingPageTabs from './components/LandingPageTabs';
import TrafficPanel from './components/TrafficPanel';
import CtaClickTable from './components/CtaClickTable';
import ConversionPanel from './components/ConversionPanel';
import PageExperimentsPanel from './components/PageExperimentsPanel';
import { isLandingPageKey, landingPageByKey, type LandingPageKey } from '@/lib/analytics/landing-pages';
import type {
  AnalyticsPeriod,
  ConversionSummary,
  EngagementSummary,
  LandingPagePayload,
  TrafficGranularity,
} from '@/lib/analytics/landing-page-metrics';

/**
 * Sensible chart granularity for a window: a year reads best as monthly points,
 * a quarter as weekly, and a week/month as daily. The window selector lives on
 * the traffic chart; granularity follows automatically.
 */
function defaultGranularityForPeriod(period: AnalyticsPeriod): TrafficGranularity {
  switch (period) {
    case '1y':
      return 'month';
    case '90d':
      return 'week';
    default:
      return 'day';
  }
}

const EMPTY_TRAFFIC: LandingPagePayload['traffic'] = {
  source: 'ga4',
  available: false,
  totals: { daily: null, weekly: null, monthly: null },
  timeseries: [],
};
const EMPTY_CONVERSION: ConversionSummary = {
  orders: 0,
  revenue: 0,
  averageOrderValue: 0,
  sessions: 0,
  conversionRate: 0,
  windowDays: 30,
  firstPartySessions: 0,
};
const EMPTY_ENGAGEMENT: EngagementSummary = {
  sessions: 0,
  pageviews: 0,
  bounceRate: 0,
  avgScrollDepth: 0,
  ctaClicks: 0,
  ctaClickRate: 0,
};

function AnalyticsHub(): ReactElement {
  const searchParams = useSearchParams();
  const pageParam = searchParams?.get('page') ?? 'home';
  const active: LandingPageKey = isLandingPageKey(pageParam) ? pageParam : 'home';
  const activeDef = landingPageByKey(active);

  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [granularity, setGranularity] = useState<TrafficGranularity>('day');
  const [data, setData] = useState<LandingPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/analytics/landing-page?page=${active}&period=${period}&granularity=${granularity}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as { data: LandingPagePayload };
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [active, period, granularity]);

  useEffect(() => {
    load();
  }, [load]);

  const selectPeriod = (p: AnalyticsPeriod): void => {
    setPeriod(p);
    setGranularity(defaultGranularityForPeriod(p));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landing Page Analytics</h1>
          <p className="text-sm text-gray-500">
            Traffic, CTA clicks &amp; conversion for each landing page.
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="px-3 py-2 text-sm font-semibold rounded-md bg-white text-brand-blue border border-brand-blue hover:bg-blue-50 transition-colors"
        >
          Global Overview →
        </Link>
      </header>

      <LandingPageTabs active={active} />

      {error && <div className="card bg-red-50 border-red-200 text-sm text-red-700">{error}</div>}

      <TrafficPanel
        traffic={data?.traffic ?? EMPTY_TRAFFIC}
        period={period}
        onPeriodChange={selectPeriod}
        granularity={granularity}
        loading={loading}
      />
      <CtaClickTable rows={data?.ctas ?? []} loading={loading} />
      <ConversionPanel
        conversion={data?.conversion ?? EMPTY_CONVERSION}
        engagement={data?.engagement ?? EMPTY_ENGAGEMENT}
        loading={loading}
      />
      {activeDef && <PageExperimentsPanel def={activeDef} />}
    </div>
  );
}

/**
 * Per-landing-page analytics hub. Top tab bar selects a page; panels show its
 * traffic (GA4), CTA-click breakdown (first-party), and conversion (orders by
 * Order.landingPage). A/B-test management is added in Phase 2.
 */
export default function AnalyticsHubPage(): ReactElement {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading…</div>}>
      <AnalyticsHub />
    </Suspense>
  );
}
