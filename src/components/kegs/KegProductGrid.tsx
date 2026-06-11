'use client';

import { useState } from 'react';
import Link from 'next/link';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import ProductModal from '@/components/ProductModal';
import AgeVerificationModal from '@/components/AgeVerificationModal';
import { Product } from '@/lib/types';
import { useCartContext } from '@/contexts/CartContext';
import { canPurchaseAlcohol } from '@/lib/utils';
import { setAgeVerified } from "@/lib/utils/age-verification";

/**
 * Keg product grid with category tabs
 * Shows in-stock kegs vs request-a-quote kegs with prices from Shopify
 */

interface Keg {
  name: string;
  size: string;
  price?: string;
  inStock: boolean;
  handle?: string;
  category: 'domestics' | 'imports' | 'craft';
  sizeType: 'half' | 'slim';
}

const ALL_KEGS: Keg[] = [
  // Domestics
  { name: 'Miller Lite', size: '1/2 barrel', price: '$174.99', inStock: true, handle: 'miller-lite-keg', category: 'domestics', sizeType: 'half' },
  { name: 'Miller Lite', size: '1/4 barrel', price: '$109.99', inStock: true, handle: 'miller-lite-keg-1-4-barrel-5-5-gal', category: 'domestics', sizeType: 'slim' },
  { name: 'Michelob Ultra', size: '1/2 barrel', price: '$189.00', inStock: true, handle: 'michelob-ultra-1-2-barrel', category: 'domestics', sizeType: 'half' },
  { name: 'Lone Star', size: '1/2 barrel', price: '$163.99', inStock: true, handle: 'lone-star-keg-1-2-barrel', category: 'domestics', sizeType: 'half' },
  { name: 'Bud Light', size: '1/2 barrel', price: '$172.99', inStock: true, handle: 'bud-light-1-2-barrell', category: 'domestics', sizeType: 'half' },
  { name: 'Bud Light', size: '1/4 barrel', price: '$89.99', inStock: true, handle: 'bud-light-1-4-slim-barrell', category: 'domestics', sizeType: 'slim' },
  { name: 'Coors Light', size: '1/2 barrel', price: '$174.99', inStock: true, handle: '1-4-barrel-1-2-keg-of-coors-light', category: 'domestics', sizeType: 'half' },
  { name: 'Budweiser', size: '1/2 barrel', price: '$172.99', inStock: true, handle: 'budweiser-1-2-barrell', category: 'domestics', sizeType: 'half' },

  // Imports
  { name: 'Corona Extra', size: '1/2 barrel', price: '$189.99', inStock: true, handle: 'corona-extra-1-2-barrel', category: 'imports', sizeType: 'half' },
  { name: 'Modelo Especial', size: '1/2 barrel', price: '$189.99', inStock: true, handle: 'modelo-especial-keg-1-2-barrel-15-5gallons', category: 'imports', sizeType: 'half' },
  { name: 'Dos Equis', size: '1/2 barrel', price: '$214.99', inStock: true, handle: 'miller-lite-keg-1-2-barrel-11-gal-copy', category: 'imports', sizeType: 'half' },
  { name: 'Dos Equis', size: '1/6 barrel', price: '$89.99', inStock: true, handle: 'dos-equis-lager-1-6', category: 'imports', sizeType: 'slim' },
  { name: 'Dos Equis Slim', size: '20L', price: '$84.99', inStock: true, handle: 'dos-equis-keg-slim-keg-20l', category: 'imports', sizeType: 'slim' },

  // Craft
  { name: 'Austin BeerWorks Pearl Snap', size: '1/6 barrel', price: '$94.99', inStock: true, handle: 'austin-beer-works-pearl-snaps-1-6', category: 'craft', sizeType: 'slim' },
  { name: 'Karbach Love Street', size: '1/2 barrel', price: '$274.99', inStock: true, handle: 'karbach-love-street-1-2-barrell', category: 'craft', sizeType: 'half' },
  { name: 'Karbach Hopadillo', size: '1/6 barrel', price: '$109.99', inStock: true, handle: 'karbach-hopadillo-1-6-barrel', category: 'craft', sizeType: 'slim' },
  { name: 'Shiner Light Blonde', size: '1/2 barrel', price: '$189.00', inStock: true, handle: 'shiner-light-blonde-keg', category: 'craft', sizeType: 'half' },
  { name: 'Blue Moon Belgian White', size: '1/6 barrel', price: '$89.99', inStock: true, handle: 'blue-moon-belgian-white-1-6-barrel', category: 'craft', sizeType: 'slim' },
  { name: 'Yuengling', size: '1/4 barrel', price: '$114.99', inStock: true, handle: 'yuengling-slim-1-4-barrel', category: 'craft', sizeType: 'slim' },
  { name: 'Franziskaner Hefeweizen', size: '13.2 gal', price: '$199.00', inStock: true, handle: 'franziskaner-hefeweizen-13-2g-keg', category: 'craft', sizeType: 'slim' },
  { name: 'Electric Jellyfish Hazy IPA', size: '1/6 barrel', price: '$159.99', inStock: true, handle: 'electric-jellyfish-hazy-ipa-1-6-barrel', category: 'craft', sizeType: 'slim' },
];

