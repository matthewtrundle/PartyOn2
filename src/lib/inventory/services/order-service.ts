/**
 * Order Service
 * Handles order creation, management, and fulfillment
 */

import { prisma } from '@/lib/database/client';
import { Prisma, OrderStatus, FulfillmentStatus, FinancialStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { CartWithItems } from './cart-service';
import type { DraftOrderWithTotal, DraftOrderItem } from '@/lib/draft-orders/types';
import { snapshotItemCost, finalizeOrderMargin } from '@/lib/analytics/margin-service';
import { classifySegment } from '@/lib/analytics/segment-classifier';
import { unitsOffShelf } from './pick-inventory-service';
import {
  parseChargedLineItems,
  snapshotToOrderItemCreates,
  assertOrderItemsMatchCharge,
  type OrderItemSnapshotCreate,
} from '@/lib/stripe/charge-snapshot';

/**
 * Order with all relations
 */
export interface OrderWithItems {
  id: string;
  orderNumber: number;
  customerId: string;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  financialStatus: FinancialStatus;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  discountCode: string | null;
  discountAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  deliveryDate: Date;
  deliveryTime: string;
  deliveryAddress: Prisma.JsonValue;
  deliveryPhone: string;
  deliveryInstructions: string | null;
  customerEmail: string;
  customerPhone: string | null;
  customerName: string;
  items: OrderItemWithProduct[];
  groupOrderV2Id?: string | null;
  groupOrderV2?: { shareCode: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemWithProduct {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  price: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
}

/**
 * Shared helper: commit inventory for a single order item.
 * Increments committedQuantity on ProductVariant (does NOT decrement inventoryQuantity).
 * Physical stock is only decremented when the order is fulfilled/delivered.
 * If the product is a bundle, commits each component's inventory instead.
 */
type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function commitInventoryForOrderItem(
  tx: TransactionClient,
  productId: string,
  variantId: string,
  orderQuantity: number,
  orderNumber: number,
  orderId: string,
): Promise<void> {
  // Check if this product is a bundle
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: {
      isBundle: true,
      bundleComponents: {
        select: {
          componentProductId: true,
          componentVariantId: true,
          quantity: true,
        },
      },
    },
  });

  if (product?.isBundle && product.bundleComponents.length > 0) {
    // Bundle: commit each component's inventory
    for (const component of product.bundleComponents) {
      const commitQty = component.quantity * orderQuantity;

      let componentVariant;
      if (component.componentVariantId) {
        componentVariant = await tx.productVariant.findUnique({
          where: { id: component.componentVariantId },
          select: { id: true, committedQuantity: true },
        });
      } else {
        componentVariant = await tx.productVariant.findFirst({
          where: { productId: component.componentProductId },
          select: { id: true, committedQuantity: true },
        });
      }

      if (componentVariant) {
        await tx.productVariant.update({
          where: { id: componentVariant.id },
          data: { committedQuantity: { increment: commitQty } },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: componentVariant.id,
            type: 'COMMITTED',
            quantity: commitQty,
            previousQuantity: componentVariant.committedQuantity,
            newQuantity: componentVariant.committedQuantity + commitQty,
            reason: `Order #${orderNumber} (bundle component)`,
            referenceId: orderId,
            referenceType: 'Order',
          },
        });
      }
    }
  } else {
    // Regular product: commit variant directly
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, committedQuantity: true },
    });

    if (variant) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { committedQuantity: { increment: orderQuantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          variantId: variant.id,
          type: 'COMMITTED',
          quantity: orderQuantity,
          previousQuantity: variant.committedQuantity,
          newQuantity: variant.committedQuantity + orderQuantity,
          reason: `Order #${orderNumber}`,
          referenceId: orderId,
          referenceType: 'Order',
        },
      });
    }
  }
}

/**
 * Fulfill a single variant's inventory: floor inventoryQuantity and
 * committedQuantity at 0 (oversells become Available < 0 via committed,
 * never inventory < 0), record the movement, and warn on oversells.
 */
