/**
 * Checkout API
 *
 * POST /api/v1/checkout - Create Stripe Checkout session
 * GET /api/v1/checkout?session_id=xxx - Get checkout session status
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCheckoutSession, getCheckoutSession, getOrCreateStripeCustomer } from '@/lib/stripe';
import { getCartById, validateCartMinimum, hasDeliveryInfo } from '@/lib/inventory/services/cart-service';
import { createFreeOrder } from '@/lib/inventory/services/order-service';
import { notifyNewOrder, buildGhlPayload } from '@/lib/webhooks/ghl';
import { getAffiliateByCode } from '@/lib/affiliates/affiliate-service';
import { linkOrderToAffiliate } from '@/lib/affiliates/commission-engine';
import { createOrderCalendarEvent } from '@/lib/calendar/google-calendar';
import { prisma } from '@/lib/database/client';

const CART_ID_COOKIE = 'cart_id';

/**
 * GET /api/v1/checkout
 * Get checkout session status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    const session = await getCheckoutSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
      },
    });
  } catch (error) {
    console.error('[Checkout API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get checkout session',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/checkout
 * Create Stripe Checkout session
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_ID_COOKIE)?.value;

    if (!cartId) {
      return NextResponse.json(
        { success: false, error: 'No cart found' },
        { status: 400 }
      );
    }

    // Get the cart
    const cart = await getCartById(cartId);

    if (!cart) {
      return NextResponse.json(
        { success: false, error: 'Cart not found' },
        { status: 404 }
      );
    }

    // Validate cart has items
    if (!cart.items || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Validate minimum order — waived for in-store pickup
    const pickupFromAddress =
      cart.deliveryAddress && typeof cart.deliveryAddress === 'object'
        ? (cart.deliveryAddress as { isPickup?: boolean }).isPickup === true
        : false;
    if (!pickupFromAddress) {
      const validation = validateCartMinimum(cart);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: `Minimum order is $${validation.minimum}. Your cart is $${validation.current.toFixed(2)}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate delivery info
    if (!hasDeliveryInfo(cart)) {
      return NextResponse.json(
        { success: false, error: 'Delivery information is required' },
        { status: 400 }
      );
    }

    // Validate stock availability before proceeding to Stripe
    for (const item of cart.items) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        select: {
          inventoryQuantity: true,
          committedQuantity: true,
          trackInventory: true,
          allowBackorder: true,
          product: {
            select: {
              title: true,
              isBundle: true,
              bundleComponents: {
                select: {
                  componentProductId: true,
                  componentVariantId: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      if (!variant || !variant.trackInventory || variant.allowBackorder) continue;

      if (variant.product.isBundle && variant.product.bundleComponents.length > 0) {
        // Bundle: check each component's available stock
        for (const comp of variant.product.bundleComponents) {
          let compVariant;
          if (comp.componentVariantId) {
            compVariant = await prisma.productVariant.findUnique({
              where: { id: comp.componentVariantId },
              select: { inventoryQuantity: true, committedQuantity: true, trackInventory: true, allowBackorder: true },
            });
          } else {
            compVariant = await prisma.productVariant.findFirst({
              where: { productId: comp.componentProductId },
              select: { inventoryQuantity: true, committedQuantity: true, trackInventory: true, allowBackorder: true },
            });
          }
          if (!compVariant || !compVariant.trackInventory || compVariant.allowBackorder) continue;

          const compAvailable = compVariant.inventoryQuantity - compVariant.committedQuantity;
          const compNeeded = comp.quantity * item.quantity;
          if (compAvailable < compNeeded) {
            return NextResponse.json(
              { success: false, error: `${variant.product.title} only has ${Math.max(0, Math.floor(compAvailable / comp.quantity))} available` },
              { status: 400 }
            );
          }
        }
      } else {
        // Regular product
        const available = variant.inventoryQuantity - variant.committedQuantity;
        if (available < item.quantity) {
          return NextResponse.json(
            { success: false, error: `${variant.product.title} only has ${Math.max(0, available)} available` },
            { status: 400 }
          );
        }
      }
    }

    // Check for affiliate attribution cookie (in-memory only -- do NOT mutate cart)
    let affiliateCode: string | undefined;
    let affiliateFreeDelivery = false;
    const refCode = cookieStore.get('ref_code')?.value;
    if (refCode) {
      try {
        const affiliate = await getAffiliateByCode(refCode);
        if (affiliate && affiliate.status === 'ACTIVE') {
          affiliateCode = affiliate.code;
          affiliateFreeDelivery = affiliate.customerPerk === 'Free Delivery';
          console.log('[Checkout] Affiliate attribution applied:', affiliateCode, '- perk:', affiliate.customerPerk, affiliateFreeDelivery ? '(free delivery)' : '(no free delivery)');
        }
      } catch (err) {
        console.error('[Checkout] Error checking affiliate code:', err);
      }
    }

    // Get request body for optional params
    const body = await request.json().catch(() => ({}));
    const { customerEmail, customerName, customerPhone, returnUrl, tipAmount: rawTip, attribution } = body;
    const tipAmount = typeof rawTip === 'number' && rawTip > 0 ? Math.round(rawTip * 100) / 100 : 0;

    // Compute effective totals (affiliate free delivery applied in-memory only)
    const effectiveDeliveryFee = affiliateFreeDelivery ? 0 : Number(cart.deliveryFee);
    const effectiveTotal = Number(cart.subtotal) - Number(cart.discountAmount)
      + Number(cart.taxAmount) + effectiveDeliveryFee + tipAmount;

    // Build success and cancel URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = returnUrl || `${appUrl}/checkout/success`;
    const cancelUrl = `${appUrl}/checkout`;

    // Handle $0 total (fully discounted orders) - Stripe can't process $0 payments
    if (effectiveTotal <= 0) {
      const order = await createFreeOrder(
        cart,
        customerEmail || '',
        customerName || 'Guest',
        customerPhone || null,
        affiliateCode,
        affiliateFreeDelivery ? 0 : undefined,
        affiliateFreeDelivery ? Math.max(effectiveTotal, 0) : undefined
      );

      // Link order to affiliate and create commission if attributed
      if (affiliateCode) {
        try {
          await linkOrderToAffiliate(order, affiliateCode);
        } catch (err) {
          console.error('[Checkout] Error linking free order to affiliate:', err);
        }
      }

      // Notify GHL webhook
      await notifyNewOrder(buildGhlPayload(order, 'free'));

      // Create Google Calendar event
      createOrderCalendarEvent(order).catch((err) =>
        console.error('[Checkout] Calendar event failed:', err)
      );

      return NextResponse.json({
        success: true,
        data: {
          freeOrder: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          checkoutUrl: `${successUrl}?order=${order.id}&order_name=PO-${order.orderNumber}&total=0`,
        },
      });
    }

    // Get or create Stripe customer if we have a customer ID
    let stripeCustomerId: string | undefined;
    if (cart.customerId) {
      const customerId = await getOrCreateStripeCustomer(cart.customerId);
      if (customerId) {
        stripeCustomerId = customerId;
      }
    }

    // Create checkout session
    const session = await createCheckoutSession({
      cart,
      successUrl,
      cancelUrl,
      customerEmail,
      stripeCustomerId,
      affiliateCode,
      overrideDeliveryFee: affiliateFreeDelivery ? 0 : undefined,
      tipAmount: tipAmount > 0 ? tipAmount : undefined,
      attribution: attribution && typeof attribution === 'object' ? attribution : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        checkoutUrl: session.url,
      },
    });
  } catch (error) {
    console.error('[Checkout API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
