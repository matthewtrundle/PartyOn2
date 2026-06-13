'use client';

import { ReactElement, useState } from 'react';
import Link from 'next/link';
import OrderItemsChecklist from './OrderItemsChecklist';
import { fmtMoney, getFulfillmentColor, getStatusColor } from './format';
import type { OrdersViewOrder } from '@/lib/ops/orders-view-data';

/**
 * One payer's order inside a cooler card: selection checkbox, order link,
 * status badges, contact, item list, and an expandable pick checklist.
 * Mirrors the weekly checklist sub-order block, with the interactive parts
 * hidden in print.
 */
export default function OrderSubCard({
  order,
  selected,
  onToggleSelected,
  onPrint,
  defaultExpanded = false,
  showPayerLabel = true,
}: {
  order: OrdersViewOrder;
  selected: boolean;
  onToggleSelected: () => void;
  onPrint: (orderId: string) => void;
  defaultExpanded?: boolean;
  showPayerLabel?: boolean;
}): ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contact = [order.customerPhone || order.deliveryPhone, order.customerEmail]
    .filter(Boolean)
    .join(' · ');
  const unpaid = order.financialStatus !== 'PAID';

  return (
    <div
      className={`break-inside-avoid border border-gray-300 border-l-[3px] rounded-sm bg-white px-2 py-1.5 ${
        selected ? 'border-l-blue-600 bg-blue-50/40' : 'border-l-brand-blue'
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelected}
          className="w-5 h-5 flex-shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer print:hidden touch-manipulation"
          aria-label={`Select order #${order.orderNumber}`}
        />
        <div className="flex-1 min-w-0 text-sm font-bold text-gray-900">
          {showPayerLabel && (
            <span className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mr-1.5">
              Paid by
            </span>
          )}
          <span className="break-words">{order.customerName}</span>
          <Link
            href={`/ops/orders/${order.id}`}
            className="text-xs font-mono font-semibold text-blue-600 hover:text-blue-800 ml-1.5"
          >
            #{order.orderNumber}
          </Link>
        </div>
        <span className="text-sm font-bold text-brand-blue tabular-nums whitespace-nowrap">
          {fmtMoney(order.total)}
        </span>
      </div>

      {/* Badges: status / fulfillment / unpaid / review */}
      <div className="mt-1 flex flex-wrap items-center gap-1 print:hidden">
        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getFulfillmentColor(order.fulfillmentStatus)}`}>
          {order.fulfillmentStatus}
        </span>
        {unpaid && (
          <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 ring-1 ring-red-300">
            {order.financialStatus}
          </span>
        )}
        {order.reviewRequestSentAt && (
          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Review sent
          </span>
        )}
        {order.discountCode && (
          <span className="text-xs text-green-700 font-medium">
            -{fmtMoney(order.discountAmount)} ({order.discountCode})
          </span>
        )}
      </div>

      {contact && (
        <div className="mt-0.5 text-xs text-gray-600">
          <span className="text-gray-400">☎</span> {contact}
        </div>
      )}

      {(order.deliveryInstructions || order.customerNote || order.internalNote) && (
        <div className="mt-1 space-y-1">
          {order.deliveryInstructions && (
            <div className="rounded-sm bg-yellow-50 border-l-4 border-yellow-600 px-2 py-1 text-xs text-yellow-900">
              <span className="font-bold">Notes:</span> {order.deliveryInstructions}
            </div>
          )}
          {order.customerNote && (
            <div className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-700">
              <span className="font-bold">Customer:</span> {order.customerNote}
            </div>
          )}
          {order.internalNote && (
            <div className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-700">
              <span className="font-bold">Internal:</span> {order.internalNote}
            </div>
          )}
        </div>
      )}

      {/* Item list (prints like the weekly sub-order bullets) */}
      {order.items.length > 0 && !expanded && (
        <ul className="mt-1 text-xs leading-snug list-disc pl-4 marker:text-gray-300">
          {order.items.map((it, idx) => (
            <li key={idx} className="text-gray-800">
              <span className="font-mono font-bold text-gray-900">{it.quantity}×</span> {it.title}
            </li>
          ))}
        </ul>
      )}

      {/* Expandable pick checklist */}
      {expanded && (
        <div className="mt-2">
          <OrderItemsChecklist orderId={order.id} items={order.items} refreshKey={expanded} />
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="min-h-[36px] px-2 -ml-2 text-sm font-medium text-blue-700 hover:text-blue-900 touch-manipulation"
        >
          {expanded ? 'Hide pick checklist' : 'Pick checklist'}
        </button>
        <button
          type="button"
          onClick={() => onPrint(order.id)}
          className="min-h-[36px] px-2 text-sm font-medium text-gray-600 hover:text-gray-900 touch-manipulation"
        >
          Print pick sheet
        </button>
      </div>
    </div>
  );
}
