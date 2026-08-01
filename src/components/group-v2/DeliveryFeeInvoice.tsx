'use client';

import { useState, useEffect, ReactElement } from 'react';
import { createDeliveryInvoice, checkFreeShippingEligibility } from '@/lib/group-orders-v2/api-client';
import type { SubOrderFull } from '@/lib/group-orders-v2/types';

interface Props {
  shareCode: string;
  tab: SubOrderFull;
  hostParticipantId: string;
}

export default function DeliveryFeeInvoice({
  shareCode,
  tab,
  hostParticipantId,
}: Props): ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freeShippingCode, setFreeShippingCode] = useState<string | null>(null);

  useEffect(() => {
    if (tab.deliveryFeeWaived || tab.deliveryInvoice?.status === 'PAID') return;
    checkFreeShippingEligibility(shareCode, tab.id)
      .then((result) => setFreeShippingCode(result.freeShippingCode))
      .catch(() => {/* ignore - will fall back to normal pay flow */});
  }, [shareCode, tab.id, tab.deliveryFeeWaived, tab.deliveryInvoice?.status]);

  if (tab.deliveryFeeWaived) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
        Delivery fee waived for this tab.
      </div>
    );
  }

  if (tab.deliveryInvoice?.status === 'PAID') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
        Delivery fee paid (${Number(tab.deliveryInvoice.total ?? 0).toFixed(2)})
      </div>
    );
  }

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await createDeliveryInvoice(
        shareCode,
        tab.id,
        hostParticipantId
      );
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      setLoading(false);
    }
  };

  const now = new Date();
  const deliveryDate = tab.deliveryDate ? new Date(tab.deliveryDate) : null;
  // No date chosen yet → treat as far-future: not urgent, not past due.
  const hoursUntilDelivery = deliveryDate
    ? (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    : Infinity;
  const isUrgent = hoursUntilDelivery <= 24 && hoursUntilDelivery > 0;
  const isPastDue = hoursUntilDelivery <= 0;

  return (
    <div className="space-y-2">
      {freeShippingCode && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Free delivery will be auto-applied — code <span className="font-semibold">{freeShippingCode}</span> includes free shipping
        </div>
      )}
      <div className={`${
        isUrgent || isPastDue
          ? 'bg-red-50 border-red-300 border-2'
          : freeShippingCode
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
      } border rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Delivery Fee: {freeShippingCode ? (
                <><span className="line-through text-gray-400">${Number(tab.deliveryFee ?? 0).toFixed(2)}</span> <span className="text-green-600 font-semibold">$0.00</span></>
              ) : (
                `$${Number(tab.deliveryFee ?? 0).toFixed(2)}`
              )}
            </p>
            <p className="text-xs text-gray-500">
              {freeShippingCode ? 'Free delivery included with your discount.' : 'Host is responsible for the delivery fee.'}
            </p>
          </div>
          <button
            onClick={handlePay}
            disabled={loading}
            className={`px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 ${
              freeShippingCode
                ? 'bg-green-600 hover:bg-green-700'
                : isUrgent || isPastDue
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-brand-blue hover:bg-brand-blue/90'
            }`}
          >
            {loading ? 'Processing...' : freeShippingCode ? 'Claim Free Delivery' : 'Pay Delivery Fee'}
          </button>
        </div>
        {!freeShippingCode && (isUrgent || isPastDue) && (
          <p className="mt-2 text-sm font-medium text-red-700">
            {isPastDue
              ? 'Your delivery date has passed. Please pay the delivery fee immediately to reschedule.'
              : 'Your delivery is less than 24 hours away. Pay now to ensure your order is delivered on time.'}
          </p>
        )}
        {!freeShippingCode && !isUrgent && !isPastDue && (
          <p className="mt-2 text-xs text-gray-500">
            Delivery fee must be paid at least 24 hours before your delivery date or your order may not be delivered.
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
