'use client';

/**
 * Per-journey attribution: sends, opens, conversions, revenue (30-day
 * post-send window, one order per send max). Data: /api/ops/followups/stats.
 */

import { useEffect, useState, type ReactElement } from 'react';
import KPITile from '@/components/backend/kit/KPITile';

interface StatRow {
  journeyKey: string;
  sends: number;
  opens: number;
  conversions: number;
  revenue: number;
}

export default function StatsPanel(): ReactElement {
  const [stats, setStats] = useState<StatRow[] | null>(null);
  const [queued, setQueued] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ops/followups/stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStats(json.stats as StatRow[]);
        else setError('Failed to load stats');
      })
      .catch(() => setError('Failed to load stats'));
    // Queued total comes from the flags payload's per-journey counts
    fetch('/api/ops/followups/flags')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const total = (json.journeys as { counts: { scheduled: number } }[]).reduce(
            (sum, j) => sum + j.counts.scheduled,
            0,
          );
          setQueued(total);
        }
      })
      .catch(() => undefined);
  }, []);

  const totalSends = stats?.reduce((sum, r) => sum + r.sends, 0) ?? 0;
  const totalOpens = stats?.reduce((sum, r) => sum + r.opens, 0) ?? 0;
  const openRate = totalSends > 0 ? Math.round((totalOpens / totalSends) * 100) : 0;

  return (
    <div className="card">
      <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-1">Conversion Stats</h2>
      <p className="text-sm text-gray-500 mb-4">
        Orders within 30 days of a send, matched by email; each order counts once.
      </p>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <KPITile label="Queued" value={queued != null ? String(queued) : '—'} />
        <KPITile label="Sent" value={String(totalSends)} delta="all time" />
        <KPITile
          label="Open rate"
          value={totalSends > 0 ? `${openRate}%` : '—'}
          delta={totalSends > 0 ? `${totalOpens} opens` : 'no sends yet'}
          deltaTone={totalSends > 0 && openRate >= 30 ? 'green' : 'gray'}
        />
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!stats ? (
        <p className="text-sm text-gray-500">Loading stats…</p>
      ) : stats.length === 0 ? (
        <p className="text-sm text-gray-500">No sends yet — stats appear once journeys go live.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold">Journey</th>
                <th className="py-2 pr-4 font-semibold text-right">Sends</th>
                <th className="py-2 pr-4 font-semibold text-right">Opens</th>
                <th className="py-2 pr-4 font-semibold text-right">Conversions</th>
                <th className="py-2 font-semibold text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.journeyKey} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-900">{row.journeyKey}</td>
                  <td className="py-2 pr-4 text-gray-700 text-right">{row.sends}</td>
                  <td className="py-2 pr-4 text-gray-700 text-right">{row.opens}</td>
                  <td className="py-2 pr-4 text-gray-700 text-right">{row.conversions}</td>
                  <td className="py-2 text-gray-900 text-right font-semibold">
                    ${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
