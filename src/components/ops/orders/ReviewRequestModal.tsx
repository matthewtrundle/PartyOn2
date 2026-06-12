'use client';

import { ReactElement } from 'react';
import type { Order } from './types';

/**
 * Post-fulfillment modal for choosing which customers get a review-request
 * text. Rows are disabled when the order has no phone or a request was
 * already sent. Extracted verbatim from the ops Orders page (Phase 1).
 */
export default function ReviewRequestModal({
  orders,
  checked,
  onToggle,
  onSkip,
  onSend,
  sending,
}: {
  orders: Order[];
  checked: Set<string>;
  onToggle: (orderId: string) => void;
  onSkip: () => void;
  onSend: () => void;
  sending: boolean;
}): ReactElement {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Send Review Requests</h3>
          <p className="text-sm text-gray-500 mt-1">Select which customers should receive a review request text.</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3 divide-y divide-gray-100">
          {orders.map((order) => {
            const phone = order.customerPhone || order.deliveryPhone;
            const hasPhone = !!phone;
            const alreadySent = !!order.reviewRequestSentAt;
            const disabled = !hasPhone || alreadySent;
            return (
              <label
                key={order.id}
                className={`flex items-center gap-3 py-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={checked.has(order.id)}
                  disabled={disabled}
                  onChange={() => onToggle(order.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">#{order.orderNumber}</span>
                    <span className="text-sm text-gray-700 truncate">{order.customerName}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {alreadySent ? 'Already sent' : hasPhone ? phone : '(No phone)'}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Skip All
          </button>
          <button
            onClick={onSend}
            disabled={sending || checked.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : `Send to ${checked.size} customer${checked.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
