'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import ProductModal from '@/components/ProductModal';
import AgeVerificationModal from '@/components/AgeVerificationModal';
import { Product } from '@/lib/types';
import { useCartContext } from '@/contexts/CartContext';
import { canPurchaseAlcohol } from '@/lib/utils';

/**
 * Keg product grid with category tabs.
 *
 * Renders live from the `kegs` collection via the public catalog API rather than
 * a hardcoded list. That endpoint only returns ACTIVE products and only their
 * `availableForSale` variants, so an archived or unavailable keg simply stops
 * rendering instead of showing an "In Stock" badge over a dead Add to Cart
 * button, and prices can never drift from what checkout actually charges.
 *
 * The only thing still hardcoded is the brand taxonomy (domestic/import/craft),
 * because the database has no such field. Unmapped handles fall back to 'craft'
 * so a new keg is always reachable from a tab.
 */

type BrandCategory = 'domestics' | 'imports' | 'craft';
type SizeType = 'half' | 'slim';

interface Keg {
  handle: string;
  name: string;
  size: string;
  price: string;
  variantId: string | null;
  category: BrandCategory;
  sizeType: SizeType;
}

/** Shape returned by GET /api/v1/products/catalog */
interface CatalogProduct {
  id: string;
  handle: string;
  title: string;
  productType: string | null;
  basePrice: number;
  image: { url: string; altText: string | null } | null;
  variants: Array<{
    id: string;
    title: string;
    price: number;
    availableForSale: boolean;
  }>;
}

/**
 * Brand taxonomy by product handle. Only domestics and imports need listing --
 * anything unmapped is treated as craft.
 */
const BRAND_CATEGORY: Record<string, BrandCategory> = {
  'coors-light-keg-1-2-barrel': 'domestics',
  'miller-lite-keg': 'domestics',
  'michelob-ultra-1-2-barrel': 'domestics',
  'lone-star-keg-1-2-barrel': 'domestics',
  'corona-extra-1-2-barrel': 'imports',
  'modelo-especial-keg-1-2-barrel-15-5gallons': 'imports',
  'modelo-especial-slim-keg-1-4-barrel': 'imports',
  'dos-equis-keg-1-2-barrel': 'imports',
  'dos-equis-keg-slim-keg-20l': 'imports',
  'dos-equis-lager-1-6': 'imports',
};

const CATEGORIES = [
  { id: 'all', name: 'All Kegs' },
  { id: 'half', name: '1/2 Barrels' },
  { id: 'slim', name: 'Slim Kegs' },
  { id: 'domestics', name: 'Domestic' },
  { id: 'imports', name: 'Import' },
  { id: 'craft', name: 'Craft' },
];

/**
 * Split a catalog title into a display name and a size label.
 *
 * Most keg titles are "Brand Name • 1/2 Barrel". A few legacy rows have no
 * bullet (e.g. "Yuengling Slim Keg 1/4 Barrel"), so fall back to peeling a
 * trailing size off the end.
 */
export function splitTitle(title: string): { name: string; size: string } {
  const bullet = title.indexOf('•');
  if (bullet !== -1) {
    return {
      name: title.slice(0, bullet).trim(),
      size: title.slice(bullet + 1).trim(),
    };
  }

  const match = title.match(/\s(\d\/\d\s*Barrel|Slim\s*Keg.*|\d+L)\s*$/i);
  if (match) {
    return {
      name: title.slice(0, match.index).trim(),
      size: match[1].trim(),
    };
  }

  return { name: title.trim(), size: 'Keg' };
}

/** Half barrels are the only "half" size; everything else is a slim keg. */
export function sizeTypeOf(size: string): SizeType {
  return /1\/2/.test(size) ? 'half' : 'slim';
}

function toKeg(product: CatalogProduct): Keg {
  const { name, size } = splitTitle(product.title);
  const variant = product.variants[0] ?? null;
  const price = variant ? variant.price : product.basePrice;

  return {
    handle: product.handle,
    name,
    size,
    price: `$${price.toFixed(2)}`,
    variantId: variant?.id ?? null,
    category: BRAND_CATEGORY[product.handle] ?? 'craft',
    sizeType: sizeTypeOf(size),
  };
}

