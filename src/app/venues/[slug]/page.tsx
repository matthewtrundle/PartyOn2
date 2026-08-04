'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import venuesData from '@/data/byob-venues.json';
import type { BYOBVenue } from '@/lib/byob-venues/types';
import { getAreaName, getPriceLabel } from '@/lib/byob-venues/types';

export default function VenueLandingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [venue, setVenue] = useState<BYOBVenue | null>(null);

  useEffect(() => {
    const venues = venuesData.venues as BYOBVenue[];
    const found = venues.find((v) => v.partnerSlug === slug);
    setVenue(found || null);
  }, [slug]);

  if (!venue) {
    return (
      <div className="bg-white min-h-screen">
        <Navigation />
        <div className="pt-32 pb-16 px-8 text-center">
          <h1 className="font-heading text-3xl text-gray-900 mb-4">Venue Not Found</h1>
          <p className="text-gray-600 mb-8">This venue page doesn&apos;t exist or is no longer a partner.</p>
          <Link
            href="/austin-byob-venues"
            className="inline-block px-6 py-3 bg-yellow-500 text-gray-900 font-medium rounded hover:bg-brand-yellow transition-colors"
          >
            Browse All Venues
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isPremier = venue.partnerStatus === 'premier';

  return (
    <div className="bg-white min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] mt-24 flex items-center">
        <div className="absolute inset-0">
          <Image
            src={venue.image || '/images/venues/default-venue.webp'}
            alt={`${venue.name} - ${venue.subcategory} in Austin`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 text-white">
          <ScrollRevealCSS duration={800} y={30}>
            {/* Partner Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold tracking-wide rounded-full ${
                isPremier ? 'bg-yellow-500 text-gray-900' : 'bg-brand-yellow text-gray-900'
              }`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                FREE ALCOHOL DELIVERY
              </span>
              {isPremier && (
                <span className="px-3 py-1 bg-gray-900 text-brand-yellow text-xs font-bold tracking-wider rounded">
                  PREMIER PARTNER
                </span>
              )}
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl mb-4 tracking-[0.1em] max-w-4xl">
              {venue.name}
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl leading-relaxed text-gray-200 mb-6">
              {venue.subcategory} in {getAreaName(venue.area)}
            </p>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{getAreaName(venue.area)}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{getPriceLabel(venue.priceRange)}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>{venue.setting === 'both' ? 'Indoor & Outdoor' : venue.setting === 'indoor' ? 'Indoor' : 'Outdoor'}</span>
              </div>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Free Delivery Banner */}
      <section className="bg-yellow-500 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-900 font-medium">
                Free alcohol delivery to {venue.name} on orders over $150
              </span>
            </div>
            <Link
              href="/order"
              className="inline-flex items-center gap-2 px-6 py-2 bg-gray-900 text-white font-medium rounded hover:bg-gray-800 transition-colors"
            >
              Order Now
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Left Column - Venue Details */}
            <div className="lg:col-span-2 space-y-12">
              {/* BYOB Policy */}
              <ScrollRevealCSS duration={600} y={20}>
                <div>
                  <h2 className="font-heading text-2xl text-gray-900 tracking-[0.1em] mb-4">
                    BYOB Policy
                  </h2>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-green-900 mb-2">Outside Alcohol Allowed</h3>
                        <p className="text-green-800">{venue.byobPolicy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollRevealCSS>

              {/* Event Types */}
              <ScrollRevealCSS duration={600} y={20} delay={100}>
                <div>
                  <h2 className="font-heading text-2xl text-gray-900 tracking-[0.1em] mb-4">
                    Perfect For
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {venue.eventTypes.map((eventType) => (
                      <span
                        key={eventType}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                      >
                        {eventType === 'wedding' && 'Weddings'}
                        {eventType === 'corporate' && 'Corporate Events'}
                        {eventType === 'party' && 'Parties'}
                        {eventType === 'bachelor' && 'Bachelor/ette Parties'}
                        {eventType === 'social' && 'Social Events'}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollRevealCSS>

              {/* How It Works */}
              <ScrollRevealCSS duration={600} y={20} delay={200}>
                <div>
                  <h2 className="font-heading text-2xl text-gray-900 tracking-[0.1em] mb-6">
                    How Free Delivery Works
                  </h2>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-xl font-bold text-yellow-600">1</span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">Browse & Order</h3>
                      <p className="text-sm text-gray-600">
                        Select your beer, wine, and spirits from our curated collection.
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-xl font-bold text-yellow-600">2</span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">Schedule Delivery</h3>
                      <p className="text-sm text-gray-600">
                        Choose your event date and we&apos;ll deliver directly to {venue.name}.
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-xl font-bold text-yellow-600">3</span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">Enjoy Your Event</h3>
                      <p className="text-sm text-gray-600">
                        Everything arrives cold and ready. Return up to 25% unopened for a full refund.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollRevealCSS>

              {/* Venue Contact */}
              {venue.website && (
                <ScrollRevealCSS duration={600} y={20} delay={300}>
                  <div>
                    <h2 className="font-heading text-2xl text-gray-900 tracking-[0.1em] mb-4">
                      Book This Venue
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Contact {venue.name} directly to book your event, then order your alcohol through Party On Delivery for free delivery.
                    </p>
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors"
                    >
                      Visit {venue.name} Website
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </ScrollRevealCSS>
              )}
            </div>

            {/* Right Column - Order CTA */}
            <div className="lg:col-span-1">
              <div className="sticky top-32">
                <ScrollRevealCSS duration={600} y={20}>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-heading text-xl text-gray-900 mb-4">
                      Order Alcohol for Your Event
                    </h3>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Free delivery to this venue</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Arrives cold and on time</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Return up to 25% unopened for a full refund</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">No corkage fees</span>
                      </li>
                    </ul>

                    <Link
                      href="/order"
                      className="block w-full text-center px-6 py-4 bg-yellow-500 text-gray-900 font-medium rounded-lg hover:bg-brand-yellow transition-colors mb-4"
                    >
                      Browse Our Selection
                    </Link>

                    <Link
                      href="/order"
                      className="block w-full text-center px-6 py-3 border border-brand-yellow text-yellow-600 font-medium rounded-lg hover:bg-yellow-50 transition-colors"
                    >
                      Use Drink Calculator
                    </Link>

                    <p className="text-xs text-gray-500 text-center mt-4">
                      Questions? Call us at{' '}
                      <a href="tel:7373719700" className="text-brand-yellow hover:underline">
                        737.371.9700
                      </a>
                    </p>
                  </div>
                </ScrollRevealCSS>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Partner Venues */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <ScrollRevealCSS duration={600} y={20}>
            <div className="text-center mb-10">
              <h2 className="font-heading text-3xl text-gray-900 tracking-[0.1em] mb-4">
                More Partner Venues
              </h2>
              <p className="text-gray-600">
                All partner venues receive free alcohol delivery from Party On Delivery
              </p>
            </div>

            <div className="flex justify-center">
              <Link
                href="/austin-byob-venues"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-medium rounded hover:bg-gray-800 transition-colors"
              >
                View All 73 BYOB Venues
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <ScrollRevealCSS duration={600} y={20}>
            <h2 className="font-heading text-2xl text-gray-900 tracking-[0.1em] mb-6">
              About {venue.name}
            </h2>
            <div className="prose prose-lg text-gray-600 max-w-none">
              <p>
                <strong>{venue.name}</strong> is a {venue.subcategory.toLowerCase()} located in{' '}
                {getAreaName(venue.area)}, Austin. As a BYOB venue, they allow you to bring your own
                alcohol for events, saving you thousands compared to traditional venue bar packages.
              </p>
              <p>
                As a Party On Delivery partner venue, {venue.name} guests receive{' '}
                <strong>free alcohol delivery</strong> on orders over $150. Simply browse our selection
                of beer, wine, and spirits, place your order, and we&apos;ll deliver everything cold and
                ready for your event.
              </p>
              <p>
                Perfect for {venue.eventTypes.slice(0, 3).map((t) => {
                  const labels: Record<string, string> = {
                    wedding: 'weddings',
                    corporate: 'corporate events',
                    party: 'parties',
                    bachelor: 'bachelor/ette parties',
                    social: 'social events',
                  };
                  return labels[t] || t;
                }).join(', ')}, {venue.name} offers a unique {venue.setting === 'both' ? 'indoor and outdoor' : venue.setting} setting
                with {getPriceLabel(venue.priceRange).toLowerCase()} pricing.
              </p>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      <Footer />
    </div>
  );
}
