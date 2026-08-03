'use client';

import { useState, type ReactElement, type FormEvent } from 'react';
import type { DraftCartItemView, SubOrderFull, AppliedPromo } from '@/lib/group-orders-v2/types';
import {
  checkoutParticipantV2,
  checkoutAllV2,
  validateGroupDiscount,
  GroupOrdersApiError,
} from '@/lib/group-orders-v2/api-client';
import SmsConsentCheckbox from '@/components/consent/SmsConsentCheckbox';

interface Props {
  shareCode: string;
  tab: SubOrderFull;
  participantId: string;
  mode: 'mine' | 'all';
  items: DraftCartItemView[];
  appliedPromo?: AppliedPromo | null;
  participantEmail?: string | null;
  onClose: () => void;
  onOpenDeliveryDetails: () => void;
}

export default function DashboardCheckoutModal({
  shareCode,
  tab,
  participantId,
  mode,
  items,
  appliedPromo,
  participantEmail,
  onClose,
  onOpenDeliveryDetails,
}: Props): ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState(participantEmail || '');
  const [emailError, setEmailError] = useState('');
  const [phone, setPhone] = useState('');
  // UNCHECKED by default — A2P 10DLC express consent must be an affirmative
  // user action. Optional: never gates checkout; recorded only when a phone
  // is provided.
  const [smsConsent, setSmsConsent] = useState(false);

  // ─── Two checkout acknowledgements ────────────────────────────────
  // 1. Substitutions OK — pre-checked, customer can opt out. Lets ops
  //    swap similar items if the exact product runs out before delivery.
  // 2. 21+ + acceptance at door — required, unchecked by default.
  //    Customer confirms both their own age AND that an adult will be
  //    there to receive the order (we ID at the door).
  // Both flow into the backend as optional fields on the checkout call
  // (API client signature update is a follow-up — for the preview the
  // UI gates the submit so we can iterate on copy before persistence).
  const [substitutionsOk, setSubstitutionsOk] = useState(true);
  // UNCHECKED by default (A2P 10DLC: express consent must be an affirmative
  // user action, never pre-checked). The customer must check it to submit;
  // the site-wide entrance gate + carding at the door are the backstops.
  const [acceptanceConfirmed, setAcceptanceConfirmed] = useState(false);
  const [acceptanceError, setAcceptanceError] = useState('');

  // Discount -- pre-populate from dashboard promo if it's a discount type
  const [discountCode, setDiscountCode] = useState(
    appliedPromo?.type === 'discount' ? appliedPromo.code : ''
  );
  const [discountApplied, setDiscountApplied] = useState<{
    code: string;
    amount: number;
  } | null>(
    appliedPromo?.type === 'discount' && appliedPromo.discountAmount > 0
      ? { code: appliedPromo.code, amount: appliedPromo.discountAmount }
      : null
  );
  const [discountError, setDiscountError] = useState('');

  // Tip state
  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');

  const isPickup = tab.deliveryAddress?.isPickup === true;
  const hasAddress = !!tab.deliveryAddress?.address1?.trim();
  // Partner-seeded dashboards have an address from birth but no chosen date —
  // checkout must not proceed until the customer confirms one (the server
  // enforces the same rule with DELIVERY_DATE_REQUIRED).
  const hasConfirmedDate = !!(tab.deliveryDate && tab.deliveryDate !== 'TBD' && tab.deliveryDateConfirmed);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = discountApplied?.amount || 0;
  const tipAmount = tipPercent !== null
    ? Math.round(subtotal * tipPercent) / 100
    : customTip
      ? parseFloat(customTip) || 0
      : 0;
  const estimatedTotal = Math.max(0, subtotal - discountAmount + tipAmount);

  async function handleApplyDiscount() {
    if (!discountCode.trim()) return;
    setDiscountError('');
    try {
      const result = await validateGroupDiscount(discountCode.trim(), subtotal);
      setDiscountApplied({
        code: result.code,
        amount: result.discountAmount,
      });
    } catch (err) {
      setDiscountError(
        err instanceof Error ? err.message : 'Invalid discount code'
      );
    }
  }

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!hasAddress) {
      setError(isPickup ? 'Pickup details are required' : 'Delivery address is required');
      return;
    }

    if (!hasConfirmedDate) {
      setError('Please add your delivery date first');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');

    // 21+ acceptance is mandatory — we can't dispatch alcohol without it.
    if (!acceptanceConfirmed) {
      setAcceptanceError('Please confirm 21+ at delivery so we can dispatch your order.');
      return;
    }
    setAcceptanceError('');

    setLoading(true);

    try {
      const tip = tipAmount > 0 ? tipAmount : undefined;
      if (mode === 'mine') {
        const result = await checkoutParticipantV2(
          shareCode,
          tab.id,
          participantId,
          discountApplied?.code,
          tip,
          trimmedEmail,
          phone.trim() || undefined,
          smsConsent
        );
        window.location.href = result.checkoutUrl;
      } else {
        const result = await checkoutAllV2(
          shareCode,
          tab.id,
          participantId,
          discountApplied?.code,
          tip,
          trimmedEmail,
          phone.trim() || undefined,
          smsConsent
        );
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      // Server-side date gates: send the customer straight to the date picker
      // instead of leaving them on a dead error message. DELIVERY_DATE_PAST
      // is the stale-dashboard case (a date that has since gone by) and is
      // fixed the same way — by picking a new date.
      if (
        err instanceof GroupOrdersApiError &&
        (err.code === 'DELIVERY_DATE_REQUIRED' || err.code === 'DELIVERY_DATE_PAST')
      ) {
        setLoading(false);
        onClose();
        onOpenDeliveryDetails();
        return;
      }
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  }

  const deliveryDate = tab.deliveryDate && tab.deliveryDate !== 'TBD' && tab.deliveryDateConfirmed
    ? new Date(tab.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : '';
  const deliveryTime = tab.deliveryTime && tab.deliveryTime !== 'TBD' && tab.deliveryDateConfirmed ? tab.deliveryTime : '';
  const addr = tab.deliveryAddress;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-heading font-bold tracking-[0.08em] text-gray-900">
            {mode === 'mine'
              ? 'Checkout'
              : tab.purchasedItems.length > 0
                ? 'Pay for Remaining'
                : 'Pay for Everything'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleCheckout} className="px-6 py-4 space-y-4">
          {/* Items summary */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate mr-2">
                    {item.quantity}x {item.title}
                  </span>
                  <span className={`font-medium flex-shrink-0 ${item.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {item.price === 0 ? (
                      <>FREE{item.compareAtPrice != null && <span className="text-gray-400 line-through ml-1 font-normal">${item.compareAtPrice.toFixed(2)}</span>}</>
                    ) : `$${(item.price * item.quantity).toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="checkout-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="checkout-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              placeholder="you@example.com"
              className={`w-full px-3 py-2 border ${emailError ? 'border-red-300' : 'border-gray-300'} rounded-lg text-sm focus:border-brand-blue focus:ring-0 transition-all`}
            />
            {emailError && (
              <p className="text-xs text-red-600 mt-1">{emailError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">For order confirmation and updates</p>
          </div>

          {/* Phone + SMS opt-in — optional. The phone field is paired with an
              unchecked, affirmative SMS consent checkbox (A2P 10DLC). Neither
              gates checkout; Stripe still collects the order phone at payment. */}
          <div>
            <label htmlFor="checkout-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="checkout-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-brand-blue focus:ring-0 transition-all"
            />
            <div className="mt-2">
              <SmsConsentCheckbox
                id="group-checkout-sms-consent"
                checked={smsConsent}
                onChange={setSmsConsent}
              />
            </div>
          </div>

          {/* Discount code */}
          <div>
            {discountApplied ? (
              <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg">
                <span className="text-sm text-green-700 font-medium">
                  {discountApplied.code} (-${discountApplied.amount.toFixed(2)})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountApplied(null);
                    setDiscountCode('');
                    setDiscountError('');
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Discount code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-brand-blue focus:ring-0 transition-all"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
            {discountError && (
              <p className="text-xs text-red-600 mt-1">{discountError}</p>
            )}
          </div>

          {/* Tip section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-gray-800 mb-2">
              Show your support for the Party On crew!
            </p>
            <div className="flex gap-2 mb-2">
              {[5, 10, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setTipPercent(tipPercent === pct ? null : pct);
                    setCustomTip('');
                  }}
                  className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors ${
                    tipPercent === pct
                      ? 'bg-brand-yellow text-gray-900 border-brand-yellow'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-brand-yellow'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Custom:</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customTip}
                  onChange={(e) => {
                    setCustomTip(e.target.value);
                    setTipPercent(null);
                  }}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-yellow"
                />
              </div>
            </div>
            {tipAmount > 0 && (
              <p className="text-xs text-amber-700 mt-2">
                +${tipAmount.toFixed(2)} tip added
              </p>
            )}
          </div>

          {/* Delivery / Pickup details section */}
          {hasAddress && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {isPickup ? 'Pickup' : 'Delivery'}
              </p>
              {(deliveryDate || deliveryTime) && (
                <p className="text-sm text-gray-700">
                  {deliveryDate}{deliveryTime ? ` at ${deliveryTime}` : ''}
                </p>
              )}
              {addr?.address1 && (
                <p className="text-sm text-gray-700">
                  {addr.address1}{addr.address2 ? `, ${addr.address2}` : ''}{addr.city ? `, ${addr.city}` : ''}{addr.province ? `, ${addr.province}` : ''} {addr.zip || ''}
                </p>
              )}
            </div>
          )}
          {(!hasAddress || !hasConfirmedDate) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm text-amber-800 mb-2">
                {!hasAddress && !hasConfirmedDate
                  ? 'Please add your delivery date and address before checking out.'
                  : !hasConfirmedDate
                    ? 'Please add your delivery date before checking out.'
                    : 'Please fill out delivery details before checking out.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDeliveryDetails();
                }}
                className="text-sm font-semibold text-brand-blue hover:text-blue-700 transition-colors"
              >
                {!hasConfirmedDate && hasAddress ? 'Add delivery date' : 'Fill out delivery details'}
              </button>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-600">Discount</span>
                <span className="text-green-600">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm mb-1">
                <span className="text-amber-700">Tip</span>
                <span className="text-amber-700">${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{isPickup ? 'Store Pickup' : 'Delivery Fee'}</span>
              {isPickup ? (
                <span className="text-green-600 font-semibold">FREE</span>
              ) : appliedPromo?.freeDelivery ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-400 line-through">${Number(tab.deliveryFee || 40).toFixed(2)}</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </span>
              ) : (
                <span className="text-gray-500">Billed separately</span>
              )}
            </div>
            {appliedPromo?.type === 'affiliate' && appliedPromo.freeDelivery && (
              <p className="text-xs text-green-600 mb-1">
                Free delivery via partner referral -- applied at delivery billing
              </p>
            )}
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-500">Calculated at checkout</span>
            </div>
            <div className="flex justify-between text-base font-bold mt-2">
              <span>Estimated Total</span>
              <span>${estimatedTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* ─── Two acknowledgements — substitutions + 21+ acceptance ──── */}
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={substitutionsOk}
                onChange={(e) => setSubstitutionsOk(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
              />
              <span className="text-sm text-gray-800 leading-snug">
                <span className="font-semibold">Substitutions are OK</span> — if
                an item runs out before we deliver, swap it for the closest
                comparable product (same brand or same category, similar
                price).{' '}
                <span className="text-gray-500">
                  Uncheck if you only want what you ordered.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptanceConfirmed}
                onChange={(e) => {
                  setAcceptanceConfirmed(e.target.checked);
                  if (e.target.checked) setAcceptanceError('');
                }}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                required
              />
              <span className="text-sm text-gray-800 leading-snug">
                <span className="font-semibold">I&apos;m 21+ and confirm that
                someone 21+ will be at the delivery address</span> to accept
                the order and show ID.{' '}
                <span className="text-gray-500">
                  Required — TABC rules. No ID at the door means we leave
                  with the order.
                </span>
              </span>
            </label>

            {acceptanceError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {acceptanceError}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || items.length === 0 || !hasAddress || !hasConfirmedDate || !acceptanceConfirmed}
            className="w-full py-3 bg-brand-blue text-white font-semibold tracking-[0.08em] rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Continue to Payment - $${estimatedTotal.toFixed(2)}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
