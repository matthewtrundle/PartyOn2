import { ReactElement } from 'react';
import { formatDate, SectionHeader } from './shared';
import type { OrderDetail } from './types';

/**
 * Read-only delivery details card: date/time, address, phone, instructions.
 * The edit-mode delivery form stays in the page (edit mode is page-owned).
 */
export default function DeliveryCard({ order }: { order: OrderDetail }): ReactElement {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <SectionHeader
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        title="Delivery Details"
      />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Delivery Date</p>
            <p className="font-bold text-gray-900 text-lg">{formatDate(order.delivery.date)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Time Window</p>
            <p className="font-bold text-gray-900 text-lg">{order.delivery.time}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Delivery Address</p>
            <p className="font-medium text-gray-900">
              {order.delivery.address.address1}
              {order.delivery.address.address2 && `, ${order.delivery.address.address2}`}
            </p>
            <p className="text-gray-600">
              {order.delivery.address.city}, {order.delivery.address.state} {order.delivery.address.zip}
            </p>
          </div>
          {order.delivery.phone && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Delivery Phone</p>
              <a href={`tel:${order.delivery.phone}`} className="text-blue-600 hover:underline font-medium">
                {order.delivery.phone}
              </a>
            </div>
          )}
          {order.delivery.instructions && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Delivery Instructions</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-gray-800">
                <svg className="w-5 h-5 text-yellow-500 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {order.delivery.instructions}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
