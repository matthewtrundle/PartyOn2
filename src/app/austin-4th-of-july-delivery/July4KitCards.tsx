'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { formatPrice, getProductImageUrl, getFirstAvailableVariant, canPurchaseAlcohol } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';
import AgeVerificationModal from '@/components/AgeVerificationModal';

interface KitMeta {
  hook: string;
  ingredients: string[];
  accent: string;
  featured?: boolean;
}

// Static display copy per kit, keyed by product handle. Price/image/variant come live from the DB.
const KIT_META: Record<string, KitMeta> = {
  'strawberry-lemonade-vodka-kit-serves-16': {
    hook: 'Bright, red, and ridiculously easy-drinking.',
    ingredients: ['Deep Eddy Lemon Vodka', 'Fresh Victor Strawberry & Lemon (×2)', 'Drink dispenser included'],
    accent: '#C8102E',
  },
  'blue-margarita-kit-serves-16': {
    hook: 'Our Austin margarita, gone blue.',
    ingredients: [
      'Lunazul Blanco Tequila',
      'Fresh Victor Mexican Lime & Agave (×2)',
      'Leroy Blue Curaçao',
      'H-E-B Club Soda',
      'Drink dispenser included',
    ],
    accent: '#0B74B8',
    featured: true,
  },
  'coconut-colada-kit-serves-16': {
    hook: 'Creamy, dreamy, and tropical.',
    ingredients: [
      'Largo Bay Coquito Coconut Cream Liqueur',
      'Bacardi Superior White Rum',
      'Fresh Victor Pineapple & Ginger',
      'Drink dispenser included',
    ],
    accent: '#E8EDF2',
  },
};

const CheckIcon = () => (
  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

function KitCard({ product }: { product: Product }) {
  const meta: KitMeta = KIT_META[product.handle] ?? { hook: '', ingredients: [], accent: '#0B74B8' };
  const { addToCart, loading } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showAge, setShowAge] = useState(false);

  const variant = getFirstAvailableVariant(product);
  const imageUrl = getProductImageUrl(product);
  const price = product.priceRange.minVariantPrice;
  const available = Boolean(variant?.availableForSale);

  const doAdd = async (): Promise<void> => {
    if (!variant?.id) return;
    setIsAdding(true);
    try {
      await addToCart(variant.id, 1);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2200);
    } catch (error) {
      console.error('Add to cart failed:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAdd = (): void => {
    if (!variant?.id || !available) return;
    if (!canPurchaseAlcohol()) {
      setShowAge(true);
      return;
    }
    void doAdd();
  };

  const handleVerified = (): void => {
    setShowAge(false);
    localStorage.setItem('age_verified', 'true');
    if (variant?.id && available) void doAdd();
  };

  const label = isAdding || loading ? 'Adding…' : justAdded ? 'Added to cart' : available ? 'Add to Cart' : 'Unavailable';

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl p-6 backdrop-blur-md ${
        meta.featured ? 'border-2' : 'border'
      }`}
      style={{
        background: 'rgba(13,30,52,0.62)',
        borderColor: meta.featured ? '#D4AF37' : 'rgba(255,255,255,0.12)',
        boxShadow: meta.featured ? '0 24px 60px -20px rgba(0,0,0,0.7)' : '0 14px 40px -22px rgba(0,0,0,0.6)',
      }}
    >
      {meta.featured && (
        <span className="eyebrow absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-gold px-3 py-1 text-xs text-gray-900 shadow-lg">
          Our Pick
        </span>
      )}

      <div className="relative mb-5 aspect-square overflow-hidden rounded-xl bg-white/5">
        {imageUrl ? (
          <Image src={imageUrl} alt={product.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `radial-gradient(circle at 50% 35%, ${meta.accent}33, transparent 70%)` }}
          >
            <span className="font-heading text-5xl tracking-[0.1em] text-white/25">POD</span>
          </div>
        )}
      </div>

      <h3 className="font-heading text-2xl tracking-[0.06em] text-white">
        {product.title.replace(' • Serves 16', '')}
      </h3>
      <p className="editorial mt-1 text-lg text-white/70">{meta.hook}</p>

      <ul className="mt-4 grow space-y-1.5 text-sm text-white/80">
        {meta.ingredients.map((ing) => (
          <li key={ing} className="flex gap-2">
            <CheckIcon />
            <span>{ing}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="num text-3xl text-white">{formatPrice(price.amount, price.currencyCode)}</span>
        <span className="text-sm text-white/60">serves 16</span>
      </div>

      <button type="button" onClick={handleAdd} disabled={!available || isAdding || loading} className="btn-cart mt-5 w-full disabled:opacity-50">
        {label}
      </button>

      <AgeVerificationModal isOpen={showAge} onClose={() => setShowAge(false)} onVerify={handleVerified} />
    </div>
  );
}

export default function July4KitCards({ kits }: { kits: Product[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
      {kits.map((kit) => (
        <KitCard key={kit.id} product={kit} />
      ))}
    </div>
  );
}
