'use client';

import { ReactElement, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { WebsiteInsights } from '@/lib/analytics/vercel-events';

const WINDOWS: { days: number; label: string }[] = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
];

/** One headline figure. Values wear text tokens — nothing here is encoded by colour. */
function StatTile({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: number;
  sub: string;
  loading: boolean;
}): ReactElement {
  return (
    <div className="card">
      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded w-24 mt-2 animate-pulse" />
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</div>
          <div className="text-sm text-gray-500">{sub}</div>
        </>
      )}
    </div>
  );
}

/**
 * Site-wide server traffic, measured from Vercel log-drain request logs.
 *
 * Deliberately a separate page from the landing-page hub: these numbers cover the
 * whole site, so showing them beside the per-page tabs would imply a scope they
 * do not have.
 */
export default function ServerTrafficPage(): ReactElement {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<WebsiteInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/traffic?days=${days}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as { data: WebsiteInsights };
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const totalViews = (data?.pageViews ?? 0) + (data?.botViews ?? 0);
  const botShare = totalViews > 0 ? Math.round(((data?.botViews ?? 0) / totalViews) * 100) : 0;
  const isEmpty = !loading && !error && totalViews === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl tracking-[0.06em] uppercase text-gray-900">
            Server Traffic
          </h1>
          <p className="text-sm text-gray-500">
            Real requests to the site, measured server-side — so bots are visible and
            counted separately.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                type="button"
                onClick={() => setDays(w.days)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  days === w.days
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <Link
            href="/admin/analytics"
            className="px-3 py-2 text-sm font-semibold rounded-md bg-white text-brand-blue border border-brand-blue hover:bg-blue-50 transition-colors"
          >
            Landing Pages →
          </Link>
        </div>
      </header>

      {error && <div className="card bg-red-50 border-red-200 text-sm text-red-700">{error}</div>}

      {isEmpty && (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-sm text-gray-700">
            No requests recorded yet for this window. If the Vercel log drain was just
            connected, data starts appearing within a few minutes — it is not
            backfilled, so only traffic from the connection onward is counted.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          label="Page views (human)"
          value={data?.pageViews ?? 0}
          sub={`last ${days} days`}
          loading={loading}
        />
        <StatTile
          label="Unique visitors"
          value={data?.uniqueVisitors ?? 0}
          sub="distinct IPs, humans only"
          loading={loading}
        />
        <StatTile
          label="Bot views"
          value={data?.botViews ?? 0}
          sub={`${botShare}% of all page views`}
          loading={loading}
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top pages</h3>
          <span className="text-xs text-gray-400">server logs · humans only</span>
        </div>

        {loading ? (
          <div className="h-40 bg-gray-100 rounded animate-pulse" />
        ) : !data || data.topPages.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No page views recorded in this window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4 font-medium">Page</th>
                  <th className="py-2 font-medium text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((p) => (
                  <tr key={p.path} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900 font-medium">{p.path}</td>
                    <td className="py-2 text-right text-gray-900">{p.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
