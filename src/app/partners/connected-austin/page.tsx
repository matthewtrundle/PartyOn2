'use client';

import { useState, useEffect, useRef, Suspense, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import JoinOrderModal from '@/components/partners/JoinOrderModal';
import DrinkCalculator from '@/components/partners/DrinkCalculator';
import QuickOrderGrid from '@/components/quick-order/QuickOrderGrid';
import QuickOrderSearch from '@/components/quick-order/QuickOrderSearch';
import CartSummaryBar from '@/components/quick-order/CartSummaryBar';
import ConnectedAustinHero from '@/components/partners/ConnectedAustinHero';
import PremierHeroStickyCTA from '@/components/partners/PremierHeroStickyCTA';
import { useQuickOrderProducts } from '@/hooks/useQuickOrderProducts';
import { SHOPIFY_COLLECTIONS } from '@/lib/products/categories';

/** Bachelor party group testimonials */
const TESTIMONIALS = [
  {
    reviewer: 'Jake M. - Groom',
    text: 'We had 14 guys coming in from all over the country. Having all the drinks already stocked at the house when we got there set the tone for the whole weekend. Absolute game changer.',
  },
  {
    reviewer: 'Chris R. - Best Man',
    text: 'I was in charge of planning the bachelor party and this took one huge thing off my plate. The group ordering feature let everyone chip in and pick what they wanted. Could not have been easier.',
  },
];

/**
 * Connected Austin - Bachelor Party Drink Delivery Landing Page
 * Optimized for bachelor party groups ordering drinks for their Austin weekend
 */
function ConnectedAustinPageContent(): ReactElement {
  const searchParams = useSearchParams();
  void searchParams;

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState('favorites-home-page');
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);

  // Sticky collections state
  const [isCollectionsSticky, setIsCollectionsSticky] = useState(false);
  const collectionsRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const endSentinelRef = useRef<HTMLDivElement>(null);
  const [isPastProductSection, setIsPastProductSection] = useState(false);

  // Load products for active collection
  const { products, loading, error } = useQuickOrderProducts(activeCollection);

  // Intersection Observer for sticky detection
  useEffect(() => {
    if (!sentinelRef.current) return;

    const startObserver = new IntersectionObserver(
      ([entry]) => {
        setIsCollectionsSticky(!entry.isIntersecting);
      },
      {
        rootMargin: '-96px 0px 0px 0px',
        threshold: 0,
      }
    );

    startObserver.observe(sentinelRef.current);
    return () => startObserver.disconnect();
  }, []);

  // Detect when user scrolls past the product section
  useEffect(() => {
    if (!endSentinelRef.current) return;

    const endObserver = new IntersectionObserver(
      ([entry]) => {
        setIsPastProductSection(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      {
        rootMargin: '0px 0px 0px 0px',
        threshold: 0,
      }
    );

    endObserver.observe(endSentinelRef.current);
    return () => endObserver.disconnect();
  }, []);

  const scrollToCollections = () => {
    document.getElementById('connected-collections')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCollectionChange = (handle: string) => {
    if (activeCollection === handle) return;
    setActiveCollection(handle);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Navigation - Always hidden on this partner page */}
      <Navigation hidden />

      {/* HERO SECTION */}
      <ConnectedAustinHero />

      {/* PARTNERSHIP INFO + WHAT'S INCLUDED SECTION */}
      <section className="py-12 px-6 md:px-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-2">
              How It Works
            </p>
            <h2 className="font-heading text-2xl md:text-3xl text-gray-900 tracking-wide">
              Stock the House for Your Crew
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
            {/* Partnership Info Card - Takes 3 columns on desktop */}
            <div className="lg:col-span-3 bg-white rounded-xl p-8 shadow-lg flex flex-col">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Image
                  src="/images/partners/connectedaustin-logo.png"
                  alt="Connected Austin"
                  width={56}
                  height={56}
                  className="h-14 w-auto object-contain rounded-full"
                />
                <span className="text-gray-400 text-2xl font-light">&times;</span>
                <Image
                  src="/images/pod-logo-2025.svg"
                  alt="Party On Delivery"
                  width={56}
                  height={56}
                  className="h-14 w-auto object-contain"
                />
              </div>
              <h3 className="font-heading text-xl md:text-2xl text-gray-900 tracking-wide mb-4 text-center">
                Connected Austin + Party On Delivery
              </h3>
              <p className="text-gray-600 text-base leading-relaxed mb-4 text-center">
                Connected Austin handles the hassles so you can handle the hangover. With 389+ five-star Google reviews, they plan your housing, activities, food, and nightlife for an unforgettable bachelor party weekend.
              </p>
              <p className="text-gray-600 text-base leading-relaxed text-center">
                Party On Delivery handles the drinks. We deliver beer, wine, spirits, and mixers straight to your rental or Airbnb so everything is stocked and ready before the first guest walks in the door.
              </p>
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <a
                  href="https://www.connectedaustin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-yellow hover:text-yellow-600 font-medium tracking-wide"
                >
                  Learn more about Connected Austin &rarr;
                </a>
              </div>
            </div>

            {/* What's Included - Takes 2 columns on desktop */}
            <div className="lg:col-span-2 bg-white rounded-xl p-8 shadow-lg flex flex-col">
              <p className="text-gray-500 tracking-[0.1em] uppercase text-base mb-2 text-center">
                Weekend = Handled
              </p>
              <h3 className="font-heading text-2xl md:text-3xl text-gray-900 tracking-wide mb-6 text-center">
                Every Order Includes
              </h3>
              <div className="space-y-4 flex-grow">
                {[
                  { item: 'FREE delivery to your rental', value: '$50' },
                  { item: 'Cooler stocking with ice', value: '$25' },
                  { item: 'Group ordering with split payments', value: 'FREE' },
                  { item: 'Your drinks ready at check-in', value: 'FREE' },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0"
                  >
                    <span className="flex items-center gap-3 text-gray-900 text-base">
                      <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {row.item}
                    </span>
                    <span className="text-gray-900 font-semibold text-base">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 border-t border-gray-300 flex justify-between items-center">
                <span className="font-heading text-lg text-gray-900">Total Value</span>
                <span className="font-heading text-xl text-gray-900 font-semibold">$75+ FREE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} id="connected-collections" className="h-0" aria-hidden="true" />

      {/* Featured Collections - Sticky only in product section */}
      <section
        ref={collectionsRef}
        className={`bg-gray-50 border-b border-gray-200 transition-all duration-300 ${
          isCollectionsSticky && !isPastProductSection
            ? 'sticky z-40 py-2 shadow-md top-0'
            : 'py-6'
        }`}
      >
        <div className="px-4 md:max-w-7xl md:mx-auto md:px-8">
          {/* CTA Buttons - hide when sticky */}
          {!isCollectionsSticky && (
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 mb-6">
              <button
                onClick={scrollToCollections}
                className="w-full md:flex-1 group flex items-center justify-center gap-3 py-4 px-6 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-800 font-semibold tracking-wide transition-all rounded-xl shadow-sm hover:shadow-md"
              >
                <span>Scroll Down to Make a Cart</span>
                <svg
                  className="w-5 h-5 animate-bounce"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              <span className="text-gray-400 font-medium text-sm uppercase tracking-wider">or</span>

              <Link
                href="/order"
                className="w-full md:flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-yellow-500 hover:bg-brand-yellow text-gray-900 font-semibold tracking-wide transition-all rounded-xl shadow-sm hover:shadow-md"
              >
                <span>Start a Group Order</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>
            </div>
          )}

          {/* Collections Grid/Horizontal Scroll */}
          <div
            className={
              isCollectionsSticky
                ? 'flex items-center gap-2'
                : 'grid grid-cols-2 md:grid-cols-5 gap-2'
            }
          >
            {/* Search button - only show when sticky */}
            {isCollectionsSticky && (
              <button
                onClick={() => setShowSearchOverlay(true)}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                aria-label="Search products"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Categories */}
            <div
              className={
                isCollectionsSticky
                  ? 'flex overflow-x-auto gap-2 pb-2 -mr-4 pr-4 scrollbar-hide snap-x snap-mandatory flex-1'
                  : 'contents'
              }
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {SHOPIFY_COLLECTIONS.map((collection) => {
                if (!collection?.colors) return null;
                const isActive = activeCollection === collection.handle;
                return (
                  <button
                    key={collection.handle}
                    onClick={() => handleCollectionChange(collection.handle)}
                    className={`
                      text-center border transition-all rounded-lg relative
                      ${isCollectionsSticky ? 'px-3 py-2' : 'px-4 py-3'}
                      ${isActive
                        ? `${collection.colors.bgActive} ${collection.colors.textActive} ${collection.colors.borderActive} shadow-lg ${isCollectionsSticky ? '' : 'scale-105'}`
                        : `${collection.colors.bg} ${collection.colors.text} ${collection.colors.border} hover:scale-102`
                      }
                      text-xs md:text-sm
                      ${isCollectionsSticky ? 'flex-shrink-0 snap-start whitespace-nowrap' : ''}
                      tracking-[0.1em] font-medium
                    `}
                    disabled={loading && activeCollection !== collection.handle}
                  >
                    {collection.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-xl mx-auto">
          <QuickOrderSearch />
        </div>
      </div>

      {/* Product Grid */}
      <main className="px-4 py-8">
        <div id="product-grid" className="scroll-mt-24 max-w-7xl mx-auto">
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-500">Failed to load products. Please try again.</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-brand-yellow text-gray-900 rounded-lg hover:bg-yellow-600"
              >
                Retry
              </button>
            </div>
          ) : (
            <QuickOrderGrid products={products} loading={loading} />
          )}
        </div>
      </main>

      {/* End sentinel for product section */}
      <div ref={endSentinelRef} className="h-0" aria-hidden="true" />

      {/* DRINK CALCULATOR */}
      <div id="order-builder" className="scroll-mt-24">
        <DrinkCalculator />
      </div>

      {/* TESTIMONIALS */}
      <section className="relative py-16 px-6 md:px-12 bg-gray-100 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-3">
              Real Reviews
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-wide">
              What Bachelor Party Groups Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {TESTIMONIALS.map((review, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">&quot;{review.text}&quot;</p>
                <p className="font-medium text-gray-900">&mdash; {review.reviewer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-20 px-6 md:px-12 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            {/* LEFT: Video/GIF */}
            <div className="flex justify-center lg:justify-end items-stretch">
              <div className="relative w-48 md:w-56 lg:w-full lg:max-w-xs rounded-2xl overflow-hidden bg-gray-800 shadow-2xl aspect-[9/16] lg:aspect-auto">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                >
                  <source src="/videos/trust-section.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            {/* RIGHT: Logo + Title + Paragraph */}
            <div className="flex flex-col">
              <div className="flex justify-center mb-6">
                <Image
                  src="/images/pod-logo-2025.svg"
                  alt="Party On Delivery"
                  width={180}
                  height={180}
                  className="w-32 h-32 md:w-44 md:h-44"
                />
              </div>

              <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-6 text-center">
                Austin-Born. Fully Licensed. Always On Time.
              </h2>

              <p className="text-gray-300 text-lg md:text-xl leading-relaxed text-center">
                Howdy! We&apos;re Allan and Brian, owners of Party On Delivery. Austin natives with 15+ years in events and hospitality, we built this business around one thing: taking care of people. We pride ourselves on clear communication, on-time delivery, and showing people the best of our great city. Our goal is simple - make your weekend easy, safe, and fun.
              </p>
              <p className="text-brand-yellow text-xl md:text-2xl font-heading mt-6 text-center tracking-wide">
                PARTY ON Y&apos;ALL
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 px-6 md:px-12 bg-gradient-to-br from-yellow-500 to-brand-yellow">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-wide">
            Ready for the Weekend?
          </h2>
          <p className="text-gray-800 text-lg mb-8 max-w-2xl mx-auto">
            Get your drinks delivered before the crew arrives. Free delivery. Easy group ordering. Zero hassle.
          </p>

          <div className="flex flex-col items-center gap-3 mb-6">
            <Link
              href="/order"
              className="px-10 py-4 bg-gray-900 text-white hover:bg-gray-800 font-semibold tracking-wider transition-colors rounded-lg"
            >
              Start a Group Order
            </Link>

            <button
              onClick={scrollToCollections}
              className="text-gray-800 hover:text-gray-900 font-medium tracking-wider underline underline-offset-4"
            >
              or start an individual order
            </button>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="text-gray-700 hover:text-gray-900 text-sm tracking-wider"
            >
              Have a share code? Join an order
            </button>
          </div>

          <p className="text-gray-700">
            Questions? Call us:{' '}
            <a href="tel:7373719700" className="font-semibold underline">
              737.371.9700
            </a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <div className="pb-24 md:pb-20">
        <Footer />
      </div>

      {/* Cart Summary Bar - Fixed Bottom */}
      <CartSummaryBar />

      {/* Mobile Sticky CTA */}
      <PremierHeroStickyCTA onJoinCode={() => setIsJoinModalOpen(true)} />

      {/* MODALS */}
      <JoinOrderModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      {/* Search Overlay */}
      {showSearchOverlay && (
        <div
          className="fixed inset-0 z-50 bg-black/50 px-4 pt-4"
          onClick={() => setShowSearchOverlay(false)}
        >
          <div
            className="bg-white w-full max-w-2xl mx-auto rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-start gap-3">
              <div className="flex-1 relative">
                <QuickOrderSearch autoFocus onResultClick={() => setShowSearchOverlay(false)} />
              </div>
              <button
                onClick={() => setShowSearchOverlay(false)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 -mt-1"
                aria-label="Close search"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Page wrapper with Suspense boundary for useSearchParams
 */
export default function ConnectedAustinPage(): ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ConnectedAustinPageContent />
    </Suspense>
  );
}