async function fulfillVariantInventory(
  tx: TransactionClient,
  variant: { id: string; inventoryQuantity: number; committedQuantity: number; trackInventory: boolean },
  qty: number,
  orderNumber: number,
  orderId: string,
  isBundleComponent: boolean,
): Promise<{ oversoldBy: number }> {
  if (!variant.trackInventory) return { oversoldBy: 0 };
  const newInventory = Math.max(0, variant.inventoryQuantity - qty);
  const newCommitted = Math.max(0, variant.committedQuantity - qty);
  const oversoldBy = qty - (variant.inventoryQuantity - newInventory);
  await tx.productVariant.update({
    where: { id: variant.id },
    data: { inventoryQuantity: newInventory, committedQuantity: newCommitted },
  });
  const suffix = isBundleComponent ? ' (bundle component)' : '';
  await tx.inventoryMovement.create({
    data: {
      variantId: variant.id,
      type: 'FULFILLED',
      quantity: -qty,
      previousQuantity: variant.inventoryQuantity,
      newQuantity: newInventory,
      reason: oversoldBy > 0
        ? `Order #${orderNumber} fulfilled${suffix} — OVERSOLD by ${oversoldBy}`
        : `Order #${orderNumber} fulfilled${suffix}`,
      referenceId: orderId,
      referenceType: 'Order',
    },
  });
  if (oversoldBy > 0) {
    console.warn(`[Oversell] Order #${orderNumber} variant ${variant.id} oversold by ${oversoldBy} — inventory floored at 0`);
  }
  return { oversoldBy };
}

/**
 * Fulfill inventory for an entire order.
 * Decrements both inventoryQuantity and committedQuantity for each item,
 * floored at 0. Called when an order's fulfillmentStatus changes to DELIVERED.
 *
 * Subtracts units that were already moved off the shelf at pack time
 * (via pick-inventory-service). Without this, packed-then-delivered orders
 * would double-decrement.
 */
export async function fulfillInventoryForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              title: true,
              isBundle: true,
              bundleComponents: {
                select: {
                  componentProductId: true,
                  componentVariantId: true,
                  quantity: true,
                  componentProduct: { select: { title: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) return;

  const pickStateRows = await prisma.orderItemPickState.findMany({
    where: { orderId },
    select: { itemKey: true, packed: true, shortBy: true },
  });
  const pickStates = new Map(pickStateRows.map((r) => [r.itemKey, r]));

  await prisma.$transaction(async (tx: TransactionClient) => {
    for (const item of order.items) {
      const effectiveQty = item.quantity - item.refundedQuantity;
      if (effectiveQty <= 0) continue;

      const parentKey = item.title || item.product.title;

      if (item.product.isBundle && item.product.bundleComponents.length > 0) {
        for (const component of item.product.bundleComponents) {
          const fulfillQty = component.quantity * effectiveQty;

          const bcKey = `${parentKey}::${component.componentProduct.title}`;
          const bcPick = pickStates.get(bcKey);
          const alreadyPacked = bcPick
            ? unitsOffShelf(bcPick, item.quantity * component.quantity)
            : 0;
          const remainingQty = Math.max(0, fulfillQty - alreadyPacked);
          if (remainingQty <= 0) continue;

          let componentVariant;
          if (component.componentVariantId) {
            componentVariant = await tx.productVariant.findUnique({
              where: { id: component.componentVariantId },
              select: { id: true, inventoryQuantity: true, committedQuantity: true, trackInventory: true },
            });
          } else {
            componentVariant = await tx.productVariant.findFirst({
              where: { productId: component.componentProductId },
              select: { id: true, inventoryQuantity: true, committedQuantity: true, trackInventory: true },
            });
          }

          if (componentVariant) {
            await fulfillVariantInventory(tx, componentVariant, remainingQty, order.orderNumber, orderId, true);
          }
        }
      } else {
        const linePick = pickStates.get(parentKey);
        const alreadyPacked = linePick ? unitsOffShelf(linePick, item.quantity) : 0;
        const remainingQty = Math.max(0, effectiveQty - alreadyPacked);
        if (remainingQty <= 0) continue;

        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { id: true, inventoryQuantity: true, committedQuantity: true, trackInventory: true },
        });

        if (variant) {
          await fulfillVariantInventory(tx, variant, remainingQty, order.orderNumber, orderId, false);
        }
      }
    }
  });
}

/**
 * Release committed inventory for an order (e.g. on cancellation before fulfillment).
 * Decrements committedQuantity only — stock stays on the shelf.
 */
