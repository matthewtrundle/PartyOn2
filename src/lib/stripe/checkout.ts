/**
 * Stripe Checkout Service
 * Handles creating and managing Stripe Checkout sessions
 */

import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { stripe } from './client';
import { CartWithItems } from '@/lib/inventory/services/cart-service';
import { prisma } from '@/lib/database/client'; // Used for getOrCreateStripeCustomer
import { getTaxRateForZip, DEFAULT_TAX_RATE } from '@/lib/tax';
import { buildChargedLineItems, chargedLineItemToStripe } from './charge-snapshot';

/**
 * Checkout session metadata stored with Stripe
 */
export interface CheckoutMetadata {
  cartId: string;
  customerId?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryInstructions?: string;
  isExpress?: string;
  discountCode?: string;
  affiliateCode?: string;
  tipAmount?: string;

  // First-touch marketing attribution (captured on landing, forwarded by client)
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
}

/**
 * Line item for checkout
 */
export interface CheckoutLineItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  quantity: number;
  price: number; // in cents
  imageUrl?: string;
}

/**
 * Options for creating a checkout session
 */
export interface CreateCheckoutOptions {
  cart: CartWithItems;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  stripeCustomerId?: string;
  affiliateCode?: string;
  overrideDeliveryFee?: number;
  tipAmount?: number;
  attribution?: {
    landingPage?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
    referrer?: string | null;
  };
}

