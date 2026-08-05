'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navigation from "@/components/Navigation";
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import ProductCard from '@/components/shopify/ProductCard';
import CompactProductCard from '@/components/shopify/CompactProductCard';
import MobileProductCard from '@/components/mobile/MobileProductCard';
import MobileFilterDrawer from '@/components/mobile/MobileFilterDrawer';
import { useCustomCollectionProducts } from '@/lib/cart/hooks/useCustomProducts';
import { Product } from '@/lib/types';
import AIConcierge from '@/components/AIConcierge';
import ProductModal from '@/components/ProductModal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getProductCategory, FILTER_OPTIONS, SHOPIFY_COLLECTIONS, getUniqueTags } from '@/lib/products/categories';
import { ProductCardSkeletonGrid } from '@/components/skeletons/ProductCardSkeleton';
import { MobileProductCardSkeletonGrid } from '@/components/skeletons/MobileProductCardSkeleton';

function ProductsContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('search');
  const isMobile = useIsMobile();
  const initialLoadCount = isMobile ? 12 : 20;
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const { products, loading, error, hasNextPage, loadMore } = useCustomCollectionProducts(collectionFilter, initialLoadCount);
  const [sortBy, setSortBy] = useState('featured');
  // Age gate retired site-wide — compliance now lives on the checkout
  // form (pre-checked 21+ acknowledgement). Premium-collection content
  // is no longer gated; the old isAgeVerified state was removed too.

  // Shopify-based filters
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);

  // Mobile states
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // View mode state for compact/regular view
  const [isCompactView, setIsCompactView] = useState(true);
  
  // Product modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Sticky collections disabled - was causing scroll conflicts on mobile
  const collectionsRef = useRef<HTMLElement>(null);

  // Set default collection to favorites-home-page on initial load
  useEffect(() => {
    // Only set default if no search query and no collection filter is already set
    if (!searchQuery && !collectionFilter) {
      setCollectionFilter('favorites-home-page');
    }
  }, [searchQuery, collectionFilter]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  // NOTE: Sticky collections feature disabled - was causing scroll conflicts on mobile
  // The collections ref is kept for potential future use

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      if (loading) return;

      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000;

      if (scrolledToBottom && hasNextPage) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasNextPage, loadMore]);

  // Search for products if search query exists
  useEffect(() => {
    if (searchQuery) {
      setSearchLoading(true);
      // Use the working API route that properly formats search queries
      fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&first=50`)
        .then(response => response.json())
        .then(data => {
          setSearchResults(data.products.edges.map((edge: { node: Product }) => edge.node));
        })
        .catch(console.error)
        .finally(() => setSearchLoading(false));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Use search results if available, otherwise use regular products
  const displayProducts = searchQuery ? searchResults : products;

  // Extract unique values for filter options from Shopify data
  const uniqueTags = getUniqueTags(displayProducts);

  // Filter products based on Shopify data only
  const filteredProducts = displayProducts.filter(product => {
    const price = parseFloat(product.priceRange.minVariantPrice.amount);

    // Collection filter is now handled by the API query, so skip this check
    // if (collectionFilter) {
    //   if (!isInCollection(product, collectionFilter)) return false;
    // }

    // Main category filter using Shopify data (works alongside collection filter)
    if (filter !== 'all') {
      const productCategory = getProductCategory(product);

      // Map filter values to category keys
      const filterMap: Record<string, string> = {
        'seltzers-champs': 'seltzersChamps',
        'beer': 'beer',
        'cocktails': 'cocktails',
        'liquor': 'liquor',
        'mixers-na': 'mixersNA',
        'party-supplies': 'partySupplies'
      };

      const expectedCategory = filterMap[filter];
      if (expectedCategory && productCategory !== expectedCategory) {
        // Also check if it's 'other' and filter is not 'all'
        if (productCategory === 'other') return false;
        return false;
      }
    }

    // Tag filters
    if (selectedTags.length > 0) {
      const productTags = product.tags || [];
      const hasAllTags = selectedTags.every(tag => productTags.includes(tag));
      if (!hasAllTags) return false;
    }

    // Price range filter
    if (priceRange[0] > 0 || priceRange[1] < 500) {
      if (price < priceRange[0] || price > priceRange[1]) return false;
    }

    return true;
  });

  // Sort products using Shopify data
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'featured') {
      // Use manual/featured sorting (default Shopify order)
      return 0;
    }
    if (sortBy === 'bestsellers') {
      // Use Shopify tags for bestseller status
      const aIsBestSeller = a.tags?.includes('bestseller') || a.tags?.includes('best-seller');
      const bIsBestSeller = b.tags?.includes('bestseller') || b.tags?.includes('best-seller');

      if (aIsBestSeller && !bIsBestSeller) return -1;
      if (!aIsBestSeller && bIsBestSeller) return 1;

      // Fall back to featured sorting
      return 0;
    }
    if (sortBy === 'price-asc') {
      return parseFloat(a.priceRange.minVariantPrice.amount) - parseFloat(b.priceRange.minVariantPrice.amount);
    }
    if (sortBy === 'price-desc') {
      return parseFloat(b.priceRange.minVariantPrice.amount) - parseFloat(a.priceRange.minVariantPrice.amount);
    }
    if (sortBy === 'name-asc') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'name-desc') {
      return b.title.localeCompare(a.title);
    }
    return 0; // featured
  });

  if (error) {
    return (
      <div className="bg-white min-h-screen">
        <Navigation forceScrolled={true} />
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="bg-red-50 border border-red-200 p-6 rounded">
            <h2 className="text-red-800 font-heading text-xl mb-2">Error Loading Products</h2>
            <p className="text-red-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <Navigation forceScrolled={true} />
      
      {/* Hero Section */}
      <section className="relative h-[40vh] mt-24 flex items-center justify-center overflow-hidden">
        <Image
          src="/images/products/premium-spirits-wall.webp"
          alt="Premium Spirits Collection"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />
        
        <div className="hero-fade-in relative text-center text-white z-10 max-w-4xl mx-auto px-8">
          <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            Premium Spirits & Party Essentials
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          <p className="text-lg font-light tracking-[0.1em] text-gray-200 mb-8">
            For whatever you&apos;re planning
            <br />
            Find something everyone will enjoy
          </p>

          {/* "Unlock premium collection" button removed with the
              age-verification gate — content is no longer locked. */}
        </div>
      </section>

      {/* Collection Quick Filters */}
      {!searchQuery && (
        <section
          ref={collectionsRef}
          className="bg-gray-50 border-b border-gray-200 py-6"
        >
          <div className={`${isMobile ? 'px-4' : 'max-w-7xl mx-auto px-8'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-heading ${isMobile ? 'text-lg' : 'text-xl'} text-gray-900 tracking-[0.1em]`}>
                FEATURED COLLECTIONS
              </h3>
              {collectionFilter && (
                <button
                  onClick={() => {
                    setCollectionFilter(null);
                    setFilter('all');
                  }}
                  className="text-sm text-brand-yellow hover:text-yellow-600 tracking-[0.1em]"
                >
                  CLEAR COLLECTION
                </button>
              )}
            </div>

            {/* Collections Grid */}
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-7 gap-2'}`}>
              {SHOPIFY_COLLECTIONS.map((collection) => {
                if (!collection?.colors) return null;
                const isActive = collectionFilter === collection.handle;
                return (
                  <button
                    key={collection.handle}
                    onClick={() => {
                      if (collectionFilter === collection.handle) {
                        setCollectionFilter(null); // Toggle off if same collection clicked
                      } else {
                        setCollectionFilter(collection.handle);
                      }
                      setFilter('all'); // Reset category filter when collection changes
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`
                      px-4 py-3 text-center border transition-all rounded-lg relative
                      ${isActive
                        ? `${collection.colors.bgActive} ${collection.colors.textActive} ${collection.colors.borderActive} shadow-lg scale-105`
                        : `${collection.colors.bg} ${collection.colors.text} ${collection.colors.border} hover:scale-102`
                      }
                      text-sm
                      tracking-[0.1em] font-medium
                    `}
                    disabled={loading && collectionFilter !== collection.handle}
                  >
                    {collection.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Search Results Heading */}
      {searchQuery && (
        <section className="bg-gray-50 py-4">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-gray-600">
              {searchResults.length} results for <span className="font-medium text-gray-900">&quot;{searchQuery}&quot;</span>
            </p>
          </div>
        </section>
      )}

      {/* Advanced Filter Bar */}
      {/* Sticky offset tracks the nav's own bar (h-14 md:h-16), per
          /design-example: "Sticky elements: top-14 md:top-16 (NOT top-24)".
          Was top-24 on desktop (a gap content scrolled through) and top-0 on
          mobile, which tucked this bar under the z-50 nav. Pure CSS now, so it
          is also correct before `isMobile` resolves on the client. */}
      <section className="border-b border-gray-200 sticky top-14 md:top-16 bg-white z-30">
        <div className={`${isMobile ? 'px-4 py-3' : 'max-w-7xl mx-auto px-8 py-6'}`}>
          {/* Mobile Filter Button */}
          {isMobile ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowMobileFilters(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-600 rounded-lg text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" 
                      />
                    </svg>
                    FILTERS
                  </button>
                  <span className="text-sm text-gray-500">
                    {sortedProducts.length} items
                  </span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="featured">Featured</option>
                  <option value="bestsellers">Best Sellers</option>
                  <option value="price-asc">Price ↑</option>
                  <option value="price-desc">Price ↓</option>
                  <option value="name-asc">A-Z</option>
                  <option value="name-desc">Z-A</option>
                </select>
              </div>
            </div>
          ) : (
            <></>
          )}

          {/* Tag Filters Row */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Show popular tags as quick filters */}
            {uniqueTags.filter(tag =>
              ['bestseller', 'best-seller', 'featured', 'new', 'sale', 'limited-edition'].includes(tag.toLowerCase())
            ).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev =>
                    prev.includes(tag)
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
                className={`px-3 py-1.5 text-sm tracking-[0.05em] rounded-full border transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-brand-yellow text-gray-900 border-brand-yellow'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-brand-yellow'
                }`}
              >
                {tag.toUpperCase()}
              </button>
            ))}

            {/* Clear Tags Button */}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-sm text-brand-yellow hover:text-yellow-600 tracking-[0.05em]"
              >
                CLEAR TAGS
              </button>
            )}

            {/* Spacer */}
            <div className="flex-grow" />
            
            {/* Product Count */}
            <div className="text-sm text-gray-600 tracking-[0.05em]">
              {sortedProducts.length} PRODUCTS
            </div>

            {/* Sort Dropdown and View Toggle */}
            <div className="flex items-center gap-4">
              {/* View Toggle Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCompactView(true)}
                  className={`p-2 border transition-colors ${
                    isCompactView 
                      ? 'border-brand-yellow bg-yellow-50 text-yellow-600' 
                      : 'border-gray-300 text-gray-600 hover:border-brand-yellow'
                  }`}
                  title="Compact view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" 
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsCompactView(false)}
                  className={`p-2 border transition-colors ${
                    !isCompactView 
                      ? 'border-brand-yellow bg-yellow-50 text-yellow-600' 
                      : 'border-gray-300 text-gray-600 hover:border-brand-yellow'
                  }`}
                  title="Regular view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M4 6h16M4 10h16M4 14h16M4 18h16" 
                    />
                  </svg>
                </button>
              </div>
              
              <label className="text-sm text-gray-600 tracking-[0.1em]">SORT BY:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 px-4 py-2 text-sm tracking-[0.05em] focus:border-brand-yellow focus:outline-none"
              >
                <option value="bestsellers">Best Sellers</option>
                <option value="featured">Featured</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Debug Info - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <section className="bg-gray-100 py-4">
          <div className="max-w-7xl mx-auto px-8 text-xs">
            <p>Total products: {displayProducts.length}</p>
            <p>Filtered products: {filteredProducts.length}</p>
            <p>Current filter: {filter}</p>
            <details>
              <summary>Product Types</summary>
              <pre>{JSON.stringify([...new Set(displayProducts.map(p => p.productType))].filter(Boolean).sort(), null, 2)}</pre>
            </details>
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section className={isCompactView ? "py-8" : "py-16"}>
        <div className={isCompactView ? "max-w-[1400px] mx-auto px-6" : "max-w-7xl mx-auto px-8"}>
          {(loading || searchLoading) && products.length === 0 ? (
            // Show skeleton loaders
            <div className={
              isMobile
                ? "grid grid-cols-2 gap-3 px-4"
                : isCompactView
                  ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  : "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8"
            }>
              {isMobile ? (
                <MobileProductCardSkeletonGrid count={initialLoadCount} />
              ) : (
                <ProductCardSkeletonGrid count={initialLoadCount} />
              )}
            </div>
          ) : (
            <>
              <div className={
                isMobile 
                  ? "grid grid-cols-2 gap-3 px-4" 
                  : isCompactView 
                    ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    : "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8"
              }>
                {sortedProducts.map((product, index) => {
                  // Use index as part of key to avoid duplicates
                  const uniqueKey = `${product.id}-${index}`;
                  if (isMobile) {
                    return <MobileProductCard key={uniqueKey} product={product} index={index} onProductClick={handleProductClick} />
                  }
                  return isCompactView 
                    ? <CompactProductCard key={uniqueKey} product={product} index={index} onProductClick={handleProductClick} />
                    : <ProductCard key={uniqueKey} product={product} index={index} onProductClick={handleProductClick} />
                })}
              </div>

              {sortedProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600 font-light text-lg">No products found in this category.</p>
                </div>
              )}

              {/* Infinite Scroll Loading Indicator */}
              {hasNextPage && (
                <div className="text-center mt-12">
                  <div className="inline-flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-yellow"></div>
                    <span className="text-sm text-gray-600 tracking-[0.1em]">LOADING MORE PRODUCTS...</span>
                  </div>
                </div>
              )}
              
              {/* End of products message */}
              {!hasNextPage && sortedProducts.length > 0 && (
                <div className="text-center mt-12">
                  <p className="text-sm text-gray-500 tracking-[0.1em]">
                    SHOWING ALL {sortedProducts.length} PRODUCTS
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Service Information */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <ScrollRevealCSS delay={0} duration={800}>
              <svg className="w-12 h-12 mx-auto text-brand-yellow mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">72-Hour Notice</h3>
              <p className="text-gray-600 text-sm">Advance booking ensures availability for your celebration</p>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={100} duration={800}>
              <svg className="w-12 h-12 mx-auto text-brand-yellow mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">Age Verified</h3>
              <p className="text-gray-600 text-sm">Secure ID verification for all alcohol deliveries</p>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={200} duration={800}>
              <svg className="w-12 h-12 mx-auto text-brand-yellow mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="font-heading text-xl text-gray-900 mb-2 tracking-[0.1em]">Austin Coverage</h3>
              <p className="text-gray-600 text-sm">Delivering excellence throughout greater Austin</p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Rich Content Section for SEO */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-6 tracking-[0.1em] text-center">
              Premium Beverage Selection for Every Austin Event
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto mb-8" />

            <p className="text-gray-700 leading-relaxed mb-6">
              Our carefully curated product catalog brings together the best of Austin&apos;s local craft scene with premium domestic and imported selections. Whether you&apos;re stocking a <Link href="/weddings" className="text-brand-yellow hover:text-yellow-600 underline">wedding bar</Link>, planning a <Link href="/austin-corporate-event-delivery" className="text-brand-yellow hover:text-yellow-600 underline">corporate happy hour</Link>, or hosting an intimate dinner party, we provide the quality and variety your event deserves.
            </p>

            <h3 className="font-heading text-2xl text-gray-900 mt-8 mb-4 tracking-[0.08em]">
              Local Austin Craft Beer & Spirits
            </h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              We proudly feature selections from Austin&apos;s renowned craft breweries including Live Oak Brewing, Austin Beerworks, Zilker Brewing Company, and more. Our spirits collection showcases Texas distilleries like Tito&apos;s Handmade Vodka, Treaty Oak Distilling, Still Austin Whiskey Co., and Garrison Brothers. Supporting local isn&apos;t just good business—it&apos;s what makes Austin events truly special.
            </p>

            <h3 className="font-heading text-2xl text-gray-900 mt-8 mb-4 tracking-[0.08em]">
              Complete Event Bar Supplies
            </h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Beyond beverages, we stock everything needed for a professional bar setup. Our inventory includes mixers (tonic, club soda, cola, ginger beer, fresh juices), garnishes, bagged ice, premium disposable cups and glassware, cocktail napkins, bar tools, and specialty items like custom koozies for weddings and corporate events. We can also arrange keg rentals with tap systems and ice tubs for beer-forward events.
            </p>

            <h3 className="font-heading text-2xl text-gray-900 mt-8 mb-4 tracking-[0.08em]">
              Wine Selection for Every Palate
            </h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Our wine program features carefully selected bottles from Texas Hill Country wineries, California estates, and international vineyards. From crisp Sauvignon Blanc and elegant Pinot Noir to celebratory Champagne and Prosecco, we help you choose wines that complement your event&apos;s cuisine and atmosphere. Need guidance? Our team provides personalized recommendations based on your menu, guest preferences, and budget.
            </p>

            <h3 className="font-heading text-2xl text-gray-900 mt-8 mb-4 tracking-[0.08em]">
              Flexible Ordering & Delivery
            </h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Browse our online catalog, add items to your cart, and schedule delivery directly to your venue or event location. We offer flexible delivery windows throughout Austin, Lake Travis, and the Hill Country. All beverages are delivered cold and ready to serve. Have questions about quantities or selections? <Link href="/contact" className="text-brand-yellow hover:text-yellow-600 underline">Contact our team</Link> for expert guidance tailored to your specific event needs.
            </p>

            <div className="mt-8 p-6 bg-white border-2 border-brand-yellow rounded-lg text-center">
              <p className="text-lg text-gray-800 mb-4">
                <strong>Need help planning your bar?</strong> Our beverage experts provide complimentary consultations for all events.
              </p>
              <Link href="/contact">
                <button className="px-8 py-3 rounded-lg bg-brand-yellow text-gray-900 hover:bg-yellow-400 active:bg-yellow-500 transition-colors tracking-[0.08em] text-sm font-semibold">
                  SCHEDULE A CONSULTATION
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img 
                src="/images/pod-logo-2025.svg" 
                alt="Party On Delivery"
                className="h-16 w-auto mb-4"
              />
              <p className="text-gray-600 text-sm leading-relaxed">
                Austin&apos;s premier alcohol delivery and event service since 2020.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SERVICES</h4>
              <ul className="space-y-2">
                <li><Link href="/weddings" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Weddings</Link></li>
                <li><Link href="/boat-parties" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Boat Parties</Link></li>
                <li><Link href="/austin-bachelor-party-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Celebrations</Link></li>
                <li><Link href="/austin-corporate-event-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Corporate</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SHOP</h4>
              <ul className="space-y-2">
                <li><Link href="/order" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">All Products</Link></li>
                <li><Link href="/products?filter=spirits" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Spirits</Link></li>
                <li><Link href="/products?filter=wine" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Wine</Link></li>
                <li><Link href="/products?filter=packages" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Packages</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">CONTACT</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>Phone: (737) 371-9700</li>
                <li>Email: info@partyondelivery.com</li>
                <li>Hours: 10AM - 9PM Mon-Sat (closed Sundays)</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">© 2024 Party On Delivery. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Terms</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
      
      {/* AI Concierge */}
      <AIConcierge mode="elegant" />
      
      <ProductModal
        product={selectedProduct}
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
      />
      
      {/* Mobile Filter Drawer */}
      {isMobile && (
        <MobileFilterDrawer
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          selectedCategory={filter}
          onCategoryChange={setFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          categories={FILTER_OPTIONS.mainCategories.map(cat => ({
            value: cat.value,
            label: cat.label,
            count: cat.value === 'all' ? products.length : 
                   products.filter(p => {
                     const category = getProductCategory(p);
                     const filterMap: Record<string, string> = {
                       'seltzers-champs': 'seltzersChamps',
                       'beer': 'beer', 
                       'cocktails': 'cocktails',
                       'liquor': 'liquor',
                       'mixers-na': 'mixersNA',
                       'party-supplies': 'partySupplies'
                     };
                     return category === filterMap[cat.value];
                   }).length
          }))}
        
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Navigation forceScrolled={true} />
        <div className="pt-32 pb-16 text-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 mx-auto rounded"></div>
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}