'use client';

import { ReactElement } from 'react';
import { timeOfDayAccent } from './format';
import type { OrderCardData } from '@/lib/ops/orders-view-data';

/**
 * Collapsed-day overview: compact tiles showing just delivery time + name,
 * subtly color-accented by AM/PM/EVE and pre-sorted by delivery time.
 *
 * Desktop (md+): tiles are grouped into per-time columns — orders sharing a
 * time stack vertically under that time. Mobile: a flat wrapping list of
 * time + name tiles (stacking into columns is too cramped on a phone).
 *
 * Clicking a tile expands the day and scrolls to that card. Screen-only —
 * print always uses the full cards.
 */
export default function DayTiles({
  cards,
  onTileClick,
}: {
  cards: OrderCardData[];
  onTileClick: (cardKey: string) => void;
}): ReactElement {
  // Cards arrive sorted by delivery time, so same-time cards are adjacent.
  const groups: { time: string; cards: OrderCardData[] }[] = [];
  for (const c of cards) {
    const time = c.deliveryTime || 'TBD';
    const last = groups[groups.length - 1];
    if (last && last.time === time) last.cards.push(c);
    else groups.push({ time, cards: [c] });
  }

  return (
    <div className="rounded-b-lg border border-t-0 border-gray-200 bg-white p-2 print:hidden">
      {/* Desktop: per-time columns — same-time orders stacked together */}
      <div className="hidden md:flex md:flex-wrap md:items-start gap-2">
        {groups.map((g) => (
          <div
            key={g.time}
            className={`flex flex-col gap-1 rounded-md border border-gray-200 border-l-[3px] ${timeOfDayAccent(g.time)} bg-white p-1.5`}
          >
            <div className="flex items-baseline gap-1.5 px-1">
              <span className="text-sm font-bold text-brand-blue tabular-nums whitespace-nowrap">
                {g.time}
              </span>
              {g.cards.length > 1 && (
                <span className="text-xs font-semibold text-gray-400">×{g.cards.length}</span>
              )}
            </div>
            {g.cards.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onTileClick(c.key)}
                title={c.displayName}
                className="text-left text-sm text-gray-800 rounded px-1.5 py-1 max-w-[16rem] truncate hover:bg-blue-50 hover:text-brand-blue transition-colors"
              >
                {c.displayName}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile: flat wrapping list of time + name tiles */}
      <div className="flex flex-wrap gap-2 md:hidden">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onTileClick(c.key)}
            title={`${c.deliveryTime || 'TBD'} · ${c.displayName}`}
            className={`inline-flex items-center gap-2 max-w-full rounded-md border border-gray-200 border-l-[3px] ${timeOfDayAccent(c.deliveryTime)} bg-gray-50 px-2.5 py-1.5 hover:border-brand-blue hover:bg-blue-50 transition-colors`}
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
