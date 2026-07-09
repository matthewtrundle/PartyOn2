'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import OrderDetailModal from './OrderDetailModal';
import OrdersTabs from '@/components/ops/orders/OrdersTabs';

type ViewTab = 'upcoming' | 'exceptions' | 'today' | 'weekly';

interface OrderInfo {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail?: string;
  total: number;
  deliveryDate?: string;
  deliveryTime?: string;
  status: string;
  fulfillmentStatus: string;
  itemsCount?: number;
}

interface DiscoBooking {
  id: number;
  clientName: string;
  clientPhone: string | null;
  headcount: number | null;
  package: string | null;
  addOns: string | null;
  podFlag: boolean;
  occasion: string | null;
  boatAssignment: string | null;
  matchStatus: string;
  order: OrderInfo | null;
}

interface ScheduleEntry {
  id: number;
  boat: string;
  timeSlot: string | null;
  clientName: string | null;
  clientPhone: string | null;
  occasion: string | null;
  headcount: number | null;
  package: string | null;
  addOns: string | null;
  podFlag: boolean;
  captainCrew: string | null;
  dj: string | null;
  photographer: string | null;
  avgAge: string | null;
  amount: number | null;
  type: 'disco' | 'private';
  isDiscoRow: boolean;
  discoBookings: DiscoBooking[];
  matchStatus: string;
  matchType: string | null;
  matchConfidence: number | null;
  matchNotes: string | null;
  order: OrderInfo | null;
}

interface OrphanOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  total: number;
  deliveryDate: string;
  deliveryTime: string;
  status: string;
  fulfillmentStatus: string;
}

interface DashboardData {
  dateRange: { from: string; to: string };
  schedule: Record<string, Record<string, ScheduleEntry[]>>;
  orphanOrders: OrphanOrder[];
  lastSync: {
    status: string | null;
    completedAt: string | null;
    rowsParsed: number;
    autoMatched: number;
    needsReview: number;
    unmatchedBookings: number;
    unmatchedOrders: number;
  } | null;
}

const VIEW_LABELS: Record<ViewTab, string> = {
  upcoming: 'Upcoming Parties',
  today: "Today's Loading List",
  exceptions: 'Exceptions',
  weekly: 'Custom Date Range',
};

