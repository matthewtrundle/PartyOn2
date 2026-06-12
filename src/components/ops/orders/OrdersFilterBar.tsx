'use client';

import { ReactElement } from 'react';
import DateRangeControl from './DateRangeControl';
import type { OrdersViewFilters } from './useOrdersView';

const FULFILLMENT_SEGMENTS: Array<{ label: string; value: string }> = [
  { label: 'Open', value: 'UNFULFILLED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'All', value: '' },
];

/**
 * Always-visible filter row: search, fulfillment segmented control, date
 * range, and the "Filters" button with active count. Below it, a removable
 * chip for every non-default filter. Horizontally scrollable on mobile.
 */
export default function OrdersFilterBar({
  search,
  onSearch,
  start,
  days,
  onRange,
  fulfillment,
  onFulfillment,
  filters,
  onFilters,
  activeFilterCount,
  onOpenSheet,
  dashboardLabel,
  resultLabel,
}: {
  search: string;
  onSearch: (q: string) => void;
  start: string;
  days: number;
  onRange: (start: string, days: number) => void;
  fulfillment: string;
  onFulfillment: (f: string) => void;
  filters: OrdersViewFilters;
  onFilters: (patch: Partial<OrdersViewFilters>) => void;
  activeFilterCount: number;
  onOpenSheet: () => void;
  /** Resolved name for the active dashboard filter chip. */
  dashboardLabel: string | null;
  resultLabel: string | null;
}): ReactElement {
  const searching = !!search.trim();

  const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (filters.status) chips.push({ key: 'status', label: `Status: ${filters.status}`, onClear: () => onFilters({ status: '' }) });
  if (filters.deliveryType) chips.push({ key: 'deliveryType', label: filters.deliveryType, onClear: () => onFilters({ deliveryType: '' }) });
  if (filters.groupType) chips.push({ key: 'groupType', label: filters.groupType === 'group' ? 'Group orders' : 'Regular orders', onClear: () => onFilters({ groupType: '' }) });
  if (filters.reviewSent) chips.push({ key: 'reviewSent', label: filters.reviewSent === 'sent' ? 'Review sent' : 'Pending review', onClear: () => onFilters({ reviewSent: '' }) });
  if (filters.groupOrderV2Id) chips.push({ key: 'dash', label: `Group: ${dashboardLabel || 'selected dashboard'}`, onClear: () => onFilters({ groupOrderV2Id: '' }) });
  if (fulfillment && !FULFILLMENT_SEGMENTS.some((s) => s.value === fulfillment)) {
    chips.push({ key: 'fulfillment', label: fulfillment, onClear: () => onFulfillment('UNFULFILLED') });
  }

  return (
    <div className="print:hidden">
      {/* Row 1: search */}
      <div className="relative">
        <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search order #, name, or email…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full min-h-[44px] pl-11 pr-10 py-2 text-base border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        {searching && (
          <button
            type="button"
            onClick={() => onSearch('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-700 touch-manipulation"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Row 2: fulfillment segments + date range + Filters button (scrolls on mobile) */}
      <div className="mt-2 flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-0.5">
        <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden flex-shrink-0">
          {FULFILLMENT_SEGMENTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onFulfillment(s.value)}
              className={`h-11 px-4 text-sm font-semibold whitespace-nowrap touch-manipulation ${
                fulfillment === s.value ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <DateRangeControl start={start} days={days} onChange={onRange} disabled={searching} />

        <button
          type="button"
          onClick={onOpenSheet}
          className="relative flex-shrink-0 h-11 px-4 inline-flex items-center gap-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-brand-blue text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {resultLabel && (
          <span className="ml-auto text-sm text-gray-500 whitespace-nowrap flex-shrink-0 hidden md:inline">
            {resultLabel}
          </span>
        )}
      </div>

      {/* Row 3: active filter chips */}
      {chips.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 pl-3 pr-1 py-1 bg-teal-50 border border-teal-200 rounded-full text-sm font-medium text-teal-800"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onClear}
                className="w-7 h-7 flex items-center justify-center text-teal-600 hover:text-teal-900 font-bold touch-manipulation"
                aria-label={`Clear ${chip.label}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
