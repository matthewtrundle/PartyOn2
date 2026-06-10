/**
 * Cart Service
 * Server-side cart management with database persistence
 */

import { prisma } from '@/lib/database/client';
import { Prisma, Cart, CartItem } from '@prisma/client';
import { calculateCartTax } from '@/lib/tax';
import { calculateDeliveryFee } from '@/lib/delivery';

// ==========================================
// Types
// ==========================================

export interface CartWithItems extends Cart {
  items: Array<CartItem & {
    product: { id: string; title: string; handle: string };
    variant: { id: string; title: string; sku: string | null; price: Prisma.Decimal };
  }>;
}

export interface AddToCartInput {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
}

export interface UpdateCartItemInput {
  itemId: string;
  quantity: number;
}

export interface DeliveryInfo {
  date: Date;
  time: string;
  address: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  phone: string;
  instructions?: string;
}

// Default delivery fee (configurable rates in delivery module)
const _DEFAULT_DELIVERY_FEE = 30; // eslint-disable-line @typescript-eslint/no-unused-vars

// ==========================================
// Cart Operations
// ==========================================

/**
 * Get or create a cart for a customer or session
 */
export async function getOrCreateCart(
  customerId?: string,
  sessionId?: string
): Promise<CartWithItems> {
  if (!customerId && !sessionId) {
    throw new Error('Either customerId or sessionId is required');
  }

  // Try to find existing active cart
  let cart = await prisma.cart.findFirst({
    where: {
      status: 'ACTIVE',
      ...(customerId ? { customerId } : { sessionId }),
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, title: true, handle: true } },
          variant: { select: { id: true, title: true, sku: true, price: true } },
        },
      },
    },
  });

  if (!cart) {
    // Create new cart
    cart = await prisma.cart.create({
      data: {
        customerId,
        sessionId: customerId ? undefined : sessionId,
        status: 'ACTIVE',
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, handle: true } },
            variant: { select: { id: true, title: true, sku: true, price: true } },
          },
        },
      },
    });
  }

  return cart as CartWithItems;
}

/**
 * Get cart by ID
 */
export async function getCartById(cartId: string): Promise<CartWithItems | null> {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: { select: { id: true, title: true, handle: true } },
          variant: { select: { id: true, title: true, sku: true, price: true } },
        },
      },
    },
  }) as Promise<CartWithItems | null>;
}

/**
 * Add item to cart
 */
export async function addToCart(
  cartId: string,
  input: AddToCartInput
): Promise<CartWithItems> {
  const { productId, variantId, quantity, price } = input;

  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId, variantId },
  });

  if (existingItem) {
    // Update quantity
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    });
  } else {
    // Add new item
    await prisma.cartItem.create({
      data: {
        cartId,
        productId,
        variantId,
        quantity,
        price: new Prisma.Decimal(price),
      },
    });
  }

  // Recalculate totals
  return recalculateCart(cartId);
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  cartId: string,
  input: UpdateCartItemInput
): Promise<CartWithItems> {
  const { itemId, quantity } = input;

  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  return recalculateCart(cartId);
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  cartId: string,
  itemId: string
): Promise<CartWithItems> {
  await prisma.cartItem.delete({ where: { id: itemId } });
  return recalculateCart(cartId);
}

/**
 * Clear all items from cart
 */
export async function clearCart(cartId: string): Promise<CartWithItems> {
  await prisma.cartItem.deleteMany({ where: { cartId } });
  return recalculateCart(cartId);
}

/**
 * Set delivery information
 */
export async function setDeliveryInfo(
  cartId: string,
  delivery: DeliveryInfo
): Promise<CartWithItems> {
  // Normalize delivery date to noon UTC to prevent timezone display issues
  const normalizedDate = new Date(delivery.date);
  normalizedDate.setUTCHours(12, 0, 0, 0);

  await prisma.cart.update({
    where: { id: cartId },
    data: {
      deliveryDate: normalizedDate,
      deliveryTime: delivery.time,
      deliveryAddress: delivery.address as Prisma.InputJsonValue,
      deliveryPhone: delivery.phone,
      deliveryInstructions: delivery.instructions,
    },
  });

  return recalculateCart(cartId);
}

/** Shape of entries stored in Cart.appliedDiscounts JSON */
interface AppliedDiscountEntry {
  code: string;
  amount: number;
  type: string;
  freeShipping?: boolean;
}

/**
 * Apply discount code (backwards compat - single code)
 */