export async function releaseCommittedInventory(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
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
      },
    },
  });

  if (!order) return;

  await prisma.$transaction(async (tx: TransactionClient) => {
    for (const item of order.items) {
      const effectiveQty = item.quantity - item.refundedQuantity;
      if (effectiveQty <= 0) continue;

      if (item.product.isBundle && item.product.bundleComponents.length > 0) {
        for (const component of item.product.bundleComponents) {
          const releaseQty = component.quantity * effectiveQty;

          let componentVariant;
          if (component.componentVariantId) {
            componentVariant = await tx.productVariant.findUnique({
              where: { id: component.componentVariantId },
              select: { id: true, committedQuantity: true },
            });
          } else {
            componentVariant = await tx.productVariant.findFirst({
              where: { productId: component.componentProductId },
              select: { id: true, committedQuantity: true },
            });
          }

          if (componentVariant) {
            const newCommitted = Math.max(0, componentVariant.committedQuantity - releaseQty);
            await tx.productVariant.update({
              where: { id: componentVariant.id },
              data: { committedQuantity: newCommitted },
            });

            await tx.inventoryMovement.create({
              data: {
                variantId: componentVariant.id,
                type: 'RETURN',
                quantity: releaseQty,
                previousQuantity: componentVariant.committedQuantity,
                newQuantity: newCommitted,
                reason: `Order #${order.orderNumber} cancelled (bundle component)`,
                referenceId: orderId,
                referenceType: 'Order',
              },
            });
          }
        }
      } else {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { id: true, committedQuantity: true },
        });

        if (variant) {
          const newCommitted = Math.max(0, variant.committedQuantity - effectiveQty);
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { committedQuantity: newCommitted },
          });

          await tx.inventoryMovement.create({
            data: {
              variantId: variant.id,
              type: 'RETURN',
              quantity: effectiveQty,
              previousQuantity: variant.committedQuantity,
              newQuantity: newCommitted,
              reason: `Order #${order.orderNumber} cancelled`,
              referenceId: orderId,
              referenceType: 'Order',
            },
          });
        }
      }
    }
  });
}

/**
 * Create an order from a completed Stripe checkout session
 */
