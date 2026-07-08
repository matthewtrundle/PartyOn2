'use client';

import React, { createContext, useContext, useState, ReactElement } from 'react';
import { useCustomCart } from '@/lib/cart/hooks/useCustomCart';
import type { Cart } from '@/lib/types';
import { trackMetaEvent } from '@/components/MetaPixel';
import { trackCartAction, trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics/track';
import { completePendingGroupOrderJoin } from '@/lib/group-orders/hooks';

interface AppliedDiscountEntry {
  code: string;
  amount: number;
  type: string;
  freeShipping?: boolean;
}

interface CustomCartData {
  discountCode?: string | null;
  discountAmount?: string | number;
  appliedDiscounts?: AppliedDiscountEntry[];
  subtotal?: string | number;
  taxAmount?: string | number;
  deliveryFee?: string | number;
  total?: string | number;
}

interface CustomCartApiData {
  id: string;
  items: Array<{
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
    price: string;
    product: { id: string; title: string; handle: string };
    variant: { id: string; title: string; sku: string | null; price: string };
  }>;
  subtotal: string;
  taxAmount: string;
  deliveryFee: string;
  discountAmount: string;
  discountCode?: string;
  appliedDiscounts?: AppliedDiscountEntry[];
  total: string;
}

interface CartContextType {
  cart: Cart | null;
  customCartData: CustomCartData | null;
  loading: boolean;
  error: Error | null;
  addToCart: (variantId: string, quantity?: number) => Promise<Cart>;
  createCartWithItems: (items: Array<{ merchandiseId: string; quantity: number }>) => Promise<Cart | null | undefined>;
  updateCartItem: (lineId: string, quantity: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  clearCart: () => void | Promise<void>;
  updateCartAttributes: (attributes: Array<{ key: string; value: string }>) => Promise<Cart | undefined>;
  refetchCart: () => Promise<void>;
  updateCartFromApiResponse: (cart: CustomCartApiData) => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }): ReactElement {
  const cartHook = useCustomCart();

  const [isCartOpen, setIsCartOpen] = useState(false);

  const checkAgeVerification = (): boolean => {
    const ageVerified = localStorage.getItem('age_verified') || localStorage.getItem('ageVerified');
    // Accept both stamps: the main age gate (AgeVerification.tsx) writes '1',
    // while product/quick-buy modals write 'true'. Requiring only 'true' made
    // Add to Cart silently reload for anyone verified via the main gate.
    return ageVerified === 'true' || ageVerified === '1';
  };

  const openCart = (): void => {
    if (!checkAgeVerification()) {
      localStorage.removeItem('age_verified');
      localStorage.removeItem('ageVerified');
      window.location.reload();
      return;
    }
    setIsCartOpen(true);

    if (cartHook.cart) {
      trackEvent(ANALYTICS_EVENTS.OPEN_CART, {
        cart_total: parseFloat(cartHook.cart.cost?.totalAmount?.amount || '0'),
        item_count: cartHook.cart.totalQuantity || 0
      });
    }
  };

  const closeCart = (): void => setIsCartOpen(false);

  const toggleCart = (): void => {
    if (!checkAgeVerification()) {
      localStorage.removeItem('age_verified');
      localStorage.removeItem('ageVerified');
      window.location.reload();
      return;
    }
    setIsCartOpen(prev => !prev);
  };

  const addToCart = async (variantId: string, quantity: number = 1): Promise<Cart> => {
    const isAgeVerified = checkAgeVerification();

    if (!isAgeVerified) {
      localStorage.removeItem('age_verified');
      localStorage.removeItem('ageVerified');
      window.location.reload();
      throw new Error('Age verification required');
    }

    const isCreatingNewCart = !cartHook.cart;

    const result = await cartHook.addToCart(variantId, quantity);

    if (isCreatingNewCart && result?.id) {
      try {
        await completePendingGroupOrderJoin(result.id);
      } catch (err) {
        console.error('Failed to complete pending group order join:', err);
      }
    }

    const addedLine = result?.lines?.edges?.find(
      edge => edge.node.merchandise.id === variantId
    )?.node;

    trackCartAction(
      'add',
      variantId,
      addedLine?.merchandise?.product?.title || 'Unknown Product',
      parseFloat(addedLine?.merchandise?.price?.amount || '0'),
      quantity
    );

    trackMetaEvent('AddToCart', {
      content_type: 'product',
      content_ids: variantId,
      num_items: quantity,
      currency: 'USD',
    });

    return result;
  };

  const removeFromCart = async (lineId: string): Promise<void> => {
    const removedLine = cartHook.cart?.lines?.edges?.find(
      edge => edge.node.id === lineId
    )?.node;

    await cartHook.removeFromCart(lineId);

    if (removedLine) {
      trackCartAction(
        'remove',
        removedLine.merchandise.id,
        removedLine.merchandise.product?.title || 'Unknown Product',
        parseFloat(removedLine.merchandise.price?.amount || '0'),
        removedLine.quantity
      );
    }
  };

  const updateCartItem = async (lineId: string, quantity: number): Promise<void> => {
    const updatedLine = cartHook.cart?.lines?.edges?.find(
      edge => edge.node.id === lineId
    )?.node;

    await cartHook.updateCartItem(lineId, quantity);

    if (updatedLine) {
      trackCartAction(
        'update',
        updatedLine.merchandise.id,
        updatedLine.merchandise.product?.title || 'Unknown Product',
        parseFloat(updatedLine.merchandise.price?.amount || '0'),
        quantity
      );
    }
  };

  const customCartData: CustomCartData | null = cartHook.customCart
    ? {
        discountCode: cartHook.customCart.discountCode,
        discountAmount: cartHook.customCart.discountAmount,
        appliedDiscounts: cartHook.customCart.appliedDiscounts || [],
        subtotal: cartHook.customCart.subtotal,
        taxAmount: cartHook.customCart.taxAmount,
        deliveryFee: cartHook.customCart.deliveryFee,
        total: cartHook.customCart.total,
      }
    : null;

  const value: CartContextType = {
    cart: cartHook.cart,
    customCartData,
    loading: cartHook.loading,
    error: cartHook.error,
    addToCart,
    createCartWithItems: cartHook.createCartWithItems,
    updateCartItem,
    removeFromCart,
    clearCart: cartHook.clearCart,
    updateCartAttributes: cartHook.updateCartAttributes,
    refetchCart: cartHook.refetchCart,
    updateCartFromApiResponse: cartHook.setCartFromApiResponse,
    isCartOpen,
    openCart,
    closeCart,
    toggleCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCartContext = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext must be used within CartProvider');
  }
  return context;
};