export async function applyDiscount(
  cartId: string,
  discountCode: string,
  discountAmount: number
): Promise<CartWithItems> {
  await prisma.cart.update({
    where: { id: cartId },
    data: {
      discountCode,
      discountAmount: new Prisma.Decimal(discountAmount),
    },
  });

  return recalculateCart(cartId);
}

/**
 * Add a discount code to the cart (multi-discount support)
 */
export async function addDiscount(
  cartId: string,
  code: string,
  amount: number,
  type: string,
  freeShipping?: boolean
): Promise<CartWithItems> {
  const cart = await prisma.cart.findUnique({ where: { id: cartId } });
  if (!cart) throw new Error('Cart not found');

  const existing = (cart.appliedDiscounts as unknown as AppliedDiscountEntry[]) || [];
  const updated = [...existing, { code, amount, type, freeShipping: freeShipping || false }];
  const totalAmount = updated.reduce((sum, d) => sum + d.amount, 0);

  await prisma.cart.update({
    where: { id: cartId },
    data: {
      appliedDiscounts: updated as unknown as Prisma.InputJsonValue,
      discountCode: updated.length === 1 ? code : null,
      discountAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
    },
  });

  return recalculateCart(cartId);
}

/**
 * Remove a specific discount code from the cart
 */
export async function removeDiscount(cartId: string, code?: string): Promise<CartWithItems> {
  const cart = await prisma.cart.findUnique({ where: { id: cartId } });
  if (!cart) throw new Error('Cart not found');

  const existing = (cart.appliedDiscounts as unknown as AppliedDiscountEntry[]) || [];

  // If no code specified or no multi-discount entries, clear all
  if (!code || existing.length === 0) {
    return removeAllDiscounts(cartId);
  }

  const filtered = existing.filter((d) => d.code.toUpperCase() !== code.toUpperCase());
  const totalAmount = filtered.reduce((sum, d) => sum + d.amount, 0);

  await prisma.cart.update({
    where: { id: cartId },
    data: {
      appliedDiscounts: filtered as unknown as Prisma.InputJsonValue,
      discountCode: filtered.length === 1 ? filtered[0].code : null,
      discountAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
    },
  });

  return recalculateCart(cartId);
}

/**
 * Remove all discount codes from the cart
 */
export async function removeAllDiscounts(cartId: string): Promise<CartWithItems> {
  await prisma.cart.update({
    where: { id: cartId },
    data: {
      appliedDiscounts: [],
      discountCode: null,
      discountAmount: new Prisma.Decimal(0),
    },
  });

  return recalculateCart(cartId);
}

/**
 * Associate cart with group order
 */
export async function associateWithGroupOrder(
  cartId: string,
  groupOrderId: string
): Promise<CartWithItems> {
  await prisma.cart.update({
    where: { id: cartId },
    data: { groupOrderId },
  });

  return getCartById(cartId) as Promise<CartWithItems>;
}

/**
 * Mark cart as converted (after successful checkout)
 */
export async function markCartConverted(cartId: string): Promise<void> {
  await prisma.cart.update({
    where: { id: cartId },
    data: { status: 'CONVERTED' },
  });
}

/**
 * Mark cart as abandoned
 */
export async function markCartAbandoned(cartId: string): Promise<void> {
  await prisma.cart.update({
    where: { id: cartId },
    data: {
      status: 'ABANDONED',
      abandonedAt: new Date(),
    },
  });
}

/**
 * Merge guest cart into customer cart
 */
export async function mergeGuestCart(
  sessionId: string,
  customerId: string
): Promise<CartWithItems> {
  // Get guest cart
  const guestCart = await prisma.cart.findFirst({
    where: { sessionId, status: 'ACTIVE' },
    include: { items: true },
  });

  if (!guestCart) {
    // No guest cart to merge, just get/create customer cart
    return getOrCreateCart(customerId);
  }

  // Get or create customer cart
  const customerCart = await prisma.cart.findFirst({
    where: { customerId, status: 'ACTIVE' },
  });

  if (!customerCart) {
    // Transfer guest cart to customer
    await prisma.cart.update({
      where: { id: guestCart.id },
      data: {
        customerId,
        sessionId: null,
      },
    });
    return getCartById(guestCart.id) as Promise<CartWithItems>;
  }

  // Merge items from guest cart to customer cart
  for (const item of guestCart.items) {
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: customerCart.id, variantId: item.variantId },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: customerCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
        },
      });
    }
  }

  // Delete guest cart
  await prisma.cart.delete({ where: { id: guestCart.id } });

  return recalculateCart(customerCart.id);
}

