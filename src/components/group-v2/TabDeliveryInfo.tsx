'use client';

import { ReactElement } from 'react';
import type { SubOrderFull } from '@/lib/group-orders-v2/types';

interface Props {
  tab: SubOrderFull;
  isHost?: boolean;
  onEdit?: () => void;
}

export default function TabDeliveryInfo({ tab, isHost, onEdit }: Props): ReactElement {
  const isPastDeadline = tab.orderDeadline ? new Date(tab.orderDeadline) < new Date() : false;
  const addr = tab.deliveryAddress;

  return (
    <div className="bg-whiteSoft rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-lg font-semibold text-gray-900">
            {tab.deliveryDate
              ? new Date(tab.deliveryDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                })
              : 'Date TBD'}
          </span>
          {tab.deliveryTime && tab.deliveryTime !== 'TBD' && (
            <span className="text-lg text-gray-500">at {tab.deliveryTime}</span>
          )}
          {isPastDeadline && (
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
              Past Deadline
            </span>
          )}
          {tab.status === 'LOCKED' && (
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
              Locked
            </span>
          )}
        </div>
        <p className="text-base text-gray-500">
          {addr?.address1 ?? ''}
          {addr?.address2 ? `, ${addr.address2}` : ''}
          {addr?.city ? `, ${addr.city}` : ''}
          {addr?.province ? `, ${addr.province}` : ''}{' '}
          {addr?.zip ?? ''}
        </p>
        {tab.deliveryNotes && (
          <p className="text-base text-gray-500">Notes: {tab.deliveryNotes}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {tab.orderDeadline && (
          <div className="text-base text-gray-500">
            <span>Deadline: </span>
            <span className={`font-semibold ${isPastDeadline ? 'text-red-600' : 'text-gray-900'}`}>
              {new Date(tab.orderDeadline).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
        {isHost && onEdit && tab.status === 'OPEN' && !isPastDeadline && (
          <button
            onClick={onEdit}
            className="text-base font-semibold text-gray-500 hover:text-brand-blue px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
