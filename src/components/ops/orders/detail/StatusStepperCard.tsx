'use client';

import { ReactElement } from 'react';
import { getStatusColor } from './shared';
import type { OrderDetail } from './types';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const FULFILLMENT_OPTIONS = ['UNFULFILLED', 'PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

/**
 * Order/payment/fulfillment status controls for the detail page, including
 * the post-delivery review-request prompt. Status writes go through the
 * page's updateOrder handler.
 */
export default function StatusStepperCard({
  order,
  saving,
  showReviewPrompt,
  sendingReview,
  onUpdateOrder,
  onSendReview,
  onDismissReview,
}: {
  order: OrderDetail;
  saving: boolean;
  showReviewPrompt: boolean;
  sendingReview: boolean;
  onUpdateOrder: (updates: Record<string, unknown>) => void;
  onSendReview: () => void;
  onDismissReview: () => void;
}): ReactElement {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Order Status
        </label>
        <select
          value={order.status}
          onChange={(e) => onUpdateOrder({ status: e.target.value })}
          disabled={saving}
          className={`w-full px-4 py-2.5 rounded-lg border-2 ${getStatusColor(order.status)} font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Payment Status
        </label>
        <div className={`px-4 py-2.5 rounded-lg border-2 ${getStatusColor(order.financialStatus)} font-semibold text-center`}>
          {order.financialStatus}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Fulfillment
        </label>
        <select
          value={order.fulfillmentStatus}
          onChange={(e) => onUpdateOrder({ fulfillmentStatus: e.target.value })}
          disabled={saving}
          className={`w-full px-4 py-2.5 rounded-lg border-2 ${getStatusColor(order.fulfillmentStatus)} font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
        >
          {FULFILLMENT_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Review request prompt */}
        {showReviewPrompt && !order.reviewRequestSentAt && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Send review request to {order.customerSnapshot.name || order.customer.name}?
            </p>
            {(order.customerSnapshot.phone || order.customer.phone || order.delivery.phone) ? (
              <div className="flex gap-2">
                <button
                  onClick={onSendReview}
                  disabled={sendingReview}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {sendingReview ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={onDismissReview}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Skip
                </button>
              </div>
            ) : (
              <p className="text-xs text-blue-700">No phone number available</p>
            )}
          </div>
        )}
        {order.reviewRequestSentAt && (
          <p className="mt-2 text-xs text-gray-500">
            Review request sent {new Date(order.reviewRequestSentAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