export async function createOrderFromCheckout(
  session: Stripe.Checkout.Session,
  cart: CartWithItems
): Promise<OrderWithItems> {
  // Extract customer info from session
  const customerEmail = session.customer_details?.email || '';
  const customerPhone = session.customer_details?.phone || null;
  const customerName = session.customer_details?.name || 'Guest';

  // Get shipping details from session or cart
  let deliveryAddress = cart.deliveryAddress;
  let deliveryPhone = cart.deliveryPhone || '';

  // Type assertion for shipping details (Stripe expanded session)
  const shippingDetails = (session as { shipping_details?: { address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string }; phone?: string } }).shipping_details;

  if (shippingDetails?.address) {
    deliveryAddress = {
      address1: shippingDetails.address.line1 || '',
      address2: shippingDetails.address.line2 || '',
      city: shippingDetails.address.city || '',
      province: shippingDetails.address.state || 'TX',
      zip: shippingDetails.address.postal_code || '',
      country: shippingDetails.address.country || 'US',
    };
  }

  if (shippingDetails?.phone) {
    deliveryPhone = shippingDetails.phone;
  }

  // Get or create customer ID
  let customerId = cart.customerId;

  if (!customerId && customerEmail) {
    // Create or find customer from Stripe session data (guest checkout)
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: customerEmail }
    });

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      // Create new customer from checkout info
      const nameParts = customerName.split(' ');
      const newCustomer = await prisma.customer.create({
        data: {
          email: customerEmail,
          phone: customerPhone,
          firstName: nameParts[0] || 'Guest',
          lastName: nameParts.slice(1).join(' ') || '',
          ageVerified: true, // They completed checkout with age verification
          isActive: true,
        }
      });
      customerId = newCustomer.id;
    }
  }

  // Validate required fields
  if (!customerId) {
    throw new Error('Customer ID is required to create an order');
  }
  if (!cart.deliveryDate) {
    throw new Error('Delivery date is required to create an order');
  }
  if (!cart.deliveryTime) {
    throw new Error('Delivery time is required to create an order');
  }

  // Extract payment intent ID (can be string or expanded object)
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // Create order with items in a transaction
  const order = await prisma.$transaction(async (tx: TransactionClient) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        customerId: customerId!,
        stripePaymentIntentId: paymentIntentId,
        stripeCheckoutSessionId: session.id,
        status: 'CONFIRMED',
        fulfillmentStatus: 'UNFULFILLED',
        financialStatus: 'PAID',
        subtotal: cart.subtotal,
        taxAmount: cart.taxAmount,
        deliveryFee: cart.deliveryFee,
        discountCode: cart.discountCode,
        discountAmount: cart.discountAmount,
        tipAmount: session.metadata?.tipAmount ? parseFloat(session.metadata.tipAmount) : 0,
        total: cart.total,
        deliveryDate: (() => { const d = new Date(cart.deliveryDate!); d.setUTCHours(12, 0, 0, 0); return d; })(),
        deliveryTime: cart.deliveryTime!,
        deliveryAddress: deliveryAddress ?? Prisma.JsonNull,
        deliveryPhone: deliveryPhone || customerPhone || '',
        deliveryInstructions: cart.deliveryInstructions,
        customerEmail,
        customerPhone,
        customerName,
        landingPage: session.metadata?.landingPage || null,
        utmSource: session.metadata?.utmSource || null,
        utmMedium: session.metadata?.utmMedium || null,
        utmCampaign: session.metadata?.utmCampaign || null,
        utmTerm: session.metadata?.utmTerm || null,
        utmContent: session.metadata?.utmContent || null,
        referrer: session.metadata?.referrer || null,
        segment: classifySegment(
          session.metadata?.landingPage,
          session.metadata?.utmCampaign
        ),
      },
      include: { items: true, groupOrderV2: { select: { shareCode: true } } },
    });

    // Build OrderItems from the immutable charge snapshot (what Stripe actually charged), NOT
    // from a re-read of cart.items — this closes the two-snapshot race. Fall back to cart.items
    // only for carts created before the snapshot shipped (in-flight across deploy).
    const snapshot = parseChargedLineItems(cart.chargedLineItems);
    let orderItemCreates: OrderItemSnapshotCreate[];
    if (snapshot) {
      orderItemCreates = await snapshotToOrderItemCreates(tx, snapshot);
      assertOrderItemsMatchCharge(orderItemCreates, snapshot);
    } else {
      console.warn(`[Order] Cart ${cart.id} has no charge snapshot — falling back to cart.items (in-flight at deploy?)`);
      orderItemCreates = [];
      for (const item of cart.items) {
        const { unitCost, totalCost } = await snapshotItemCost(tx, item.variantId, item.quantity);
        orderItemCreates.push({
          productId: item.productId,
          variantId: item.variantId,
          title: item.product.title,
          variantTitle: item.variant.title,
          sku: item.variant.sku,
          price: item.price,
          quantity: item.quantity,
          totalPrice: new Prisma.Decimal(Number(item.price) * item.quantity),
          unitCost,
          totalCost,
        });
      }
    }

    // Create order items
    for (const itemData of orderItemCreates) {
      await tx.orderItem.create({ data: { orderId: newOrder.id, ...itemData } });
    }

    // Commit inventory for each item (handles bundles automatically). Sourced from the same
    // snapshot so committed stock matches exactly what was charged.
    for (const itemData of orderItemCreates) {
      await commitInventoryForOrderItem(tx, itemData.productId, itemData.variantId, itemData.quantity, newOrder.orderNumber, newOrder.id);
    }

    await finalizeOrderMargin(tx, newOrder.id);

    // Get the order with items
    const orderWithItems = await tx.order.findUnique({
      where: { id: newOrder.id },
      include: { items: true, groupOrderV2: { select: { shareCode: true } } },
    });

    return orderWithItems;
  });

  if (!order) {
    throw new Error('Failed to create order');
  }

  // Update cart status
  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      status: 'CONVERTED',
    },
  });

  return order as unknown as OrderWithItems;
}

/**
 * Create an order from a cart with $0 total (fully discounted)
 * Used when discounts cover the entire order, skipping Stripe
 */
