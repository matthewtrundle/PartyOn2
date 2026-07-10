'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HqBadge from '@/components/backend/kit/Badge';
import { formatDateTime } from './shared';
import type { OrderDetail } from './types';

/**
 * Order detail page header: back link, order number + flags, created stamp,
 * prev/next navigation, and the action button row. All handlers live in the
 * page — this component only renders.
 */
export default function DetailHeader({
  order,
  isEditing,
  canAmend,
  sendingReceipt,
  onCopySummary,
  onPrint,
  onSendReceipt,
  onOpenRefund,
  onOpenReturn,
  onEnterEdit,
  onOpenCancel,
  onCancelEdit,
}: {
  order: OrderDetail;
  isEditing: boolean;
  canAmend: boolean;
  sendingReceipt: boolean;
  onCopySummary: () => void;
  onPrint: () => void;
  onSendReceipt: () => void;
  onOpenRefund: () => void;
  onOpenReturn: () => void;
  onEnterEdit: () => void;
  onOpenCancel: () => void;
  onCancelEdit: () => void;
}): ReactElement {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <Link
          href="/ops/orders"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl tracking-[0.06em] uppercase text-gray-900">
              Order #{order.orderNumber}
            </h1>
            {order.groupOrder.isGroupOrder && (
              <HqBadge variant="blue">Group Order</HqBadge>
            )}
            {order.cruiseType && (
              <span
                className={`inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase whitespace-nowrap ${
                  order.cruiseType === 'DISCO'
                    ? 'bg-orange-500 text-white'
                    : 'bg-teal-600 text-white'
                }`}
                title={order.cruiseBoat ? `Boat: ${order.cruiseBoat}` : undefined}
              >
                {order.cruiseType === 'DISCO' ? 'Disco Cruise' : 'Private Cruise'}
                {order.cruiseBoat ? ` · ${order.cruiseBoat}` : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {order.customer.name || order.customerSnapshot.name || 'Guest'} · ${order.pricing.total.toFixed(2)} · Created {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Prev/Next Navigation */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <button
            onClick={() => order.navigation.previousOrderId && router.push(`/ops/orders/${order.navigation.previousOrderId}`)}
            disabled={!order.navigation.previousOrderId}
            className="p-2 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-r border-gray-200"
            title="Previous order (by delivery date)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => order.navigation.nextOrderId && router.push(`/ops/orders/${order.navigation.nextOrderId}`)}
            disabled={!order.navigation.nextOrderId}
            className="p-2 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next order (by delivery date)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          onClick={onCopySummary}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy Summary
        </button>

        <button
          onClick={onPrint}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>

        {order.financialStatus === 'PAID' && (
          <button
            onClick={onSendReceipt}
            disabled={sendingReceipt}
            className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {sendingReceipt ? 'Sending...' : 'Send Receipt'}
          </button>
        )}

        {order.payment.stripePaymentIntentId && (
          <button
            onClick={onOpenRefund}
            className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Issue Refund
          </button>
        )}

        {order.payment.stripePaymentIntentId && (order.status === 'DELIVERED' || order.fulfillmentStatus === 'DELIVERED') && (
          <button
            onClick={onOpenReturn}
            className="px-4 py-2 bg-white border border-orange-200 text-orange-700 rounded-lg font-medium hover:bg-orange-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
          </svg>
            Process Return
          </button>
        )}

        {canAmend && !isEditing && (
          <>
            <button
              onClick={onEnterEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Order
            </button>
            <button
              onClick={onOpenCancel}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Order
            </button>
          </>
        )}

        {isEditing && (
          <button
            onClick={onCancelEdit}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
