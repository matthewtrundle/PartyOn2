'use client';

import type { ReactElement } from 'react';
import { trackCTAClick } from '@/lib/analytics/ga4-events';

/**
 * Mobile sticky CTA — espresso + gold to match the editorial palette.
 * Tapping scrolls to the quote form. Spacer matches the bar's footprint
 * so trailing content isn't covered.
 */
export default function MobileStickyCta(): ReactElement {
  const handleClick = () => {
    trackCTAClick(
      'Get My Wedding Bar Quote',
      '#quote-form',
      'wedding_calc_sticky',
    );
    const el = document.getElementById('quote-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1a1410] border-t border-[#C8A96A]/20 px-4 py-3 shadow-2xl">
        <button
          type="button"
          onClick={handleClick}
          className="w-full inline-flex items-center justify-center gap-3 py-3 rounded-lg text-[11px] tracking-[0.4em] uppercase font-light text-[#C8A96A] border border-[#C8A96A] hover:bg-[#C8A96A] hover:text-[#1a1410] transition-colors"
        >
          Get My Wedding Bar Quote
          <span>→</span>
        </button>
      </div>
      <div className="md:hidden h-16" aria-hidden />
    </>
  );
}
