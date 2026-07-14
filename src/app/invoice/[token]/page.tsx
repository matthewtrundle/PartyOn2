'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import type { ReactElement } from 'react';
import { DraftOrderWithTotal, DraftOrderItem } from '@/lib/draft-orders/types';

interface InvoiceData extends DraftOrderWithTotal {
  invoiceUrl: string;
}

export default function InvoicePage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState(false);

  // 21+ acknowledgement — UNCHECKED by default (A2P 10DLC: express consent
  // must be an affirmative user action, never pre-checked). Blocks payment
  // until the customer checks it; carding at the door is the backstop.
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Discount code state
  const [discountInput, setDiscountInput] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    freeShipping: boolean;
  } | null>(null);

  // Apply discount code
  const handleApplyDiscount = async () => {
    if (!discountInput.trim() || !invoice) return;

    setDiscountLoading(true);
    setDiscountError(null);
    try {
      const response = await fetch(`/api/v1/invoice/${token}/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountInput.trim() }),
      });
      const data = await response.json();

      if (!data.success) {
        setDiscountError(data.error || 'Invalid discount code');
        return;
      }

      setAppliedDiscount({
        code: data.discountCode,
        amount: data.discountAmount,
        freeShipping: data.freeShipping,
      });
      setDiscountError(null);
    } catch {
      setDiscountError('Failed to validate discount code');
    } finally {
      setDiscountLoading(false);
    }
  };

  // Remove applied discount
  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput('');
    setDiscountError(null);
  };

  // Update item quantity
  const handleUpdateQuantity = useCallback(async (productId: string, variantId: string, newQuantity: number) => {
    if (!invoice) return;

    const updatedItems = invoice.items
      .map((item: DraftOrderItem) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.productId === productId && item.variantId === variantId
          ? newQuantity
          : item.quantity,
      }))
      .filter(item => item.quantity > 0);

    if (updatedItems.length === 0) return;

    setUpdatingItems(true);
    try {
      const response = await fetch(`/api/v1/invoice/${token}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to update items');
        return;
      }

      setInvoice(data.data);
      // Clear customer-applied discount since totals changed
      if (appliedDiscount) {
        setAppliedDiscount(null);
        setDiscountInput('');
        setDiscountError(null);
      }
    } catch {
      setError('Failed to update items');
    } finally {
      setUpdatingItems(false);
    }
  }, [invoice, token, appliedDiscount]);

  // Fetch invoice data
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`/api/v1/invoice/${token}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Invoice not found');
          return;
        }

        setInvoice(data.data);
      } catch {
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvoice();
    }
  }, [token]);

  // Handle pay now click
  const handlePayNow = async () => {
    if (!invoice) return;

    setPaymentLoading(true);
    try {
      const response = await fetch(`/api/v1/invoice/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountCode: appliedDiscount?.code || undefined,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create checkout session');
        setPaymentLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError('Failed to process payment');
      setPaymentLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }

  // Error state
  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This invoice may have expired or been cancelled.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Format date — use timeZone: 'UTC' to prevent timezone shift
  // (deliveryDate is stored as midnight UTC, local TZ conversion rolls it back a day)
  const deliveryDate = new Date(invoice.deliveryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  // Check if paid
  const isPaid = invoice.status === 'PAID' || invoice.status === 'CONVERTED';
  const isCancelled = invoice.status === 'CANCELLED';
  const isExpired = invoice.status === 'EXPIRED' || (invoice.expiresAt && new Date(invoice.expiresAt) < new Date());
  const isPayable = !isPaid && !isCancelled && !isExpired;

  // Discount calculations
  const hasBakedDiscount = Number(invoice.discountAmount) > 0;
  const customerDiscountAmount = appliedDiscount && !hasBakedDiscount ? appliedDiscount.amount : 0;
  const displayTotal = Number(invoice.total) - customerDiscountAmount;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-[#1a1a1a] rounded-t-xl text-center py-8 px-6">
          <Image
            src="/images/pod-logo-2025.png"
            alt="Party On Delivery"
            width={180}
            height={60}
            className="mx-auto mb-3"
          />
          <p className="text-white text-sm tracking-widest">PREMIUM ALCOHOL DELIVERY</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-b-xl shadow-lg overflow-hidden">
          {/* Status Banner */}
          {isPaid && (
            <div className="bg-green-500 text-white px-6 py-3 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Payment Complete</span>
            </div>
          )}
          {isCancelled && (
            <div className="bg-red-500 text-white px-6 py-3 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="font-medium">Invoice Cancelled</span>
            </div>
          )}
          {isExpired && !isPaid && !isCancelled && (
            <div className="bg-yellow-500 text-white px-6 py-3 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Invoice Expired</span>
            </div>
          )}

          {/* Customer Info */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Hi {invoice.customerName},
            </h2>
            <p className="text-gray-600">
              {isPaid
                ? 'Thank you for your payment! Your order is confirmed.'
                : 'Here\'s your invoice. Complete your payment to confirm your order.'}
            </p>
          </div>

          {/* Delivery Info */}
          <div className="p-6 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Delivery Details
            </h3>
            <div className="space-y-2 text-gray-700">
              <p><span className="font-medium">Date:</span> {deliveryDate}</p>
              <p><span className="font-medium">Time:</span> {invoice.deliveryTime}</p>
              <p>
                <span className="font-medium">Address:</span>{' '}
                {invoice.deliveryAddress}, {invoice.deliveryCity}, {invoice.deliveryState} {invoice.deliveryZip}
              </p>
              {invoice.deliveryNotes && (
                <p><span className="font-medium">Notes:</span> {invoice.deliveryNotes}</p>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Order Items
              </h3>
              {updatingItems && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="animate-spin inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></span>
                  Updating...
                </span>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-sm text-gray-500">
                    <th className="py-3 px-4 w-14"></th>
                    <th className="text-left py-3 px-4 font-medium">Item</th>
                    <th className="text-center py-3 px-4 font-medium">Qty</th>
                    <th className="text-right py-3 px-4 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: DraftOrderItem, index: number) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="py-3 px-4 w-14">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="w-10 h-10 object-cover rounded-md"
                            unoptimized
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-md" />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        {item.variantTitle && (
                          <p className="text-sm text-gray-500">{item.variantTitle}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700">
                        {isPayable ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.variantId, item.quantity - 1)}
                              disabled={updatingItems}
                              className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                            >
                              {item.quantity === 1 ? (
                                <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              )}
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.variantId, item.quantity + 1)}
                              disabled={updatingItems}
                              className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Increase quantity"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-gray-400">${item.price.toFixed(2)} each</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount Code Input */}
          {isPayable && !hasBakedDiscount && (
            <div className="px-6 pt-6 pb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Code
              </label>
              {appliedDiscount ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div>
                    <span className="font-medium text-green-800">{appliedDiscount.code}</span>
                    <span className="text-green-600 ml-2">-${appliedDiscount.amount.toFixed(2)} off</span>
                  </div>
                  <button
                    onClick={handleRemoveDiscount}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value.toUpperCase());
                      setDiscountError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyDiscount();
                    }}
                    placeholder="Enter code"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                  />
                  <button
                    onClick={handleApplyDiscount}
                    disabled={discountLoading || !discountInput.trim()}
                    className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {discountLoading ? 'Checking...' : 'Apply'}
                  </button>
                </div>
              )}
              {discountError && (
                <p className="mt-2 text-sm text-red-600">{discountError}</p>
              )}
            </div>
          )}

          {/* Order Total */}
          <div className="p-6 border-b border-gray-100 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {hasBakedDiscount && (
              <div className="flex justify-between text-green-600">
                <span>Discount{invoice.discountCode ? ` (${invoice.discountCode})` : ''}</span>
                <span>-${Number(invoice.discountAmount).toFixed(2)}</span>
              </div>
            )}
            {appliedDiscount && !hasBakedDiscount && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({appliedDiscount.code})</span>
                <span>-${appliedDiscount.amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Sales Tax</span>
              <span>${Number(invoice.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              {invoice.originalDeliveryFee != null && Number(invoice.originalDeliveryFee) > 0 && Number(invoice.deliveryFee) === 0 ? (
                <span>
                  <span className="line-through text-gray-400 mr-2">${Number(invoice.originalDeliveryFee).toFixed(2)}</span>
                  <span className="text-green-600 font-semibold">$0.00</span>
                </span>
              ) : (
                <span>${Number(invoice.deliveryFee).toFixed(2)}</span>
              )}
            </div>
            <div className="flex justify-between text-xl font-semibold text-gray-900 pt-4 border-t border-gray-200">
              <span>Total</span>
              <span>${displayTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Pay Button */}
          {isPayable && (
            <div className="p-6">
              {/* 21+ acknowledgement — pre-checked, customer can uncheck.
                  Replaces the old site-wide age-verification modal. */}
              <label className="flex items-start gap-2.5 mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                />
                <span className="text-sm text-gray-800 leading-snug">
                  <span className="font-semibold">
                    I&apos;m 21+ and confirm someone 21+ will be at the
                    delivery address
                  </span>{' '}
                  to accept the order and show ID.{' '}
                  <span className="text-gray-500">
                    Required — TABC rules. No ID at the door means we leave
                    with the order.
                  </span>
                </span>
              </label>
              <button
                onClick={handlePayNow}
                disabled={paymentLoading || updatingItems || !ageConfirmed}
                className="w-full py-4 bg-brand-yellow hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {paymentLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Pay ${displayTotal.toFixed(2)}</span>
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-3">
                Secure payment powered by Stripe
              </p>
            </div>
          )}

          {/* Paid confirmation */}
          {isPaid && (
            <div className="p-6 text-center">
              <p className="text-green-600 font-medium">
                Thank you! Your payment has been received.
              </p>
              <p className="text-gray-500 mt-1">
                We&apos;ll send you a confirmation email with your order details.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm">
          <p className="text-[#D4AF37]">Questions? Contact us at orders@partyondelivery.com</p>
          <p className="mt-2 text-gray-400">&copy; {new Date().getFullYear()} Party On Delivery. Austin, Texas.</p>
        </div>
      </div>
    </div>
  );
}
