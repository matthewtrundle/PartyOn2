'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

const ORDER_HREF = '/order?event=rodeo-cruise&ref=PREMIER&p=boat&d=boat';

/**
 * Sticky event nav for the Buckaroo Rodeo invite. Transparent over the hero,
 * then solidifies to a white bar with a border + shadow once the page scrolls.
 * Self-contained (this route lives outside the (main) layout, so there is no
 * global nav here).
 */
export default function BuckarooNav(): ReactElement {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex h-[84px] items-center backdrop-blur-[10px] transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? 'border-b border-gray-200 bg-white/95 shadow-sm'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-6 px-6">
        <a
          href="#top"
          className="font-heading text-2xl font-bold uppercase tracking-[0.14em] text-navy"
        >
          Buckaroo <span className="text-brand-blue">◆</span> Rodeo
        </a>
        <a
          href={ORDER_HREF}
          className="inline-flex items-center rounded-lg bg-brand-yellow px-[22px] py-[11px] font-heading text-[15px] font-bold uppercase tracking-[0.08em] text-black transition-colors hover:bg-yellow-400"
        >
          Start Your Order
        </a>
      </div>
    </header>
  );
}
