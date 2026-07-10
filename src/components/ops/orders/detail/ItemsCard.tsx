import { ReactElement } from 'react';
import { SectionHeader } from './shared';
import type { OrderDetail } from './types';

/**
 * Read-only order items card with the pricing summary footer. Edit-mode item
 * management (product search, quantity steppers) stays in the page.
 */
export default function ItemsCard({ order }: { order: OrderDetail }): ReactElement {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <SectionHeader
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        }
        title="Order Items"
      />

      <div className="divide-y divide-gray-100">
        {order.items.map((item) => (
          <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                {item.variantTitle && item.variantTitle !== 'Default Title' && (
                  <p className="text-sm text-gray-500">{item.variantTitle}</p>
                )}
                {item.sku && (
                  <p className="text-xs text-gray-400 font-mono">SKU: {item.sku}</p>
                )}
                {item.refundedQuantity > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 rounded-full">
                    {item.refundedQuantity} returned
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {item.quantity} x ${item.price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                ${item.total.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Summary */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900 font-medium">${order.pricing.subtotal.toFixed(2)}</span>
        </div>
        {order.pricing.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Discount {order.pricing.discountCode && (
                <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded ml-2">
                  {order.pricing.discountCode}
                </span>
              )}
            </span>
            <span className="text-green-600 font-medium">-${order.pricing.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Delivery Fee</span>
          <span className="text-gray-900 font-medium">${order.pricing.deliveryFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax (8.25%)</span>
          <span className="text-gray-900 font-medium">${order.pricing.taxAmount.toFixed(2)}</span>
        </div>
        {order.pricing.tipAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tip</span>
            <span className="text-amber-600 font-medium">${order.pricing.tipAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xl font-bold pt-3 mt-3 border-t border-gray-200">
          <span>Total</span>
          <span className="text-blue-600">${order.pricing.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
