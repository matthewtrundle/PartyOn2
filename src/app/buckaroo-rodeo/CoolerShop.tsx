'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useCartContext } from '@/contexts/CartContext';
import type { Product } from '@/lib/types';
import CompactProductCard from '@/components/shopify/CompactProductCard';
import ProductModal from '@/components/ProductModal';

const ORDER_HREF = '/order?event=rodeo-cruise&ref=PREMIER&p=boat&d=boat';

interface CoolerShopProps {
  /** Curated crowd-pleaser products, server-fetched in display order. */
  products: Product[];
}

/**
 * Inline shop for the Buckaroo Rodeo page — a curated grid of crowd-pleasers
 * (3 across on mobile, 4 across on desktop) rendered with the site's
 * CompactProductCard + solo cart (CartContext). Items added here check out via
 * the normal /cart → /checkout flow — free delivery to the boat, no minimum.
 * A floating "view cart" button appears once anything has been added.
 */
export default function CoolerShop({ products }: CoolerShopProps): ReactElement {
  const { cart } = useCartContext();
  const [selected, setSelected] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const count = cart?.totalQuantity ?? 0;

  const openProduct = (product: Product): void => {
    setSelected(product);
    setModalOpen(true);
  };

  return (
    <div>
      {/* Delivery-context note */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-brand-blue/20 bg-white/70 p-4 text-sm text-gray-700">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-brand-blue"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-5M12 8h.01" />
        </svg>
        <span>
          Add anything here and check out — it’s{' '}
          <strong className="font-semibold text-gray-900">free delivery straight to your boat</strong>{' '}
          on Sunday, July 12, no minimum. Questions? Text or call{' '}
          <a href="tel:+17373719700" className="font-semibold text-brand-blue underline">
            (737) 371-9700
          </a>
          .
        </span>
      </div>

      {/* Grid — 3 across on mobile, 4 across on desktop */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-4 lg:gap-4">
        {products.map((product, i) => (
          <CompactProductCard
            key={`${product.id}-${i}`}
            product={product}
            index={i}
            onProductClick={openProduct}
          />
        ))}
      </div>

      {/* Browse the full catalog */}
      <div className="mt-8 text-center">
        <a
          href={ORDER_HREF}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-blue px-7 py-3 font-heading text-base font-bold uppercase tracking-[0.08em] text-brand-blue transition-colors hover:bg-brand-blue hover:text-white"
        >
          Browse the Full Menu
        </a>
      </div>

      {/* Floating cart button — appears once items are in the cart (bottom-left to clear the chat bubble) */}
      {count > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-5 py-3 font-heading text-base font-bold uppercase tracking-[0.08em] text-black shadow-[0_8px_24px_rgba(11,31,51,0.28)] transition-colors hover:bg-yellow-400"
        >
          View Cart ({count})
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}

      <ProductModal product={selected} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
