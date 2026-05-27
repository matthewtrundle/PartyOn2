'use client';

import type { ReactElement } from 'react';
import { trackCTAClick } from '@/lib/analytics/ga4-events';

/**
 * Mobile sticky CTA — only shown on <md viewports. Tapping scrolls to the
 * quote form section. Matches the height/spacing pattern from the Wes
 * landing template so the spacer below avoids covering trailing content.
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
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-2xl">
        <button
          type="button"
          onClick={handleClick}
          className="w-full inline-flex items-center justify-center font-bold py-3 rounded-lg text-sm tracking-[0.05em] bg-[#F2D34F] text-gray-900"
        >
          Get My Wedding Bar Quote →
        </button>
      </div>
      <div className="md:hidden h-16" aria-hidden />
    </>
  );
}
