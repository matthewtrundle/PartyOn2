'use client';

import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import { useCustomerContext } from '@/contexts/CustomerContext';
import { trackMetaEvent } from '@/components/MetaPixel';
import { trackPurchase } from '@/lib/analytics/track';

interface OrderItem {
  title: string;
  variantTitle: string | null;
  quantity: number;
  price: string | number;
  totalPrice: string | number;
}

interface DeliveryAddress {
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
}

interface OrderData {
  orderNumber: number;
  items: OrderItem[];
  subtotal: string | number;
  discountCode: string | null;
  discountAmount: string | number;
  taxAmount: string | number;
  deliveryFee: string | number;
  total: string | number;
  deliveryDate: string | null;
  deliveryTime: string | null;
  deliveryAddress: DeliveryAddress | null;
  customerName: string;
  customerEmail: string;
  appliedDiscounts?: Array<{ code: string; type: string; amount: number }>;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, refreshCustomer } = useCustomerContext();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const purchaseEventFired = useRef(false);
  const orderFetched = useRef(false);

  const fetchOrderDetails = useCallback(async (orderId: string | null, sessionId: string | null) => {
    if (orderFetched.current) return;
    orderFetched.current = true;

    try {
      let response: Response | null = null;

      if (orderId) {
        response = await fetch(`/api/v1/orders/${orderId}`);
      } else if (sessionId) {
        response = await fetch(`/api/v1/orders?session_id=${sessionId}`);
      }

      if (response?.ok) {
        const data = await response.json();
        const order = data.data?.order || data.data;
        if (order?.items) {
          setOrderData(order);
          if (order.orderNumber) {
            setOrderNumber(`PO-${order.orderNumber}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setOrderLoading(false);
    }
  }, []);

  useEffect(() => {
    const order = searchParams?.get('order');
    const orderName = searchParams?.get('order_name');
    const orderTotal = searchParams?.get('total');
    const sessionId = searchParams?.get('session_id');

    // Set order number from URL params immediately
    if (orderName) {
      setOrderNumber(orderName);
    } else if (order) {
      setOrderNumber(order);
    }

    // Fetch full order details
    fetchOrderDetails(order ?? null, sessionId ?? null);

    // Fire tracking for Stripe checkout
    async function fetchStripeSession() {
      if (sessionId) {
        try {
          const response = await fetch(`/api/v1/checkout?session_id=${sessionId}`);
          const data = await response.json();
          if (data.success && !purchaseEventFired.current) {
            purchaseEventFired.current = true;
            const amount = data.data.amountTotal ? data.data.amountTotal / 100 : 0;
            trackPurchase(sessionId, amount);
            trackMetaEvent('Purchase', {
              content_type: 'product',
              value: amount,
              currency: data.data.currency?.toUpperCase() || 'USD',
              content_name: 'Stripe Order',
            });
            if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
              const conversionId = process.env.NEXT_PUBLIC_GADS_PURCHASE_CONVERSION_ID;
              if (conversionId) {
                window.gtag('event', 'conversion', {
                  send_to: conversionId,
                  value: amount,
                  currency: data.data.currency?.toUpperCase() || 'USD',
                  transaction_id: sessionId,
                });
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch session:', error);
        }
      }
    }

    if (sessionId) {
      fetchStripeSession();
    }

    // Fire purchase tracking for non-Stripe checkouts
    if (!purchaseEventFired.current && !sessionId) {
      purchaseEventFired.current = true;
      trackPurchase(
        orderName || order || 'Unknown',
        orderTotal ? parseFloat(orderTotal) : 0
      );
      trackMetaEvent('Purchase', {
        content_type: 'product',
        value: orderTotal ? parseFloat(orderTotal) : 0,
        currency: 'USD',
        content_name: orderName || order || 'Order',
      });
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        const conversionId = process.env.NEXT_PUBLIC_GADS_PURCHASE_CONVERSION_ID;
        if (conversionId) {
          window.gtag('event', 'conversion', {
            send_to: conversionId,
            value: orderTotal ? parseFloat(orderTotal) : 0,
            currency: 'USD',
            transaction_id: orderName || order || 'Unknown',
          });
        }
      }
    }

    if (isAuthenticated) {
      refreshCustomer();
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('shopify_cart_id');
      localStorage.removeItem('cart_id');
    }
  }, [searchParams, isAuthenticated, refreshCustomer, fetchOrderDetails]);

  const fmt = (val: string | number) => {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(n) ? '0.00' : n.toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatAddress = (addr: DeliveryAddress) => {
    const parts = [addr.address1];
    if (addr.address2) parts.push(addr.address2);
    parts.push(`${addr.city || 'Austin'}, ${addr.province || 'TX'} ${addr.zip || ''}`);
    return parts;
  };

  return (
    <>
      <Navigation />

      <main className="min-h-screen">
        {/* Hero Image */}
        <div className="relative h-64 md:h-80 w-full">
          <img
            src="/images/checkout/thank-you-hero.png"
            alt="Thank you for your order"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <h1 className="font-cormorant text-5xl md:text-6xl text-white tracking-[0.08em] drop-shadow-lg">
              THANK YOU!
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 md:px-12 py-12 text-center">

          <p className="text-lg text-gray-600 mb-8">
            Your order has been successfully placed and our team is preparing your delivery.
          </p>

          {orderNumber && (
            <div className="bg-gray-50 p-6 rounded-lg mb-8 inline-block">
              <p className="text-sm tracking-[0.1em] text-gray-600 mb-2">ORDER NUMBER</p>
              <p className="font-cormorant text-2xl">{orderNumber}</p>
            </div>
          )}

          {/* Order Items */}
          {orderLoading ? (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-200 rounded w-40 mx-auto"></div>
                <div className="h-16 bg-gray-100 rounded"></div>
                <div className="h-16 bg-gray-100 rounded"></div>
              </div>
            </div>
          ) : orderData?.items && orderData.items.length > 0 ? (
            <div className="max-w-2xl mx-auto mb-8 text-left">
              <h2 className="font-cormorant text-xl mb-4 text-center">Order Summary</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {orderData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center px-5 py-4">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-gray-900 font-medium truncate">{item.title}</p>
                        {item.variantTitle && item.variantTitle !== 'Default Title' && (
                          <p className="text-sm text-gray-500">{item.variantTitle}</p>
                        )}
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-gray-900 font-medium whitespace-nowrap">
                        ${fmt(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="bg-gray-50 px-5 py-4 space-y-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>${fmt(orderData.subtotal)}</span>
                  </div>

                  {Number(orderData.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>
                        Discount
                        {orderData.appliedDiscounts && orderData.appliedDiscounts.length > 0
                          ? ` (${orderData.appliedDiscounts.map(d => d.code).join(' + ')})`
                          : orderData.discountCode
                            ? ` (${orderData.discountCode})`
                            : ''}
                      </span>
                      <span>-${fmt(orderData.discountAmount)}</span>
                    </div>
                  )}

                  {Number(orderData.deliveryFee) > 0 ? (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Delivery Fee</span>
                      <span>${fmt(orderData.deliveryFee)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Delivery Fee</span>
                      <span>FREE</span>
                    </div>
                  )}

                  {Number(orderData.taxAmount) > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax</span>
                      <span>${fmt(orderData.taxAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>${fmt(orderData.total)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              {(orderData.deliveryDate || orderData.deliveryAddress) && (
                <div className="mt-6 border border-gray-200 rounded-lg px-5 py-4">
                  <h3 className="font-cormorant text-lg mb-3">Delivery Details</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    {orderData.deliveryDate && (
                      <div className="flex items-start">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {formatDate(orderData.deliveryDate)}
                          {orderData.deliveryTime && ` at ${orderData.deliveryTime}`}
                        </span>
                      </div>
                    )}
                    {orderData.deliveryAddress && (
                      <div className="flex items-start">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          {formatAddress(orderData.deliveryAddress).map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="bg-gold/10 border border-gold/30 p-6 rounded-lg mb-8 max-w-2xl mx-auto">
            <h2 className="font-cormorant text-xl mb-3">What Happens Next?</h2>
            <ul className="text-left space-y-3 text-gray-700">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-gold mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>You&apos;ll receive an order confirmation email shortly with all the details</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-gold mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Our team will contact you 24 hours before delivery to confirm timing</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-gold mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Please have a valid ID ready for age verification upon delivery</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4 mb-8">
            {isAuthenticated ? (
              <Link
                href="/account/orders"
                className="inline-block px-8 py-3 bg-gold text-gray-900 text-sm tracking-[0.08em] hover:bg-gold/90 transition-colors"
              >
                VIEW ORDER DETAILS
              </Link>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Create an account to track your order and save time on future purchases
                </p>
                <Link
                  href="/account"
                  className="inline-block px-8 py-4 bg-yellow-400 text-gray-900 text-sm font-semibold tracking-[0.08em] rounded-lg hover:bg-yellow-500 transition-colors shadow-md"
                >
                  CREATE ACCOUNT
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/order"
            className="inline-block px-8 py-3 border border-gray-300 text-gray-700 text-sm tracking-[0.08em] hover:border-gold transition-colors"
          >
            CONTINUE SHOPPING
          </Link>

          {/* Contact Info */}
          <div className="mt-12 pt-12 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Questions about your order?</p>
            <p className="text-lg">
              Call us at{' '}
              <a href="tel:737-371-9700" className="text-gold hover:underline">
                (737) 371-9700
              </a>
              {' '}or email{' '}
              <a href="mailto:info@partyondelivery.com" className="text-gold hover:underline">
                info@partyondelivery.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Navigation forceScrolled={true} />
        <div className="pt-32 pb-16 text-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 mx-auto rounded"></div>
          </div>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
