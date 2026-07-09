'use client';

import { ReactElement } from 'react';
import Link from 'next/link';

export type OrdersTab = 'orders' | 'invoices' | 'carts';

const TABS: Array<{ key: OrdersTab; label: string; activeCls: string }> = [
  { key: 'orders', label: 'Orders', activeCls: 'bg-brand-blue text-white shadow-sm' },
  { key: 'invoices', label: 'Invoices', activeCls: 'bg-brand-blue text-white shadow-sm' },
  { key: 'carts', label: 'Unpaid Carts', activeCls: 'bg-orange-500 text-white shadow-sm' },
];

const INACTIVE_CLS =
  'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300';
const BASE_CLS =
  'min-h-[44px] px-4 inline-flex items-center text-sm font-semibold rounded-lg whitespace-nowrap transition-colors touch-manipulation';

/**
 * Top-level tab bar for the Orders section: Orders / Invoices / Unpaid Carts
 * (in-page views) + Boats (links to /ops/boat-schedule). 44px touch targets.
 *
 * On /ops/orders, pass `onChange` — the three order views switch in place and
 * Boats renders as a link. On /ops/boat-schedule, pass `active="boats"` with
 * no `onChange` — the order views render as links back to /ops/orders.
 */
export default function OrdersTabs({
  active,
  onChange,
}: {
  active: OrdersTab | 'boats';
  onChange?: (tab: OrdersTab) => void;
}): ReactElement {
  return (
    <div className="print:hidden flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
      {TABS.map((t) =>
        onChange ? (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`${BASE_CLS} ${active === t.key ? t.activeCls : INACTIVE_CLS}`}
          >
            {t.label}
          </button>
        ) : (
          <Link
            key={t.key}
            href={`/ops/orders${t.key === 'orders' ? '' : `?view=${t.key}`}`}
            className={`${BASE_CLS} ${active === t.key ? t.activeCls : INACTIVE_CLS}`}
          >
            {t.label}
          </Link>
        ),
      )}
      <Link
        href="/ops/boat-schedule"
        className={`${BASE_CLS} ${
          active === 'boats' ? 'bg-brand-blue text-white shadow-sm' : INACTIVE_CLS
        }`}
      >
        Boats
      </Link>
    </div>
  );
}
