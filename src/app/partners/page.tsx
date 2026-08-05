'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import CategoryFilter from '@/components/partners/CategoryFilter';
import PartnerGrid from '@/components/partners/PartnerGrid';
import partnersData from '@/data/austin-partners.json';
import type { Partner, PartnerCategory } from '@/lib/partners/types';
import { PARTNER_CATEGORIES } from '@/lib/partners/types';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';

export default function AustinPartnersPage() {
  // Track page view on mount
  useEffect(() => {
    trackPageView(ANALYTICS_EVENTS.VIEW_PARTNERS, '/partners', 'Austin Event Partners');
  }, []);
  const [activeCategory, setActiveCategory] = useState<PartnerCategory | 'all'>('all');
  const partners = partnersData.partners as Partner[];

  // Calculate partner counts for each category
  const partnerCounts = useMemo(() => {
    const counts: Record<PartnerCategory | 'all', number> = {
      all: partners.length,
      'event-planning': 0,
      'mobile-bartending': 0,
      venues: 0,
      catering: 0,
      boats: 0,
      transportation: 0,
      experiences: 0,
      'places-to-stay': 0,
    };

    partners.forEach((partner) => {
      if (counts[partner.category] !== undefined) {
        counts[partner.category]++;
      }
    });

    return counts;
  }, [partners]);

  return (
    <div className="bg-white min-h-screen">
      <Navigation hideMobileLogo />

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] pt-20 flex items-center">
        <div className="absolute inset-0">
          <Image
            src="/images/hero/austin-skyline-golden-hour.webp"
            alt="Austin skyline at golden hour - event partners directory"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 text-white">
          <ScrollRevealCSS duration={800} y={30}>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl mb-6 tracking-[0.1em] max-w-4xl">
              Austin&apos;s Best Event Vendors
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl leading-relaxed text-gray-200">
              Discover Austin&apos;s top-rated event vendors for 2026. From wedding planners
              and Lake Travis boat rentals to mobile bartenders and caterers—find the
              best local professionals for your next Austin event.
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Become a Partner CTA Banner */}
      <div className="bg-gray-900 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white text-center sm:text-left">
            <span className="text-brand-yellow font-medium">Are you an event vendor?</span>
            {' '}Join our partner network and grow your business.
          </p>
          <Link
            href="/austin-partners"
            className="inline-block px-6 py-2 bg-brand-yellow text-black hover:bg-yellow-500 transition-colors tracking-[0.1em] text-sm font-medium rounded-sm whitespace-nowrap"
          >
            BECOME A PARTNER
          </Link>
        </div>
      </div>

      {/* Featured Partners Section */}
      <section className="py-16 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <ScrollRevealCSS duration={600} y={20}>
            <div className="text-center mb-10">
              <p className="text-brand-yellow tracking-[0.1em] uppercase text-sm mb-3">
                Premier Partnership
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 tracking-[0.1em]">
                Featured Partners
              </h2>
            </div>

            {/* Premier Party Cruises Featured Tile */}
            <Link
              href="/partners/premier-party-cruises"
              className="group relative block w-full aspect-[4/3] sm:aspect-[21/9] lg:aspect-[21/7] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500"
            >
              <Image
                src="/images/partners/premierpartycruises-hero.webp"
                alt="Premier Party Cruises - Austin's favorite Lake Travis party boat rentals"
                fill
                sizes="(max-width: 768px) 100vw, 1280px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-16">
                {/* Premier Partner Badge */}
                <div className="inline-flex items-center gap-2 bg-yellow-500 text-gray-900 px-3 py-1.5 rounded-full w-fit mb-4">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold tracking-wider uppercase">Premier Partner</span>
                </div>

                {/* Partner Name & Tagline */}
                <h3 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-wide mb-3">
                  Premier Party Cruises
                </h3>
                <p className="text-lg sm:text-xl text-gray-200 max-w-xl mb-6">
                  Austin&apos;s favorite Lake Travis party boat rentals. Free delivery to the marina + cooler stocking included.
                </p>

                {/* CTA Button */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-gray-900 rounded-lg font-semibold group-hover:bg-brand-yellow transition-colors">
                    Order Drinks for Your Boat Party
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Logo (desktop only) */}
              <div className="absolute bottom-6 right-6 hidden md:block">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                  <Image
                    src="/images/partners/premierpartycruises-logo.webp"
                    alt="Premier Party Cruises Logo"
                    width={120}
                    height={60}
                    className="object-contain"
                  />
                </div>
              </div>
            </Link>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Category Filter */}
      <CategoryFilter
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        partnerCounts={partnerCounts}
      />

      {/* Partners Grid */}
      <section className="py-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <PartnerGrid partners={partners} activeCategory={activeCategory} />
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-3xl text-gray-900 tracking-[0.1em] mb-6">
              Your Complete Guide to Austin Event Vendors
            </h2>
            <div className="prose prose-lg text-gray-600 max-w-none">
              <p>
                Looking for the <strong>best Austin event vendors</strong>? Austin is known for its vibrant
                event scene, with over 12,000 weddings annually and countless corporate events,
                bachelorette parties, and celebrations. From stunning{' '}
                <Link href="/boat-parties" className="text-brand-yellow hover:text-yellow-600">
                  Lake Travis boat rentals
                </Link>{' '}
                and double-decker party boats to unforgettable{' '}
                <Link href="/austin-bachelor-party-delivery" className="text-brand-yellow hover:text-yellow-600">
                  bachelorette party services
                </Link>{' '}
                on South Congress, our curated directory features Austin&apos;s top-rated vendors.
              </p>
              <p>
                Our <strong>Austin wedding vendors</strong> include full-service wedding planners,
                day-of coordinators, and luxury event designers who know the local venue scene inside
                and out. Looking for the perfect space? Browse our{' '}
                <Link href="/austin-byob-venues" className="text-brand-yellow hover:text-yellow-600">
                  complete list of 75+ Austin BYOB venues
                </Link>
                . Need <strong>mobile bartenders in Austin</strong>? Our TABC-certified bartending
                partners bring professional bar service directly to your event—whether it&apos;s a
                downtown office party, Hill Country wedding, or lakeside celebration.
              </p>
              <p>
                Planning a{' '}
                <Link href="/austin-corporate-event-delivery" className="text-brand-yellow hover:text-yellow-600">
                  corporate event in Austin
                </Link>
                ? Our vendor network includes professional caterers specializing in Tex-Mex, BBQ,
                and farm-to-table cuisine, plus reliable transportation services including party
                buses and limo rentals. Every partner has been vetted for quality, reliability,
                and exceptional service.
              </p>
              <p>
                Combined with Party On Delivery&apos;s{' '}
                <Link href="/order" className="text-brand-yellow hover:text-yellow-600">
                  premium alcohol delivery
                </Link>
                , you have everything you need for the perfect Austin event. We deliver beer, wine,
                spirits, mixers, and ice directly to your venue—cold and on time. Let us handle the
                drinks while our trusted partners take care of the rest.
              </p>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* FAQ Section for SEO */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-3xl text-gray-900 tracking-[0.1em] mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="font-medium text-gray-900 mb-2">
                  What are the best event vendors in Austin?
                </h3>
                <p className="text-gray-600">
                  Austin&apos;s best event vendors include experienced wedding planners, TABC-certified
                  mobile bartenders, Lake Travis boat rental companies, professional caterers, and
                  unique venue spaces. Browse our{' '}
                  <Link href="/austin-byob-venues" className="text-brand-yellow hover:text-yellow-600">
                    complete BYOB venue directory
                  </Link>{' '}
                  for 75+ venues that allow outside alcohol. Our directory features vetted partners
                  across all categories to help you plan the perfect Austin event.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-6">
                <h3 className="font-medium text-gray-900 mb-2">
                  How do I find wedding vendors in Austin, TX?
                </h3>
                <p className="text-gray-600">
                  Browse our Austin event vendor page to find top-rated wedding planners, caterers,
                  bartenders, and venues. For venue options, check out our{' '}
                  <Link href="/austin-byob-venues" className="text-brand-yellow hover:text-yellow-600">
                    full list of 75+ BYOB venues in Austin
                  </Link>
                  . Each partner has been selected for their quality of service
                  and experience with Austin weddings, from downtown celebrations to Hill Country estates.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-6">
                <h3 className="font-medium text-gray-900 mb-2">
                  Where can I rent a party boat on Lake Travis?
                </h3>
                <p className="text-gray-600">
                  Our boat rental partners offer a variety of Lake Travis party boats, including
                  double-decker boats with water slides, luxury yachts, and pontoon boats perfect
                  for bachelorette parties, birthdays, and corporate outings. Most boats include
                  captains and can accommodate groups from 8 to 25+ guests.
                </p>
              </div>
              <div className="pb-6">
                <h3 className="font-medium text-gray-900 mb-2">
                  Do I need a TABC-certified bartender for my Austin event?
                </h3>
                <p className="text-gray-600">
                  Yes, Texas law requires bartenders serving alcohol at events to be TABC-certified.
                  Our mobile bartending partners are fully licensed and insured, ensuring your event
                  is compliant while providing professional cocktail service for your guests.
                </p>
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Become a Partner CTA */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-3xl sm:text-4xl text-white tracking-[0.1em] mb-4">
              Become a Partner
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join Austin&apos;s premier network of event professionals. Partner
              with Party On Delivery to reach more customers and grow your
              business.
            </p>
            <Link
              href="/austin-partners"
              className="inline-block px-8 py-4 bg-brand-yellow text-black hover:bg-yellow-500 transition-colors tracking-[0.1em] text-sm font-medium rounded-sm"
            >
              LEARN ABOUT PARTNERSHIP
            </Link>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-2xl text-gray-900 tracking-[0.1em] mb-8 text-center">
              Browse Austin Event Vendors by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PARTNER_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="p-6 bg-gray-50 hover:bg-yellow-50 rounded-lg text-center transition-colors group"
                >
                  <span className="block font-heading text-lg text-gray-900 group-hover:text-yellow-600 tracking-[0.05em] mb-1">
                    {category.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {partnerCounts[category.id]} partner
                    {partnerCounts[category.id] !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      <Footer />
    </div>
  );
}
