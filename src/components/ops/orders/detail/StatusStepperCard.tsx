'use client';

import { ReactElement } from 'react';
import StatusStepper from '@/components/backend/kit/StatusStepper';
import HqBadge from '@/components/backend/kit/Badge';
import { getStatusColor } from './shared';
import type { OrderDetail } from './types';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const FULFILLMENT_OPTIONS = ['UNFULFILLED', 'PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
const STEPS = ['PAID', 'PACKING', 'OUT', 'DELIVERED'];

/**
 * Stepper position for an order. A step earns its checkmark when its action
 * completes: PAID from financialStatus; MARK PACKED (→ PENDING) completes
 * PACKING; MARK OUT (→ OUT_FOR_DELIVERY, IN_TRANSIT displays the same)
 * completes OUT; DELIVERED completes all four. Unpaid orders hold at PAID.
 */
export function stepperIndex(order: Pick<OrderDetail, 'financialStatus' | 'fulfillmentStatus'>): number {
  const paid = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.financialStatus);
  if (!paid) return 0;
  switch (order.fulfillmentStatus) {
    case 'DELIVERED':
      return 4;
    case 'OUT_FOR_DELIVERY':
    case 'IN_TRANSIT':
      return 3;
    case 'PENDING':
      return 2;
    default:
      return 1;
  }
}

/**
 * Order progress card: the PAID → PACKING → OUT → DELIVERED stepper (FAILED
 * renders as a red badge override), a manual-override disclosure with the
 * raw status/fulfillment selects, and the post-delivery review prompt.
 * Status writes go through the page's optimistic updateOrder handler.
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
  const unpaid = !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.financialStatus);
  const cancelled = order.status === 'CANCELLED';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6">
      {(unpaid || cancelled) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {cancelled && <HqBadge variant="red">Cancelled</HqBadge>}
          {unpaid && <HqBadge variant="amber">{order.financialStatus.replace(/_/g, ' ')}</HqBadge>}
        </div>
      )}

      <StatusStepper
        steps={STEPS}
        currentIndex={stepperIndex(order)}
        failed={order.fulfillmentStatus === 'FAILED'}
      />

      {/* Review request prompt (after marking delivered) */}
      {showReviewPrompt && !order.reviewRequestSentAt && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">
            Send review request to {order.customerSnapshot.name || order.customer.name}?
          </p>
          {(order.customerSnapshot.phone || order.customer.phone || order.delivery.phone) ? (
            <div className="flex gap-2">
              <button
                onClick={onSendReview}
                disabled={sendingReview}
                className="min-h-[36px] px-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {sendingReview ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={onDismissReview}
                className="min-h-[36px] px-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Skip
              </button>
            </div>
          ) : (
            <p className="text-sm text-blue-700">No phone number available</p>
          )}
        </div>
      )}
      {order.reviewRequestSentAt && (
        <p className="mt-3 text-sm text-gray-500">
          Review request sent {new Date(order.reviewRequestSentAt).toLocaleDateString()}
        </p>
      )}

      {/* Manual override: full status control beyond the stepper's happy path
          (CANCELLED, FAILED, reverting a mistaken advance) */}
      <details className="mt-4">
        <summary className="cursor-pointer select-none text-sm font-semibold text-gray-500 hover:text-gray-700 min-h-[36px] flex items-center touch-manipulation">
          Set status manually
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Order Status
            </label>
            <select
              value={order.status}
              onChange={(e) => onUpdateOrder({ status: e.target.value })}
              disabled={saving}
              className={`w-full px-3 py-2 rounded-lg border-2 ${getStatusColor(order.status)} text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Fulfillment
            </label>
            <select
              value={order.fulfillmentStatus}
              onChange={(e) => onUpdateOrder({ fulfillmentStatus: e.target.value })}
              disabled={saving}
              className={`w-full px-3 py-2 rounded-lg border-2 ${getStatusColor(order.fulfillmentStatus)} text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
            >
              {FULFILLMENT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </details>
    </div>
  );
}