export async function createFreeOrder(
  cart: CartWithItems,
  customerEmail: string,
  customerName: string,
  customerPhone: string | null,
  affiliateCode?: string,
  overrideDeliveryFee?: number,
  overrideTotal?: number
): Promise<OrderWithItems> {
  // Get or create customer
  let customerId = cart.customerId;

  if (!customerId && customerEmail) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: customerEmail },
    });

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const nameParts = customerName.split(' ');
      const newCustomer = await prisma.customer.create({
        data: {
          email: customerEmail,
          phone: customerPhone,
          firstName: nameParts[0] || 'Guest',
          lastName: nameParts.slice(1).join(' ') || '',
          ageVerified: true,
          isActive: true,
        },
      });
      customerId = newCustomer.id;
    }
  }

  if (!customerId) {
    throw new Error('Customer ID is required to create an order');
  }
  if (!cart.deliveryDate) {
    throw new Error('Delivery date is required to create an order');
  }
  if (!cart.deliveryTime) {
    throw new Error('Delivery time is required to create an order');
  }

  // Look up affiliate ID if code provided
  let affiliateId: string | undefined;
  if (affiliateCode) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { code: affiliateCode.toUpperCase() },
    });
    if (affiliate && affiliate.status === 'ACTIVE') {
      affiliateId = affiliate.id;
    }
  }

  const order = await prisma.$transaction(async (tx: TransactionClient) => {
    const newOrder = await tx.order.create({
      data: {
        customerId: customerId!,
        stripePaymentIntentId: null,
        stripeCheckoutSessionId: null,
        status: 'CONFIRMED',
        fulfillmentStatus: 'UNFULFILLED',
        financialStatus: 'PAID',
        subtotal: cart.subtotal,
        taxAmount: cart.taxAmount,
        deliveryFee: overrideDeliveryFee !== undefined ? overrideDeliveryFee : cart.deliveryFee,
        discountCode: cart.discountCode,
        discountAmount: cart.discountAmount,
        total: overrideTotal !== undefined ? Math.max(overrideTotal, 0) : cart.total,
        deliveryDate: (() => { const d = new Date(cart.deliveryDate!); d.setUTCHours(12, 0, 0, 0); return d; })(),
        deliveryTime: cart.deliveryTime!,
        deliveryAddress: cart.deliveryAddress ?? Prisma.JsonNull,
        deliveryPhone: cart.deliveryPhone || customerPhone || '',
        deliveryInstructions: cart.deliveryInstructions,
        customerEmail,
        customerPhone,
        customerName,
        affiliateId: affiliateId || undefined,
      },
      include: { items: true, groupOrderV2: { select: { shareCode: true } } },
    });

    for (const item of cart.items) {
      const { unitCost, totalCost } = await snapshotItemCost(tx, item.variantId, item.quantity);
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          title: item.product.title,
          variantTitle: item.variant.title,
          sku: item.variant.sku,
          quantity: item.quantity,
          price: item.price,
          totalPrice: new Prisma.Decimal(Number(item.price) * item.quantity),
          unitCost,
          totalCost,
        },
      });
    }

    // Commit inventory (handles bundles automatically)
    for (const item of cart.items) {
      await commitInventoryForOrderItem(tx, item.productId, item.variantId, item.quantity, newOrder.orderNumber, newOrder.id);
    }

    await finalizeOrderMargin(tx, newOrder.id);

    return await tx.order.findUnique({
      where: { id: newOrder.id },
      include: { items: true, groupOrderV2: { select: { shareCode: true } } },
    });
  });

  if (!order) {
    throw new Error('Failed to create free order');
  }

  // Mark cart as converted
  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: 'CONVERTED' },
  });

  return order as unknown as OrderWithItems;
}

/**
 * Get an order by ID
 */
export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  return order as unknown as OrderWithItems | null;
}

/**
 * Get an order by order number
 */
export async function getOrderByNumber(orderNumber: number): Promise<OrderWithItems | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  return order as unknown as OrderWithItems | null;
}

/**
 * Get an order by Stripe checkout session ID
 */
export async function getOrderByCheckoutSession(
  sessionId: string
): Promise<OrderWithItems | null> {
  const order = await prisma.order.findFirst({
    where: { stripeCheckoutSessionId: sessionId },
    include: { items: true },
  });

  return order as unknown as OrderWithItems | null;
}

/**
 * Get orders for a customer
 */
export async function getCustomerOrders(
  customerId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ orders: OrderWithItems[]; total: number }> {
  const { page = 1, pageSize = 10 } = options;
  const skip = (page - 1) * pageSize;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      include: { items: true, groupOrderV2: { select: { shareCode: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where: { customerId } }),
  ]);

  return { orders: orders as unknown as OrderWithItems[], total };
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<OrderWithItems> {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { items: true },
  });

  return order as unknown as OrderWithItems;
}

