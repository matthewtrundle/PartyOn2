'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from "@/components/Navigation";
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import KegsSchemas from '@/components/seo/KegsSchemas';
import KegSizeEducation from '@/components/kegs/KegSizeEducation';
import KegProductGrid from '@/components/kegs/KegProductGrid';
import EquipmentRentals from '@/components/kegs/EquipmentRentals';
import KegCalculator from '@/components/kegs/KegCalculator';
import KegServiceAreas from '@/components/kegs/KegServiceAreas';
import { trackPageView, ANALYTICS_EVENTS } from '@/lib/analytics/track';
import { useCartContext } from '@/contexts/CartContext';

/**
 * Keg Delivery Landing Page
 * SEO-optimized page for Austin keg delivery searches
 */
export default function KegsPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { cart, openCart } = useCartContext();

  const itemCount = cart?.lines?.edges?.reduce((total, edge) => total + edge.node.quantity, 0) || 0;

  useEffect(() => {
    trackPageView(ANALYTICS_EVENTS.VIEW_KEGS, '/kegs', 'Keg Delivery Austin TX');
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('section');
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        setIsScrolled(window.scrollY > heroBottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-white">
      {/* SEO Schemas */}
      <KegsSchemas />

      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] mt-24 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/kegs/keg-party-hero.png"
            alt="Backyard pool party with keg in Austin"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/90" />

        <div className="hero-fade-in relative text-center text-white z-10 max-w-4xl mx-auto px-8">
          <h1 className="font-heading font-light text-5xl md:text-7xl mb-6 tracking-[0.08em]">
            Cold Beer Kegs
            <span className="block text-brand-yellow mt-2">DELIVERED TO YOUR DOOR</span>
          </h1>
          <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          <p className="text-lg md:text-xl font-light tracking-[0.1em] text-gray-200 mb-8">
            Keg delivery for parties, weddings, tailgates, and events throughout Austin.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/contact">
              <button className="px-8 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm font-medium">
                REQUEST A QUOTE
              </button>
            </Link>
            <a href="tel:7373719700">
              <button className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm font-medium">
                CALL (737) 371-9700
              </button>
            </a>
          </div>
          <p className="text-sm text-gray-300 mt-4 tracking-[0.05em]">
            TABC-certified delivery • $50 refundable deposit • 72-hour advance notice
          </p>
        </div>
      </section>

      {/* Product Grid - includes "Need Multiple Kegs" CTA */}
      <KegProductGrid />

      {/* Equipment Rentals - right after kegs */}
      <EquipmentRentals />

      {/* How It Works */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              How Keg Delivery Works
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollRevealCSS duration={800} y={20} delay={100} className="text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-heading text-brand-yellow">1</span>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Choose Your Brew
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Select from our in-stock kegs or request any brand.
                Miller Lite, Corona, craft beers—we source it all.
              </p>
              <p className="text-gray-500 text-sm mt-2 italic">
                If you need something specific, just call and ask.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={200} className="text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-heading text-brand-yellow">2</span>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Schedule Delivery
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Book 72 hours in advance. We deliver to homes, venues,
                docks, and event spaces across Austin.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={300} className="text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-heading text-brand-yellow">3</span>
              </div>
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.1em]">
                Party On
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                We arrive with your keg ice-cold and ready to tap.
                Return the empty keg within 7 days for your deposit refund.
              </p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* Keg Size Education */}
      <KegSizeEducation />

      {/* Keg Calculator */}
      <KegCalculator />

      {/* Service Areas */}
      <KegServiceAreas />

      {/* Trust Badges */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-8">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <ScrollRevealCSS duration={800} y={20} delay={100} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium tracking-[0.05em]">TABC Certified</p>
              <p className="text-gray-500 text-sm">Licensed delivery</p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={200} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium tracking-[0.05em]">$50 Deposit</p>
              <p className="text-gray-500 text-sm">100% refundable</p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={300} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium tracking-[0.05em]">72-Hour Notice</p>
              <p className="text-gray-500 text-sm">Advance booking</p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={400} className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium tracking-[0.05em]">Ice Cold</p>
              <p className="text-gray-500 text-sm">Delivered chilled</p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-8">
          <ScrollRevealCSS duration={800} y={20} className="text-center mb-16">
            <h2 className="font-heading font-light text-4xl md:text-5xl text-gray-900 mb-4 tracking-[0.1em]">
              Frequently Asked Questions
            </h2>
            <div className="w-16 h-px bg-brand-yellow mx-auto" />
          </ScrollRevealCSS>

          <div className="space-y-6">
            <ScrollRevealCSS duration={800} y={20} delay={100} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                How quickly can I get a keg delivered in Austin?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We require 72-hour advance notice for all keg deliveries. This allows us to
                source your preferred brand, ensure it&apos;s properly chilled, and coordinate
                delivery logistics. For last-minute needs, call us—we may be able to accommodate.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={150} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                What&apos;s the difference between 1/2, 1/4, and 1/6 barrel kegs?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                A 1/2 barrel (full keg) holds 15.5 gallons (~165 beers) and serves 50-80 guests.
                A 1/4 barrel (pony keg) holds 7.75 gallons (~82 beers) for 25-40 guests.
                A 1/6 barrel (sixtel) holds 5.16 gallons (~55 beers) for 15-25 guests.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={200} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                Do you provide taps and ice tubs with keg delivery?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes! We offer equipment rentals including party taps ($15/day), ice tubs ($25/day),
                CO2 dispensing systems ($50/day), and jockey boxes ($75/day). Bundle equipment
                with your keg order for the best value.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={250} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                Is there a keg deposit? How do returns work?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, there&apos;s a $50 keg deposit that&apos;s fully refunded when you return the
                empty keg within 7 days. We can pick it up or you can drop it off at our location.
                Equipment deposits vary by item.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={300} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                Can you deliver kegs to Lake Travis boat docks?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Absolutely! We specialize in Lake Travis dock delivery to marinas including
                Lakeway Marina, Point Venture, Volente Beach, and Hudson Bend. Check out our{' '}
                <Link href="/boat-parties" className="text-brand-yellow hover:text-yellow-600 underline">
                  boat party delivery page
                </Link>{' '}
                for more details.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={350} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                How long does a keg stay fresh after tapping?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                With a manual pump tap, a keg stays fresh for about 8-12 hours once tapped.
                With a CO2 system, it stays fresh for 2-3 weeks. We recommend CO2 for multi-day
                events or if you won&apos;t finish the keg in one day.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={400} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                Do you deliver Miller Lite and Corona kegs same-day?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We keep Miller Lite and Corona kegs in stock, but still require 72-hour advance
                notice to ensure they&apos;re properly chilled for your event. For other brands,
                we source them based on your request.
              </p>
            </ScrollRevealCSS>

            <ScrollRevealCSS duration={800} y={20} delay={450} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-heading text-xl text-gray-900 mb-3 tracking-[0.05em]">
                What areas of Austin do you deliver kegs to?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We deliver throughout Austin including Downtown, South Austin, East Austin,
                Lake Travis, Westlake, The Domain, Bee Cave, Lakeway, Mueller, and Spicewood.
                We currently don&apos;t serve Round Rock, Cedar Park, or Dripping Springs.
              </p>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <ScrollRevealCSS duration={800} y={20}>
            <h2 className="font-heading font-light text-4xl md:text-5xl text-white mb-6 tracking-[0.1em]">
              Ready to Order Your Keg?
            </h2>
            <p className="text-gray-300 text-lg mb-12 tracking-[0.05em]">
              Get cold kegs delivered to your door, dock, or venue in Austin
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <Link href="/contact">
                <button className="px-10 py-4 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm">
                  REQUEST A QUOTE
                </button>
              </Link>
              <a href="tel:7373719700">
                <button className="px-10 py-4 border-2 border-brand-yellow text-white hover:bg-brand-yellow hover:text-gray-900 transition-all duration-300 tracking-[0.08em] text-sm">
                  CALL (737) 371-9700
                </button>
              </a>
            </div>
          </ScrollRevealCSS>
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
                Austin&apos;s premier keg delivery service. Cold beer for parties, weddings, and events.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SERVICES</h4>
              <ul className="space-y-2">
                <li><Link href="/kegs" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Keg Delivery</Link></li>
                <li><Link href="/weddings" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Weddings</Link></li>
                <li><Link href="/boat-parties" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Boat Parties</Link></li>
                <li><Link href="/austin-corporate-event-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Corporate</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">KEGS</h4>
              <ul className="space-y-2">
                <li><Link href="/products/miller-lite-keg" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Miller Lite</Link></li>
                <li><Link href="/products/corona-extra-1-2-barrel" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Corona Extra</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Request a Brand</Link></li>
                <li><Link href="/faqs" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">FAQs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">CONTACT</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>Phone: (737) 371-9700</li>
                <li>Email: info@partyondelivery.com</li>
                <li>Hours: 9am - 7pm</li>
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

      {/* Sticky Bottom Bar - Mobile Only */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50 md:hidden"
          >
            <button
              onClick={() => openCart()}
              className="w-full py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors text-sm tracking-[0.1em] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              VIEW CART {itemCount > 0 && `(${itemCount})`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
