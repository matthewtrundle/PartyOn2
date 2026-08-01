'use client';

import { useState, ReactElement } from 'react';
import { checkoutParticipantV2, validateGroupDiscount } from '@/lib/group-orders-v2/api-client';
import SmsConsentCheckbox from '@/components/consent/SmsConsentCheckbox';
import type { DraftCartItemView, SubOrderFull } from '@/lib/group-orders-v2/types';

interface Props {
  shareCode: string;
  tab: SubOrderFull;
  participantId: string;
  items: DraftCartItemView[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutSummaryModal({
  shareCode,
  tab,
  participantId,
  items,
  isOpen,
  onClose,
}: Props): ReactElement | null {
  const [discountCode, setDiscountCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [discountApplied, setDiscountApplied] = useState<{ code: string; type: string; value: number; discountAmount: number; freeShipping?: boolean } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [phone, setPhone] = useState('');
  // UNCHECKED by default — A2P 10DLC express consent must be an affirmative
  // user action. Optional: never gates checkout; recorded only when a phone
  // is provided.
  const [smsConsent, setSmsConsent] = useState(false);

  if (!isOpen) return null;

  const myItems = (items || []).filter((i) => i.addedBy?.id === participantId);
  const subtotal = myItems.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
  const addr = tab.deliveryAddress;

  const discountAmount = discountApplied?.discountAmount ?? 0;
  const estimatedTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyDiscount = async () => {
    const trimmed = discountCode.trim();
    if (!trimmed) return;
    setDiscountError('');
    setDiscountApplied(null);
    setApplyingDiscount(true);
    try {
      const result = await validateGroupDiscount(trimmed, subtotal);
      setDiscountApplied(result);
    } catch (err) {
      setDiscountError(err instanceof Error ? err.message : 'Invalid discount code');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountApplied(null);
    setDiscountError('');
    setDiscountCode('');
  };

  const handleCheckout = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await checkoutParticipantV2(
        shareCode,
        tab.id,
        participantId,
        discountApplied?.code || undefined,
        undefined,
        undefined,
        phone.trim() || undefined,
        smsConsent
      );
      if (!result.checkoutUrl) {
        throw new Error('No checkout URL returned');
      }
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-sans font-semibold text-gray-900">Order Summary</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Delivery info */}
        <div className="bg-whiteSoft rounded-lg p-3 mb-4 text-sm text-gray-500">
          <p className="font-medium text-gray-900">{tab.name}</p>
          <p>
            {tab.deliveryDate
              ? new Date(tab.deliveryDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                })
              : 'Date TBD'}
            {tab.deliveryTime && tab.deliveryTime !== 'TBD' ? ` at ${tab.deliveryTime}` : ''}
          </p>
          <p>
            {addr?.address1 ?? ''}{addr?.city ? `, ${addr.city}` : ''}{addr?.province ? `, ${addr.province}` : ''} {addr?.zip ?? ''}
          </p>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-gray-900">
            Your Items ({myItems.length})
          </p>
          <div className="divide-y divide-gray-100">
            {myItems.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate">{item.title}</p>
                  {item.variantTitle && (
                    <p className="text-gray-400 text-xs">{item.variantTitle}</p>
                  )}
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-gray-900">
                    ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-gray-400 text-xs">
                      {item.quantity} x ${Number(item.price).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discount code */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discount Code (optional)
          </label>
          {discountApplied ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div className="text-sm">
                <span className="font-semibold text-green-800">{discountApplied.code}</span>
                <span className="text-green-700 ml-2">
                  {discountApplied.type === 'PERCENTAGE'
                    ? `${discountApplied.value}% off${discountApplied.freeShipping ? ' + Free delivery' : ''}`
                    : discountApplied.type === 'FREE_SHIPPING' || discountApplied.freeShipping
                    ? 'Free delivery'
                    : `-$${discountApplied.discountAmount.toFixed(2)}`}
                </span>
              </div>
              <button
                onClick={handleRemoveDiscount}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value.toUpperCase());
                  setDiscountError('');
                }}
                placeholder="Enter code"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue"
              />
              <button
                onClick={handleApplyDiscount}
                disabled={!discountCode.trim() || applyingDiscount}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applyingDiscount ? 'Applying...' : 'Apply'}
              </button>
            </div>
          )}
          {discountError && (
            <p className="text-sm text-red-600 mt-1">{discountError}</p>
          )}
        </div>

        {/* Phone + SMS opt-in — optional, unchecked (A2P 10DLC express consent).
            Neither gates checkout; Stripe still collects the order phone. */}
        <div className="mb-4">
          <label htmlFor="group-summary-phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="group-summary-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-5555"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue"
          />
          <div className="mt-2">
            <SmsConsentCheckbox
              id="group-summary-sms-consent"
              checked={smsConsent}
              onChange={setSmsConsent}
            />
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-3 mb-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-400">
            <span>Tax</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 pt-1">
            <span>Estimated Total</span>
            <span>${estimatedTotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400">
            Final total including tax will be shown on the Stripe checkout page.
          </p>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || myItems.length === 0}
          className="w-full py-3 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Redirecting to checkout...' : `Pay $${estimatedTotal.toFixed(2)}`}
        </button>

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
