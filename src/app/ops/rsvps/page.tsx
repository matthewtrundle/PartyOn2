'use client';

import { useState, useEffect, useCallback, type ReactElement } from 'react';

interface Rsvp {
  id: string;
  event: string;
  name: string;
  adults: number;
  kids: number;
  dish: string | null;
  totalHeads: number;
  createdAt: string;
}

interface EventGroup {
  event: string;
  parties: number;
  totalAdults: number;
  totalKids: number;
  totalHeads: number;
  rsvps: Rsvp[];
}

/** "dads-gone-wild" -> "Dads Gone Wild" for a friendlier section heading. */
function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatTile({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs font-bold uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}

/**
 * Ops guest-list view for one-off event invites (Father's Day boat party, etc.).
 * Read-only: lists every RSVP grouped by event with rolled-up head counts.
 * Auto-gated by the /ops layout password.
 */
export default function EventRsvpsPage(): ReactElement {
  const [events, setEvents] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRsvps = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ops/event-rsvps');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load RSVPs.');
        return;
      }
      setEvents(json.events ?? []);
    } catch {
      setError('Network error — try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRsvps();
  }, [fetchRsvps]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-3a3 3 0 10-3-3"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event RSVPs</h1>
            <p className="mt-0.5 text-gray-500">Guest lists for one-off invite pages</p>
          </div>
        </div>
        <button
          onClick={fetchRsvps}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white shadow-sm" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-16 text-center shadow-sm">
          <p className="text-xl font-semibold text-gray-700">No RSVPs yet</p>
          <p className="mt-2 text-gray-500">
            As guests submit an invite page, they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {events.map((group) => (
            <section key={group.event}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-bold text-gray-900">{humanizeSlug(group.event)}</h2>
                <a
                  href={`/${group.event}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  View page ↗
                </a>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Parties" value={group.parties} />
                <StatTile label="Adults" value={group.totalAdults} />
                <StatTile label="Kids" value={group.totalKids} />
                <StatTile label="Total Heads" value={group.totalHeads} />
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Name
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600">
                          Adults
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600">
                          Kids
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600">
                          Heads
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Bringing
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          RSVP&apos;d
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.rsvps.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{r.name}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{r.adults}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{r.kids}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-900">
                            {r.totalHeads}
                          </td>
                          <td className="px-6 py-3 text-gray-700">
                            {r.dish || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-6 py-3 text-gray-500">
                            {formatWhen(r.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
