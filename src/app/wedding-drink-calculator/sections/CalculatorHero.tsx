'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { trackCTAClick } from '@/lib/analytics/ga4-events';

/**
 * Paid-ad landing hero. Editorial-luxury aesthetic (espresso ground,
 * champagne gold accent, restrained type) executed for conversion:
 *
 *   - One-line H1 = exact keyword match for "wedding drink calculator"
 *   - Single Fraunces italic gold "exact" in the subhead carries the
 *     entire editorial signature — no fragmented headline, no
 *     decorative furniture (corner marks, "No. 01", etc.)
 *   - Solid-gold filled CTA above the fold at 1366×768
 *   - Inline "★ 5.0 on Google" trust line below the CTA — social proof
 *     ABOVE the policy compliance strip
 *   - Staggered 600ms entrance reads as composed/premium
 */
export default function CalculatorHero(): ReactElement {
  const handleHeroCta = () => {
    trackCTAClick('Start the calculator', '#calculator', 'wedding_calc_hero');
  };

  return (
    <section className="relative h-[45vh] md:h-[50vh] min-h-[420px] overflow-hidden bg-[#1a1410]">
      <Image
        src="/images/services/weddings/outdoor-bar-setup.webp"
        alt="Austin wedding bar setup with champagne and spirits"
        fill
        className="object-cover opacity-70"
        priority
        sizes="100vw"
      />
      {/* Bottom-heavy vignette — gives the type guaranteed dark ground
          without flattening the image */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1410]/55 via-[#1a1410]/15 to-[#1a1410]" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6 max-w-3xl mx-auto">
        <h1
          className="font-heading text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05] opacity-0 animate-[fadeUp_0.6s_cubic-bezier(0.22,1,0.36,1)_forwards]"
        >
          Wedding Drink Calculator
        </h1>

        <p
          className="mt-6 max-w-xl text-lg md:text-xl text-white/85 font-light leading-relaxed opacity-0 animate-[fadeUp_0.6s_cubic-bezier(0.22,1,0.36,1)_0.2s_forwards]"
        >
          Get{' '}
          <span className="font-cormorant italic text-[#C8A96A]">exact</span>{' '}
          beer, wine, spirits, and bubbly counts for your Austin wedding.
          Delivered cold to your venue.
        </p>

        <a
          href="#calculator"
          onClick={handleHeroCta}
          className="group mt-8 inline-flex items-center gap-3 bg-[#C8A96A] text-[#1a1410] hover:bg-[#d8b97a] transition-colors duration-300 px-10 py-4 text-sm tracking-[0.25em] uppercase font-medium rounded-lg opacity-0 animate-[fadeUp_0.6s_cubic-bezier(0.22,1,0.36,1)_0.4s_forwards]"
        >
          Start the Calculator
          <span className="transition-transform duration-300 group-hover:translate-y-0.5">
            ↓
          </span>
        </a>

        <p
          className="mt-5 text-sm text-white/65 tracking-wide font-light opacity-0 animate-[fadeUp_0.6s_cubic-bezier(0.22,1,0.36,1)_0.6s_forwards]"
        >
          <span className="text-[#C8A96A]">★ 5.0</span> on Google · 98+ Austin wedding reviews
        </p>
      </div>

      {/* TABC compliance — policy-mandated bottom strip, kept separate
          from the social-proof line above (different jobs) */}
      <div className="absolute bottom-0 inset-x-0 z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-2 py-2.5 px-4 text-xs sm:text-sm tracking-[0.25em] uppercase font-light text-white/80">
          <li>
            <Link href="/tabc" className="hover:text-[#C8A96A] transition-colors">
              TABC-Licensed
            </Link>
          </li>
          <li className="text-white/25">·</li>
          <li>21+ to Order</li>
          <li className="text-white/25">·</li>
          <li>ID Required</li>
        </ul>
      </div>
    </section>
  );
}
