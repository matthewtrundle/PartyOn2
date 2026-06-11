'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import { Product } from '@/lib/types';
import { formatPrice, getProductImageUrl, getFirstAvailableVariant, canPurchaseAlcohol } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';
import AgeVerificationModal from '@/components/AgeVerificationModal';
import { setAgeVerified } from "@/lib/utils/age-verification";

/**
 * Equipment rentals and party supplies section for keg page
 * Fetches actual products from Shopify and displays with Add to Cart
 */

// Product handles to fetch
const EQUIPMENT_HANDLES = [
  'ultimate-keg-party-package',
  'keg-tub-rental',
  'keg-tap-rental',
  'bag-of-ice-7-lbs',
  '240-16-oz-solo-cups',
  '10-ping-pong-balls',
  'folding-table-rental-6ft',
];

const FEATURED_HANDLE = 'ultimate-keg-party-package';

interface EquipmentCardProps {
  product: Product;
  featured?: boolean;
}

function EquipmentCard({ product, featured = false }: EquipmentCardProps) {
  const { addToCart, loading: cartLoading } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);

  const imageUrl = getProductImageUrl(product);
  const variant = getFirstAvailableVariant(product);
  const price = product.priceRange.minVariantPrice;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!variant?.id || !variant.availableForSale) return;

    if (!canPurchaseAlcohol()) {
      setShowAgeVerification(true);
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(variant.id, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    setAgeVerified();

    if (variant?.id && variant.availableForSale) {
      setIsAdding(true);
      try {
        await addToCart(variant.id, 1);
      } catch (error) {
        console.error('Error adding to cart:', error);
      } finally {
        setIsAdding(false);
      }
    }
  };

  if (featured) {
    return (
      <>
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-brand-yellow hover:border-brand-yellow transition-all duration-300 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <Link href={`/products/${product.handle}`} className="md:w-1/3 aspect-video md:aspect-auto">
              <div className="relative h-full min-h-[200px] bg-white">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.title}
                    className="w-full h-full object-contain p-4"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
            </Link>

            {/* Content */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-heading text-xl md:text-2xl text-gray-900 tracking-[0.05em]">
                  {product.title}
                </h3>
                <span className="bg-brand-yellow text-gray-900 text-xs px-2 py-0.5 rounded font-medium">
                  BEST VALUE
                </span>
              </div>
              <p className="text-gray-600 text-sm md:text-base mb-4 line-clamp-2">
                {product.description || 'Everything you need for your keg party!'}
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-3xl md:text-4xl font-medium text-brand-yellow">
                  {formatPrice(price.amount, price.currencyCode)}
                </p>

                <button
                  onClick={handleAddToCart}
                  disabled={!variant?.availableForSale || isAdding || cartLoading}
                  className={`px-6 py-2 text-sm font-medium tracking-[0.1em] transition-colors ${
                    variant?.availableForSale && !isAdding && !cartLoading
                      ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isAdding || cartLoading ? 'ADDING...' : variant?.availableForSale ? 'ADD TO CART' : 'SOLD OUT'}
                </button>

                <Link
                  href={`/products/${product.handle}`}
                  className="text-yellow-600 text-sm font-medium tracking-[0.1em] hover:text-yellow-700"
                >
                  VIEW DETAILS →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <AgeVerificationModal
          isOpen={showAgeVerification}
          onClose={() => setShowAgeVerification(false)}
          onVerify={handleAgeVerified}
        />
      </>
    );
  }

  // Regular card
  return (
    <>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 hover:border-brand-yellow transition-all duration-300 h-full flex flex-col overflow-hidden group">
        {/* Image */}
        <Link href={`/products/${product.handle}`} className="block">
          <div className="relative aspect-square bg-gray-50 overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.title}
                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}

            {/* Out of Stock Overlay */}
            {!variant?.availableForSale && (
              <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                <span className="text-white font-light tracking-[0.1em] text-xs">SOLD OUT</span>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-3 md:p-4 flex-1 flex flex-col">
          <Link href={`/products/${product.handle}`}>
            <h3 className="font-heading text-xs md:text-sm text-gray-900 mb-1 tracking-[0.02em] text-center leading-tight hover:text-brand-yellow transition-colors line-clamp-2">
              {product.title}
            </h3>
          </Link>

          <p className="text-lg md:text-xl font-medium text-brand-yellow text-center mb-3">
            {formatPrice(price.amount, price.currencyCode)}
          </p>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!variant?.availableForSale || isAdding || cartLoading}
            className={`mt-auto w-full py-2 text-xs font-medium tracking-wider transition-colors ${
              variant?.availableForSale && !isAdding && !cartLoading
                ? 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isAdding || cartLoading ? 'ADDING...' : variant?.availableForSale ? 'ADD TO CART' : 'SOLD OUT'}
          </button>
        </div>
      </div>

      <AgeVerificationModal
        isOpen={showAgeVerification}
        onClose={() => setShowAgeVerification(false)}
        onVerify={handleAgeVerified}
      />
    </>
  );
}

export default function EquipmentRentals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        // Fetch products by handles
        const responses = await Promise.all(
          EQUIPMENT_HANDLES.map(handle =>
            fetch(`/api/products/${handle}`).then(r => r.ok ? r.json() : null)
          )
        );

        const validProducts = responses.filter(Boolean) as Product[];
        setProducts(validProducts);
      } catch (error) {
        console.error('Error fetching equipment products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const featuredProduct = products.find(p => p.handle === FEATURED_HANDLE);
  const regularProducts = products.filter(p => p.handle !== FEATURED_HANDLE);

  if (loading) {
    return (
      <section className="py-12 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="font-heading font-light text-3xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Party Supplies & Rentals
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-4 md:mb-6" />
          </div>

          {/* Loading skeleton */}
          <div className="animate-pulse">
            <div className="bg-gray-200 h-48 rounded-lg mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-64 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <ScrollRevealCSS duration={800} y={20} className="text-center mb-10 md:mb-16">
          <h2 className="font-heading font-light text-3xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
            Party Supplies & Rentals
          </h2>
          <div className="w-16 h-px bg-brand-yellow mx-auto mb-4 md:mb-6" />
          <p className="text-gray-600 text-sm md:text-lg max-w-2xl mx-auto">
            Everything you need to tap and serve your keg.
          </p>
        </ScrollRevealCSS>

        {/* Featured Package */}
        {featuredProduct && (
          <ScrollRevealCSS duration={800} y={20} className="mb-8">
            <EquipmentCard product={featuredProduct} featured />
          </ScrollRevealCSS>
        )}

        {/* Regular Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {regularProducts.map((product, index) => (
            <ScrollRevealCSS
              key={product.id}
              duration={800}
              y={20}
              delay={index * 50}
            >
              <EquipmentCard product={product} />
            </ScrollRevealCSS>
          ))}
        </div>

        {/* Deposit Notice */}
        <ScrollRevealCSS duration={800} y={20} delay={400} className="mt-8 md:mt-12">
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-gray-900 text-sm md:text-base">About Deposits</span>
            </div>
            <p className="text-gray-600 text-xs md:text-sm">
              <strong>$50 keg deposit</strong> refunded when empty keg is
              returned within 7 days.{' '}
              <Link href="/contact" className="text-brand-yellow hover:text-yellow-600 underline">
                Contact us
              </Link>{' '}
              for details.
            </p>
          </div>
        </ScrollRevealCSS>
      </div>
    </section>
  );
}
