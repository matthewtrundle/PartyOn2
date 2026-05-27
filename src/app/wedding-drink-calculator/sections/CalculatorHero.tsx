'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { trackCTAClick } from '@/lib/analytics/ga4-events';

/**
 * Compact paid-ad hero for /wedding-drink-calculator. Single-line H1
 * matches the target search keyword, italic gold accent preserves the
 * editorial signature. Decorative magazine furniture (corner marks,
 * "Est. Austin", "No. 01") removed — too much visual noise for cold
 * paid traffic that needs message-match in <1 second.
 */
export default function CalculatorHero(): ReactElement {
  const handleHeroCta = () => {
    trackCTAClick('Start the calculator', '#calculator', 'wedding_calc_hero');
  };

  return (
    <section className="relative h-[50vh] md:h-[55vh] min-h-[420px] overflow-hidden bg-[#1a1410]">
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

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6 max-w-4xl mx-auto">
        <div className="h-px w-12 bg-[#C8A96A] mb-6" />

        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-light leading-[1.05] tracking-tight">
          Wedding drink{' '}
          <span className="italic font-extralight text-[#C8A96A]">
            calculator.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto leading-relaxed font-light tracking-wide mt-6 mb-8">
          How much alcohol for your Austin wedding? Plug in your guest
          count. We&apos;ll calculate exact quantities for beer, wine,
          spirits, and bubbly — then deliver it all cold to your venue.
        </p>

        <a
          href="#calculator"
          onClick={handleHeroCta}
          className="group inline-flex items-center gap-4 border border-[#C8A96A] text-[#C8A96A] hover:bg-[#C8A96A] hover:text-[#1a1410] transition-colors duration-300 px-9 py-4 text-sm tracking-[0.3em] uppercase font-light rounded-lg"
        >
          Start the calculator
          <span className="text-sm transition-transform duration-300 group-hover:translate-y-0.5">
            ↓
          </span>
        </a>
      </div>

      {/* Compliance strip — quiet bottom rule, sized to be legible (12-14px),
          required for Google Ads alcohol policy. */}
      <div className="absolute bottom-0 inset-x-0 z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-2 py-3 px-4 text-xs sm:text-sm tracking-[0.25em] uppercase font-light text-white/80">
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
