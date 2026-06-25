'use client';

import { ReactElement } from 'react';
import TrafficChart from './TrafficChart';
import type {
  LandingPagePayload,
  TrafficGranularity,
  PageTrafficTotals,
} from '@/lib/analytics/landing-page-metrics';

interface TrafficPanelProps {
  traffic: LandingPagePayload['traffic'];
  granularity: TrafficGranularity;
  onGranularityChange: (g: TrafficGranularity) => void;
  loading?: boolean;
}

const GRANULARITIES: { id: TrafficGranularity; label: string }[] = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
];

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
 * Traffic section: daily/weekly/monthly visitor + pageview totals (exact unique
 * counts from GA4) plus a trend chart at the chosen granularity.
 */
export default function TrafficPanel({
  traffic,
  granularity,
  onGranularityChange,
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
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Traffic trend</h3>
            <span className="text-xs text-gray-400 uppercase">{traffic.source}</span>
          </div>
          <div className="flex gap-1">
            {GRANULARITIES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onGranularityChange(g.id)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  granularity === g.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <TrafficChart data={traffic.timeseries} loading={loading} />
      </div>
    </div>
  );
}