/**
 * Update fulfillment status
 */
export async function updateFulfillmentStatus(
  orderId: string,
  fulfillmentStatus: FulfillmentStatus
): Promise<OrderWithItems> {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { fulfillmentStatus },
    include: { items: true },
  });

  return order as unknown as OrderWithItems;
}

/**
 * Create a refund for an order. Returns the id of the new Refund row so callers
 * can stamp it (stripeRefundId / processedBy) by id — looking it up afterward
 * with findFirst(orderBy createdAt desc) can grab the wrong row if a concurrent
 * webhook inserts another refund for the same order in between.
 *
 * The financialStatus decision compares against the Stripe-captured amount
 * when available. order.total alone gets rewritten by OrderAmendment when
 * items are removed, so a refund for the removed items would otherwise look
 * like a "full" refund (totalRefunded >= currentOrderTotal) even though
 * the customer still has a net-positive paid order.
 */
export async function createRefund(
  orderId: string,
  amount: number,
  reason?: string
): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Create refund record
  const refund = await prisma.refund.create({
    data: {
      orderId,
      amount: new Prisma.Decimal(amount),
      reason: reason || 'Customer request',
      status: 'SUCCEEDED',
    },
  });

  await recomputeOrderFinancialStatus(orderId);

  return refund.id;
}

/**
 * Recompute and persist an order's financialStatus from its current Refund rows.
 *
 * Compares total refunded against what Stripe actually captured (falling back to
 * order.total when the PaymentIntent can't be read). Extracted so both
 * createRefund and the charge.refunded webhook reconciler converge on the same
 * label instead of duplicating the comparison.
 */
export async function recomputeOrderFinancialStatus(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) return;

  const totalRefunds = await prisma.refund.aggregate({
    where: { orderId },
    _sum: { amount: true },
  });
  const totalRefunded = Number(totalRefunds._sum.amount || 0);

  let originallyCharged = Number(order.total);
  if (order.stripePaymentIntentId) {
    const { getStripeCapturedAmount } = await import('@/lib/stripe/refund-utils');
    try {
      originallyCharged = await getStripeCapturedAmount(order.stripePaymentIntentId);
    } catch {
      // Fall back to order.total — better partial-refunded label than a hard fail.
    }
  }

  if (totalRefunded >= originallyCharged - 0.005) {
    await prisma.order.update({
      where: { id: orderId },
      data: { financialStatus: 'REFUNDED' },
    });
  } else if (totalRefunded > 0) {
    await prisma.order.update({
      where: { id: orderId },
      data: { financialStatus: 'PARTIALLY_REFUNDED' },
    });
  }
}

/**
 * Get all orders with filtering
 */
