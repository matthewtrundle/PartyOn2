'use client';

import { useState, useEffect, useCallback, type ReactElement } from 'react';

type OpsEventType = 'rsvp' | 'ticketed';
type OpsEventStatus = 'active' | 'upcoming' | 'today' | 'past' | 'postponed';

interface OpsEventSummary {
  key: string;
  title: string;
  type: OpsEventType;
  date: string | null;
  publicPath: string | null;
  detailPath: string;
  status: OpsEventStatus;
  rsvp?: { parties: number; adults: number; kids: number; heads: number };
  ticketed?: {
    ticketsSold: number;
    payingOrders: number;
    compOrders: number;
    collected: number;
    minimum: number;
    advertisedCapacity: number;
    hardCap: number;
    overMinimum: boolean;
    postponed: boolean;
    productFound: boolean;
  };
}

interface EventsResponse {
  success: boolean;
  events: OpsEventSummary[];
  error?: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'No set date';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_STYLE: Record<OpsEventStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  today: 'bg-green-100 text-green-800',
  past: 'bg-gray-100 text-gray-600',
  postponed: 'bg-amber-100 text-amber-800',
  active: 'bg-indigo-100 text-indigo-800',
};

function Badge({ children, className }: { children: React.ReactNode; className: string }): ReactElement {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${className}`}>{children}</span>
  );
}

function EventCard({ e }: { e: OpsEventSummary }): ReactElement {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">{e.title}</h2>
        <Badge className={STATUS_STYLE[e.status]}>{e.status}</Badge>
      </div>
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Badge className="bg-gray-100 text-gray-600">{e.type === 'ticketed' ? 'Ticketed' : 'RSVP'}</Badge>
        <span>{formatDate(e.date)}</span>
      </div>

      {/* Headline metric */}
      {e.ticketed ? (
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">{e.ticketed.ticketsSold}</span>
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">tickets</span>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {formatMoney(e.ticketed.collected)} collected · {e.ticketed.ticketsSold}/{e.ticketed.minimum} min ·{' '}
            {e.ticketed.overMinimum ? 'sailing ✓' : `${Math.max(0, e.ticketed.minimum - e.ticketed.ticketsSold)} to go`}
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            advertised cap {e.ticketed.advertisedCapacity} · hard cap {e.ticketed.hardCap}
            {e.ticketed.compOrders > 0 ? ` · ${e.ticketed.compOrders} comp` : ''}
            {!e.ticketed.productFound ? ' · product not created yet' : ''}
          </div>
        </div>
      ) : e.rsvp ? (
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">{e.rsvp.heads}</span>
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">guests</span>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {e.rsvp.parties} {e.rsvp.parties === 1 ? 'party' : 'parties'} · {e.rsvp.adults} adults · {e.rsvp.kids} kids
          </div>
        </div>
      ) : (
        <div className="mb-4 text-sm text-gray-400">No roster data source configured.</div>
      )}

      {/* Links */}
      <div className="mt-auto flex items-center gap-4 border-t border-gray-100 pt-3">
        <a href={e.detailPath} className="text-sm font-semibold text-blue-600 hover:underline">
          View roster →
        </a>
        {e.publicPath && (
          <a
            href={e.publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-500 hover:text-gray-800 hover:underline"
          >
            View page ↗
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Ops events hub — one card per registered event (RSVP or ticketed) with live
 * headline stats and a drill-in to the full roster. Auto-gated by the /ops
 * password. Add new events in src/lib/events/ops-catalog.ts.
 */
export default function OpsEventsPage(): ReactElement {
  const [events, setEvents] = useState<OpsEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/events');
      const json = (await res.json()) as EventsResponse;
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load events.');
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
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
            <p className="mt-0.5 text-gray-500">Every event and its live roster</p>
          </div>
        </div>
        <button
          onClick={fetchEvents}
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
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-white shadow-sm" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-16 text-center shadow-sm">
          <p className="text-xl font-semibold text-gray-700">No events registered</p>
          <p className="mt-2 text-gray-500">
            Add one in <code className="rounded bg-gray-100 px-1.5 py-0.5">src/lib/events/ops-catalog.ts</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.key} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}
