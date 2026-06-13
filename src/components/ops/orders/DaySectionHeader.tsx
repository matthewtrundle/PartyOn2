'use client';

import { ReactElement, useRef } from 'react';
import { fmtMoney } from './format';

/**
 * Day banner: "WEDNESDAY, JUN 11 · 3 coolers · $1,234" with a tristate
 * select-all checkbox for the day's orders. `variant="overdue"` renders the
 * red past-due header.
 */
export default function DaySectionHeader({
  label,
  cardCount,
  total,
  orderIds,
  selected,
  onSetManySelected,
  variant = 'day',
}: {
  label: string;
  cardCount: number;
  total: number;
  orderIds: string[];
  selected: Set<string>;
  onSetManySelected: (ids: string[], on: boolean) => void;
  variant?: 'day' | 'overdue';
}): ReactElement {
  const ref = useRef<HTMLInputElement>(null);
  const allSelected = orderIds.length > 0 && orderIds.every((id) => selected.has(id));
  const someSelected = orderIds.some((id) => selected.has(id));
  if (ref.current) ref.current.indeterminate = someSelected && !allSelected;

  const isOverdue = variant === 'overdue';

  return (
    <div
      className={`flex items-center gap-3 rounded-t-lg px-3 py-2 text-white print:rounded-none print:py-1 ${
        isOverdue ? 'bg-red-700' : 'bg-brand-blue'
      }`}
      style={{ breakAfter: 'avoid' }}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={allSelected}
        onChange={() => onSetManySelected(orderIds, !allSelected)}
        className="w-5 h-5 flex-shrink-0 rounded border-white/60 bg-white/10 text-blue-900 focus:ring-white cursor-pointer print:hidden touch-manipulation"
        aria-label={`Select all orders for ${label}`}
      />
      <h2 className="font-heading text-lg md:text-xl font-bold tracking-[0.1em] uppercase flex-1 min-w-0">
        {isOverdue ? `⚠ ${label}` : label}
      </h2>
      <div className="text-sm font-medium opacity-90 whitespace-nowrap">
        {cardCount} cooler{cardCount === 1 ? '' : 's'} · {fmtMoney(total)}
      </div>
    </div>
  );
}