// ==========================================
// Internal Helpers
// ==========================================

/**
 * Recalculate cart totals
 */
async function recalculateCart(cartId: string): Promise<CartWithItems> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: { select: { id: true, title: true, handle: true } },
          variant: { select: { id: true, title: true, sku: true, price: true } },
        },
      },
    },
  });

  if (!cart) {
    throw new Error('Cart not found');
  }

  // Calculate subtotal
  const subtotal = cart.items.reduce((sum, item) => {
    return sum + (parseFloat(item.price.toString()) * item.quantity);
  }, 0);

  // Get zip code + pickup flag from delivery address if available
  let zipCode: string | undefined;
  let isPickup = false;
  if (cart.deliveryAddress && typeof cart.deliveryAddress === 'object') {
    const addr = cart.deliveryAddress as { zip?: string; isPickup?: boolean };
    zipCode = addr.zip;
    isPickup = addr.isPickup === true;
  }

  // Calculate tax using configurable rates
  const discountAmount = parseFloat(cart.discountAmount.toString());
  const taxResult = calculateCartTax({
    subtotal,
    discountAmount,
    zipCode,
  });
  const taxAmount = taxResult.taxAmount;

  // Check if any applied discount is FREE_SHIPPING
  const appliedDiscounts = (cart.appliedDiscounts as unknown as AppliedDiscountEntry[]) || [];
  const hasFreeShipping = appliedDiscounts.some((d) => d.type === 'FREE_SHIPPING' || d.freeShipping);

  // Calculate delivery fee based on zip code (if delivery address is set)
  let deliveryFee = parseFloat(cart.deliveryFee.toString());
  if (isPickup || hasFreeShipping) {
    deliveryFee = 0;
  } else if (zipCode && cart.deliveryAddress) {
    // Calculate delivery fee based on zone - use existing fee if manually set
    const existingFee = parseFloat(cart.deliveryFee.toString());
    // Only auto-calculate if fee is 0 or if we don't have a fee set
    if (existingFee === 0) {
      const deliveryResult = calculateDeliveryFee(zipCode, subtotal, false);
      deliveryFee = deliveryResult.fee;
    }
  }

  // Calculate total
  const total = Math.max(0, subtotal - discountAmount + taxAmount + deliveryFee);

  // Update cart totals
  await prisma.cart.update({
    where: { id: cartId },
    data: {
      subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
      taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
      deliveryFee: new Prisma.Decimal(deliveryFee.toFixed(2)),
      total: new Prisma.Decimal(total.toFixed(2)),
    },
  });

  return getCartById(cartId) as Promise<CartWithItems>;
}

// ==========================================
// Cart Validation
// ==========================================

/**
 * Validate cart meets minimum order requirements
 */
export function validateCartMinimum(cart: CartWithItems): {
  valid: boolean;
  minimum: number;
  current: number;
  difference: number;
} {
  const minimum = 100; // $100 minimum
  const current = parseFloat(cart.subtotal.toString());
  const difference = minimum - current;

  return {
    valid: current >= minimum,
    minimum,
    current,
    difference: Math.max(0, difference),
  };
}

/**
 * Check if cart has delivery info
 */
export function hasDeliveryInfo(cart: CartWithItems): boolean {
  return !!(cart.deliveryDate && cart.deliveryTime && cart.deliveryAddress && cart.deliveryPhone);
}

/**
 * Convert cart to checkout-ready format
 */
export function cartToCheckoutData(cart: CartWithItems) {
  return {
    cartId: cart.id,
    items: cart.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      title: item.product.title,
      variantTitle: item.variant.title,
      sku: item.variant.sku,
      quantity: item.quantity,
      price: parseFloat(item.price.toString()),
      total: parseFloat(item.price.toString()) * item.quantity,
    })),
    subtotal: parseFloat(cart.subtotal.toString()),
    discountCode: cart.discountCode,
    discountAmount: parseFloat(cart.discountAmount.toString()),
    appliedDiscounts: (cart.appliedDiscounts as unknown as AppliedDiscountEntry[]) || [],
    taxAmount: parseFloat(cart.taxAmount.toString()),
    deliveryFee: parseFloat(cart.deliveryFee.toString()),
    total: parseFloat(cart.total.toString()),
    delivery: cart.deliveryAddress ? {
      date: cart.deliveryDate,
      time: cart.deliveryTime,
      address: cart.deliveryAddress,
      phone: cart.deliveryPhone,
      instructions: cart.deliveryInstructions,
    } : null,
  };
}
