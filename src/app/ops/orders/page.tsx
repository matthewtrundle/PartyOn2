'use client';

import { ReactElement, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DraftOrdersTable from '@/components/ops/DraftOrdersTable';
import UnpaidCartsTable from '@/components/ops/UnpaidCartsTable';
import NavyBand from '@/components/backend/shell/NavyBand';
import SegmentedControl from '@/components/backend/kit/SegmentedControl';
import UnifiedOrdersView from '@/components/ops/orders/UnifiedOrdersView';

type OrdersTab = 'orders' | 'invoices' | 'carts';

/**
 * Ops Orders page — thin shell around the Orders-section sub-views:
 *  - Upcoming: the unified day-grouped cooler-card view (absorbs the old flat
 *    table AND the Weekly Checklist; `?view=weekly` is kept as an alias)
 *  - Invoices: draft orders awaiting payment
 *  - Carts: dashboards with unpaid draft items
 *  - Boats: links out to /ops/boat-schedule (same segmented bar there)
 */
export default function OrdersPage(): ReactElement {
  const searchParams = useSearchParams();
  const initialView = searchParams?.get('view');
  const [view, setView] = useState<OrdersTab>(
    initialView === 'invoices' || initialView === 'carts' ? initialView : 'orders',
  );

  const initialDaysRaw = parseInt(searchParams?.get('days') || '', 10);

  return (
    <div className="bg-gray-50 min-h-screen print:bg-white">
      <NavyBand>
        <SegmentedControl
          active={view}
          onChange={(key) => setView(key as OrdersTab)}
          segments={[
            { key: 'orders', label: 'Upcoming' },
            { key: 'invoices', label: 'Invoices' },
            { key: 'carts', label: 'Carts' },
            { key: 'boats', label: 'Boats', href: '/ops/boat-schedule' },
          ]}
        />
      </NavyBand>
      <div className="px-4 py-3 md:px-6 md:py-4 print:p-0">
        <div className="mx-auto max-w-7xl space-y-3">
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
    </div>
  );
}
