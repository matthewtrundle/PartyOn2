'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';

export default function LuxuryRitzPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Elegant Hero */}
      <section className="relative h-screen">
        <Image
          src="/images/hero/austin-skyline-golden-hour.webp"
          alt="Luxury Experience"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white hero-fade-in">
              <h1 className="text-5xl md:text-7xl font-light tracking-[0.1em] mb-6">
                Old Fashioned Cocktail Recipe
              </h1>
              <div className="w-32 h-px bg-brand-yellow mx-auto mb-6" />
              <p className="text-xl tracking-[0.08em] text-white/90">
                DISTINGUISHED ALCOHOL DELIVERY
              </p>
            </div>
          </div>

          <div className="text-center pb-12">
            <ScrollRevealCSS duration={800} delay={0} y={30}>
              <div>
                <p className="text-white/70 mb-4">Discover Excellence</p>
                <svg className="w-6 h-6 mx-auto text-white/70 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* The Party On Experience */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4 text-gray-900">The Party On Experience</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Premium alcohol delivery service bringing the finest spirits, cocktails, 
              and party essentials to Austin&apos;s most distinguished addresses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <svg className="w-full h-full text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-2xl font-light mb-4">Curated Selection</h3>
              <p className="text-gray-600 leading-relaxed">
                Premium spirits, rare whiskeys, champagnes, and craft cocktails. 
                Expert recommendations available for every occasion.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <svg className="w-full h-full text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-light mb-4">Swift Delivery</h3>
              <p className="text-gray-600 leading-relaxed">
                2-hour delivery across Austin. Temperature-controlled vehicles 
                ensure perfect condition upon arrival.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <svg className="w-full h-full text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-light mb-4">Trusted Excellence</h3>
              <p className="text-gray-600 leading-relaxed">
                Eight years delivering premium alcohol to Austin&apos;s finest 
                homes, offices, and event venues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Services */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4 text-gray-900">Signature Services</h2>
            <p className="text-xl text-gray-600">Tailored to perfection for every occasion</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="relative h-[500px]">
              <Image
                src="/images/services/corporate/penthouse-suite-setup.webp"
                alt="Corporate Excellence"
                fill
                className="object-cover"
              />
            </div>
            <div className="bg-white p-16 flex items-center">
              <div>
                <h3 className="text-3xl font-light mb-6 text-gray-900">Corporate Delivery</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  From office celebrations to client entertainment, we deliver premium 
                  spirits and complete bar setups. Professional presentation with 
                  white-glove service.
                </p>
                <Link href="/austin-corporate-event-delivery">
                  <button className="text-brand-yellow hover:text-yellow-600 transition-colors flex items-center">
                    Explore Corporate Services
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="bg-white p-16 flex items-center order-2 md:order-1">
              <div>
                <h3 className="text-3xl font-light mb-6 text-gray-900">Event Packages</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Your special day deserves nothing less than perfection. Our wedding 
                  services blend seamlessly with your vision, creating memorable moments 
                  that last a lifetime.
                </p>
                <Link href="/weddings">
                  <button className="text-brand-yellow hover:text-yellow-600 transition-colors flex items-center">
                    Discover Wedding Services
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            <div className="relative h-[500px] order-1 md:order-2">
              <Image
                src="/images/services/weddings/boho-hill-country-1.webp"
                alt="Wedding Elegance"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4 text-gray-900">Client Testimonials</h2>
            <p className="text-xl text-gray-600">The measure of our success</p>
          </div>

          <div className="space-y-12">
            <div className="text-center">
              <p className="text-xl text-gray-700 italic mb-6 leading-relaxed">
                &quot;PartyOn has been our exclusive partner for all corporate events. 
                Their attention to detail and commitment to excellence perfectly 
                aligns with our brand values.&quot;
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Jennifer Martinez</span>
                <span className="block text-sm mt-1">Chief Marketing Officer, TechVentures Inc.</span>
              </p>
            </div>

            <div className="w-32 h-px bg-gray-300 mx-auto" />

            <div className="text-center">
              <p className="text-xl text-gray-700 italic mb-6 leading-relaxed">
                &quot;From our engagement party to our wedding day, PartyOn delivered 
                flawless service that exceeded every expectation. Truly world-class.&quot;
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Michael & Sarah Chen</span>
                <span className="block text-sm mt-1">Married at Commodore Perry Estate</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-24 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-light mb-8">Begin Your Journey With Party On</h2>
          <p className="text-xl mb-12 text-gray-300 max-w-2xl mx-auto">
            Experience the gold standard in luxury bar service. 
            Let us elevate your next event to extraordinary.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/consultation">
              <button className="px-10 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors">
                Schedule Consultation
              </button>
            </Link>
            <Link href="/contact">
              <button className="px-10 py-4 border border-white hover:bg-white hover:text-gray-900 transition-all duration-300">
                Contact Us
              </button>
            </Link>
            <Link href="/order-now">
              <button className="px-10 py-4 bg-white text-gray-900 hover:bg-gray-100 transition-colors">
                Order Now
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Refined Footer */}
      <footer className="py-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-light mb-4 text-gray-900">PARTY ON</h3>
              <p className="text-gray-600 max-w-sm">
                Austin&apos;s premier luxury bar service, dedicated to creating 
                exceptional experiences since 2016.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-gray-900">Services</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/austin-corporate-event-delivery" className="hover:text-gray-900">Corporate Events</Link></li>
                <li><Link href="/weddings" className="hover:text-gray-900">Weddings</Link></li>
                <li><Link href="/private" className="hover:text-gray-900">Private Events</Link></li>
                <li><Link href="/consultation" className="hover:text-gray-900">Consultation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-gray-900">Connect</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Austin, Texas</li>
                <li><a href="tel:5125550100" className="hover:text-gray-900">(512) 555-0100</a></li>
                <li><a href="mailto:concierge@partyonaustin.com" className="hover:text-gray-900">concierge@partyonaustin.com</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-gray-500">
            <p>&copy; 2024 Party On. All rights reserved. | <Link href="/privacy" className="hover:text-gray-700">Privacy Policy</Link></p>
          </div>
        </div>
      </footer>
    </main>
  );
}