export default function BoatSchedulePage() {
  const [view, setView] = useState<ViewTab>('upcoming');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<Set<number>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkingEntry, setLinkingEntry] = useState<number | null>(null);
  const [modalOrderNumber, setModalOrderNumber] = useState<number | null>(null);
  const [linkOrderNumber, setLinkOrderNumber] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view });
      if (view === 'weekly' && dateFrom && dateTo) {
        params.set('from', dateFrom);
        params.set('to', dateTo);
      }
      const res = await fetch(`/api/ops/boat-schedule?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (view === 'weekly') {
          if (!dateFrom) setDateFrom(json.dateRange.from);
          if (!dateTo) setDateTo(json.dateRange.to);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [view, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    setMenuOpen(false);
    try {
      const res = await fetch('/api/ops/boat-schedule/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: 'ops_dashboard' }),
      });
      const json = await res.json();
      if (res.ok) {
        setSyncResult(
          `Synced: ${json.rows_upserted} rows  ·  ${json.auto_matched} new matches  ·  ${json.unmatched_bookings} unmatched  ·  ${json.unmatched_orders} orphan orders`,
        );
        await load();
      } else {
        setSyncResult(`Sync failed: ${json.error || 'Unknown error'}`);
      }
    } catch (err) {
      setSyncResult(`Sync error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  const postAction = async (
    action: string,
    scheduleId: number,
    orderId: string,
    extra: Record<string, unknown> = {},
  ) => {
    const res = await fetch('/api/ops/boat-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, scheduleId, orderId, ...extra }),
    });
    if (res.ok) await load();
    else {
      const j = await res.json().catch(() => ({}));
      alert(`Action failed: ${j.error || 'Unknown error'}`);
    }
  };

  const handleLink = async (scheduleId: number) => {
    if (!linkOrderNumber.trim()) return;
    try {
      const r = await fetch(
        `/api/v1/admin/orders?search=${encodeURIComponent(linkOrderNumber.trim())}&limit=5`,
      );
      if (!r.ok) throw new Error('Search failed');
      const j = await r.json();
      const orders = j.data?.orders || j.orders || [];
      const match = orders.find(
        (o: { orderNumber: number }) => String(o.orderNumber) === linkOrderNumber.trim(),
      );
      if (!match) {
        alert(`No order found with number ${linkOrderNumber}`);
        return;
      }
      await postAction('link', scheduleId, match.id);
      setLinkingEntry(null);
      setLinkOrderNumber('');
    } catch (err) {
      alert(`Lookup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRow(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4">
        <OrdersTabs active="boats" />
      </div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-none">
            Boat Schedule
          </h1>
          <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-widest">
            Premier Party Cruises
          </p>
        </div>
        <div className="flex items-start gap-2">
          {/* Sync Now compact button + last sync timestamp */}
          <div className="flex flex-col items-end">
            <button
              onClick={syncNow}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              <SyncIcon spinning={syncing} />
              {syncing ? 'Syncing' : 'Sync Now'}
            </button>
            {data?.lastSync?.completedAt && (
              <span className="text-[10px] text-gray-500 mt-1 font-mono">
                last sync {formatRelative(data.lastSync.completedAt)}
              </span>
            )}
          </div>

          {/* Menu dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  View
                </div>
                {(['upcoming', 'today', 'exceptions', 'weekly'] as ViewTab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setView(t);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                      view === t ? 'text-blue-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {view === t && <span className="mr-1">•</span>}
                    {VIEW_LABELS[t]}
                  </button>
                ))}
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={syncNow}
                  disabled={syncing}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Sync now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current view label + sync result banner */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 font-semibold">
          <span className="w-1 h-4 bg-blue-900 rounded-full" />
          {VIEW_LABELS[view]}
          {view === 'upcoming' && (
            <span className="text-gray-400 normal-case tracking-normal font-normal">
              next 21 days
            </span>
          )}
        </div>
        {syncResult && (
          <div className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5">
            {syncResult}
          </div>
        )}
      </div>

      {view === 'weekly' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap text-sm">
          <label className="text-gray-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
          />
          <label className="text-gray-600">to</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={load}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
          >
            Refresh
          </button>
        </div>
      )}

      {loading && <div className="text-center py-12 text-gray-400">Loading...</div>}

      {!loading && data && (
        <>
          {Object.keys(data.schedule).length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
              {view === 'exceptions'
                ? 'No exceptions - everything matched'
                : view === 'upcoming'
                  ? 'No parties booked in the next 21 days'
                  : 'No bookings for this range'}
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(data.schedule)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, timeSlots]) => (
                  <DaySection
                    key={date}
                    date={date}
                    timeSlots={timeSlots}
                    view={view}
                    expandedRow={expandedRow}
                    onToggleRow={toggleRow}
                    onStartLink={id => {
                      setLinkingEntry(id);
                      setLinkOrderNumber('');
                    }}
                    onCancelLink={() => setLinkingEntry(null)}
                    onLink={handleLink}
                    linkingEntry={linkingEntry}
                    linkOrderNumber={linkOrderNumber}
                    setLinkOrderNumber={setLinkOrderNumber}
                    onUnlink={(sid, oid) => postAction('unlink', sid, oid)}
                    onConfirm={(sid, oid) =>
                      postAction('status', sid, oid, { status: 'matched' })
                    }
                    onOpenOrder={setModalOrderNumber}
                  />
                ))}
            </div>
          )}

          {data.orphanOrders.length > 0 && (
            <div className="mt-8">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-700 font-semibold mb-3">
                <span className="w-1 h-4 bg-amber-500 rounded-full" />
                Orphan Orders
                <span className="text-gray-400 normal-case tracking-normal font-normal">
                  ({data.orphanOrders.length}) Premier-bound, no schedule match
                </span>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Order</th>
                      <th className="px-4 py-2 text-left font-semibold">Customer</th>
                      <th className="px-4 py-2 text-left font-semibold">Delivery</th>
                      <th className="px-4 py-2 text-left font-semibold">Total</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orphanOrders.map(o => (
                      <tr key={o.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-mono">
                          <Link
                            href={`/ops/orders?search=${o.orderNumber}`}
                            className="text-blue-700 hover:underline font-semibold"
                          >
                            #{o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-2">{o.customerName}</td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {formatDateShort(o.deliveryDate)}
                        </td>
                        <td className="px-4 py-2 font-mono">${o.total.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <FulfillmentBadge status={o.fulfillmentStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {modalOrderNumber !== null && (
        <OrderDetailModal
          orderNumber={modalOrderNumber}
          onClose={() => setModalOrderNumber(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Day section
// ============================================

function DaySection({
  date,
  timeSlots,
  view,
  expandedRow,
  onToggleRow,
  onStartLink,
  onCancelLink,
  onLink,
  linkingEntry,
  linkOrderNumber,
  setLinkOrderNumber,
  onUnlink,
  onConfirm,
  onOpenOrder,
}: {
  date: string;
  timeSlots: Record<string, ScheduleEntry[]>;
  view: ViewTab;
  expandedRow: Set<number>;
  onToggleRow: (id: number) => void;
  onStartLink: (id: number) => void;
  onCancelLink: () => void;
  onLink: (id: number) => void;
  linkingEntry: number | null;
  linkOrderNumber: string;
  setLinkOrderNumber: (v: string) => void;
  onOpenOrder: (orderNumber: number) => void;
  onUnlink: (sid: number, oid: string) => void;
  onConfirm: (sid: number, oid: string) => void;
}) {
  // Flatten all entries across time slots, sorted by timeSlot then boat
  const allEntries: ScheduleEntry[] = [];
  for (const slot of Object.keys(timeSlots).sort()) {
    for (const e of timeSlots[slot]) allEntries.push(e);
  }

  // Compute summary. DSC bookings get attached to every PVT Disco row for their
  // (date, timeSlot), so dedupe by booking id when counting day-level totals.
  const boatSet = new Set<string>();
  const seenDiscoIds = new Set<number>();
  let bookings = 0;
  let podCount = 0;
  let matched = 0;
  for (const e of allEntries) {
    boatSet.add(e.boat);
    if (e.clientName && !e.isDiscoRow) {
      bookings++;
      if (e.podFlag) podCount++;
      if (e.matchStatus === 'matched') matched++;
    }
    if (e.isDiscoRow) {
      for (const b of e.discoBookings) {
        if (seenDiscoIds.has(b.id)) continue;
        seenDiscoIds.add(b.id);
        bookings++;
        if (b.podFlag) podCount++;
        if (b.matchStatus === 'matched') matched++;
      }
    }
  }

  // Hide empty rows for upcoming / exceptions
  const visible =
    view === 'upcoming' || view === 'exceptions'
      ? allEntries.filter(e => e.clientName)
      : allEntries;

  if (visible.length === 0) return null;

  return (
    <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Day header */}
      <header className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            {formatDateLong(date)}
          </h3>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">
          <span>{boatSet.size} boats</span>
          <span className="mx-1.5 text-gray-300">/</span>
          <span>
            {bookings} {bookings === 1 ? 'party' : 'parties'}
          </span>
          {podCount > 0 && (
            <>
              <span className="mx-1.5 text-gray-300">/</span>
              <span className="text-purple-700">{podCount} POD</span>
            </>
          )}
          {matched > 0 && (
            <>
              <span className="mx-1.5 text-gray-300">/</span>
              <span className="text-green-700">{matched} matched</span>
            </>
          )}
        </div>
      </header>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/60 text-[10px] uppercase tracking-widest text-gray-500">
            <tr>
              <th className="w-6" />
              <th className="px-3 py-2 text-left font-semibold">Boat</th>
              <th className="px-2 py-2 text-left font-semibold">Type</th>
              <th className="px-2 py-2 text-left font-semibold">Captain</th>
              <th className="px-2 py-2 text-left font-semibold">Time</th>
              <th className="px-2 py-2 text-left font-semibold">POD</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                isExpanded={expandedRow.has(entry.id)}
                onToggle={() => onToggleRow(entry.id)}
                onStartLink={() => onStartLink(entry.id)}
                onCancelLink={onCancelLink}
                onLink={() => onLink(entry.id)}
                isLinking={linkingEntry === entry.id}
                linkOrderNumber={linkOrderNumber}
                setLinkOrderNumber={setLinkOrderNumber}
                onUnlink={() => entry.order && onUnlink(entry.id, entry.order.id)}
                onConfirm={() => entry.order && onConfirm(entry.id, entry.order.id)}
                onOpenOrder={onOpenOrder}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================
// Entry Row
// ============================================

function EntryRow({
  entry,
  isExpanded,
  onToggle,
  onStartLink,
  onCancelLink,
  onLink,
  isLinking,
  linkOrderNumber,
  setLinkOrderNumber,
  onUnlink,
  onConfirm,
  onOpenOrder,
}: {
  entry: ScheduleEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onStartLink: () => void;
  onCancelLink: () => void;
  onLink: () => void;
  isLinking: boolean;
  linkOrderNumber: string;
  onOpenOrder: (orderNumber: number) => void;
  setLinkOrderNumber: (v: string) => void;
  onUnlink: () => void;
  onConfirm: () => void;
}) {
  const borderClass =
    entry.matchStatus === 'matched'
      ? 'border-l-2 border-l-green-500'
      : entry.matchStatus === 'needs_review'
        ? 'border-l-2 border-l-blue-500'
        : entry.clientName
          ? 'border-l-2 border-l-amber-400'
          : 'border-l-2 border-l-transparent';

  // AM (start hour 6-11): yellow tint. PM (12 or 1-5): blue tint.
  const timeTint = getTimeOfDayTint(entry.timeSlot);
  const rowTint =
    entry.matchStatus === 'matched'
      ? 'bg-green-50/40'
      : entry.matchStatus === 'needs_review'
        ? 'bg-sky-100/40'
        : timeTint;

  return (
    <>
      <tr
        className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${borderClass} ${rowTint}`}
        onClick={onToggle}
      >
        <td className="w-6 pl-3 text-gray-400 align-middle">
          <span className="inline-block transition-transform text-xs" style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            ▶
          </span>
        </td>
        <td className="px-3 py-2.5 font-semibold text-gray-900">{entry.boat}</td>
        <td className="px-2 py-2.5">
          <TypePill type={entry.type} />
        </td>
        <td className="px-2 py-2.5 text-gray-700 font-mono text-xs">
          {entry.captainCrew || '—'}
        </td>
        <td className="px-2 py-2.5 font-mono text-xs text-gray-700 whitespace-nowrap">
          {entry.timeSlot || '—'}
        </td>
        <td className="px-2 py-2.5">
          {entry.order ? (
            <button
              onClick={e => {
                e.stopPropagation();
                onOpenOrder(entry.order!.orderNumber);
              }}
              className="inline-flex items-center gap-1.5 text-blue-700 hover:underline font-semibold text-sm font-mono"
            >
              #{entry.order.orderNumber}
            </button>
          ) : entry.isDiscoRow ? (
            (() => {
              const podCount = entry.discoBookings.filter(b => b.order).length;
              return podCount > 0 ? (
                <span className="text-sm font-semibold text-blue-700 font-mono">
                  {podCount}
                </span>
              ) : (
                <span className="text-gray-300">—</span>
              );
            })()
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
      </tr>

      {/* Expansion */}
      {isExpanded && (
        <tr className={rowTint}>
          <td colSpan={6} className="pl-10 pr-4 py-4 border-t border-gray-100">
            {entry.isDiscoRow ? (
              <DiscoExpansion entry={entry} onOpenOrder={onOpenOrder} />
            ) : (
              <PrivateExpansion
                entry={entry}
                isLinking={isLinking}
                linkOrderNumber={linkOrderNumber}
                setLinkOrderNumber={setLinkOrderNumber}
                onLink={onLink}
                onCancelLink={onCancelLink}
                onStartLink={onStartLink}
                onUnlink={onUnlink}
                onConfirm={onConfirm}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================
// Expansion content
// ============================================

function PrivateExpansion({
  entry,
  isLinking,
  linkOrderNumber,
  setLinkOrderNumber,
  onLink,
  onCancelLink,
  onStartLink,
  onUnlink,
  onConfirm,
}: {
  entry: ScheduleEntry;
  isLinking: boolean;
  linkOrderNumber: string;
  setLinkOrderNumber: (v: string) => void;
  onLink: () => void;
  onCancelLink: () => void;
  onStartLink: () => void;
  onUnlink: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      {/* Top row: client + headcount + occasion */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">
            Client
          </div>
          <div className="font-semibold text-gray-900">{entry.clientName}</div>
          {entry.clientPhone && (
            <a
              href={`tel:${entry.clientPhone}`}
              className="text-xs font-mono text-gray-600 hover:text-blue-700"
            >
              {formatPhone(entry.clientPhone)}
            </a>
          )}
        </div>
        <div className="flex items-center gap-6">
          <StatBlock label="Headcount" value={entry.headcount?.toString() || '—'} />
          <StatBlock label="Age" value={entry.avgAge || '—'} />
          {entry.occasion && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">
                Occasion
              </div>
              <OccasionBadge occasion={entry.occasion} />
            </div>
          )}
        </div>
      </div>

      {/* Add-ons */}
      {entry.addOns && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">
            Add-ons / Packages
          </div>
          <div className="text-sm text-gray-800 leading-snug">{entry.addOns}</div>
        </div>
      )}

      {/* Entertainment */}
      {((entry.dj && entry.dj !== 'NA') ||
        (entry.photographer && entry.photographer !== 'NA')) && (
        <div className="flex gap-6">
          {entry.dj && entry.dj !== 'NA' && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">
                DJ
              </div>
              <div className="text-sm text-gray-800">{entry.dj}</div>
            </div>
          )}
          {entry.photographer && entry.photographer !== 'NA' && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">
                Photog
              </div>
              <div className="text-sm text-gray-800">{entry.photographer}</div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-end flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {entry.order ? (
            <>
              {entry.matchStatus === 'needs_review' && (
                <button
                  onClick={onConfirm}
                  className="px-2 py-1 text-xs text-green-700 hover:bg-green-50 rounded font-medium"
                >
                  Confirm
                </button>
              )}
              <button
                onClick={onUnlink}
                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >
                Unlink
              </button>
            </>
          ) : !isLinking ? (
            <button
              onClick={onStartLink}
              className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded font-medium"
            >
              Link order
            </button>
          ) : null}
        </div>
      </div>

      {isLinking && (
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-gray-600">Order #</span>
          <input
            type="text"
            value={linkOrderNumber}
            onChange={e => setLinkOrderNumber(e.target.value)}
            placeholder="1234"
            autoFocus
            className="px-2 py-1 border border-gray-300 rounded text-sm w-24 font-mono"
            onKeyDown={e => e.key === 'Enter' && onLink()}
          />
          <button
            onClick={onLink}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
          >
            Link
          </button>
          <button
            onClick={onCancelLink}
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function DiscoExpansion({
  entry,
  onOpenOrder,
}: {
  entry: ScheduleEntry;
  onOpenOrder: (orderNumber: number) => void;
}) {
  if (entry.discoBookings.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No individual disco bookings parsed for this slot yet. They may live on the DSC tab — check
        the sheet directly.
      </div>
    );
  }

  // Split bookings into bachelorettes and bachelors, sort each by headcount desc
  const isBach = (occ: string | null) => (occ || '').toLowerCase().includes('bachelorette');
  const isBachelor = (occ: string | null) => {
    const o = (occ || '').toLowerCase();
    return o.includes('bachelor') && !o.includes('bachelorette');
  };
  const bySize = (a: DiscoBooking, b: DiscoBooking) =>
    (b.headcount ?? 0) - (a.headcount ?? 0);
  const bacheloretteList = entry.discoBookings.filter(b => isBach(b.occasion)).sort(bySize);
  const bachelorList = entry.discoBookings.filter(b => isBachelor(b.occasion)).sort(bySize);
  const otherList = entry.discoBookings.filter(
    b => !isBach(b.occasion) && !isBachelor(b.occasion),
  );
  const sortedBookings = [...bacheloretteList, ...bachelorList, ...otherList];
  const bachelorette = bacheloretteList.length;
  const bachelor = bachelorList.length;

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
        <div className="text-[10px] uppercase tracking-widest text-purple-700 font-semibold">
          {entry.discoBookings.length}{' '}
          {entry.discoBookings.length === 1 ? 'disco party' : 'disco parties'}
          {bachelorette > 0 && (
            <span className="ml-2 text-pink-700">{bachelorette} bachelorette</span>
          )}
          {bachelor > 0 && (
            <span className="ml-2 text-blue-700">{bachelor} bachelor</span>
          )}
        </div>
        <div className="text-[10px] text-gray-500 font-mono">
          {entry.captainCrew && <span className="mr-3">Capt: {entry.captainCrew}</span>}
          {entry.dj && entry.dj !== 'NA' && entry.dj !== 'PLEASE ASSIGN' && (
            <span className="mr-3">DJ: {entry.dj}</span>
          )}
          {entry.photographer &&
            entry.photographer !== 'NA' &&
            entry.photographer !== 'PLEASE ASSIGN' && (
              <span>Photog: {entry.photographer}</span>
            )}
        </div>
      </div>
      <div className="overflow-x-auto border border-purple-100 rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-purple-50 text-purple-900">
            <tr>
              <th className="px-3 py-1.5 text-left font-semibold uppercase tracking-widest text-[10px]">
                Client
              </th>
              <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-widest text-[10px]">
                Phone
              </th>
              <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-widest text-[10px]">
                Type
              </th>
              <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-widest text-[10px]">
                Ppl
              </th>
              <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-widest text-[10px]">
                Add-ons
              </th>
              <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-widest text-[10px]">
                POD
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map(b => {
              const occ = (b.occasion || '').toLowerCase();
              const isBachelorette = occ.includes('bachelorette');
              const isBachelor = occ.includes('bachelor') && !isBachelorette;
              return (
                <tr key={b.id} className="border-t border-purple-100 hover:bg-purple-50/50">
                  <td className="px-3 py-1.5 font-medium">{b.clientName}</td>
                  <td className="px-2 py-1.5 font-mono text-gray-600">
                    {b.clientPhone ? formatPhone(b.clientPhone) : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    {isBachelorette ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-800">
                        Bachelorette
                      </span>
                    ) : isBachelor ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        Bachelor
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{b.headcount !== null ? b.headcount : '—'}</td>
                  <td className="px-2 py-1.5 text-gray-600 max-w-xs truncate">
                    {b.addOns || '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    {b.order ? (
                      <button
                        onClick={() => onOpenOrder(b.order!.orderNumber)}
                        className="text-blue-700 hover:underline font-medium font-mono"
                      >
                        #{b.order.orderNumber}
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// Small components
// ============================================

function TypePill({ type }: { type: 'disco' | 'private' }) {
  return type === 'disco' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-purple-100 text-purple-800">
      Disco
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-700">
      Private
    </span>
  );
}

function OccasionBadge({ occasion }: { occasion: string }) {
  const o = occasion.toLowerCase();
  let color = 'bg-slate-100 text-slate-700';
  if (o.includes('bachelorette')) color = 'bg-pink-100 text-pink-800';
  else if (o.includes('bachelor')) color = 'bg-blue-100 text-blue-800';
  else if (o.includes('family')) color = 'bg-green-100 text-green-800';
  else if (o.includes('corporate')) color = 'bg-gray-200 text-gray-800';
  else if (o.includes('disco')) color = 'bg-purple-100 text-purple-800';
  else if (o.includes('birthday')) color = 'bg-yellow-100 text-yellow-800';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}
    >
      {occasion}
    </span>
  );
}

function FulfillmentBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let color = 'bg-gray-100 text-gray-700';
  if (s === 'DELIVERED' || s === 'FULFILLED') color = 'bg-green-100 text-green-700';
  else if (s === 'OUT_FOR_DELIVERY' || s === 'IN_TRANSIT') color = 'bg-blue-100 text-blue-700';
  else if (s === 'UNFULFILLED') color = 'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={spinning ? 'animate-spin' : ''}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

// ============================================
// Helpers
// ============================================

// Parse start hour from time slot string. Returns tint class: AM (6-11) → yellow,
// PM (12 or 1-5) → blue, unknown → no tint. Boat trips run 6am-10pm, so hours 1-5
// are always PM, 6-11 are AM, 12 is PM noon.
function getTimeOfDayTint(timeSlot: string | null): string {
  if (!timeSlot) return '';
  const match = timeSlot.match(/^(\d{1,2})/);
  if (!match) return '';
  const hour = parseInt(match[1], 10);
  if (hour >= 6 && hour <= 11) return 'bg-amber-50/60';
  return 'bg-sky-50/50';
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}
