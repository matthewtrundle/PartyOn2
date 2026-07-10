import { ReactElement } from 'react';
import { getStatusColor, SectionHeader } from './shared';
import type { OrderDetail } from './types';

/** Payment info card: financial status, Stripe payment id, Shopify order ref. */
export default function PaymentCard({ order }: { order: OrderDetail }): ReactElement {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <SectionHeader
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        }
        title="Payment"
      />
      <div className="p-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Status</p>
          <span className={`inline-flex px-3 py-1.5 rounded-lg border text-sm font-semibold ${getStatusColor(order.financialStatus)}`}>
            {order.financialStatus}
          </span>
        </div>
        {order.payment.stripePaymentIntentId && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Stripe Payment ID</p>
            <p className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded break-all">
              {order.payment.stripePaymentIntentId}
            </p>
          </div>
        )}
        {order.shopify.orderId && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Shopify Order</p>
            <p className="text-sm text-gray-600">
              #{order.shopify.orderNumber}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
