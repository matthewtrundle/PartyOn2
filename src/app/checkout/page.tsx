'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import DeliveryDateTimePicker from '@/components/checkout/DeliveryDateTimePicker';
import { useCartContext } from '@/contexts/CartContext';
import { useCustomerContext } from '@/contexts/CustomerContext';
import CustomerAuth from '@/components/CustomerAuth';
import SmsConsentCheckbox from '@/components/consent/SmsConsentCheckbox';

/** In-store pickup location — 7600 N. Lamar Blvd #A2, Austin TX 78752 */
const STORE_PICKUP_ADDRESS = {
  address1: '7600 N. Lamar Blvd',
  address2: '#A2',
  city: 'Austin',
  province: 'TX',
  zip: '78752',
  country: 'US',
} as const;

export default function CheckoutPage() {
  const { cart, customCartData, loading: cartLoading, refetchCart, updateCartFromApiResponse } = useCartContext();
  const { customer, isAuthenticated } = useCustomerContext();

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fulfillment method — delivery (default) vs in-store pickup
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
  const isPickup = fulfillmentMethod === 'pickup';

  // Delivery schedule state (inline picker)
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  
  const [billingAddress, setBillingAddress] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: 'Austin',
    state: 'TX',
    zip: '',
    country: 'US'
  });

  const [acceptTerms, setAcceptTerms] = useState(false);
  // A2P 10DLC: SMS opt-in is an affirmative action, unchecked by default and
  // NOT required to check out (consent is not a condition of purchase).
  const [smsConsent, setSmsConsent] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountFeedback, setDiscountFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [affiliatePartner, setAffiliatePartner] = useState<string | null>(null);
  const [affiliatePerk, setAffiliatePerk] = useState<string>('Free Delivery');
  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState<string>('');

  // Initialize form with customer data
  useEffect(() => {
    if (customer) {
      setBillingAddress(prev => ({
        ...prev,
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.phone || ''
      }));
    }
  }, [customer]);

  // Initialize delivery details from cart attributes (if already collected)
  useEffect(() => {
    if (cart?.attributes && !deliveryDate) {
      const getAttr = (key: string) => cart.attributes?.find((a: { key: string; value: string }) => a.key === key)?.value;

      const dateStr = getAttr('delivery_date');
      const time = getAttr('delivery_time');
      const instructions = getAttr('delivery_instructions');

      if (dateStr) {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          setDeliveryDate(parsedDate);
        }
      }
      if (time) setDeliveryTime(time);
      if (instructions) setDeliveryInstructions(instructions);
    }
  }, [cart?.attributes, deliveryDate]);

  // Pre-fill ZIP code from cart attributes
  useEffect(() => {
    if (cart?.attributes) {
      const zipAttr = cart.attributes.find((a: { key: string; value: string }) => a.key === 'delivery_zip')?.value;
      if (zipAttr && !billingAddress.zip) {
        setBillingAddress(prev => ({ ...prev, zip: zipAttr }));
      }
    }
  }, [cart?.attributes, billingAddress.zip]);

  // Check for affiliate attribution (free delivery via partner)
  useEffect(() => {
    fetch('/api/v1/affiliate/attribution', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.active) {
          setAffiliatePartner(data.data.partnerName);
          setAffiliatePerk(data.data.customerPerk || 'Free Delivery');
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  // Calculate totals - with proper null checks to prevent subtotalAmount error
  const subtotal = cart?.cost?.subtotalAmount ? parseFloat(cart.cost.subtotalAmount.amount) :
    (cart?.lines?.edges?.reduce((total, { node }) => {
      return total + (parseFloat(node.merchandise.price?.amount || '0') * (node.quantity || 0));
    }, 0) || 0);

  // Use API-calculated values from custom cart
  const deliveryFee = customCartData?.deliveryFee
    ? parseFloat(String(customCartData.deliveryFee))
    : 25;

  const tax = customCartData?.taxAmount
    ? parseFloat(String(customCartData.taxAmount))
    : subtotal * 0.0825;

  // Get discount amount from cart data
  const discountAmount = (() => {
    if (customCartData?.discountAmount) {
      const amount = parseFloat(String(customCartData.discountAmount));
      return amount || 0;
    }
    // Fallback to attributes for backward compatibility
    const attrValue = cart?.attributes?.find(a => a.key === '_discountAmount')?.value;
    if (attrValue) {
      return parseFloat(attrValue) || 0;
    }
    return 0;
  })();

  // Get applied discount code(s)
  const appliedDiscountCode = customCartData?.discountCode ?? null;
  const appliedDiscounts = customCartData?.appliedDiscounts ?? [];
  const hasFreeShipping = (affiliatePartner !== null && affiliatePerk === 'Free Delivery') || appliedDiscounts.some(d => d.type === 'FREE_SHIPPING' || d.freeShipping);

  const effectiveDeliveryFee = isPickup || hasFreeShipping ? 0 : deliveryFee;

  // Tip calculation
  const tipAmount = tipPercent !== null
    ? Math.round(subtotal * tipPercent) / 100
    : customTip
      ? parseFloat(customTip) || 0
      : 0;

  const total = subtotal + effectiveDeliveryFee + tax - Math.abs(discountAmount) + tipAmount;

  const handleApplyDiscount = async () => {
    if (!cart || !discountCode.trim()) return;

    setIsApplyingDiscount(true);
    setDiscountFeedback({ type: null, message: '' });

    try {
      const response = await fetch('/api/v1/cart/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: discountCode.trim().toUpperCase() }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setDiscountFeedback({
          type: 'error',
          message: data.error || 'Invalid or expired discount code'
        });
      } else {
        setDiscountFeedback({
          type: 'success',
          message: data.message || `Discount code "${discountCode.toUpperCase()}" applied!`
        });
        setDiscountCode('');
        if (data.data?.cart) {
          updateCartFromApiResponse(data.data.cart);
        } else {
          await refetchCart();
        }
      }
    } catch {
      setDiscountFeedback({
        type: 'error',
        message: 'Failed to apply discount code. Please try again.'
      });
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = async (codeToRemove?: string) => {
    if (!cart) return;

    try {
      const url = codeToRemove
        ? `/api/v1/cart/discount?code=${encodeURIComponent(codeToRemove)}`
        : '/api/v1/cart/discount';
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.data?.cart) {
          updateCartFromApiResponse(data.data.cart);
        } else {
          await refetchCart();
        }
        setDiscountFeedback({
          type: 'success',
          message: codeToRemove ? `Discount "${codeToRemove}" removed` : 'Discounts removed'
        });
      }
    } catch {
      setDiscountFeedback({
        type: 'error',
        message: 'Failed to remove discount code'
      });
    }
  };

  const handleProceedToPayment = async () => {
    // Validate form — name/email/phone always required; street address only for delivery
    const missingContact = !billingAddress.firstName || !billingAddress.lastName ||
      !billingAddress.email || !billingAddress.phone;
    const missingDeliveryAddress = !isPickup && (!billingAddress.address1 || !billingAddress.zip);
    if (missingContact || missingDeliveryAddress) {
      alert('Please fill in all required fields');
      return;
    }

    if (!deliveryDate || !deliveryTime) {
      alert(isPickup ? 'Please select a pickup date and time' : 'Please select a delivery date and time');
      return;
    }

    if (!acceptTerms) {
      alert('Please accept the terms and conditions');
      return;
    }

    setIsProcessingCheckout(true);
    setCheckoutError(null);

    try {
      // Save delivery info to cart — store address + isPickup flag when picking up
      const addressPayload = isPickup
        ? { ...STORE_PICKUP_ADDRESS, isPickup: true }
        : {
            address1: billingAddress.address1,
            address2: billingAddress.address2 || '',
            city: billingAddress.city,
            province: billingAddress.state,
            zip: billingAddress.zip,
            country: billingAddress.country,
          };
      const deliveryResponse = await fetch('/api/v1/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delivery',
          date: deliveryDate?.toISOString(),
          time: deliveryTime,
          address: addressPayload,
          phone: billingAddress.phone,
          instructions: deliveryInstructions,
        }),
      });

      if (!deliveryResponse.ok) {
        const data = await deliveryResponse.json();
        throw new Error(data.error || 'Failed to save delivery info');
      }

      // Create checkout session (Stripe for paid orders, direct for $0 orders)
      const { getAttribution } = await import('@/lib/analytics/attribution');
      const attribution = getAttribution();
      const checkoutResponse = await fetch('/api/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: billingAddress.email,
          customerName: `${billingAddress.firstName} ${billingAddress.lastName}`.trim(),
          customerPhone: billingAddress.phone,
          // A2P 10DLC consent proof: true only when a phone is present AND the
          // customer affirmatively checked the (unchecked-by-default) opt-in.
          smsConsent: billingAddress.phone ? smsConsent : false,
          tipAmount: tipAmount > 0 ? tipAmount : undefined,
          attribution,
        }),
      });

      const checkoutData = await checkoutResponse.json();

      if (!checkoutData.success) {
        throw new Error(checkoutData.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (checkoutData.data.checkoutUrl) {
        window.location.href = checkoutData.data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed. Please try again.');
      setIsProcessingCheckout(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }

  if (!cart || cart.lines.edges.length === 0) {
    return (
      <>
        <div className="min-h-screen pt-12">
          <div className="max-w-4xl mx-auto px-8 text-center">
            <h1 className="font-cormorant text-4xl mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">Add some products to your cart to proceed with checkout.</p>
            <Link href="/order">
              <button className="px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors">
                SHOP PRODUCTS
              </button>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-8">
          {/* Back to Cart Link */}
          <div className="mb-6">
            <Link
              href="/order"
              className="inline-flex items-center text-gray-600 hover:text-brand-yellow transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Shopping
            </Link>
          </div>

          <h1 className="font-cormorant text-4xl tracking-[0.08em] text-center mb-12">
            CHECKOUT
          </h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-8">
              {/* Group Order Info - Hidden until Stripe setup */}
              {/* {isGroupCheckout && currentGroupOrder && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                  <h3 className="font-cormorant text-xl mb-2">Group Order Checkout</h3>
                  <p className="text-gray-700">
                    You&apos;re checking out for the entire group. Total includes orders from {currentGroupOrder.participants.length} participants.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Group Code: <span className="font-mono font-bold">{currentGroupOrder.shareCode}</span>
                  </p>
                </div>
              )} */}

              {/* Customer Information */}
              <div className="bg-white p-6 border border-gray-200">
                <h2 className="font-cormorant text-2xl mb-6">Customer Information</h2>
                
                {!isAuthenticated && (
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
                    <p className="text-sm mb-3">Already have an account?</p>
                    <button 
                      onClick={() => setShowAuthModal(true)}
                      className="text-brand-yellow hover:underline text-sm"
                    >
                      Sign in for faster checkout →
                    </button>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                      FIRST NAME *
                    </label>
                    <input
                      type="text"
                      value={billingAddress.firstName}
                      onChange={(e) => setBillingAddress({...billingAddress, firstName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                      LAST NAME *
                    </label>
                    <input
                      type="text"
                      value={billingAddress.lastName}
                      onChange={(e) => setBillingAddress({...billingAddress, lastName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                      EMAIL *
                    </label>
                    <input
                      type="email"
                      value={billingAddress.email}
                      onChange={(e) => setBillingAddress({...billingAddress, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                      PHONE *
                    </label>
                    <input
                      type="tel"
                      value={billingAddress.phone}
                      onChange={(e) => setBillingAddress({...billingAddress, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* SMS opt-in — optional, unchecked by default (A2P 10DLC), paired with the phone field above */}
                <div className="mt-4">
                  <SmsConsentCheckbox
                    id="checkout-sms-consent"
                    checked={smsConsent}
                    onChange={setSmsConsent}
                  />
                </div>
              </div>

              {/* Fulfillment Method Picker */}
              <div>
                <h2 className="font-cormorant text-2xl mb-4">How would you like your order?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('delivery')}
                    className={`text-left p-5 border-2 rounded transition-colors ${
                      !isPickup
                        ? 'border-brand-yellow bg-yellow-50'
                        : 'border-gray-200 bg-white hover:border-brand-yellow'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">Deliver to me</span>
                      <span className="text-sm text-gray-600">${deliveryFee.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      We&apos;ll bring it to your door. Austin-area zip codes only.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('pickup')}
                    className={`text-left p-5 border-2 rounded transition-colors ${
                      isPickup
                        ? 'border-brand-yellow bg-yellow-50'
                        : 'border-gray-200 bg-white hover:border-brand-yellow'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">Pick up in store</span>
                      <span className="text-sm font-semibold text-green-700">FREE</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Grab it at our shop on N. Lamar. No delivery fee, no order minimum.
                    </p>
                  </button>
                </div>
              </div>

              {/* Delivery / Pickup Schedule - Inline Picker */}
              <DeliveryDateTimePicker
                selectedDate={deliveryDate}
                selectedTime={deliveryTime}
                instructions={deliveryInstructions}
                onDateChange={setDeliveryDate}
                onTimeChange={setDeliveryTime}
                onInstructionsChange={setDeliveryInstructions}
                mode={isPickup ? 'pickup' : 'delivery'}
              />

              {isPickup ? (
                <div className="bg-white p-6 border border-gray-200">
                  <h2 className="font-cormorant text-2xl mb-4">Pickup Location</h2>
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-brand-yellow flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900">Party On Delivery</p>
                      <p className="text-gray-700">
                        7600 N. Lamar Blvd #A2<br />
                        Austin, TX 78752
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Bring a photo ID. We&apos;ll have your order ready at the time you select above.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="bg-white p-6 border border-gray-200">
                <h2 className="font-cormorant text-2xl mb-6">Delivery Address</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                      STREET ADDRESS *
                    </label>
                    <input
                      type="text"
                      value={billingAddress.address1}
                      onChange={(e) => setBillingAddress({...billingAddress, address1: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                      placeholder="123 Main St"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                      APARTMENT, SUITE, ETC. (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={billingAddress.address2}
                      onChange={(e) => setBillingAddress({...billingAddress, address2: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                      placeholder="Apt 4B"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                        CITY *
                      </label>
                      <input
                        type="text"
                        value={billingAddress.city}
                        onChange={(e) => setBillingAddress({...billingAddress, city: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                        STATE *
                      </label>
                      <input
                        type="text"
                        value={billingAddress.state}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-[0.1em] text-gray-600 mb-2">
                        ZIP CODE *
                      </label>
                      <input
                        type="text"
                        value={billingAddress.zip}
                        onChange={(e) => setBillingAddress({...billingAddress, zip: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 focus:border-brand-yellow focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 p-6 border border-gray-200 sticky top-8">
                <h2 className="font-cormorant text-2xl mb-6">Order Summary</h2>
                
                {/* Cart Items */}
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {cart.lines.edges.map(({ node }) => (
                    <div key={node.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{node.merchandise.product.title}</p>
                        <p className="text-gray-600">Qty: {node.quantity}</p>
                      </div>
                      <p className="font-medium">
                        ${(parseFloat(node.merchandise.price.amount) * node.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Affiliate Attribution Banner */}
                {affiliatePartner && (
                  <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-3 rounded">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">
                      {affiliatePerk} included via {affiliatePartner}
                    </span>
                  </div>
                )}

                {/* Discount Code Section */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                      placeholder="Discount code"
                      disabled={isApplyingDiscount}
                      className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-brand-yellow"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={isApplyingDiscount || !discountCode.trim()}
                      className="px-4 py-2 bg-gray-900 text-white text-sm hover:bg-brand-yellow transition-colors disabled:opacity-50"
                    >
                      {isApplyingDiscount ? 'APPLYING...' : 'APPLY'}
                    </button>
                  </div>
                  
                  {/* Discount Feedback */}
                  {discountFeedback.type && (
                    <p className={`text-xs mt-2 ${
                      discountFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {discountFeedback.message}
                    </p>
                  )}
                  
                  {/* Applied Discounts - multi-code support */}
                  {appliedDiscounts.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {appliedDiscounts.map((d) => (
                        <div key={d.code} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-green-700">{d.code}</span>
                            <span className="text-xs text-green-600 ml-2">
                              {d.type === 'FREE_SHIPPING' ? 'Free Delivery' :
                               d.type === 'PERCENTAGE' ? `${d.amount > 0 ? `-$${d.amount.toFixed(2)}` : ''}${d.freeShipping ? ' + Free Delivery' : ''}` :
                               d.amount > 0 ? `-$${d.amount.toFixed(2)}${d.freeShipping ? ' + Free Delivery' : ''}` : d.freeShipping ? 'Free Delivery' : ''}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveDiscount(d.code)}
                            className="text-red-600 hover:text-red-700 text-sm ml-2"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Fallback for legacy single discount code */
                    appliedDiscountCode && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded">
                          <span className="text-sm text-green-700">
                            {appliedDiscountCode} ✓ Applied
                          </span>
                          <button
                            onClick={() => handleRemoveDiscount()}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Tip Section */}
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-sm font-medium text-gray-800 mb-3">
                    Show your support for the Party On crew!
                  </p>
                  <div className="flex gap-2 mb-3">
                    {[5, 10, 20].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => {
                          setTipPercent(tipPercent === pct ? null : pct);
                          setCustomTip('');
                        }}
                        className={`flex-1 py-2 text-sm font-medium border rounded transition-colors ${
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
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand-yellow"
                      />
                    </div>
                  </div>
                  {tipAmount > 0 && (
                    <p className="text-xs text-amber-700 mt-2">
                      +${tipAmount.toFixed(2)} tip added
                    </p>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{isPickup ? 'Store Pickup' : 'Delivery Fee'}</span>
                    {isPickup ? (
                      <span className="text-green-600">FREE</span>
                    ) : hasFreeShipping ? (
                      <span>
                        <span className="line-through text-gray-400 mr-1">${deliveryFee.toFixed(2)}</span>
                        <span className="text-green-600">$0.00</span>
                      </span>
                    ) : (
                      <span>${deliveryFee.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  
                  {/* Show discount amount if applied */}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${Math.abs(discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Tip amount */}
                  {tipAmount > 0 && (
                    <div className="flex justify-between text-sm text-amber-700">
                      <span>Tip</span>
                      <span>${tipAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-medium text-lg pt-4 border-t">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <label className="flex items-start gap-2 mt-6 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-brand-yellow focus:ring-brand-yellow"
                  />
                  <span className="text-gray-600">
                    I confirm I am 21+ years old and agree to the{' '}
                    <Link href="/terms" className="text-brand-yellow hover:underline">
                      terms and conditions
                    </Link>
                  </span>
                </label>

                {/* Checkout Error */}
                {checkoutError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                    {checkoutError}
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={handleProceedToPayment}
                  disabled={!acceptTerms || !deliveryDate || !deliveryTime || isProcessingCheckout}
                  className={`w-full mt-6 py-4 font-medium tracking-[0.08em] transition-colors ${
                    acceptTerms && deliveryDate && deliveryTime && !isProcessingCheckout
                      ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isProcessingCheckout ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      PROCESSING...
                    </span>
                  ) : (
                    'PROCEED TO PAYMENT'
                  )}
                </button>

                {/* Security Badge */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Secure checkout powered by Stripe
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <CustomerAuth
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectTo="/checkout"
      />

      <Footer />
    </>
  );
}