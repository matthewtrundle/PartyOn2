'use client';

import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import BulkActionBar from './BulkActionBar';
import DaySectionHeader from './DaySectionHeader';
import DayTiles from './DayTiles';
import FilterSheet from './FilterSheet';
import OrderGroupCard from './OrderGroupCard';
import OrdersFilterBar from './OrdersFilterBar';
import OrdersHeader from './OrdersHeader';
import OrdersStatsStrip from './OrdersStatsStrip';
import PackModeOverlay from './PackModeOverlay';
import PickSheetPrint from './print/PickSheetPrint';
import CruiseTypeGateDialog, { type CruisePick } from './CruiseTypeGateDialog';
import ReviewRequestModal from './ReviewRequestModal';
import ShortageListModal from './ShortageListModal';
import { buildShortageList } from './shortage';
import { todayCT } from './client-today';
import { EMPTY_FILTERS, useOrdersView } from './useOrdersView';
import { cacheChecks, fetchChecks, loadCachedChecks } from './usePickChecks';
import { deliveryTimeMinutes, fmtDateLong, formatDate, formatDateTime } from './format';
import type { OrderCardData, OrdersViewOrder } from '@/lib/ops/orders-view-data';
import type { Order, ShortageRow } from './types';

/**
 * The unified Orders tab: day-grouped cooler cards (the weekly-checklist
 * design) carrying the full order workflow — selection, bulk fulfill,
 * review requests, shortage lists, pick checklists, and both print paths.
 *
 * Printing: the on-screen checklist prints as-is (weekly-checklist layout);
 * when pick sheets are requested, the screen content is print-hidden and
 * only the PickSheetPrint tree prints.
 */
