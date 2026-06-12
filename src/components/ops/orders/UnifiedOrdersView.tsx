'use client';

import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import BulkActionBar from './BulkActionBar';
import DaySectionHeader from './DaySectionHeader';
import FilterSheet from './FilterSheet';
import OrderGroupCard from './OrderGroupCard';
import OrdersFilterBar from './OrdersFilterBar';
import OrdersHeader from './OrdersHeader';
import OrdersStatsStrip from './OrdersStatsStrip';
import PickSheetPrint from './print/PickSheetPrint';
import ReviewRequestModal from './ReviewRequestModal';
import ShortageListModal from './ShortageListModal';
import { buildShortageList } from './shortage';
import { EMPTY_FILTERS, useOrdersView } from './useOrdersView';
import { cacheChecks, fetchChecks, loadCachedChecks } from './usePickChecks';
import { fmtDateLong, formatDate, formatDateTime } from './format';
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
  const [printOrders, setPrintOrders] = useState<Order[]>([]);
  const [reviewModalOrders, setReviewModalOrders] = useState<Order[] | null>(null);
  const [reviewChecked, setReviewChecked] = useState<Set<string>>(new Set());
  const [sendingReviews, setSendingReviews] = useState(false);
  const [shortageList, setShortageList] = useState<ShortageRow[] | null>(null);
  const [shortageCount, setShortageCount] = useState(0);

  // Reset pick-sheet print mode after the dialog closes so subsequent
  // prints fall back to the checklist layout.
  useEffect(() => {
    const reset = (): void => setPrintOrders([]);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  const selectedOrders = useMemo<OrdersViewOrder[]>(
    () => [...selected].map((id) => view.ordersById.get(id)).filter((o): o is OrdersViewOrder => !!o),
    [selected, view.ordersById],
  );

  // --- Print paths ---

  const handlePrintPickSheets = useCallback(async (orderIds: string[]) => {
    const orders = orderIds
      .map((id) => view.ordersById.get(id))
      .filter((o): o is OrdersViewOrder => !!o);
    if (!orders.length) return;
    // Prefetch authoritative pick state into the localStorage cache before
    // the print sheet reads it, so prints reflect cross-device updates.
    await Promise.all(
      orders.map((o) =>
        fetchChecks(o.id).then((server) => {
          if (server) cacheChecks(o.id, server);
        }),
      ),
    );
    setPrintOrders(orders);
    setTimeout(() => window.print(), 100);
  }, [view.ordersById]);

  const handlePrintChecklist = useCallback(() => {
    setPrintOrders([]);
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

  const pickSheetMode = printOrders.length > 0;

  const cardActions = {
    selected,
    onToggleOrder: view.toggleOrder,
    onSetManySelected: view.setManySelected,
    onPrintOrder: (id: string) => void handlePrintPickSheets([id]),
    onFilterByDashboard: (dashId: string) => view.setFilters({ groupOrderV2Id: dashId }),
  };

  return (
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
        {data?.overdue && (
          <section className="break-inside-avoid-page">
            <DaySectionHeader
              label="Overdue — unfulfilled"
              variant="overdue"
              cardCount={data.overdue.cards.length}
              total={data.overdue.total}
              orderIds={data.overdue.cards.flatMap((c) => c.orders.map((o) => o.id))}
              selected={selected}
              onSetManySelected={view.setManySelected}
            />
            <CardGrid cards={data.overdue.cards} {...cardActions} />
          </section>
        )}

        {/* Day sections */}
        {data?.days.map((day) => (
          <section key={day.date} className="break-inside-avoid-page">
            <DaySectionHeader
              label={fmtDateLong(day.date)}
              cardCount={day.cards.length}
              total={day.total}
              orderIds={day.cards.flatMap((c) => c.orders.map((o) => o.id))}
              selected={selected}
              onSetManySelected={view.setManySelected}
            />
            <CardGrid cards={day.cards} {...cardActions} />
          </section>
        ))}
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

      {/* Pick sheets print tree (only mounts in pick-sheet mode) */}
      {pickSheetMode && (
        <div className="hidden print:block">
          <PickSheetPrint orders={printOrders} />
        </div>
      )}

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

      <style jsx global>{`
        @media print {
          @page {
            margin: 0.4in;
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
