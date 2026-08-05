'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import Navigation from "@/components/Navigation";
import { WeddingOrderCalculator } from '@/components/wedding-order';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';

/**
 * Wedding Order Page
 * Shareable page for wedding venues and couples to build their bar order
 */
export default function WeddingOrderPage(): ReactElement {
  return (
    <div className="bg-white min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 min-h-[500px] relative overflow-hidden">
        {/* Background Image */}
        <img
          src="/images/wedding-services/order-hero.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_70%]"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/50" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <ScrollRevealCSS>
            <p className="text-brand-yellow tracking-[0.1em] text-sm uppercase mb-4">
              Wedding Bar Packages
            </p>
          </ScrollRevealCSS>

          <ScrollRevealCSS delay={100}>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-6 tracking-[0.1em]">
              BUILD YOUR PERFECT
              <br />
              WEDDING BAR
            </h1>
          </ScrollRevealCSS>

          <ScrollRevealCSS delay={200}>
            <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
          </ScrollRevealCSS>

          <ScrollRevealCSS delay={300}>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto">
              Use our calculator to build a customized bar package for your wedding.
              Choose from 5 tiers, select your spirits, and get exactly what you need
              delivered to your Austin venue.
            </p>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6">
          <WeddingOrderCalculator />
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <ScrollRevealCSS delay={0}>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 text-sm tracking-[0.05em]">TABC Certified</h3>
                <p className="text-xs text-gray-500 mt-1">Licensed & insured</p>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={100}>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 text-sm tracking-[0.05em]">Austin Local</h3>
                <p className="text-xs text-gray-500 mt-1">Serving Greater Austin</p>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={200}>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 text-sm tracking-[0.05em]">Scheduled Delivery</h3>
                <p className="text-xs text-gray-500 mt-1">We arrive on time</p>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={300}>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 text-sm tracking-[0.05em]">Easy Payment</h3>
                <p className="text-xs text-gray-500 mt-1">Secure checkout</p>
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <ScrollRevealCSS>
            <h2 className="font-heading text-3xl text-center text-gray-900 mb-12 tracking-[0.1em]">
              FREQUENTLY ASKED QUESTIONS
            </h2>
          </ScrollRevealCSS>

          <div className="space-y-6">
            <ScrollRevealCSS delay={100}>
              <div className="border-b border-gray-200 pb-6">
                <h3 className="font-medium text-gray-900 mb-2">How accurate is the calculator?</h3>
                <p className="text-gray-600 text-sm">
                  Our calculator uses industry-standard formulas based on guest count and event
                  duration. The quantities are recommendations - you can adjust them in your cart
                  before checkout. We recommend contacting us to review your order.
                </p>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={150}>
              <div className="border-b border-gray-200 pb-6">
                <h3 className="font-medium text-gray-900 mb-2">Can I customize the products?</h3>
                <p className="text-gray-600 text-sm">
                  Yes! After adding the package to your cart, you can remove items, adjust
                  quantities, or add additional products from our full catalog. The calculator
                  gives you a starting point.
                </p>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={200}>
              <div className="border-b border-gray-200 pb-6">
                <h3 className="font-medium text-gray-900 mb-2">What areas do you deliver to?</h3>
                <p className="text-gray-600 text-sm">
                  We deliver throughout the Greater Austin area including downtown, Lake Travis,
                  Dripping Springs, Round Rock, Cedar Park, and more. Contact us for venues
                  outside our standard delivery zone.
                </p>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={250}>
              <div className="border-b border-gray-200 pb-6">
                <h3 className="font-medium text-gray-900 mb-2">How far in advance should I order?</h3>
                <p className="text-gray-600 text-sm">
                  We require at least 72 hours notice for all orders. For weddings, we recommend
                  placing your order 1-2 weeks in advance to ensure product availability.
                </p>
              </div>
            </ScrollRevealCSS>

            <ScrollRevealCSS delay={300}>
              <div className="pb-6">
                <h3 className="font-medium text-gray-900 mb-2">Do you offer bartending services?</h3>
                <p className="text-gray-600 text-sm">
                  Yes! We partner with TABC-certified bartenders. Contact us to add bartending
                  services to your order. Prices vary based on event duration and guest count.
                </p>
              </div>
            </ScrollRevealCSS>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ScrollRevealCSS>
            <h2 className="font-heading text-3xl text-white mb-4 tracking-[0.1em]">
              NEED HELP WITH YOUR ORDER?
            </h2>
          </ScrollRevealCSS>

          <ScrollRevealCSS delay={100}>
            <p className="text-gray-400 mb-8">
              Our team is here to help you plan the perfect bar for your wedding.
              Get personalized recommendations and answers to your questions.
            </p>
          </ScrollRevealCSS>

          <ScrollRevealCSS delay={200}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-4 bg-brand-yellow text-white rounded-lg font-medium tracking-[0.1em] uppercase hover:bg-yellow-600 transition-colors"
              >
                Contact Us
              </Link>
              <a
                href="tel:5125551234"
                className="inline-flex items-center justify-center px-8 py-4 border border-white/30 text-white rounded-lg font-medium tracking-[0.1em] uppercase hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Us
              </a>
            </div>
          </ScrollRevealCSS>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="font-heading text-lg text-gray-900 tracking-[0.1em]">PARTY ON DELIVERY</p>
              <p className="text-sm text-gray-500 mt-1">Premium alcohol delivery in Austin, Texas</p>
            </div>
            <div className="flex gap-6">
              <Link href="/weddings" className="text-sm text-gray-600 hover:text-brand-yellow transition-colors">
                Wedding Services
              </Link>
              <Link href="/order" className="text-sm text-gray-600 hover:text-brand-yellow transition-colors">
                Full Catalog
              </Link>
              <Link href="/contact" className="text-sm text-gray-600 hover:text-brand-yellow transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