/**
 * Create a Stripe Checkout session from a cart
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<Stripe.Checkout.Session> {
  const { cart, successUrl, cancelUrl, customerEmail, stripeCustomerId, affiliateCode, overrideDeliveryFee, tipAmount, attribution } = options;

  // Build the immutable charge snapshot from the cart's products, then derive the Stripe
  // product line items from it so the snapshot literally equals what's charged. OrderItems are
  // later rebuilt from this snapshot (persisted on the cart below) — never from a re-read cart,
  // which is what let items added/removed after this point drift from the charge.
  const chargedLineItems = buildChargedLineItems(
    cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      title: item.product.title,
      variantTitle: item.variant.title,
      sku: item.variant.sku,
      price: item.price,
      quantity: item.quantity,
    }))
  );
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    chargedLineItems.map(chargedLineItemToStripe);

  // Add delivery fee as a line item (use override if provided, e.g. $0 for affiliate referrals)
  const deliveryFee = overrideDeliveryFee !== undefined ? overrideDeliveryFee : Number(cart.deliveryFee);
  if (deliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: cart.deliveryDate ? 'Scheduled Delivery' : 'Express Delivery',
          description: cart.deliveryDate
            ? `Delivery on ${cart.deliveryDate} at ${cart.deliveryTime || 'Scheduled time'}`
            : '3-hour express delivery',
        },
        unit_amount: Math.round(deliveryFee * 100),
      },
      quantity: 1,
    });
  }

  // Add tip as a line item if provided
  if (tipAmount && tipAmount > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Tip for the Party On Team',
        },
        unit_amount: Math.round(tipAmount * 100),
      },
      quantity: 1,
    });
  }

  // Build metadata for the session (filter out undefined values)
  const rawMetadata: CheckoutMetadata = {
    cartId: cart.id,
    customerId: cart.customerId || undefined,
    deliveryDate: cart.deliveryDate ? cart.deliveryDate.toISOString() : undefined,
    deliveryTime: cart.deliveryTime || undefined,
    deliveryAddress: cart.deliveryAddress ? JSON.stringify(cart.deliveryAddress) : undefined,
    deliveryPhone: cart.deliveryPhone || undefined,
    deliveryInstructions: cart.deliveryInstructions || undefined,
    discountCode: cart.discountCode || undefined,
    affiliateCode: affiliateCode || undefined,
    tipAmount: tipAmount && tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
    landingPage: attribution?.landingPage || undefined,
    utmSource: attribution?.utmSource || undefined,
    utmMedium: attribution?.utmMedium || undefined,
    utmCampaign: attribution?.utmCampaign || undefined,
    utmTerm: attribution?.utmTerm || undefined,
    utmContent: attribution?.utmContent || undefined,
    referrer: attribution?.referrer || undefined,
  };

  // Filter out undefined values for Stripe metadata
  const metadata: Record<string, string> = Object.fromEntries(
    Object.entries(rawMetadata).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;

  // Create checkout session params
  // Note: Shipping address is collected on our checkout page, not in Stripe
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card', 'link'],
    line_items: lineItems,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata,
    automatic_tax: { enabled: false }, // We handle tax ourselves
    phone_number_collection: {
      enabled: true,
    },
    billing_address_collection: 'required',
    // SMS consent disclosure shown at the phone-number field (A2P 10DLC opt-in).
    custom_text: {
      submit: {
        message:
          'By providing your phone number, you agree to receive order and delivery text messages from Party On Delivery. Message and data rates may apply. Reply STOP to opt out. See our Privacy Policy at partyondelivery.com/privacy.',
      },
    },
  };

  // Add customer info if available
  if (stripeCustomerId) {
    sessionParams.customer = stripeCustomerId;
  } else if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  // Apply discounts if any (supports multiple discount codes)
  const totalDiscountAmount = Number(cart.discountAmount);
  if (totalDiscountAmount > 0) {
    // Build coupon name from all applied discounts
    const appliedDiscounts = (cart.appliedDiscounts as unknown as Array<{ code: string; type: string; amount: number }>) || [];
    const couponName = appliedDiscounts.length > 0
      ? appliedDiscounts.map(d => d.code).join(' + ')
      : cart.discountCode || 'Discount';

    const coupon = await stripe.coupons.create({
      amount_off: Math.round(totalDiscountAmount * 100),
      currency: 'usd',
      duration: 'once',
      name: couponName,
    });
    sessionParams.discounts = [{ coupon: coupon.id }];
  }

  // Add tax line item with correct rate based on delivery address
  const taxAmount = Number(cart.taxAmount);
  if (taxAmount > 0) {
    // Get tax rate based on delivery zip code
    let taxRate = DEFAULT_TAX_RATE;
    let taxDescription = 'Texas Sales Tax';
    if (cart.deliveryAddress && typeof cart.deliveryAddress === 'object') {
      const addr = cart.deliveryAddress as { zip?: string };
      if (addr.zip) {
        const rateConfig = getTaxRateForZip(addr.zip);
        taxRate = rateConfig.rate;
        taxDescription = rateConfig.description;
      }
    }
    const taxRateDisplay = `${(taxRate * 100).toFixed(2)}%`;

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Sales Tax (${taxRateDisplay})`,
          description: `${taxDescription} sales tax`,
        },
        unit_amount: Math.round(taxAmount * 100),
      },
      quantity: 1,
    });
  }

  // Create the session
  const session = await stripe.checkout.sessions.create(sessionParams);

  // Persist the immutable charge snapshot on the cart. createOrderFromCheckout rebuilds
  // OrderItems from this (not a re-read of cart.items), closing the two-snapshot race where
  // items edited after checkout-creation diverged from what Stripe charged.
  await prisma.cart.update({
    where: { id: cart.id },
    data: { chargedLineItems: chargedLineItems as unknown as Prisma.InputJsonValue },
  });

  // Note: We store session ID in Stripe metadata, not in cart
  // The order service will link the checkout session when order is created

  return session;
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent', 'customer'],
    });
  } catch (error) {
    console.error('[Stripe] Failed to retrieve checkout session:', error);
    return null;
  }
}

/**
 * Expire a checkout session (cancel it)
 */
export async function expireCheckoutSession(sessionId: string): Promise<boolean> {
  try {
    await stripe.checkout.sessions.expire(sessionId);
    return true;
  } catch (error) {
    console.error('[Stripe] Failed to expire checkout session:', error);
    return false;
  }
}

/**
 * Get or create a Stripe customer
 */
export async function getOrCreateStripeCustomer(
  customerId: string
): Promise<string | null> {
  try {
    // Check if customer already has a Stripe customer ID
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) return null;

    if (customer.stripeCustomerId) {
      return customer.stripeCustomerId;
    }

    // Create a new Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email: customer.email,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || undefined,
      phone: customer.phone || undefined,
      metadata: {
        customerId: customer.id,
      },
    });

    // Save the Stripe customer ID
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        stripeCustomerId: stripeCustomer.id,
      },
    });

    return stripeCustomer.id;
  } catch (error) {
    console.error('[Stripe] Failed to get/create customer:', error);
    return null;
  }
}
