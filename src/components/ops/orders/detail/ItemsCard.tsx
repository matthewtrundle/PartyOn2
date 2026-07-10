'use client';

import { ReactElement, useState } from 'react';
import OrderItemsChecklist from '../OrderItemsChecklist';
import type { OrderDetail } from './types';

/**
 * Read-only order items card with an expandable pick checklist. The
 * checklist reuses OrderItemsChecklist, so pick state shares the exact
 * TITLE-derived item keys and /api/ops/orders/[id]/picks persistence the
 * orders list uses — both surfaces see the same live progress. Edit-mode
 * item management stays in the page; the pricing summary lives in
 * PaymentCard.
 */
export default function ItemsCard({ order }: { order: OrderDetail }): ReactElement {
  const [showChecklist, setShowChecklist] = useState(false);
  const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100">
        <h2 className="font-heading font-bold text-lg tracking-[0.08em] uppercase text-gray-900">
          Items · {order.items.length}
        </h2>
        <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">{totalUnits} units</span>
      </div>

      <div className="divide-y divide-gray-100">
        {order.items.map((item) => (
          <div key={item.id} className="px-4 sm:px-6 py-3 flex items-center gap-3 min-h-[56px]">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              {item.variantTitle && item.variantTitle !== 'Default Title' && (
                <p className="text-sm text-gray-500">{item.variantTitle}</p>
              )}
              {item.refundedQuantity > 0 && (
                <span className="inline-flex items-center px-2 py-[3px] mt-1 rounded text-xs font-bold tracking-[0.05em] uppercase bg-amber-100 text-amber-800">
                  {item.refundedQuantity} returned
                </span>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-gray-900 tabular-nums">
                {item.quantity} × ${item.price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 tabular-nums">${item.total.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-6 py-2 border-t border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={() => setShowChecklist(!showChecklist)}
          className="min-h-[44px] -ml-1 px-1 text-sm font-heading font-bold tracking-[0.08em] uppercase text-brand-blue hover:text-blue-800 touch-manipulation"
        >
          {showChecklist ? 'Hide pick checklist' : 'Pick checklist'}
        </button>
        {showChecklist && (
          <div className="pb-2">
            <OrderItemsChecklist
              orderId={order.id}
              items={order.items.map((item) => ({
                quantity: item.quantity,
                title: item.title,
                bundleComponents: item.bundleComponents,
              }))}
              refreshKey={showChecklist}
            />
          </div>
        )}
      </div>
    </div>
  );
}
