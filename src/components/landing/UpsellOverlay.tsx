'use client';

/**
 * UPSELL OVERLAY
 *
 * Renders absolutely-positioned inside a parent modal (PackageBuilderModal
 * or QuickBuyModal). Surfaces 12 add-on products in two 6-item grids right
 * before the customer commits to checkout, giving them one last chance to
 * grab high-margin extras or top sellers.
 *
 * Designed to dismiss easily — big black X in a white circle (top-right)
 * and a "Continue to Checkout" button at the bottom.
 */

import Image from 'next/image';
import { useState } from 'react';
import type { ThemeColors } from './types';
import type { UpsellProduct, UpsellProducts } from '@/lib/landing/getUpsellProducts';

type Props = {
  open: boolean;
  products: UpsellProducts;
  theme: ThemeColors;
  /** Called when the customer adds an item; parent merges into its cart. */
  onAdd: (p: UpsellProduct) => void;
  /** Dismiss without adding more — proceed to checkout. */
  onClose: () => void;
};

export default function UpsellOverlay({ open, products, theme: T, onAdd, onClose }: Props) {
  // Per-product qty added during this overlay session. Increments via the
  // stepper; never goes below 0 (a confirmed remove would zero it out).
  const [qtyByHandle, setQtyByHandle] = useState<Record<string, number>>({});

  if (!open) return null;

  const bumpQty = (p: UpsellProduct, delta: number) => {
    setQtyByHandle((s) => {
      const cur = s[p.handle] ?? 0;
      const next = Math.max(0, cur + delta);
      return { ...s, [p.handle]: next };
    });
    if (delta > 0) onAdd(p);
    // Note: parent doesn't currently support de-increment from upsell, so a
    // minus on the overlay just decrements the local count display — the
    // customer can manage final qty back in the main cart list.
  };

  const handleAddOne = (p: UpsellProduct) => bumpQty(p, +1);
  const totalAdded = Object.values(qtyByHandle).reduce((s, n) => s + (n > 0 ? 1 : 0), 0);

  return (
    <div
      // Absolute layer over the parent modal's content area. Parent has
      // `position: relative` (the modal shell) so this fills it edge-to-edge.
      className="absolute inset-0 z-[60] flex items-center justify-center p-3 sm:p-5"
      style={{ background: 'rgba(10,15,25,0.62)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-full overflow-hidden flex flex-col rounded-2xl shadow-2xl"
        style={{ background: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Big X in white-bg black circle, top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close upsell"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold leading-none transition-transform hover:scale-110"
          style={{ background: '#FFFFFF', color: '#000000', border: '2px solid #000000' }}
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex-shrink-0 px-5 sm:px-7 pt-6 pb-3">
          <p
            className="text-xs font-bold tracking-[0.22em] mb-1"
            style={{ color: T.primary }}
          >
            BEFORE YOU CHECK OUT
          </p>
          <h2
            id="upsell-title"
            className="font-heading text-2xl sm:text-3xl font-bold leading-tight"
            style={{ color: T.navy }}
          >
            One more thing.
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Top add-ons groups grab last-minute. Tap to drop one in.
          </p>
        </div>

        {/* Scrollable body — two grids */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 pb-4">
          <UpsellGrid
            label="ADD TO YOUR ORDER"
            products={products.addons}
            qtyByHandle={qtyByHandle}
            onBump={bumpQty}
            onAddOne={handleAddOne}
            theme={T}
          />
          <div className="mt-5">
            <UpsellGrid
              label="GROUPS ALSO BUY"
              products={products.topSellers}
              qtyByHandle={qtyByHandle}
              onBump={bumpQty}
              onAddOne={handleAddOne}
              theme={T}
            />
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div
          className="flex-shrink-0 px-5 sm:px-7 py-3 border-t flex items-center justify-between gap-3"
          style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
        >
          <div className="text-xs text-gray-500">
            {totalAdded === 0
              ? 'No thanks?'
              : `${totalAdded} add-on${totalAdded !== 1 ? 's' : ''} added`}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 font-bold rounded-md text-sm sm:text-base tracking-wide shadow-md transition-transform hover:scale-[1.02]"
            style={{ background: T.primary, color: T.primaryText }}
          >
            Continue to Checkout →
          </button>
        </div>
      </div>
    </div>
  );
}

function UpsellGrid({
  label,
  products,
  qtyByHandle,
  onBump,
  onAddOne,
  theme: T,
}: {
  label: string;
  products: UpsellProduct[];
  qtyByHandle: Record<string, number>;
  onBump: (p: UpsellProduct, delta: number) => void;
  onAddOne: (p: UpsellProduct) => void;
  theme: ThemeColors;
}) {
  if (products.length === 0) return null;
  return (
    <div>
      <div
        className="text-xs font-bold tracking-[0.18em] mb-2"
        style={{ color: T.navy }}
      >
        {label}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {products.map((p) => {
          const qty = qtyByHandle[p.handle] ?? 0;
          const isAdded = qty > 0;
          return (
            <div
              key={p.handle}
              className="relative rounded-xl bg-white overflow-hidden flex flex-col transition-all"
              style={{
                border: isAdded ? `2px solid ${T.primary}` : '1px solid #E5E7EB',
                boxShadow: isAdded ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="relative w-full bg-white flex items-center justify-center flex-shrink-0 border-b border-gray-100"
                style={{ height: '90px' }}
              >
                {p.image ? (
                  <Image
                    // Image URLs in the DB are already URL-encoded
                    // (e.g. "Lady%20Bird%20Margarita"); re-encoding would
                    // double-encode to "%2520" and break Next/Image.
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(min-width: 768px) 20vw, 45vw"
                    className="object-contain p-3"
                  />
                ) : (
                  <span className="text-3xl opacity-80">🥂</span>
                )}
                {isAdded && (
                  <div
                    className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-xs font-bold shadow"
                    style={{ background: T.primary, color: T.primaryText }}
                  >
                    ×{qty}
                  </div>
                )}
              </div>
              <div className="p-2 flex flex-col flex-1">
                <div
                  className="text-xs font-bold leading-tight text-center mb-1"
                  style={{
                    color: T.navy,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '2.2em',
                  }}
                >
                  {p.name}
                </div>
                <div className="flex items-baseline justify-between mb-1.5 px-0.5">
                  <span className="text-xs text-gray-500 truncate">
                    {p.detail || ' '}
                  </span>
                  <span className="font-bold text-xs whitespace-nowrap" style={{ color: T.blue }}>
                    ${p.unitPrice}
                  </span>
                </div>
                {qty === 0 ? (
                  <button
                    type="button"
                    onClick={() => onAddOne(p)}
                    className="text-xs font-bold py-1.5 rounded-md w-full transition-all"
                    style={{ background: T.primary, color: T.primaryText }}
                  >
                    + Add
                  </button>
                ) : (
                  <div
                    className="flex items-center justify-between rounded-md px-1 py-0.5 transition-all"
                    style={{ background: T.primary }}
                  >
                    <button
                      type="button"
                      onClick={() => onBump(p, -1)}
                      className="w-6 h-6 rounded-full bg-white/80 hover:bg-white text-base font-bold leading-none"
                      style={{ color: T.primaryText }}
                      aria-label={`Decrease ${p.name}`}
                    >
                      −
                    </button>
                    <span
                      className="text-xs font-bold"
                      style={{ color: T.primaryText }}
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onBump(p, +1)}
                      className="w-6 h-6 rounded-full bg-white/80 hover:bg-white text-base font-bold leading-none"
                      style={{ color: T.primaryText }}
                      aria-label={`Increase ${p.name}`}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