export default function UnifiedOrdersView({
  initialGroupOrderV2Id,
  initialQ,
  initialStart,
  initialDays,
}: {
  initialGroupOrderV2Id?: string;
  initialQ?: string;
  initialStart?: string;
  initialDays?: number;
}): ReactElement {
  const view = useOrdersView({
    groupOrderV2Id: initialGroupOrderV2Id,
    q: initialQ,
    start: initialStart,
    days: initialDays,
  });
  const { data, selected } = view;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [printCards, setPrintCards] = useState<OrderCardData[]>([]);
  const [cruiseGate, setCruiseGate] = useState<{ unresolved: OrderCardData[]; cards: OrderCardData[] } | null>(null);
  const [reviewModalOrders, setReviewModalOrders] = useState<Order[] | null>(null);
  const [reviewChecked, setReviewChecked] = useState<Set<string>>(new Set());
  const [sendingReviews, setSendingReviews] = useState(false);
  const [shortageList, setShortageList] = useState<ShortageRow[] | null>(null);
  const [shortageCount, setShortageCount] = useState(0);
  // Day/overdue sections collapse to a compact tile overview. Keys present
  // here are EXPANDED; empty set = all collapsed (the default landing state).
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // The day currently open in full-screen Pack mode (null = closed).
  const [packSection, setPackSection] = useState<{ label: string; cards: OrderCardData[] } | null>(null);

  // Reset pick-sheet print mode after the dialog closes so subsequent
  // prints fall back to the checklist layout.
  useEffect(() => {
    const reset = (): void => setPrintCards([]);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  const selectedOrders = useMemo<OrdersViewOrder[]>(
    () => [...selected].map((id) => view.ordersById.get(id)).filter((o): o is OrdersViewOrder => !!o),
    [selected, view.ordersById],
  );

  // --- Print paths ---

  // Prefetch authoritative pick state for EVERY order across the selected
  // coolers (not just the clicked one) so the sheet reflects cross-device
  // updates, then render + print the pick sheets.
  const doPrintPickSheets = useCallback(async (cards: OrderCardData[]) => {
    await Promise.all(
      cards
        .flatMap((c) => c.orders)
        .map((o) =>
          fetchChecks(o.id).then((server) => {
            if (server) cacheChecks(o.id, server);
          }),
        ),
    );
    setPrintCards(cards);
    setTimeout(() => window.print(), 100);
  }, []);

  const handlePrintPickSheets = useCallback(async (orderIds: string[]) => {
    // Resolve each requested order to its cooler card and print the WHOLE
    // cooler, so a group dashboard's guest orders share one combined sheet.
    const cardByOrderId = new Map<string, OrderCardData>();
    for (const card of view.allCards) {
      for (const o of card.orders) cardByOrderId.set(o.id, card);
    }
    const seen = new Set<string>();
    const cards: OrderCardData[] = [];
    for (const id of orderIds) {
      const card = cardByOrderId.get(id);
      if (!card || seen.has(card.key)) continue;
      seen.add(card.key);
      cards.push(card);
    }
    if (!cards.length) return;
    // Gate: any marina delivery whose cruise type (Private/Disco) is unknown
    // must be resolved before the sheet prints — the pick sheet has to say it.
    const unresolved = cards.filter((c) => c.isMarina && !c.cruiseTypeKnown);
    if (unresolved.length) {
      setCruiseGate({ unresolved, cards });
      return;
    }
    await doPrintPickSheets(cards);
  }, [view.allCards, doPrintPickSheets]);

  // Operator resolved the cruise-type gate: persist each pick to its dashboard,
  // stamp the resolved type onto the print cards, then print.
  const handleCruiseGateConfirm = useCallback(async (picks: Record<string, CruisePick>) => {
    const gate = cruiseGate;
    if (!gate) return;
    await Promise.all(
      gate.unresolved.map((c) => {
        const cruiseType = picks[c.key];
        if (!cruiseType || !c.shareCode) return Promise.resolve(); // no dashboard → this-print-only
        return fetch('/api/ops/orders/cruise-type', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareCode: c.shareCode, cruiseType }),
        }).catch(() => undefined);
      }),
    );
    const applied = gate.cards.map((c) =>
      picks[c.key] ? { ...c, cruiseType: picks[c.key], cruiseTypeKnown: true } : c,
    );
    setCruiseGate(null);
    view.refresh();
    await doPrintPickSheets(applied);
  }, [cruiseGate, doPrintPickSheets, view]);

  const handlePrintChecklist = useCallback(() => {
    setPrintCards([]);
    setTimeout(() => window.print(), 50);
  }, []);

  // --- Bulk actions ---

  const handleBulkFulfill = useCallback(async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Mark ${count} order${count !== 1 ? 's' : ''} as fulfilled?`)) return;

    setFulfilling(true);
    // Snapshot BEFORE refetch so the review modal survives the data reload.
    const snapshot = [...selectedOrders];
    try {
      const response = await fetch('/api/v1/admin/orders/bulk-fulfill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: snapshot.map((o) => o.id) }),
      });
      const result = await response.json();
      if (result.success) {
        if (snapshot.length > 0) {
          const checkable = new Set(
            snapshot
              .filter((o) => (o.customerPhone || o.deliveryPhone) && !o.reviewRequestSentAt)
              .map((o) => o.id),
          );
          setReviewChecked(checkable);
          setReviewModalOrders(snapshot);
        } else {
          view.clearSelection();
          view.refresh();
        }
      } else {
        alert('Failed to fulfill orders: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Bulk fulfill failed:', error);
      alert('Failed to fulfill orders');
    } finally {
      setFulfilling(false);
    }
  }, [selected, selectedOrders, view]);

  const handleSendReviewRequests = useCallback(async () => {
    const orderIds = [...reviewChecked];
    if (orderIds.length === 0) {
      setReviewModalOrders(null);
      view.clearSelection();
      view.refresh();
      return;
    }
    setSendingReviews(true);
    try {
      const response = await fetch('/api/v1/admin/orders/send-review-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`Review requests sent: ${result.data.sentCount}${result.data.skippedCount > 0 ? `, ${result.data.skippedCount} skipped` : ''}`);
      } else {
        alert('Failed to send review requests: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Send review requests failed:', error);
      alert('Failed to send review requests');
    } finally {
      setSendingReviews(false);
      setReviewModalOrders(null);
      view.clearSelection();
      view.refresh();
    }
  }, [reviewChecked, view]);

  const handleOpenReviewModal = useCallback(() => {
    if (selectedOrders.length === 0) return;
    const checkable = new Set(
      selectedOrders
        .filter((o) => (o.customerPhone || o.deliveryPhone) && !o.reviewRequestSentAt)
        .map((o) => o.id),
    );
    setReviewChecked(checkable);
    setReviewModalOrders([...selectedOrders]);
  }, [selectedOrders]);

  const handleShortage = useCallback(async () => {
    const snapshot = [...selectedOrders];
    setShortageCount(snapshot.length);
    // Prefetch authoritative pick state so the shortage list reflects what
    // other devices have updated, not just what this browser has seen.
    await Promise.all(
      snapshot.map((o) =>
        fetchChecks(o.id).then((server) => {
          if (server) cacheChecks(o.id, server);
        }),
      ),
    );
    setShortageList(buildShortageList(snapshot, loadCachedChecks));
  }, [selectedOrders]);

  const handleExportCsv = useCallback(() => {
    const all = view.allCards.flatMap((c) => c.orders);
    if (!all.length) return;
    const headers = ['Order #', 'Customer', 'Email', 'Items', 'Total', 'Status', 'Fulfillment', 'Delivery Date', 'Created'];
    const rows = all.map((o) => [
      o.orderNumber,
      o.customerName,
      o.customerEmail,
      o.itemCount,
      o.total.toFixed(2),
      o.status,
      o.fulfillmentStatus,
      formatDate(o.deliveryDate),
      formatDateTime(o.createdAt),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [view.allCards]);

  // --- Derived display bits ---

  const dashboardLabel = useMemo(() => {
    if (!view.filters.groupOrderV2Id) return null;
    const match = view.allCards.find((c) => c.dashboard?.id === view.filters.groupOrderV2Id);
    return match?.dashboard ? `${match.dashboard.name} (${match.dashboard.hostName})` : null;
  }, [view.filters.groupOrderV2Id, view.allCards]);

  const resultLabel = data
    ? data.mode === 'search'
      ? `${data.stats.range.payments} result${data.stats.range.payments === 1 ? '' : 's'}${data.truncated ? ' (truncated)' : ''}`
      : `${data.stats.range.coolers} cooler${data.stats.range.coolers === 1 ? '' : 's'} · ${data.stats.range.payments} order${data.stats.range.payments === 1 ? '' : 's'}`
    : null;

  const subtitle = data
    ? data.mode === 'search'
      ? 'Search results — all dates'
      : `${fmtDateLong(data.range.start)} – ${fmtDateLong(data.range.end)}`
    : null;

  const pickSheetMode = printCards.length > 0;

  const cardActions = {
    selected,
    onToggleOrder: view.toggleOrder,
    onSetManySelected: view.setManySelected,
    onPrintOrder: (id: string) => void handlePrintPickSheets([id]),
    onFilterByDashboard: (dashId: string) => view.setFilters({ groupOrderV2Id: dashId }),
  };

  // --- Day collapse / expand ---

  const allSectionKeys = useMemo(() => {
    const keys: string[] = [];
    if (data?.overdue) keys.push('overdue');
    for (const d of data?.days ?? []) keys.push(d.date);
    return keys;
  }, [data]);

  const allExpanded =
    allSectionKeys.length > 0 && allSectionKeys.every((k) => expandedSections.has(k));

  const toggleAll = useCallback(() => {
    setExpandedSections(allExpanded ? new Set() : new Set(allSectionKeys));
  }, [allExpanded, allSectionKeys]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAndScroll = useCallback((sectionKey: string, cardKey: string) => {
    setExpandedSections((prev) => new Set(prev).add(sectionKey));
    // Let the day expand (cards leave the print-only wrapper) before scrolling.
    setTimeout(() => {
      document.getElementById(`cool-${cardKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  /**
   * One day (or the overdue group). Collapsed → a time-sorted tile overview;
   * expanded → the full cooler cards. The full cards always render for print,
   * so "Print checklist" stays complete regardless of what's collapsed.
   */
  const renderSection = (args: {
    key: string;
    label: string;
    variant: 'day' | 'overdue';
    cards: OrderCardData[];
    total: number;
  }): ReactElement => {
    const collapsed = !expandedSections.has(args.key);
    const sorted = [...args.cards].sort(
      (a, b) => deliveryTimeMinutes(a.deliveryTime) - deliveryTimeMinutes(b.deliveryTime),
    );
    return (
      <section key={args.key} className="break-inside-avoid-page">
        <DaySectionHeader
          label={args.label}
          variant={args.variant}
          cardCount={args.cards.length}
          total={args.total}
          orderIds={args.cards.flatMap((c) => c.orders.map((o) => o.id))}
          selected={selected}
          onSetManySelected={view.setManySelected}
          collapsed={collapsed}
          onToggleCollapse={() => toggleSection(args.key)}
          onPack={() => setPackSection({ label: args.label, cards: sorted })}
        />
        {collapsed ? (
          <>
            <DayTiles cards={sorted} onTileClick={(ck) => expandAndScroll(args.key, ck)} />
            <div className="hidden print:block">
              <CardGrid cards={sorted} {...cardActions} />
            </div>
          </>
        ) : (
          <CardGrid cards={sorted} {...cardActions} />
        )}
      </section>
    );
  };

  return (
    <>
    <div className={pickSheetMode ? 'print:hidden' : 'print:block'}>
      {/* Print-only checklist header */}
      <div className="hidden print:block pb-2 mb-2 border-b border-gray-300">
        <div className="flex items-baseline justify-between">
          <h1 className="font-heading text-xl font-bold tracking-[0.08em] text-gray-900 uppercase">
            Delivery Checklist
          </h1>
          {data && (
            <div className="text-[10px] text-gray-600">
              {fmtDateLong(data.range.start)} – {fmtDateLong(data.range.end)}
              {view.fulfillment ? ` · ${view.fulfillment.toLowerCase()}` : ' · all fulfillment states'}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <OrdersHeader
          onRefresh={view.refresh}
          refreshing={view.loading}
          onPrintChecklist={handlePrintChecklist}
          onExportCsv={handleExportCsv}
          subtitle={subtitle}
          onToggleAll={allSectionKeys.length ? toggleAll : undefined}
          allExpanded={allExpanded}
        />

        {data && <OrdersStatsStrip data={data} />}

        <OrdersFilterBar
          search={view.search}
          onSearch={view.setSearch}
          start={view.start}
          days={view.days}
          onRange={view.setRange}
          fulfillment={view.fulfillment}
          onFulfillment={view.setFulfillment}
          filters={view.filters}
          onFilters={view.setFilters}
          activeFilterCount={view.activeFilterCount}
          onOpenSheet={() => setSheetOpen(true)}
          dashboardLabel={dashboardLabel}
          resultLabel={resultLabel}
        />

        <FilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          filters={view.filters}
          onChange={view.setFilters}
          fulfillment={view.fulfillment}
          onFulfillmentChange={view.setFulfillment}
          statuses={data?.filters.statuses || []}
          deliveryTypes={data?.filters.deliveryTypes || []}
          onClearAll={() => {
            view.setFilters({ ...EMPTY_FILTERS });
            view.setFulfillment('UNFULFILLED');
          }}
        />

        {view.error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 print:hidden" role="alert">
            <strong className="font-semibold">Failed to load:</strong> {view.error}
          </div>
        )}

        {view.loading && !data && <LoadingSkeleton />}

        {data && data.truncated && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 print:hidden">
            Showing the first {data.mode === 'search' ? 200 : 500} orders — narrow the
            {data.mode === 'search' ? ' search' : ' date range'} to see everything.
          </div>
        )}

        {data && data.days.length === 0 && !data.overdue && (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center print:hidden">
            <p className="font-heading text-xl tracking-[0.08em] uppercase text-gray-500">
              No orders in this view
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Try a wider date range, a different fulfillment state, or clear filters.
            </p>
          </div>
        )}

        {/* Overdue section */}
        {data?.overdue &&
          renderSection({
            key: 'overdue',
            label: 'Overdue — unfulfilled',
            variant: 'overdue',
            cards: data.overdue.cards,
            total: data.overdue.total,
          })}

        {/* Day sections */}
        {data?.days.map((day) =>
          renderSection({
            key: day.date,
            label: `${day.date === todayCT() ? 'TODAY · ' : ''}${fmtDateLong(day.date)}`,
            variant: 'day',
            cards: day.cards,
            total: day.total,
          }),
        )}
      </div>

      {/* Spacer so the fixed bulk bar never covers the last card */}
      {selected.size > 0 && <div className="h-24 print:hidden" />}

      <BulkActionBar
        count={selected.size}
        fulfilling={fulfilling}
        onFulfill={handleBulkFulfill}
        onPrint={() => void handlePrintPickSheets([...selected])}
        onShortage={() => void handleShortage()}
        onReviews={handleOpenReviewModal}
        showReviews={view.filters.reviewSent === 'unsent'}
        onClear={view.clearSelection}
      />

      {reviewModalOrders && (
        <ReviewRequestModal
          orders={reviewModalOrders}
          checked={reviewChecked}
          onToggle={(orderId) => {
            setReviewChecked((prev) => {
              const next = new Set(prev);
              if (next.has(orderId)) next.delete(orderId);
              else next.add(orderId);
              return next;
            });
          }}
          onSkip={() => {
            setReviewModalOrders(null);
            view.clearSelection();
            view.refresh();
          }}
          onSend={handleSendReviewRequests}
          sending={sendingReviews}
        />
      )}

      {shortageList && (
        <ShortageListModal
          items={shortageList}
          selectedCount={shortageCount}
          onClose={() => setShortageList(null)}
        />
      )}

      {packSection && (
        <PackModeOverlay
          label={packSection.label}
          cards={packSection.cards}
          onClose={() => setPackSection(null)}
        />
      )}

      {cruiseGate && (
        <CruiseTypeGateDialog
          cards={cruiseGate.unresolved}
          onConfirm={(picks: Record<string, CruisePick>) => void handleCruiseGateConfirm(picks)}
          onCancel={() => setCruiseGate(null)}
        />
      )}

      <style jsx global>{`
        @media print {
          @page {
            /* Match the pick-sheet margin in globals.css — two different
               @page margins fight each other in the cascade. */
            margin: 0.3in;
          }
          body {
            background: white !important;
          }
          nav {
            display: none !important;
          }
        }
      `}</style>
    </div>

    {/* Pick sheets print on their OWN surface — must be a SIBLING of the
        print:hidden screen wrapper above, never a child. A child can't
        un-hide itself once an ancestor is display:none, which is exactly
        what silently blanked pick-sheet printing after #124. */}
    {pickSheetMode && (
      <div className="hidden print:block">
        <PickSheetPrint cards={printCards} />
      </div>
    )}
    </>
  );
}

function CardGrid({
  cards,
  selected,
  onToggleOrder,
  onSetManySelected,
  onPrintOrder,
  onFilterByDashboard,
}: {
  cards: OrderCardData[];
  selected: Set<string>;
  onToggleOrder: (id: string) => void;
  onSetManySelected: (ids: string[], on: boolean) => void;
  onPrintOrder: (orderId: string) => void;
  onFilterByDashboard: (dashboardId: string) => void;
}): ReactElement {
  return (
    <div className="mt-0 grid grid-cols-1 lg:grid-cols-2 gap-3 print:grid-cols-1 print:gap-2 pt-3 print:pt-2">
      {cards.map((c) => (
        <OrderGroupCard
          key={c.key}
          htmlId={`cool-${c.key}`}
          card={c}
          selected={selected}
          onToggleOrder={onToggleOrder}
          onSetManySelected={onSetManySelected}
          onPrintOrder={onPrintOrder}
          onFilterByDashboard={onFilterByDashboard}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton(): ReactElement {
  return (
    <div className="space-y-3 print:hidden">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
