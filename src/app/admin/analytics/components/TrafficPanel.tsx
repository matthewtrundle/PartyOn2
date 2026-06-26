'use client';

import { ReactElement } from 'react';
import TrafficChart from './TrafficChart';
import type {
  AnalyticsPeriod,
  LandingPagePayload,
  TrafficGranularity,
  PageTrafficTotals,
} from '@/lib/analytics/landing-page-metrics';

interface TrafficPanelProps {
  traffic: LandingPagePayload['traffic'];
  /** Active time window — drives the chart and all per-page metrics. */
  period: AnalyticsPeriod;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  /** Auto-derived from the window; shown as a label (no manual toggle). */
  granularity: TrafficGranularity;
  loading?: boolean;
}

const WINDOWS: { id: AnalyticsPeriod; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' },
];

const GRANULARITY_LABEL: Record<TrafficGranularity, string> = {
  day: 'daily points',
  week: 'weekly points',
  month: 'monthly points',
};

/** One D/W/M stat block showing unique visitors (big) + pageviews (muted). */
function TrafficStat({
  label,
  totals,
  loading,
}: {
  label: string;
  totals: PageTrafficTotals | null;
  loading?: boolean;
}): ReactElement {
  return (
    <div className="card">
      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded w-24 mt-2 animate-pulse" />
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-900 mt-1">
            {(totals?.visitors ?? 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">
            {(totals?.pageviews ?? 0).toLocaleString()} pageviews
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Traffic section: fixed daily/weekly/monthly visitor totals (top cards) plus a
 * trend chart whose time window is selectable (7D/30D/90D/1Y). The data-point
 * spacing follows the window automatically (7D/30D → daily, 90D → weekly,
 * 1Y → monthly), shown as a label next to the chart.
 */
export default function TrafficPanel({
  traffic,
  period,
  onPeriodChange,
  granularity,
  loading = false,
}: TrafficPanelProps): ReactElement {
  return (
    <div className="space-y-4">
      {!loading && !traffic.available && (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-sm text-gray-700">
            No GA4 traffic data is available yet (GA4 may not be configured for this
            environment). CTA-click and conversion sections below still draw from
            first-party data.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TrafficStat label="Today" totals={traffic.totals.daily} loading={loading} />
        <TrafficStat label="Last 7 days" totals={traffic.totals.weekly} loading={loading} />
        <TrafficStat label="Last 30 days" totals={traffic.totals.monthly} loading={loading} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Traffic trend</h3>
            <span className="text-xs text-gray-400">{GRANULARITY_LABEL[granularity]} · {traffic.source.toUpperCase()}</span>
          </div>
          <div className="flex gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onPeriodChange(w.id)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  period === w.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <TrafficChart data={traffic.timeseries} loading={loading} />
      </div>
    </div>
  );
}
