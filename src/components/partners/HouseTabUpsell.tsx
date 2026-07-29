'use client';

import type { ReactElement } from 'react';
import Image from 'next/image';
import Button from '@/components/Button';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';

/**
 * House Tab upsell section for Premier Party Cruises page.
 * Dark section encouraging customers to add a house delivery
 * with Austin Survival Kit and free delivery/stocking perks.
 */
export default function HouseTabUpsell(): ReactElement {
  return (
    <section id="house-tab-upsell" className="bg-gray-900 py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
          {/* Left: Content */}
          <div>
            {/* Headline */}
            <h2 className="font-heading text-3xl md:text-4xl text-white mb-3">
              Free Welcome Package
            </h2>
            <p className="text-white/80 font-sans text-lg mb-8">
              Spend <strong className="text-brand-yellow">$300+</strong> on a house delivery and we include a{' '}
              <strong className="text-brand-yellow">Welcome to Austin Survival Package</strong>,{' '}
              free delivery, and fridge stocking.
            </p>

            {/* Value bullets */}
            <div className="space-y-4 mb-8">
              {[
                'One group link for house and boat orders',
                'Stocked and ready when your group walks in',
              ].map((bullet, idx) => (
                <ScrollRevealCSS key={bullet} delay={idx * 100}>
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-brand-yellow flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/90 font-sans leading-relaxed">{bullet}</span>
                  </div>
                </ScrollRevealCSS>
              ))}
            </div>

            {/* CTA */}
            <Button variant="cart" size="md" href="/order">
              Order Your Drinks
            </Button>
          </div>

          {/* Right: Austin Survival Kit Image */}
          <ScrollRevealCSS delay={200} className="flex justify-center">
            <div className="relative w-full max-w-sm aspect-square rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src="/images/products/welcome-to-austin-survival-package.png"
                alt="Welcome to Austin Survival Package - included free with $300+ house delivery orders"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 384px"
              />
            </div>
          </ScrollRevealCSS>
        </div>
      </div>
    </section>
  );
}
