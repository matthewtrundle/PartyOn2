/**
 * @fileoverview Inn Cahoots hero - cocktail mosaic background with logo watermark
 * @module components/partners/InnCahootsHero
 */

'use client';

import { type ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function InnCahootsHero(): ReactElement {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundImage: `url('/images/partners/inncahoots-hero.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark gradient overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 via-gray-900/70 to-gray-900/55" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">

          {/* Left Column: Content */}
          <div className="order-1 text-center">
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-white mb-4 tracking-wide leading-tight">
              Your Drinks, Ready At Check-In
            </h1>
            <p className="text-gray-300 text-lg md:text-xl mb-8">
              Delivered to Inn Cahoots on East 6th. Fridge stocked. Zero hassle.
            </p>

            {/* CTA */}
            <div className="mb-8">
              <Link
                href="/order?ref=MISCHIEF"
                className="inline-block h-14 md:h-16 px-10 bg-yellow-500 hover:bg-brand-yellow text-gray-900 font-semibold tracking-wide transition-colors rounded-lg text-lg md:text-xl leading-[3.5rem] md:leading-[4rem]"
              >
                Start an Order
              </Link>
            </div>

            {/* Phone */}
            <p className="text-base text-white/50">
              Questions? Text{' '}
              <a href="tel:7373719700" className="text-brand-yellow hover:text-brand-yellow font-medium">
                737-371-9700
              </a>
            </p>
          </div>

          {/* Right Column: Cocktail mosaic + partnership badge + trust */}
          <div className="order-2 flex flex-col gap-5">
            {/* Cocktail mosaic */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg border border-white/10">
              <Image
                src="/images/partners/inn-cahoots-cocktail-mosaic.webp"
                alt="Cocktails delivered to Inn Cahoots"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Partnership Badge -- proper aspect ratio for the wordmark */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Image
                src="/images/partners/inncahoots-logo.png"
                alt="Inn Cahoots"
                width={1389}
                height={285}
                className="h-7 md:h-8 w-auto object-contain"
              />
              <span className="text-white/40 text-lg">&times;</span>
              <Image
                src="/images/pod-logo-2025.svg"
                alt="Party On Delivery"
                width={44}
                height={44}
                className="h-9 md:h-11 w-auto object-contain"
              />
            </div>

            {/* Trust Signals Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/70">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Free Hotel Delivery
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                TABC Licensed
              </span>
              <span className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
