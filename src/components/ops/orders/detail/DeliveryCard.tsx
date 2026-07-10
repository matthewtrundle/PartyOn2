import { ReactElement } from 'react';
import { formatDate } from './shared';
import type { OrderDetail } from './types';

/**
 * Read-only delivery details card: date/time tiles, address, instructions,
 * and Call / Text / Map contact actions (tel:, sms:, Google Maps deep link).
 * The edit-mode delivery form stays in the page.
 */
export default function DeliveryCard({ order }: { order: OrderDetail }): ReactElement {
  const phone = order.delivery.phone || order.customer.phone || order.customerSnapshot.phone;
  const addr = order.delivery.address;
  const mapsQuery = encodeURIComponent(
    [addr.address1, addr.address2, addr.city, addr.state, addr.zip].filter(Boolean).join(', '),
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100">
        <h2 className="font-heading font-bold text-lg tracking-[0.08em] uppercase text-gray-900">
          Delivery
        </h2>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Date</p>
            <p className="font-heading font-bold text-gray-900 text-lg leading-snug">{formatDate(order.delivery.date)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Window</p>
            <p className="font-heading font-bold text-gray-900 text-lg leading-snug">{order.delivery.time}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</p>
            <p className="text-sm font-medium text-gray-900">
              {addr.address1}
              {addr.address2 && `, ${addr.address2}`}
            </p>
            <p className="text-sm text-gray-600">
              {addr.city}, {addr.state} {addr.zip}
            </p>
          </div>
          {phone && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</p>
              <a href={`tel:${phone}`} className="text-sm text-brand-blue hover:underline font-medium">
                {phone}
              </a>
            </div>
          )}
          {order.delivery.instructions && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-800">
              <span className="font-bold">Instructions: </span>
              {order.delivery.instructions}
            </div>
          )}
        </div>

        {/* Contact actions */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-blue text-brand-blue font-heading font-bold text-[13px] tracking-[0.08em] uppercase hover:bg-blue-50 transition-colors touch-manipulation"
            >
              <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </a>
          ) : (
            <span className="min-h-[48px] inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-300 font-heading font-bold text-[13px] tracking-[0.08em] uppercase">
              Call
            </span>
          )}
          {phone ? (
            <a
              href={`sms:${phone}`}
              className="min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-blue text-brand-blue font-heading font-bold text-[13px] tracking-[0.08em] uppercase hover:bg-blue-50 transition-colors touch-manipulation"
            >
              <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Text
            </a>
          ) : (
            <span className="min-h-[48px] inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-300 font-heading font-bold text-[13px] tracking-[0.08em] uppercase">
              Text
            </span>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-blue text-brand-blue font-heading font-bold text-[13px] tracking-[0.08em] uppercase hover:bg-blue-50 transition-colors touch-manipulation"
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Map
          </a>
        </div>
      </div>
    </div>
  );
}
