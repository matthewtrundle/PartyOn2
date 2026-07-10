'use client';

import { ReactElement } from 'react';
import { fmtMoney } from './format';
import type { OrdersViewResponse } from '@/lib/ops/orders-view-data';

interface Tile {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}

/**
 * Stats: one horizontally-scrollable strip on mobile (scroll-snap), grid on
 * desktop. Row 1 = global business stats, row 2 = stats for the visible
 * range (cooler counts, type mix, manifest coverage). Prints like the old
 * weekly StatsGrid.
 */
export default function OrdersStatsStrip({ data }: { data: OrdersViewResponse }): ReactElement {
  const r = data.stats.range;

  // The global business tiles (today's revenue/orders, 30-day, pending)
  // moved to the Today Shift Board — this strip is range-scoped only now.
  const rangeTiles: Tile[] = [
    { label: 'Coolers', value: String(r.coolers) },
    { label: 'Payments', value: String(r.payments) },
    { label: 'Range revenue', value: fmtMoney(r.totalRevenue), accent: 'text-brand-blue' },
    { label: 'Disco', value: String(r.disco), accent: 'text-orange-600' },
    { label: 'Private', value: String(r.privateCruise), accent: 'text-teal-700' },
    { label: 'House', value: String(r.house), accent: 'text-emerald-800' },
    { label: 'Very large', value: String(r.veryLarge), accent: 'text-orange-600' },
    {
      label: 'Manifest',
      value: `${r.manifestMatched}/${r.manifestMatched + r.manifestMissing}`,
      accent: r.manifestMissing > 0 ? 'text-red-600' : 'text-emerald-700',
    },
  ];

  return <TileRow tiles={rangeTiles} />;
}

function TileRow({ tiles, printHidden = false }: { tiles: Tile[]; printHidden?: boolean }): ReactElement {
  return (
    <section
      className={[
        printHidden ? 'print:hidden' : 'print:grid print:grid-cols-8 print:gap-1',
        // Mobile: horizontal snap scroll; desktop: grid
        'flex gap-2 overflow-x-auto hide-scrollbar snap-x -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 lg:grid-cols-8 md:overflow-visible',
      ].join(' ')}
    >
      {tiles.map((t) => (
        <div
          key={t.label}
          className="snap-start flex-shrink-0 min-w-[120px] md:min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 print:rounded print:border-gray-300 print:px-2 print:py-1"
        >
          <div className={`font-heading text-xl md:text-2xl font-bold tracking-tight leading-none ${t.accent || 'text-gray-900'} print:text-base`}>
            {t.value}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-gray-500 print:text-[8px] whitespace-nowrap">
            {t.label}
            {t.sub && <span className="ml-1 normal-case tracking-normal text-gray-400">{t.sub}</span>}
          </div>
        </div>
      ))}
    </section>
  );
}
