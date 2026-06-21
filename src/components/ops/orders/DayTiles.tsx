'use client';

import { ReactElement } from 'react';
import { timeOfDayAccent } from './format';
import { orderPackProgress, usePickTick } from './usePickChecks';
import type { OrderCardData } from '@/lib/ops/orders-view-data';

/**
 * Collapsed-day overview: compact tiles showing delivery time + name, subtly
 * color-accented by AM/PM/EVE and pre-sorted by delivery time. Each tile shows
 * its pack progress (packed / total line items) and turns green when fully
 * packed — live, via usePickTick, as items get checked off anywhere.
 *
 * Desktop (md+): tiles group into per-time columns — orders sharing a time
 * stack vertically. Mobile: a flat wrapping list of time + name tiles.
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
  usePickTick(); // re-render when pick/pack state changes

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
            {g.cards.map((c) => {
              const p = cardProgress(c);
              const complete = p.total > 0 && p.packed === p.total;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onTileClick(c.key)}
                  title={c.displayName}
                  className={`flex items-center justify-between gap-2 max-w-[18rem] rounded px-1.5 py-1 text-left text-sm transition-colors ${
                    complete
                      ? 'bg-green-100 text-green-900'
                      : 'text-gray-800 hover:bg-blue-50 hover:text-brand-blue'
                  }`}
                >
                  <span className="truncate">{c.displayName}</span>
                  <PackBadge packed={p.packed} total={p.total} complete={complete} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile: flat wrapping list of time + name tiles */}
      <div className="flex flex-wrap gap-2 md:hidden">
        {cards.map((c) => {
          const p = cardProgress(c);
          const complete = p.total > 0 && p.packed === p.total;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onTileClick(c.key)}
              title={`${c.deliveryTime || 'TBD'} · ${c.displayName}`}
              className={`inline-flex items-center gap-2 max-w-full rounded-md border border-gray-200 border-l-[3px] px-2.5 py-1.5 transition-colors ${
                complete
                  ? 'border-l-green-500 bg-green-50'
                  : `${timeOfDayAccent(c.deliveryTime)} bg-gray-50 hover:border-brand-blue hover:bg-blue-50`
              }`}
            >
              <span className="text-sm font-bold text-brand-blue tabular-nums whitespace-nowrap">
                {c.deliveryTime || 'TBD'}
              </span>
              <span className="text-sm text-gray-800 truncate max-w-[12rem]">{c.displayName}</span>
              <PackBadge packed={p.packed} total={p.total} complete={complete} />
            </button>
          );
        })}
      </div>
    </div>
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

/** "3/5" while packing, a green check at 100%, hidden when there's nothing. */
function PackBadge({
  packed,
  total,
  complete,
}: {
  packed: number;
  total: number;
  complete: boolean;
}): ReactElement | null {
  if (total === 0) return null;
  if (complete) {
    return (
      <svg
        className="w-4 h-4 flex-shrink-0 text-green-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Packed"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <span
      className={`flex-shrink-0 text-xs font-bold tabular-nums ${packed > 0 ? 'text-amber-700' : 'text-gray-400'}`}
    >
      {packed}/{total}
    </span>
  );
}
