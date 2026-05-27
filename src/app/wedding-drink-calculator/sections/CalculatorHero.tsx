'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { trackCTAClick } from '@/lib/analytics/ga4-events';

/**
 * Full-bleed hero for /wedding-drink-calculator. Follows the `mt-24 h-[60vh]
 * md:h-[70vh]` pattern from CLAUDE.md. Keeps the 4-badge TABC/21+ compliance
 * strip required by Google Ads alcohol policy.
 */
export default function CalculatorHero(): ReactElement {
  const handleHeroCta = () => {
    trackCTAClick('Show me the calculator', '#calculator', 'wedding_calc_hero');
  };

  return (
    <section className="relative h-[60vh] md:h-[70vh] mt-16 flex items-center justify-center overflow-hidden">
      <Image
        src="/images/services/weddings/outdoor-bar-setup.webp"
        alt="Outdoor wedding bar setup at an Austin reception"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/65 via-gray-900/45 to-gray-900/65" />

      <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-6">
        <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] text-[#F2D34F] mb-4">
          AUSTIN WEDDING BAR DELIVERY
        </p>
        <h1 className="font-heading font-bold text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight mb-5">
          Your Wedding Bar.
          <span className="block text-[#C8A96A]">Calculated. Delivered. Done.</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed mb-7">
          Plug in your guest count. Get exact quantities for beer, wine, spirits,
          and bubbly. Then let Austin&apos;s wedding alcohol delivery team handle the rest.
        </p>

        <a
          href="#calculator"
          onClick={handleHeroCta}
          className="inline-flex items-center justify-center font-bold text-base sm:text-lg px-8 py-4 rounded-lg tracking-wide bg-[#F2D34F] text-gray-900 hover:bg-[#FACC15] transition-colors shadow-xl"
        >
          Show Me The Calculator ↓
        </a>

        {/* Compliance + trust strip — required for Google Ads alcohol policy.
            Surfaces TABC license and 21+ disclosure above the fold. */}
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm">
          <li>
            <Link
              href="/tabc"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 font-semibold text-white hover:bg-white/25 border border-white/25"
            >
              ✓ TABC-Licensed Retailer
            </Link>
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 font-semibold text-white border border-white/20">
            ✓ Must Be 21+ to Order
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 font-semibold text-white border border-white/20">
            ★ 5.0 on Google · 98+ reviews
          </li>
        </ul>
      </div>
    </section>
  );
}