const CATEGORIES = [
  { id: 'all', name: 'All Kegs' },
  { id: 'half', name: '1/2 Barrels' },
  { id: 'slim', name: 'Slim Kegs' },
  { id: 'domestics', name: 'Domestic' },
  { id: 'imports', name: 'Import' },
  { id: 'craft', name: 'Craft' },
];

export default function KegProductGrid() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingHandle, setLoadingHandle] = useState<string | null>(null);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [pendingCartAdd, setPendingCartAdd] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [productCache, setProductCache] = useState<Record<string, Product>>({});

  const { addToCart, loading: cartLoading } = useCartContext();

  const filteredKegs = activeCategory === 'all'
    ? ALL_KEGS
    : activeCategory === 'half' || activeCategory === 'slim'
      ? ALL_KEGS.filter(keg => keg.sizeType === activeCategory)
      : ALL_KEGS.filter(keg => keg.category === activeCategory);

  // Fetch product by handle
  const fetchProduct = async (handle: string): Promise<Product | null> => {
    // Check cache first
    if (productCache[handle]) {
      return productCache[handle];
    }

    try {
      const response = await fetch(`/api/products/${handle}`);
      if (!response.ok) return null;
      const product = await response.json();

      // Cache the product
      setProductCache(prev => ({ ...prev, [handle]: product }));
      return product;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  };

  // Handle title click - open modal with product details
  const handleTitleClick = async (keg: Keg) => {
    if (!keg.handle) return;

    setLoadingHandle(keg.handle);
    const product = await fetchProduct(keg.handle);
    setLoadingHandle(null);

    if (product) {
      setSelectedProduct(product);
      setIsModalOpen(true);
    }
  };

  // Handle add to cart
  const handleAddToCart = async (keg: Keg) => {
    if (!keg.handle) return;

    // Check age verification
    if (!canPurchaseAlcohol()) {
      setPendingCartAdd(keg.handle);
      setShowAgeVerification(true);
      return;
    }

    await addProductToCart(keg.handle);
  };

  // Actually add to cart
  const addProductToCart = async (handle: string) => {
    setAddingToCart(handle);

    try {
      const product = await fetchProduct(handle);
      if (!product) {
        console.error('Product not found');
        return;
      }

      const variant = product.variants?.edges?.[0]?.node;
      if (!variant?.id || !variant.availableForSale) {
        console.error('No available variant');
        return;
      }

      await addToCart(variant.id, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  // Handle age verification success
  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    setAgeVerified();

    if (pendingCartAdd) {
      await addProductToCart(pendingCartAdd);
      setPendingCartAdd(null);
    }
  };

  return (
    <>
      <section className="py-12 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-8 md:mb-12">
            <h2 className="font-heading font-light text-3xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Available Kegs
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-4 md:mb-6" />
            <p className="text-gray-600 text-sm md:text-lg max-w-2xl mx-auto">
              In-stock kegs available for delivery. Can&apos;t find your brand?
              Request a quote and we&apos;ll source it for you.
            </p>
          </ScrollRevealCSS>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 md:mb-12">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-3 md:px-6 py-2 md:py-3 tracking-[0.05em] md:tracking-[0.1em] text-xs md:text-sm transition-all duration-300 rounded ${
                  activeCategory === category.id
                    ? 'bg-brand-yellow text-gray-900'
                    : 'border border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900'
                }`}
              >
                {category.name.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Keg Grid */}
          <div
            key={activeCategory}
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6"
            style={{
              animation: 'result-fade-in 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
            }}
          >
            {filteredKegs.map((keg, index) => (
              <div
                key={`${keg.name}-${keg.size}`}
                className="bg-white rounded-lg p-4 md:p-6 shadow-lg border border-gray-200 hover:border-brand-yellow transition-all duration-300 text-center"
                style={{
                  animation: `result-fade-in 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
                  animationDelay: `${index * 30}ms`,
                  opacity: 0,
                }}
              >
                {/* In Stock Badge */}
                <div className="mb-3">
                  {keg.inStock ? (
                    <span className="bg-green-100 text-green-800 text-xs md:text-sm px-3 py-1 rounded-full font-medium">
                      In Stock
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 text-xs md:text-sm px-3 py-1 rounded-full font-medium">
                      Request Quote
                    </span>
                  )}
                </div>

                {/* Title - Clickable */}
                <button
                  onClick={() => handleTitleClick(keg)}
                  disabled={!keg.handle || loadingHandle === keg.handle}
                  className="w-full mb-1 hover:text-brand-yellow transition-colors disabled:cursor-default"
                >
                  <h3 className="font-heading text-lg md:text-2xl text-gray-900 tracking-[0.05em] leading-tight">
                    {loadingHandle === keg.handle ? 'Loading...' : keg.name}
                  </h3>
                </button>

                {/* Size */}
                <p className="text-gray-500 text-sm md:text-base mb-3">{keg.size}</p>

                {/* Price */}
                {keg.price ? (
                  <p className="text-2xl md:text-3xl font-medium text-brand-yellow mb-4">
                    {keg.price}
                  </p>
                ) : (
                  <p className="text-base md:text-lg text-gray-400 mb-4 italic">
                    Price on request
                  </p>
                )}

                {/* Action Button */}
                {keg.inStock && keg.handle ? (
                  <button
                    onClick={() => handleAddToCart(keg)}
                    disabled={addingToCart === keg.handle || cartLoading}
                    className={`w-full py-2 md:py-3 transition-colors tracking-[0.05em] md:tracking-[0.1em] text-xs md:text-sm font-medium rounded ${
                      addingToCart === keg.handle || cartLoading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-brand-yellow text-gray-900 hover:bg-yellow-600'
                    }`}
                  >
                    {addingToCart === keg.handle ? 'ADDING...' : 'ADD TO CART'}
                  </button>
                ) : (
                  <Link
                    href="/contact"
                    className="block w-full py-2 md:py-3 border border-brand-yellow text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.05em] md:tracking-[0.1em] text-xs md:text-sm font-medium text-center rounded"
                  >
                    REQUEST QUOTE
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Bulk Order CTA */}
          <ScrollRevealCSS duration={800} y={20} delay={300} className="mt-12">
            <div
              className="relative rounded-lg p-8 text-center overflow-hidden"
              style={{
                backgroundImage: 'url(/images/kegs/multiple-kegs-bg.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gray-900/70" />

              <div className="relative z-10">
                <h3 className="font-heading text-2xl text-white mb-4 tracking-[0.1em]">
                  Need Multiple Kegs or a Special Brand?
                </h3>
                <p className="text-gray-200 mb-6 max-w-xl mx-auto">
                  Planning a large event? We can source almost any beer and offer
                  volume discounts for orders of 3+ kegs.
                </p>
                <a
                  href="tel:7373719700"
                  className="inline-block px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium rounded"
                >
                  CALL (737) 371-9700
                </a>
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
      />

      {/* Age Verification Modal */}
      <AgeVerificationModal
        isOpen={showAgeVerification}
        onClose={() => {
          setShowAgeVerification(false);
          setPendingCartAdd(null);
        }}
        onVerify={handleAgeVerified}
      />
    </>
  );
}
