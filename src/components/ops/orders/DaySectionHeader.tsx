'use client';

import { ReactElement, useRef } from 'react';
import { fmtMoney } from './format';

/**
 * Day banner: "WEDNESDAY, JUN 11 · 3 coolers · $1,234" with a tristate
 * select-all checkbox for the day's orders and a collapse chevron. Clicking
 * the bar toggles collapse (the checkbox stops propagation so selecting all
 * doesn't also collapse). `variant="overdue"` renders the red past-due header.
 */
export default function DaySectionHeader({
  label,
  cardCount,
  total,
  orderIds,
  selected,
  onSetManySelected,
  variant = 'day',
  collapsed = false,
  onToggleCollapse,
  onPack,
}: {
  label: string;
  cardCount: number;
  total: number;
  orderIds: string[];
  selected: Set<string>;
  onSetManySelected: (ids: string[], on: boolean) => void;
  variant?: 'day' | 'overdue';
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Opens Pack mode for this day's orders. */
  onPack?: () => void;
}): ReactElement {
  const ref = useRef<HTMLInputElement>(null);
  const allSelected = orderIds.length > 0 && orderIds.every((id) => selected.has(id));
  const someSelected = orderIds.some((id) => selected.has(id));
  if (ref.current) ref.current.indeterminate = someSelected && !allSelected;

  const isOverdue = variant === 'overdue';
  const clickable = !!onToggleCollapse;

  return (
    <div
      className={`flex items-center gap-3 rounded-t-lg px-3 py-2 text-white print:rounded-none print:py-1 ${
        isOverdue ? 'bg-red-700' : 'bg-brand-blue'
      } ${clickable ? 'cursor-pointer select-none' : ''}`}
      style={{ breakAfter: 'avoid' }}
      onClick={onToggleCollapse}
      role={clickable ? 'button' : undefined}
      aria-expanded={clickable ? !collapsed : undefined}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={allSelected}
        onChange={() => onSetManySelected(orderIds, !allSelected)}
        onClick={(e) => e.stopPropagation()}
        className="w-5 h-5 flex-shrink-0 rounded border-white/60 bg-white/10 text-blue-900 focus:ring-white cursor-pointer print:hidden touch-manipulation"
        aria-label={`Select all orders for ${label}`}
      />
      <h2 className="font-heading text-lg md:text-xl font-bold tracking-[0.1em] uppercase flex-1 min-w-0">
        {isOverdue ? `⚠ ${label}` : label}
      </h2>
      <div className="text-sm font-medium opacity-90 whitespace-nowrap">
        <span className="hidden sm:inline">
          {orderIds.length} order{orderIds.length === 1 ? '' : 's'} ·{' '}
        </span>
        {cardCount} cooler{cardCount === 1 ? '' : 's'} · {fmtMoney(total)}
      </div>
      {onPack && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPack();
          }}
          className="print:hidden inline-flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 px-2.5 py-1 text-sm font-semibold transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span>Pack</span>
        </button>
      )}
      {clickable && (
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform print:hidden ${collapsed ? '' : 'rotate-180'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </div>
  );
}
