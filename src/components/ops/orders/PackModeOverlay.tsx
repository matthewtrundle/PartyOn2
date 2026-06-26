'use client';

import { ReactElement, useEffect } from 'react';
import OrderItemsChecklist from './OrderItemsChecklist';
import { orderPackProgress, usePickTick } from './usePickChecks';
import type { OrderCardData } from '@/lib/ops/orders-view-data';

/**
 * Full-screen "Pack mode" for one day: every cooler/order for that day with
 * its In Stock / Packed / Short By checklist, in delivery-time order, so the
 * whole day can be packed from one screen. Checking off writes through the
 * same picks API (drives inventory) and updates the day-tile progress live.
 */
export default function PackModeOverlay({
  label,
  cards,
  onClose,
}: {
  label: string;
  cards: OrderCardData[];
  onClose: () => void;
}): ReactElement {
  usePickTick(); // live day total as items get checked off

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const day = dayProgress(cards);
  const complete = day.total > 0 && day.packed === day.total;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 print:hidden" onClick={onClose}>
      <div
        className="absolute inset-0 mx-auto flex max-w-3xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-bold uppercase tracking-[0.08em] text-gray-900 truncate">
              Pack · {label}
            </h2>
            <p className={`text-sm font-semibold ${complete ? 'text-green-700' : 'text-gray-500'}`}>
              {day.packed} / {day.total} items packed
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-primary !min-h-[44px] !py-2 !px-5">
            Done
          </button>
        </div>

        {/* Scrollable body — one section per cooler */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {cards.map((card) => (
            <PackCard key={card.key} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PackCard({ card }: { card: OrderCardData }): ReactElement {
  const prog = cardProgress(card);
  const complete = prog.total > 0 && prog.packed === prog.total;
  const multi = card.orders.length > 1;

  return (
    <section className={`rounded-lg border ${complete ? 'border-green-300' : 'border-gray-200'}`}>
      <header
        className={`flex items-baseline justify-between gap-2 rounded-t-lg border-b px-3 py-2 ${
          complete ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="min-w-0">
          <span className="text-sm font-bold text-brand-blue tabular-nums">
            {card.deliveryTime || 'TBD'}
          </span>
          <span className="mx-2 text-gray-300">·</span>
          <span className="font-heading text-base font-bold tracking-[0.02em] text-gray-900">
            {card.displayName}
          </span>
        </div>
        <span
          className={`flex-shrink-0 text-sm font-bold tabular-nums ${complete ? 'text-green-700' : 'text-gray-500'}`}
        >
          {prog.packed}/{prog.total}
        </span>
      </header>
      <div className="space-y-3 p-3">
        {card.orders.map((o) => (
          <div key={o.id}>
            {multi && (
              <div className="mb-1 text-sm font-bold text-gray-900">
                #{o.orderNumber} · {o.customerName}
              </div>
            )}
            <OrderItemsChecklist orderId={o.id} items={o.items} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Sum top-level line-item pack progress across a cooler's orders. */
function cardProgress(card: OrderCardData): { packed: number; total: number } {
  let packed = 0;
  let total = 0;
  for (const o of card.orders) {
    const p = orderPackProgress(o.id, o.items);
    packed += p.packed;
    total += p.total;
  }
  return { packed, total };
}

function dayProgress(cards: OrderCardData[]): { packed: number; total: number } {
  return cards.reduce(
    (acc, c) => {
      const p = cardProgress(c);
      acc.packed += p.packed;
      acc.total += p.total;
      return acc;
    },
    { packed: 0, total: 0 },
  );
}
