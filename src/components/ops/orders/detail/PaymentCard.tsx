import { ReactElement } from 'react';
import HqBadge, { HqBadgeVariant } from '@/components/backend/kit/Badge';
import type { OrderDetail } from './types';

function financialBadgeVariant(status: string): HqBadgeVariant {
  if (status === 'PAID') return 'green';
  if (status === 'REFUNDED' || status === 'WAIVED') return 'gray';
  if (status === 'PARTIALLY_REFUNDED' || status === 'PARTIALLY_PAID') return 'amber';
  if (status === 'INVOICE_SENT') return 'blue';
  return 'red';
}

/**
 * Payment card: financial status badge, the full pricing breakdown
 * (subtotal → total, exact amounts always), refunds to date, and the
 * Stripe/Shopify references.
 */
export default function PaymentCard({ order }: { order: OrderDetail }): ReactElement {
  const { pricing, refunds } = order;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100">
        <h2 className="font-heading font-bold text-lg tracking-[0.08em] uppercase text-gray-900">
          Payment
        </h2>
        <HqBadge variant={financialBadgeVariant(order.financialStatus)}>
          {order.financialStatus.replace(/_/g, ' ')}
        </HqBadge>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900 font-medium tabular-nums">${pricing.subtotal.toFixed(2)}</span>
          </div>
          {pricing.discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Discount
                {pricing.discountCode && (
                  <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded ml-2">
                    {pricing.discountCode}
                  </span>
                )}
              </span>
              <span className="text-green-600 font-medium tabular-nums">-${pricing.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Delivery Fee</span>
            <span className="text-gray-900 font-medium tabular-nums">${pricing.deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (8.25%)</span>
            <span className="text-gray-900 font-medium tabular-nums">${pricing.taxAmount.toFixed(2)}</span>
          </div>
          {pricing.tipAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tip</span>
              <span className="text-amber-600 font-medium tabular-nums">${pricing.tipAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-gray-200">
            <span className="font-heading font-bold text-base tracking-[0.05em] uppercase text-gray-900">Total</span>
            <span className="font-heading font-bold text-2xl text-gray-900 tabular-nums">${pricing.total.toFixed(2)}</span>
          </div>
          {refunds && refunds.totalRefunded > 0 && (
            <div className="flex justify-between text-sm pt-1">
              <span className="text-red-700 font-medium">
                Refunded ({refunds.count})
              </span>
              <span className="text-red-700 font-semibold tabular-nums">-${refunds.totalRefunded.toFixed(2)}</span>
            </div>
          )}
        </div>

        {order.payment.stripePaymentIntentId && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Stripe Payment ID</p>
            <p className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded break-all">
              {order.payment.stripePaymentIntentId}
            </p>
          </div>
        )}
        {order.shopify.orderId && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Shopify Order</p>
            <p className="text-sm text-gray-600">
              #{order.shopify.orderNumber}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
