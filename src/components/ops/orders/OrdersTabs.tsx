'use client';

import { ReactElement } from 'react';

export type OrdersTab = 'orders' | 'invoices' | 'carts';

const TABS: Array<{ key: OrdersTab; label: string; activeCls: string }> = [
  { key: 'orders', label: 'Orders', activeCls: 'bg-brand-blue text-white shadow-sm' },
  { key: 'invoices', label: 'Invoices', activeCls: 'bg-brand-blue text-white shadow-sm' },
  { key: 'carts', label: 'Unpaid Carts', activeCls: 'bg-orange-500 text-white shadow-sm' },
];

/** Top-level tab bar: Orders / Invoices / Unpaid Carts. 44px touch targets. */
export default function OrdersTabs({
  active,
  onChange,
}: {
  active: OrdersTab;
  onChange: (tab: OrdersTab) => void;
}): ReactElement {
  return (
    <div className="print:hidden flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`min-h-[44px] px-4 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors touch-manipulation ${
            active === t.key
              ? t.activeCls
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
