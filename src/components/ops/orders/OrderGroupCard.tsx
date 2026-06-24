'use client';

import { ReactElement, useRef } from 'react';
import OrderSubCard from './OrderSubCard';
import { fmtDateShort, fmtMoney, timeOfDayPill, typeTagClasses, cruiseLabelForCard } from './format';
import type { OrderCardData } from '@/lib/ops/orders-view-data';

/**
 * Unified cooler card — the weekly checklist's CoolerCard with selection and
 * order-level actions layered in. One card per dashboard delivery slot (or
 * per solo order). Prints as-is, with interactive parts `print:hidden`.
 */
export default function OrderGroupCard({
  card: c,
  selected,
  onToggleOrder,
  onSetManySelected,
  onPrintOrder,
  onFilterByDashboard,
  htmlId,
}: {
  card: OrderCardData;
  selected: Set<string>;
  onToggleOrder: (id: string) => void;
  onSetManySelected: (ids: string[], on: boolean) => void;
  onPrintOrder: (orderId: string) => void;
  onFilterByDashboard: (dashboardId: string) => void;
  /** DOM id used as a scroll target when a collapsed-day tile is clicked. */
  htmlId?: string;
}): ReactElement {
  const pill = timeOfDayPill(c.deliveryTime);
  // Cruise label is gated: only a marina delivery that's matched on the boat
  // manifest counts as DISCO/PRIVATE; everything else shows as HOUSE.
  const cruise = cruiseLabelForCard(c);
  const typeTag = typeTagClasses(cruise ?? 'HOUSE');
  const checkboxRef = useRef<HTMLInputElement>(null);

  const orderIds = c.orders.map((o) => o.id);
  const allSelected = orderIds.length > 0 && orderIds.every((id) => selected.has(id));
  const someSelected = orderIds.some((id) => selected.has(id));
  if (checkboxRef.current) {
    checkboxRef.current.indeterminate = someSelected && !allSelected;
  }

  const hostContact = [c.hostPhone, c.hostEmail].filter(Boolean).join(' · ');
  const multiPayer = c.orders.length > 1;
  const unpaidCount = c.orders.filter((o) => o.financialStatus !== 'PAID').length;

  return (
    <article
      id={htmlId}
      data-share-code={c.shareCode || undefined}
      className={[
        'overflow-hidden border border-gray-200 bg-white break-inside-avoid rounded-lg print:rounded-none',
        'print:border-gray-400',
        c.isVeryLarge ? 'border-l-4 border-l-orange-500' : '',
      ].join(' ')}
    >
      {/* Banner */}
      <div
        className={`px-3 md:px-4 pt-2.5 pb-2 border-b-2 border-gray-300 ${
          c.isVeryLarge
            ? 'bg-gradient-to-r from-orange-50 via-gray-50 to-gray-50'
            : 'bg-gray-50'
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-[0.08em] ${pill.cls}`}>
            {pill.label}
          </span>
          <span className="text-sm md:text-base font-bold text-gray-900 leading-none">
            {c.deliveryTime || 'TBD'}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-extrabold tracking-[0.06em] uppercase leading-none ${typeTag.cls}`}>
            {typeTag.label}
          </span>
          {c.isVeryLarge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-[0.08em] bg-orange-100 text-orange-800 ring-1 ring-orange-400">
              VERY LARGE
            </span>
          )}
          {unpaidCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-[0.08em] bg-red-100 text-red-800 ring-1 ring-red-300">
              {unpaidCount} UNPAID
            </span>
          )}
          {c.shareCode && (
            <span className="text-xs font-mono uppercase tracking-wider text-gray-500 ml-auto">
              code {c.shareCode}
              {c.extId && <span className="text-gray-400"> · Premier#{c.extId.slice(0, 12)}</span>}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="flex items-center gap-2 min-w-0">
            {/* Screen: tristate select-all; print: empty pick checkbox */}
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={allSelected}
              onChange={() => onSetManySelected(orderIds, !allSelected)}
              className="flex-shrink-0 w-6 h-6 text-blue-600 border-2 border-gray-900 rounded-sm focus:ring-blue-500 cursor-pointer print:hidden touch-manipulation"
              aria-label={`Select all orders for ${c.displayName}`}
            />
            <span
              className="hidden print:inline-block flex-shrink-0 w-5 h-5 border-2 border-gray-900 rounded-sm bg-white"
              aria-hidden="true"
            />
            <h3 className="font-heading text-xl md:text-2xl font-extrabold tracking-[0.02em] text-gray-900 leading-tight break-words">
              {c.displayName}
            </h3>
          </div>
          <span className="ml-auto font-mono text-xs font-bold tracking-[0.08em] uppercase text-brand-blue whitespace-nowrap">
            {fmtDateShort(c.deliveryDate)}
            <span className="text-gray-400 mx-1">·</span>
            {pill.label}
            <span className="text-gray-400 mx-1">·</span>
            <span className={typeTag.labelCls}>{cruise ?? 'HOUSE'}</span>
          </span>
        </div>

        {(c.groupTitle || c.dashboard) && (
          <div className="mt-1 ml-8 print:ml-7 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600">
            {c.groupTitle && (
              <span className="italic">
                <span className="not-italic font-semibold text-gray-700">Group:</span> {c.groupTitle}
              </span>
            )}
            {c.dashboard && (
              <span className="print:hidden inline-flex items-center gap-1.5">
                <a
                  href={`/dashboard/${c.dashboard.shareCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 font-medium hover:underline"
                >
                  Open dashboard ↗
                </a>
                <button
                  type="button"
                  onClick={() => onFilterByDashboard(c.dashboard!.id)}
                  className="text-teal-600 underline decoration-dotted hover:text-teal-800"
                  title="Show only orders in this group"
                >
                  filter
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body — 2 col on md+, single col on mobile, ALWAYS 2 col in print */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-3 md:gap-4 px-3 md:px-4 py-3 print:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] print:gap-3 print:px-3 print:py-2">
        {/* Left column */}
        <div className="min-w-0 flex flex-col">
          {c.isBoatish && c.manifestMatch && <ManifestOk card={c} />}
          {c.isBoatish && !c.manifestMatch && (
            <div className="text-xs font-semibold rounded-sm px-2 py-1 mb-1 bg-red-50 text-red-800 border border-red-200">
              ⚠ NOT FOUND on boat manifest — verify before loading
            </div>
          )}

          <div className="text-sm text-gray-700 leading-snug">
            <span className="text-gray-500">📍</span> {c.address || 'No address on file'}
          </div>
          {hostContact && (
            <div className="text-sm text-gray-700 leading-snug mt-0.5">
              <span className="text-gray-500">👤</span> {hostContact}
            </div>
          )}

          {c.deliveryNotes && (
            <div className="mt-2 rounded-sm bg-yellow-50 border-l-4 border-yellow-600 px-2 py-1 text-xs text-yellow-900">
              <span className="font-bold">Notes:</span> {c.deliveryNotes}
            </div>
          )}

          {/* Sub-orders: one block per payer (also the solo order's block) */}
          <div className="mt-3 pt-2 border-t border-gray-200">
            {multiPayer && (
              <h4 className="font-heading text-xs font-bold tracking-[0.1em] uppercase text-brand-blue mb-1.5">
                Sub-orders ({c.orders.length} payers)
              </h4>
            )}
            <div className="space-y-1.5">
              {c.orders.map((o) => (
                <OrderSubCard
                  key={o.id}
                  order={o}
                  selected={selected.has(o.id)}
                  onToggleSelected={() => onToggleOrder(o.id)}
                  onPrint={onPrintOrder}
                  showPayerLabel={multiPayer || o.payerDiffers}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto pt-2 border-t-2 border-brand-blue flex items-baseline justify-between font-bold">
            <span className="text-sm uppercase tracking-[0.08em] text-gray-700">Order total</span>
            <span className="text-base text-gray-900">{fmtMoney(c.total)}</span>
          </div>
        </div>

        {/* Right column — aggregated SKU list */}
        <div className="min-w-0">
          <h4 className="font-heading text-xs font-bold tracking-[0.1em] uppercase text-brand-blue mb-1">
            Cooler contents · {c.totalItems} items · {c.uniqueSkus} SKUs
          </h4>
          <ul className="text-sm print:text-xs leading-tight space-y-0.5">
            {c.aggregatedItems.map((it) => (
              <li key={it.title} className="flex gap-1.5">
                <span className="font-mono font-bold text-brand-blue tabular-nums w-8 flex-shrink-0 text-right">
                  {it.qty}×
                </span>
                <span className="text-gray-800">{it.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function ManifestOk({ card }: { card: OrderCardData }): ReactElement {
  const m = card.manifestMatch!;
  const bits: string[] = [];
  if (m.boat) bits.push(m.boat);
  if (m.timeSlot) bits.push(m.timeSlot);
  if (m.package) bits.push(m.package);
  if (m.headcount) bits.push(`${m.headcount} guests`);
  if (m.sheetTab) bits.push(m.sheetTab);
  return (
    <div className="text-xs rounded-sm px-2 py-1 mb-1 bg-emerald-50 text-emerald-900 border border-emerald-200 leading-snug">
      <span className="font-bold">✓ Boat manifest match — </span>
      {m.clientName && (
        <>
          Cruise host: <b>{m.clientName}</b>
          {bits.length > 0 ? ' · ' : ''}
        </>
      )}
      {bits.join(' · ')}
    </div>
  );
}
