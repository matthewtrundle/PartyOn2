'use client';

import { ReactElement } from 'react';
import type { OrderCardData } from '@/lib/ops/orders-view-data';

/**
 * Collapsed-day overview: one compact tile per cooler card, showing just the
 * delivery time and the order/group name, wrapping across the row. Cards
 * arrive pre-sorted by delivery time. Clicking a tile expands the day and
 * scrolls to that card. Screen-only — print always uses the full cards.
 */
export default function DayTiles({
  cards,
  onTileClick,
}: {
  cards: OrderCardData[];
  onTileClick: (cardKey: string) => void;
}): ReactElement {
  return (
    <div className="rounded-b-lg border border-t-0 border-gray-200 bg-white p-2 print:hidden">
      <div className="flex flex-wrap gap-2">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onTileClick(c.key)}
            title={`${c.deliveryTime || 'TBD'} · ${c.displayName}`}
            className="inline-flex items-center gap-2 max-w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 hover:border-brand-blue hover:bg-blue-50 transition-colors"
          >
            <span className="text-sm font-bold text-brand-blue tabular-nums whitespace-nowrap">
              {c.deliveryTime || 'TBD'}
            </span>
            <span className="text-sm text-gray-800 truncate max-w-[12rem]">{c.displayName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
