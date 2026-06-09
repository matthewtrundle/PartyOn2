'use client';

import { useState, useCallback, useRef, forwardRef, type ReactElement } from 'react';
import Image from 'next/image';
import type {
  DraftCartItemView,
  PurchasedItemView,
  ParticipantSummary,
  AppliedPromo,
} from '@/lib/group-orders-v2/types';
import type { Product } from '@/lib/types/product';
import {
  updateDraftItemV2,
  removeDraftItemV2,
} from '@/lib/group-orders-v2/api-client';
import ProductDetailModal from './ProductDetailModal';

interface Props {
  shareCode: string;
  tabId: string;
  participantId: string;
  participants: ParticipantSummary[];
  draftItems: DraftCartItemView[];
  purchasedItems: PurchasedItemView[];
  isLocked?: boolean;
  deliveryFee: number;
  appliedPromo?: AppliedPromo | null;
  onItemChanged: () => void;
  onCheckoutMine: () => void;
  onCheckoutAll: () => void;
}

const OrderSidebar = forwardRef<HTMLDivElement, Props>(function OrderSidebar(
  {
    shareCode,
    tabId,
    participantId,
    participants,
    draftItems,
    purchasedItems,
    isLocked,
    deliveryFee: tabDeliveryFee,
    appliedPromo,
    onItemChanged,
    onCheckoutMine,
    onCheckoutAll,
  },
  ref
): ReactElement {
  const [expanded, setExpanded] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Derive current item from props so qty updates reactively after onItemChanged
  const selectedItem = selectedItemId ? draftItems.find((i) => i.id === selectedItemId) ?? null : null;

  const openProductModal = useCallback(async (item: DraftCartItemView) => {
    if (!item.handle) return;
    setSelectedItemId(item.id);
    setLoadingProduct(true);
    try {
      const res = await fetch(`/api/products/${item.handle}`);
      if (res.ok) {
        setSelectedProduct(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
    } finally {
      setLoadingProduct(false);
    }
  }, []);

  const closeProductModal = useCallback(() => {
    setSelectedItemId(null);
    setSelectedProduct(null);
  }, []);

  const isSolo = participants.filter((p) => p.status === 'ACTIVE').length <= 1;
  const myItems = draftItems.filter((i) => i.addedBy.id === participantId);
  const othersItems = draftItems.filter((i) => i.addedBy.id !== participantId);
  const myPurchased = purchasedItems.filter((i) => i.purchaser.id === participantId);
  const othersPurchased = purchasedItems.filter((i) => i.purchaser.id !== participantId);

  const totalQty = myItems.reduce((sum, i) => sum + i.quantity, 0);
  const myTotal = myItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const allDraftTotal = draftItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const hasPurchased = purchasedItems.length > 0;

  async function handleUpdate(itemId: string, newQty: number) {
    setUpdatingId(itemId);
    try {
      if (newQty <= 0) {
        await removeDraftItemV2(shareCode, tabId, itemId, participantId);
      } else {
        await updateDraftItemV2(shareCode, tabId, itemId, participantId, newQty);
      }
      onItemChanged();
    } catch (err) {
      console.error('Failed to update item:', err);
    } finally {
      setUpdatingId(null);
    }
  }

  // Group others' items by participant
  const othersByParticipant = new Map<string, { name: string; items: DraftCartItemView[]; purchased: PurchasedItemView[] }>();
  for (const item of othersItems) {
    const key = item.addedBy.id;
    if (!othersByParticipant.has(key)) {
      othersByParticipant.set(key, { name: item.addedBy.name, items: [], purchased: [] });
    }
    othersByParticipant.get(key)!.items.push(item);
  }
  for (const item of othersPurchased) {
    const key = item.purchaser.id;
    if (!othersByParticipant.has(key)) {
      othersByParticipant.set(key, { name: item.purchaser.name, items: [], purchased: [] });
    }
    othersByParticipant.get(key)!.purchased.push(item);
  }

  const isEmpty = draftItems.length === 0 && purchasedItems.length === 0;

  function renderItemRow(item: DraftCartItemView, editable: boolean) {
    const isUpdating = updatingId === item.id;
    const isFreeItem = item.price === 0;
    const clickable = !!item.handle;
    return (
      <div key={item.id} className="flex items-start gap-3 py-3">
        <button
          type="button"
          onClick={() => clickable && openProductModal(item)}
          disabled={!clickable}
          className={`w-14 h-14 rounded-lg bg-cream flex-shrink-0 relative overflow-hidden ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-brand-blue/30 transition-shadow' : ''}`}
        >
          {item.imageUrl && (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="56px"
            />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => clickable && openProductModal(item)}
            disabled={!clickable}
            className={`text-sm font-medium text-gray-900 leading-snug text-left ${clickable ? 'hover:text-brand-blue transition-colors' : ''}`}
          >
            {item.title}
          </button>
          {item.variantTitle && (
            <p className="text-xs text-gray-500">{item.variantTitle}</p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            {isFreeItem ? (
              <span className="text-sm font-semibold text-green-600">
                FREE
                {item.compareAtPrice != null && (
                  <span className="text-xs font-normal text-gray-400 line-through ml-1">
                    ${item.compareAtPrice.toFixed(2)}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-sm font-semibold text-gray-900">
                ${(item.price * item.quantity).toFixed(2)}
                {item.quantity > 1 && (
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    (${item.price.toFixed(2)} ea)
                  </span>
                )}
              </span>
            )}
            {isFreeItem ? (
              editable && !isLocked ? (
                <button
                  onClick={() => handleUpdate(item.id, 0)}
                  disabled={isUpdating}
                  className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Remove"
                >
                  {isUpdating ? (
                    <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              ) : (
                <span className="text-xs text-green-600 font-medium">x{item.quantity}</span>
              )
            ) : editable && !isLocked ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleUpdate(item.id, item.quantity - 1)}
                  disabled={isUpdating}
                  className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                >
                  {item.quantity === 1 ? (
                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">-</span>
                  )}
                </button>
                {editingItemId === item.id ? (
                  <input
                    ref={editInputRef}
                    type="number"
                    min="1"
                    step="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      } else if (e.key === 'Escape') {
                        setEditingItemId(null);
                      }
                    }}
                    onBlur={() => {
                      const val = parseInt(editValue, 10);
                      if (!isNaN(val) && val !== item.quantity) {
                        handleUpdate(item.id, val);
                      } else if (editValue === '' || val === 0) {
                        handleUpdate(item.id, 0);
                      }
                      setEditingItemId(null);
                    }}
                    className="w-8 text-center text-sm font-semibold bg-white border border-brand-blue rounded outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isUpdating) return;
                      setEditingItemId(item.id);
                      setEditValue(String(item.quantity));
                      setTimeout(() => editInputRef.current?.select(), 0);
                    }}
                    className="w-8 text-center text-sm font-semibold cursor-text hover:bg-gray-100 rounded transition-colors"
                  >
                    {isUpdating ? (
                      <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      item.quantity
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleUpdate(item.id, item.quantity + 1)}
                  disabled={isUpdating}
                  className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                >
                  <span className="text-sm font-medium">+</span>
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-500">x{item.quantity}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderPurchasedRow(item: PurchasedItemView) {
    return (
      <div key={item.id} className="flex items-center gap-3 py-3 opacity-50">
        <div className="w-14 h-14 rounded-lg bg-cream flex-shrink-0 relative overflow-hidden">
          {item.imageUrl && (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="56px"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 truncate line-through">
            {item.title}
          </p>
          <p className="text-sm text-green-600">Paid</p>
        </div>
        <span className="text-sm text-gray-500">x{item.quantity}</span>
        <span className="text-sm text-gray-500 w-20 text-right">
          ${(item.price * item.quantity).toFixed(2)}
        </span>
      </div>
    );
  }

  // Desktop sidebar content
  function renderCartContent() {
    if (isEmpty) {
      return (
        <div className="text-center py-12 px-4">
          <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4m0 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m-5-4a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-base text-gray-500">Your cart is empty</p>
          <p className="text-sm text-gray-400 mt-1">Browse products to get started</p>
        </div>
      );
    }

    if (isSolo) {
      return (
        <>
          <div className="divide-y divide-gray-100 px-5">
            {myItems.map((item) => renderItemRow(item, true))}
            {myPurchased.map(renderPurchasedRow)}
          </div>
          {renderCheckoutButtons()}
        </>
      );
    }

    // Multi-participant view
    return (
      <>
        <div className="px-5">
          {/* Your items */}
          {(myItems.length > 0 || myPurchased.length > 0) && (
            <div className="pb-3">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 pt-3">
                Your Items
              </p>
              <div className="divide-y divide-gray-100">
                {myItems.map((item) => renderItemRow(item, true))}
                {myPurchased.map(renderPurchasedRow)}
              </div>
            </div>
          )}

          {/* Others' items grouped by person */}
          {Array.from(othersByParticipant.entries()).map(([pid, group]) => (
            <div key={pid} className="pb-3 border-t border-gray-200">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 pt-3">
                {group.name}&apos;s Items
              </p>
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => renderItemRow(item, false))}
                {group.purchased.map(renderPurchasedRow)}
              </div>
            </div>
          ))}
        </div>
        {renderCheckoutButtons()}
      </>
    );
  }

  function renderCheckoutButtons() {
    if (isEmpty) return null;

    const deliveryFee = tabDeliveryFee || 40;
    const hasFreeDelivery = appliedPromo?.freeDelivery === true;

    return (
      <div data-tour="checkout-buttons" className="px-5 py-4 bg-gray-50 border-t border-gray-100">
        {/* Delivery fee line */}
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Delivery Fee</span>
          {hasFreeDelivery ? (
            <span className="flex items-center gap-1.5">
              <span className="text-gray-400 line-through">${deliveryFee.toFixed(2)}</span>
              <span className="text-green-600 font-semibold">FREE</span>
            </span>
          ) : (
            <span className="text-gray-600">${deliveryFee.toFixed(2)}</span>
          )}
        </div>

        {/* Promo badge */}
        {appliedPromo && (
          <div className="flex items-center gap-1.5 mb-3">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium text-green-700 truncate">
              {appliedPromo.label}
            </span>
          </div>
        )}

        {isSolo ? (
          // Direction E Rec #2: solo checkout button is the cart CTA -- yellow,
          // 48px min, warm shadow, rounded-xl to match the card family.
          <button
            onClick={onCheckoutMine}
            disabled={myItems.length === 0 || isLocked}
            className="w-full py-3.5 min-h-[48px] bg-brand-yellow text-gray-900 text-base font-semibold tracking-[0.08em] rounded-xl hover:bg-yellow-400 active:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-warm-md"
          >
            Checkout - ${myTotal.toFixed(2)}
          </button>
        ) : (
          <div className="space-y-2">
            {myItems.length > 0 && (
              // "Checkout My Items" stays blue to visually distinguish from the
              // "Pay for Everything" primary action below (which is yellow).
              // Both still meet the 48px tap-target floor.
              <button
                onClick={onCheckoutMine}
                disabled={isLocked}
                className="w-full py-3.5 min-h-[48px] bg-brand-blue text-white text-base font-semibold tracking-[0.08em] rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
              >
                Checkout My Items - ${myTotal.toFixed(2)}
              </button>
            )}
            {draftItems.length > 0 && (
              <button
                onClick={onCheckoutAll}
                disabled={isLocked}
                className="w-full py-3.5 min-h-[48px] bg-brand-yellow text-gray-900 text-base font-semibold tracking-[0.08em] rounded-xl hover:bg-yellow-400 active:bg-yellow-500 transition-colors disabled:opacity-50 shadow-warm-md"
              >
                {hasPurchased
                  ? `Pay for Remaining - $${allDraftTotal.toFixed(2)}`
                  : `Pay for Everything - $${allDraftTotal.toFixed(2)}`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop sidebar -- hidden on mobile */}
      <div className="hidden lg:block">
        {/* Direction E: no border on cream -- rely on the warm shadow alone.
            rounded-2xl matches the WelcomeHero family. */}
        <div data-tour="cart" className="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto bg-white rounded-2xl shadow-warm-md">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4m0 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m-5-4a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-base font-semibold text-gray-900">
                Cart ({totalQty} item{totalQty !== 1 ? 's' : ''})
              </span>
              <span className="ml-auto text-base font-bold text-gray-900">
                ${myTotal.toFixed(2)}
              </span>
            </div>
            {/* Direction E premium accent: 48px gold rule under the cart head. */}
            <div className="h-px w-12 bg-gold mt-3" />
          </div>
          {renderCartContent()}

        </div>
      </div>

      {/* Mobile collapsible cart -- hidden when empty */}
      {!isEmpty && (
        <div ref={ref} className="lg:hidden mb-6" data-tour="cart">
          <div className="bg-white rounded-2xl shadow-warm-md overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4m0 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m-5-4a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-base font-semibold text-gray-900">
                  Cart ({totalQty} item{totalQty !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-gray-900">${myTotal.toFixed(2)}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expanded && (
              <div className="border-t border-gray-100">
                {renderCartContent()}

              </div>
            )}
          </div>
        </div>
      )}

      {/* Product detail modal -- opened by clicking cart items */}
      {selectedProduct && selectedItem && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={closeProductModal}
          qty={selectedItem.quantity}
          busy={updatingId === selectedItem.id}
          available={true}
          isLocked={isLocked}
          onAddToCart={() => {
            handleUpdate(selectedItem.id, selectedItem.quantity + 1);
          }}
          onIncrement={() => {
            handleUpdate(selectedItem.id, selectedItem.quantity + 1);
          }}
          onDecrement={() => {
            handleUpdate(selectedItem.id, selectedItem.quantity - 1);
            if (selectedItem.quantity <= 1) closeProductModal();
          }}
          onSetQuantity={(q) => {
            handleUpdate(selectedItem.id, q);
            if (q <= 0) closeProductModal();
          }}
        />
      )}

      {/* Loading overlay for product fetch */}
      {loadingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
            <span className="inline-block w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-700">Loading product details...</span>
          </div>
        </div>
      )}
    </>
  );
});

export default OrderSidebar;