export async function getOrders(options: {
  status?: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus;
  financialStatus?: FinancialStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}): Promise<{ orders: OrderWithItems[]; total: number }> {
  const {
    status,
    fulfillmentStatus,
    financialStatus,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = options;

  const skip = (page - 1) * pageSize;

  const where: Prisma.OrderWhereInput = {};

  if (status) where.status = status;
  if (fulfillmentStatus) where.fulfillmentStatus = fulfillmentStatus;
  if (financialStatus) where.financialStatus = financialStatus;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, groupOrderV2: { select: { shareCode: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders: orders as unknown as OrderWithItems[], total };
}

/**
 * Create an order from a paid draft order (invoice)
 */
export async function createOrderFromDraftOrder(
  draftOrder: DraftOrderWithTotal,
  session: Stripe.Checkout.Session
): Promise<OrderWithItems> {
  // Extract customer info from session (or fallback to draft order)
  const customerEmail = session.customer_details?.email || draftOrder.customerEmail;
  const customerPhone = session.customer_details?.phone || draftOrder.customerPhone || null;
  const customerName = session.customer_details?.name || draftOrder.customerName;

  // Build delivery address object
  const deliveryAddress = {
    address1: draftOrder.deliveryAddress,
    address2: '',
    city: draftOrder.deliveryCity,
    province: draftOrder.deliveryState,
    zip: draftOrder.deliveryZip,
    country: 'US',
  };

  // Get or create customer ID
  let customerId: string | null = null;

  if (customerEmail) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: customerEmail }
    });

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      // Create new customer from invoice info
      const nameParts = customerName.split(' ');
      const newCustomer = await prisma.customer.create({
        data: {
          email: customerEmail,
          phone: customerPhone,
          firstName: nameParts[0] || 'Guest',
          lastName: nameParts.slice(1).join(' ') || '',
          ageVerified: true, // They completed checkout
          isActive: true,
        }
      });
      customerId = newCustomer.id;
    }
  }

  if (!customerId) {
    throw new Error('Customer ID is required to create an order');
  }

  // Extract payment intent ID
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // Create order with items in a transaction
  const order = await prisma.$transaction(async (tx: TransactionClient) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        customerId,
        stripePaymentIntentId: paymentIntentId,
        stripeCheckoutSessionId: session.id,
        status: 'CONFIRMED',
        fulfillmentStatus: 'UNFULFILLED',
        financialStatus: 'PAID',
        subtotal: draftOrder.subtotal,
        taxAmount: draftOrder.taxAmount,
        deliveryFee: draftOrder.deliveryFee,
        discountCode: draftOrder.discountCode,
        discountAmount: draftOrder.discountAmount,
        total: draftOrder.total,
        deliveryDate: (() => { const d = new Date(draftOrder.deliveryDate); d.setUTCHours(12, 0, 0, 0); return d; })(),
        deliveryTime: draftOrder.deliveryTime,
        deliveryAddress: deliveryAddress,
        deliveryPhone: draftOrder.customerPhone || customerPhone || '',
        deliveryInstructions: draftOrder.deliveryNotes,
        customerEmail,
        customerPhone,
        customerName,
        groupOrderId: draftOrder.groupOrderId,
      },
      include: { items: true, groupOrderV2: { select: { shareCode: true } } },
    });

    // Create order items (handle custom items that may not have real product/variant IDs)
    const items = draftOrder.items as DraftOrderItem[];
    for (const item of items) {
      const productId = item.productId;
      let variantId = item.variantId;

      // Check if product exists; create placeholder if not (for custom draft order items)
      const productExists = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!productExists) {
        await tx.product.create({
          data: {
            id: productId,
            title: item.title,
            handle: productId,
            description: 'Custom item (added via draft order)',
            status: 'DRAFT',
            productType: 'Custom',
            vendor: 'Custom',
            basePrice: new Prisma.Decimal(item.price),
          },
        });
        console.log(`[Order Service] Created placeholder product for custom item: ${item.title}`);
      }

      // Check if variant exists; create or find one if not
      const variantExists = await tx.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
      if (!variantExists) {
        const existingVariant = await tx.productVariant.findFirst({ where: { productId }, select: { id: true } });
        if (existingVariant) {
          variantId = existingVariant.id;
        } else {
          const newVariant = await tx.productVariant.create({
            data: {
              productId,
              title: item.variantTitle || 'Default Title',
              price: new Prisma.Decimal(item.price),
              inventoryQuantity: 0,
              availableForSale: false,
            },
          });
          variantId = newVariant.id;
        }
      }

      const { unitCost, totalCost } = await snapshotItemCost(tx, variantId, item.quantity);
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId,
          variantId,
          title: item.title,
          variantTitle: item.variantTitle || null,
          sku: null,
          quantity: item.quantity,
          price: new Prisma.Decimal(item.price),
          totalPrice: new Prisma.Decimal(item.price * item.quantity),
          unitCost,
          totalCost,
        },
      });
    }

    // Commit inventory for each item (handles bundles automatically, skips missing products)
    for (const item of items) {
      try {
        await commitInventoryForOrderItem(tx, item.productId, item.variantId, item.quantity, newOrder.orderNumber, newOrder.id);
      } catch (inventoryError) {
        // Custom items may not have inventory tracking - log and continue
        console.warn(`[Order Service] Could not commit inventory for ${item.title}:`, inventoryError);
      }
    }

    await finalizeOrderMargin(tx, newOrder.id);

    // Get the order with items
    const orderWithItems = await tx.order.findUnique({
      where: { id: newOrder.id },
      include: { items: true, groupOrderV2: { select: { shareCode: true } } },
    });

    return orderWithItems;
  });

  if (!order) {
    throw new Error('Failed to create order');
  }

  return order as unknown as OrderWithItems;
}
