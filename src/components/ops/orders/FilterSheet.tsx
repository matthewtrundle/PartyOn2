'use client';

import { ReactElement } from 'react';
import type { OrdersViewFilters } from './useOrdersView';

const RARE_FULFILLMENT = ['PARTIAL', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'FULFILLED'];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] px-4 text-sm font-semibold rounded-lg transition-colors touch-manipulation ${
        active
          ? 'bg-brand-blue text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }): ReactElement {
  return (
    <div>
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * The "More filters" panel: bottom sheet on mobile, inline dropdown panel on
 * desktop. All controls are touch-friendly pills — no <select>s.
 */
export default function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  fulfillment,
  onFulfillmentChange,
  statuses,
  deliveryTypes,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  filters: OrdersViewFilters;
  onChange: (patch: Partial<OrdersViewFilters>) => void;
  fulfillment: string;
  onFulfillmentChange: (f: string) => void;
  statuses: string[];
  deliveryTypes: string[];
  onClearAll: () => void;
}): ReactElement | null {
  if (!open) return null;

  return (
    <>
      {/* Backdrop (mobile sheet) */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={[
          'print:hidden z-50',
          // Mobile: bottom sheet
          'fixed inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl safe-area-bottom',
          // Desktop: inline panel
          'md:static md:max-h-none md:rounded-xl md:shadow-sm md:border md:border-gray-200 md:mb-3',
        ].join(' ')}
        role="dialog"
        aria-label="More filters"
      >
        {/* Drag handle (mobile only) */}
        <div className="md:hidden flex justify-center pt-2">
          <span className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-4 py-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Filters</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClearAll}
                className="min-h-[44px] px-3 text-sm font-medium text-gray-500 hover:text-gray-800 touch-manipulation"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 text-sm font-semibold text-white bg-brand-blue rounded-lg touch-manipulation"
              >
                Done
              </button>
            </div>
          </div>

          <FilterGroup label="Order status">
            <Pill active={filters.status === ''} onClick={() => onChange({ status: '' })}>All</Pill>
            {statuses.map((s) => (
              <Pill key={s} active={filters.status === s} onClick={() => onChange({ status: s })}>
                {s}
              </Pill>
            ))}
          </FilterGroup>

          <FilterGroup label="Delivery type">
            <Pill active={filters.deliveryType === ''} onClick={() => onChange({ deliveryType: '' })}>All</Pill>
            {deliveryTypes.map((t) => (
              <Pill key={t} active={filters.deliveryType === t} onClick={() => onChange({ deliveryType: t })}>
                {t}
              </Pill>
            ))}
          </FilterGroup>

          <FilterGroup label="Order type">
            <Pill active={filters.groupType === ''} onClick={() => onChange({ groupType: '' })}>All</Pill>
            <Pill active={filters.groupType === 'regular'} onClick={() => onChange({ groupType: 'regular' })}>Regular</Pill>
            <Pill active={filters.groupType === 'group'} onClick={() => onChange({ groupType: 'group' })}>Group orders</Pill>
          </FilterGroup>

          <FilterGroup label="Review requests">
            <Pill active={filters.reviewSent === ''} onClick={() => onChange({ reviewSent: '' })}>All</Pill>
            <Pill active={filters.reviewSent === 'unsent'} onClick={() => onChange({ reviewSent: 'unsent' })}>Pending review</Pill>
            <Pill active={filters.reviewSent === 'sent'} onClick={() => onChange({ reviewSent: 'sent' })}>Review sent</Pill>
          </FilterGroup>

          <FilterGroup label="More fulfillment states">
            {RARE_FULFILLMENT.map((f) => (
              <Pill key={f} active={fulfillment === f} onClick={() => onFulfillmentChange(f)}>
                {f}
              </Pill>
            ))}
          </FilterGroup>
        </div>
      </div>
    </>
  );
}
