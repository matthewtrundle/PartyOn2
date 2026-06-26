'use client';

import { ReactElement } from 'react';
import ShortByStepper from './ShortByStepper';
import { usePickChecks } from './usePickChecks';
import type { OrderLineItem } from './types';

/**
 * In Stock / Packed / Short By checklist for one order's items (incl. bundle
 * components). Pick state paints from the localStorage cache and syncs via
 * /api/ops/orders/[id]/picks — identical keys + debounce as the legacy rows.
 * Interactive only — hidden in print (pick sheets render their own table).
 */
export default function OrderItemsChecklist({
  orderId,
  items,
  refreshKey,
}: {
  orderId: string;
  items: OrderLineItem[];
  refreshKey?: unknown;
}): ReactElement {
  const { checks, toggleCheck, setShortBy } = usePickChecks(orderId, refreshKey);

  return (
    <div className="print:hidden">
      <div className="flex gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        <span className="w-10 text-center">Stock</span>
        <span className="w-10 text-center">Pack</span>
        <span className="w-[104px] text-center">Short by</span>
        <span>Item</span>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item, idx) => (
          <div key={idx} className="py-0.5">
            <CheckRow
              itemKey={item.title}
              label={`${item.quantity}x ${item.title}`}
              checks={checks}
              onToggle={toggleCheck}
              onShortBy={setShortBy}
            />
            {item.bundleComponents?.map((bc, bcIdx) => (
              <CheckRow
                key={`bc-${bcIdx}`}
                itemKey={`${item.title}::${bc.title}`}
                label={`|- ${item.quantity * bc.quantity}x ${bc.title}${bc.variantTitle && bc.variantTitle !== 'Default Title' ? ` (${bc.variantTitle})` : ''}`}
                checks={checks}
                onToggle={toggleCheck}
                onShortBy={setShortBy}
                nested
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckRow({
  itemKey,
  label,
  checks,
  onToggle,
  onShortBy,
  nested = false,
}: {
  itemKey: string;
  label: string;
  checks: Record<string, { inStock?: boolean; packed?: boolean; shortBy?: number }>;
  onToggle: (itemKey: string, field: 'inStock' | 'packed') => void;
  onShortBy: (itemKey: string, value: number) => void;
  nested?: boolean;
}): ReactElement {
  const entry = checks[itemKey];
  return (
    <div className={`flex items-center gap-3 min-h-[44px] ${nested ? 'pl-3' : ''}`}>
      <label className="w-10 self-stretch flex items-center justify-center cursor-pointer touch-manipulation">
        <input
          type="checkbox"
          checked={!!entry?.inStock}
          onChange={() => onToggle(itemKey, 'inStock')}
          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
        />
      </label>
      <label className="w-10 self-stretch flex items-center justify-center cursor-pointer touch-manipulation">
        <input
          type="checkbox"
          checked={!!entry?.packed}
          onChange={() => onToggle(itemKey, 'packed')}
          className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
        />
      </label>
      <ShortByStepper value={entry?.shortBy ?? 0} onChange={(v) => onShortBy(itemKey, v)} />
      <span className={`text-sm leading-snug ${nested ? 'text-gray-500' : 'text-gray-800'}`}>{label}</span>
    </div>
  );
}
