'use client';

import { useState, useEffect, type ReactElement, type RefObject } from 'react';
import type { DraftCartItemView } from '@/lib/group-orders-v2/types';

interface Props {
  participantId: string;
  draftItems: DraftCartItemView[];
  isLocked?: boolean;
  cartRef: RefObject<HTMLDivElement | null>;
  onCheckout: () => void;
}

export default function DashboardBottomBar({
  participantId,
  draftItems,
  isLocked,
  cartRef,
  onCheckout,
}: Props): ReactElement | null {
  const [cartVisible, setCartVisible] = useState(true);

  useEffect(() => {
    const target = cartRef.current;
    if (!target) {
      setCartVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCartVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [cartRef]);

  const myItems = draftItems.filter((i) => i.addedBy.id === participantId);
  const totalQty = myItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = myItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Hide when no items (unless locked with items), or when cart is visible on screen
  if (totalQty === 0 && !isLocked) return null;
  if (cartVisible && totalQty > 0) return null;

  function scrollToCart() {
    cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (isLocked) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg lg:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center">
          <div className="flex items-center gap-2 text-base font-semibold text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Order Locked
            {totalQty > 0 && (
              <span className="text-gray-500 font-normal ml-2">
                {totalQty} item{totalQty !== 1 ? 's' : ''} - ${totalPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg lg:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={scrollToCart}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl px-3 min-h-[48px] hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4m0 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m-5-4a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {totalQty} item{totalQty !== 1 ? 's' : ''}
        </button>
        {/* Direction E Rec #2 (highest-ROI fix): the mobile checkout button is
            the most-tapped surface in the app. It MUST be yellow (cart color
            per the design system), >=48px tall (Material), and read at a
            glance. Blue / py-2.5 / text-sm was wrong on all three counts. */}
        <button
          onClick={onCheckout}
          className="flex-1 py-3.5 min-h-[48px] bg-brand-yellow text-gray-900 font-semibold tracking-[0.08em] rounded-xl hover:bg-yellow-400 active:bg-yellow-500 transition-colors text-base text-center shadow-warm-md"
        >
          Checkout - ${totalPrice.toFixed(2)}
        </button>
      </div>
    </div>
  );
}
