'use client';

import { ReactElement, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { WebsiteInsights, DailyTraffic } from '@/lib/analytics/vercel-events';

/** Series colors — validated for CVD separation + contrast on white. */
const HUMAN_COLOR = '#0B74B8'; // brand-blue
const BOT_COLOR = '#C2410C'; // burnt orange

const AXIS_TICK = { fontSize: 12, fill: '#6b7280' };
const AXIS_LINE = { stroke: '#e5e7eb' };
const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

interface ServerTrafficStripProps {
  /** Dashboard period selection; maps 1:1 onto the API's trailing window. */
  period: '7d' | '30d' | '90d';
}

interface TrafficResponse {
  data: WebsiteInsights;
  daily?: DailyTraffic[];
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }): ReactElement {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/**
 * Server-side traffic strip fed by the Vercel log drain (`vercel_events`).
 *
 * Complements the GA4 panel rather than duplicating it: GA4 measures in the
 * browser (and bots rarely run its JavaScript), this measures at the server, so
 * it sees every request and can split humans from bots. The two will never
 * match exactly — different instruments.
 */
export default function ServerTrafficStrip({ period }: ServerTrafficStripProps): ReactElement {
  const days = { '7d': 7, '30d': 30, '90d': 90 }[period];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traffic, setTraffic] = useState<TrafficResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics/traffic?days=${days}&include=daily`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        return res.json() as Promise<TrafficResponse>;
      })
      .then((json) => {
        if (!cancelled) setTraffic(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load traffic');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-56 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const insights = traffic?.data;
  const daily = traffic?.daily ?? [];
  const total = (insights?.pageViews ?? 0) + (insights?.botViews ?? 0);
  const botShare = total > 0 ? Math.round(((insights?.botViews ?? 0) / total) * 100) : 0;
  const chartData = daily.map((d) => ({ ...d, dateLabel: format(parseISO(d.day), 'MMM d') }));

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Server Traffic</h3>
          <p className="text-sm text-gray-500">
            Measured at the server via the Vercel log drain — includes visitors GA4 can&apos;t see,
            and splits humans from bots.
          </p>
        </div>
        <Link
          href="/admin/analytics/traffic"
          className="text-sm font-medium text-brand-blue hover:underline whitespace-nowrap"
        >
          Full report →
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      ) : !insights || total === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          No traffic recorded in this window yet — the drain went live Aug 30, so data starts there.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Tile label="Human Page Views" value={insights.pageViews.toLocaleString()} />
            <Tile label="Unique Visitors" value={insights.uniqueVisitors.toLocaleString()} />
            <Tile label="Bot Views" value={insights.botViews.toLocaleString()} />
            <Tile label="Bot Share" value={`${botShare}%`} hint="of all page views" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="h-56" aria-label="Daily human and bot page views">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={AXIS_LINE}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={AXIS_LINE}
                      allowDecimals={false}
                      width={40}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="human"
                      name="Humans"
                      stroke={HUMAN_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bot"
                      name="Bots"
                      stroke={BOT_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Top Pages (humans)</h4>
              {insights.topPages.length === 0 ? (
                <p className="text-sm text-gray-500">No human page views yet.</p>
              ) : (
                <div className="space-y-2">
                  {insights.topPages.slice(0, 8).map((page) => (
                    <div key={page.path} className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-700 truncate" title={page.path}>
                        {page.path}
                      </span>
                      <span className="text-gray-500 tabular-nums shrink-0">
                        {page.views.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
