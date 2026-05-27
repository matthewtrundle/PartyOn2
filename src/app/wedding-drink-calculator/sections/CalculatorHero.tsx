'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { trackCTAClick } from '@/lib/analytics/ga4-events';

/**
 * Editorial-estate hero for /wedding-drink-calculator. Dramatic type
 * contrast, gold-mark accents, no chrome. The compliance strip is
 * anchored to the bottom of the viewport as a quiet rule, not a badge
 * cluster.
 */
export default function CalculatorHero(): ReactElement {
  const handleHeroCta = () => {
    trackCTAClick('Start the calculator', '#calculator', 'wedding_calc_hero');
  };

  return (
    <section className="relative h-[55vh] md:h-[65vh] min-h-[480px] overflow-hidden bg-[#1a1410]">
      <Image
        src="/images/services/weddings/outdoor-bar-setup.webp"
        alt="Outdoor wedding bar setup at an Austin reception"
        fill
        className="object-cover opacity-55"
        priority
        sizes="100vw"
      />
      {/* Soft vignette — keeps focus center, lets photo breathe at edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1410]/70 via-[#1a1410]/30 to-[#1a1410]" />

      {/* Top corner marks — magazine-style page furniture */}
      <div className="absolute top-6 left-6 md:top-10 md:left-12 z-10">
        <p className="text-[#C8A96A] tracking-[0.4em] text-[10px] sm:text-xs font-light uppercase">
          Est. Austin
        </p>
      </div>
      <div className="absolute top-6 right-6 md:top-10 md:right-12 z-10 text-right">
        <p className="text-white/55 tracking-[0.35em] text-[10px] sm:text-xs font-light uppercase">
          No. 01
        </p>
        <p className="text-white/40 tracking-[0.25em] text-[9px] sm:text-[10px] font-light uppercase mt-1">
          Reception · Bar · Delivery
        </p>
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6 max-w-5xl mx-auto">
        <div className="h-px w-12 bg-[#C8A96A] mb-8" />

        <p className="text-[11px] sm:text-xs tracking-[0.5em] text-[#C8A96A] mb-10 font-light uppercase">
          Austin Wedding Bar Delivery
        </p>

        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[7.5rem] font-light leading-[0.95] tracking-tight max-w-4xl">
          Wedding drink
          <span className="block italic font-extralight text-[#C8A96A] mt-1 md:mt-2">
            calculator.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-white/75 max-w-xl mx-auto leading-relaxed font-light tracking-wide mt-10 mb-12">
          How much alcohol for your Austin wedding? Plug in your guest
          count. We&apos;ll calculate exact quantities for beer, wine,
          spirits, and bubbly — then deliver it all cold to your venue.
        </p>

        <a
          href="#calculator"
          onClick={handleHeroCta}
          className="group inline-flex items-center gap-4 border border-[#C8A96A] text-[#C8A96A] hover:bg-[#C8A96A] hover:text-[#1a1410] transition-colors duration-300 px-9 py-4 text-xs sm:text-sm tracking-[0.35em] uppercase font-light rounded-lg"
        >
          Start the calculator
          <span className="text-sm transition-transform duration-300 group-hover:translate-y-0.5">
            ↓
          </span>
        </a>
      </div>

      {/* Compliance strip — quiet bottom rule. Required for Google Ads alcohol policy
          but treated as page furniture, not a CTA. */}
      <div className="absolute bottom-0 inset-x-0 z-10 border-t border-white/10 bg-black/35 backdrop-blur-sm">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-2 py-3 px-4 text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-light text-white/70">
          <li>
            <span className="text-[#C8A96A] mr-1.5">★</span>
            5.0 on Google
          </li>
          <li className="text-white/25">·</li>
          <li>
            <Link href="/tabc" className="hover:text-[#C8A96A] transition-colors">
              TABC-Licensed
            </Link>
          </li>
          <li className="text-white/25">·</li>
          <li>21+ to Order</li>
        </ul>
      </div>
    </section>
  );
}