export default function KegProductGrid() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [kegs, setKegs] = useState<Keg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingHandle, setLoadingHandle] = useState<string | null>(null);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [pendingCartAdd, setPendingCartAdd] = useState<Keg | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [productCache, setProductCache] = useState<Record<string, Product>>({});

  const { addToCart, loading: cartLoading } = useCartContext();

  // Load the live kegs collection once on mount.
  useEffect(() => {
    let cancelled = false;

    const loadKegs = async () => {
      try {
        const response = await fetch('/api/v1/products/catalog?collection=kegs&limit=100');
        if (!response.ok) throw new Error(`Catalog responded ${response.status}`);

        const json = await response.json();
        const products: CatalogProduct[] = json?.data?.products ?? [];
        if (cancelled) return;

        // Defensive: the endpoint already filters to sellable variants, but a
        // product with none would render an un-addable card.
        setKegs(products.filter((p) => p.variants.length > 0).map(toKeg));
        setLoadFailed(false);
      } catch (error) {
        console.error('Error loading kegs:', error);
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadKegs();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredKegs = useMemo(() => {
    if (activeCategory === 'all') return kegs;
    if (activeCategory === 'half' || activeCategory === 'slim') {
      return kegs.filter((keg) => keg.sizeType === activeCategory);
    }
    return kegs.filter((keg) => keg.category === activeCategory);
  }, [kegs, activeCategory]);

  // Fetch the full product record, needed only for the detail modal.
  const fetchProduct = async (handle: string): Promise<Product | null> => {
    if (productCache[handle]) return productCache[handle];

    try {
      const response = await fetch(`/api/products/${handle}`);
      if (!response.ok) return null;
      const product = await response.json();
      setProductCache((prev) => ({ ...prev, [handle]: product }));
      return product;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  };

  const handleTitleClick = async (keg: Keg) => {
    setLoadingHandle(keg.handle);
    const product = await fetchProduct(keg.handle);
    setLoadingHandle(null);

    if (product) {
      setSelectedProduct(product);
      setIsModalOpen(true);
    }
  };

  const handleAddToCart = async (keg: Keg) => {
    if (!canPurchaseAlcohol()) {
      setPendingCartAdd(keg);
      setShowAgeVerification(true);
      return;
    }

    await addKegToCart(keg);
  };

  /**
   * Add straight from the catalog's variant id -- no second lookup, so a stale
   * or renamed handle can no longer turn this into a silent no-op.
   */
  const addKegToCart = async (keg: Keg) => {
    if (!keg.variantId) return;

    setAddingToCart(keg.handle);
    try {
      await addToCart(keg.variantId, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleAgeVerified = async () => {
    setShowAgeVerification(false);
    localStorage.setItem('age_verified', 'true');

    if (pendingCartAdd) {
      await addKegToCart(pendingCartAdd);
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

          {isLoading ? (
            <p className="text-center text-gray-600 text-sm md:text-lg py-12">
              Loading available kegs...
            </p>
          ) : loadFailed ? (
            <div className="text-center py-12">
              <p className="text-gray-700 text-sm md:text-lg mb-4">
                We couldn&apos;t load our keg list just now.
              </p>
              <a
                href="tel:7373719700"
                className="inline-block px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium rounded"
              >
                CALL (737) 371-9700
              </a>
            </div>
          ) : filteredKegs.length === 0 ? (
            <p className="text-center text-gray-600 text-sm md:text-lg py-12">
              No kegs in this category right now. Try another tab or give us a call.
            </p>
          ) : (
            <div
              key={activeCategory}
              className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6"
              style={{
                animation: 'result-fade-in 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
              }}
            >
              {filteredKegs.map((keg, index) => (
                <div
                  key={keg.handle}
                  className="bg-white rounded-lg p-4 md:p-6 shadow-lg border border-gray-200 hover:border-brand-yellow transition-all duration-300 text-center"
                  style={{
                    animation: `result-fade-in 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
                    animationDelay: `${index * 30}ms`,
                    opacity: 0,
                  }}
                >
                  {/* In Stock Badge */}
                  <div className="mb-3">
                    <span className="bg-green-100 text-green-800 text-xs md:text-sm px-3 py-1 rounded-full font-medium">
                      In Stock
                    </span>
                  </div>

                  {/* Title - Clickable */}
                  <button
                    onClick={() => handleTitleClick(keg)}
                    disabled={loadingHandle === keg.handle}
                    className="w-full mb-1 hover:text-brand-yellow transition-colors disabled:cursor-default"
                  >
                    <h3 className="font-heading text-lg md:text-2xl text-gray-900 tracking-[0.05em] leading-tight">
                      {loadingHandle === keg.handle ? 'Loading...' : keg.name}
                    </h3>
                  </button>

                  {/* Size */}
                  <p className="text-gray-500 text-sm md:text-base mb-3">{keg.size}</p>

                  {/* Price */}
                  <p className="text-2xl md:text-3xl font-medium text-brand-yellow mb-4">
                    {keg.price}
                  </p>

                  {/* Action Button */}
                  {keg.variantId ? (
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
          )}

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
