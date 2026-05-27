import type { ReactElement } from 'react';

/**
 * Hormozi risk-reversal strip. Deep-espresso band with champagne-gold
 * headline — matches the wedding palette already established on the page
 * (no more brand-blue clashing with the gold theme).
 */
export default function GuaranteeRow(): ReactElement {
  return (
    <section className="py-14" style={{ background: '#2A2218' }}>
      <div className="max-w-3xl mx-auto px-6 text-center text-white">
        <p
          className="font-heading text-2xl md:text-3xl font-bold tracking-[0.05em] mb-3"
          style={{ color: '#C8A96A' }}
        >
          If we&apos;re late, we&apos;ll refund your delivery fee. No questions asked.
        </p>
        <p className="text-base md:text-lg text-white/90">
          Call or text{' '}
          <a
            href="tel:7373719700"
            className="font-bold underline hover:text-[#F2D34F]"
            style={{ color: '#C8A96A' }}
          >
            (737) 371-9700
          </a>{' '}
          the day of your wedding if anything&apos;s off — we&apos;ll make it right.
        </p>
      </div>
    </section>
  );
}
