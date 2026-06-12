'use client';

import { ReactElement, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DraftOrdersTable from '@/components/ops/DraftOrdersTable';
import UnpaidCartsTable from '@/components/ops/UnpaidCartsTable';
import OrdersTabs, { type OrdersTab } from '@/components/ops/orders/OrdersTabs';
import UnifiedOrdersView from '@/components/ops/orders/UnifiedOrdersView';

/**
 * Ops Orders page — thin shell around three tabs:
 *  - Orders: the unified day-grouped cooler-card view (absorbs the old flat
 *    table AND the Weekly Checklist; `?view=weekly` is kept as an alias)
 *  - Invoices: draft orders awaiting payment
 *  - Unpaid Carts: dashboards with unpaid draft items
 */
export default function OrdersPage(): ReactElement {
  const searchParams = useSearchParams();
  const initialView = searchParams?.get('view');
  const [view, setView] = useState<OrdersTab>(
    initialView === 'invoices' || initialView === 'carts' ? initialView : 'orders',
  );

  const initialDaysRaw = parseInt(searchParams?.get('days') || '', 10);

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-3 md:px-6 md:py-4 print:p-0 print:bg-white">
      <div className="mx-auto max-w-7xl space-y-3">
        <OrdersTabs active={view} onChange={setView} />

        {view === 'orders' && (
          <UnifiedOrdersView
            initialGroupOrderV2Id={searchParams?.get('groupOrderV2Id') || undefined}
            initialQ={searchParams?.get('q') || undefined}
            initialStart={searchParams?.get('start') || undefined}
            initialDays={Number.isNaN(initialDaysRaw) ? undefined : initialDaysRaw}
          />
        )}
        {view === 'invoices' && <DraftOrdersTable />}
        {view === 'carts' && <UnpaidCartsTable />}
      </div>
    </div>
  );
}
