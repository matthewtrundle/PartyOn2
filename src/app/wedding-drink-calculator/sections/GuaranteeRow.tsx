import type { ReactElement } from 'react';

/**
 * Editorial manifesto strip. Deep-espresso section, gold-marked, with
 * the guarantee treated as a pull quote — italic display weight, generous
 * vertical breathing room, hairline-framed phone number.
 */
export default function GuaranteeRow(): ReactElement {
  return (
    <section className="py-24 md:py-32 bg-[#1a1410] text-white">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="h-px w-12 bg-[#C8A96A] mx-auto mb-8" />
        <p className="text-xs tracking-[0.5em] text-[#C8A96A] uppercase mb-10 font-light">
          Our Promise
        </p>

        <p className="font-heading text-3xl md:text-4xl lg:text-5xl text-white font-extralight italic leading-[1.2] tracking-tight mb-10">
          &ldquo;If we&apos;re late, we refund your delivery fee.
          <span className="block mt-1">No questions asked.&rdquo;</span>
        </p>

        <div className="h-px w-12 bg-[#C8A96A]/40 mx-auto mb-8" />

        <p className="text-sm md:text-base text-white/65 font-light tracking-wide">
          Call or text{' '}
          <a
            href="tel:7373719700"
            className="text-[#C8A96A] hover:text-white transition-colors border-b border-[#C8A96A]/40 hover:border-white pb-0.5 tracking-[0.05em] font-normal"
          >
            (737) 371-9700
          </a>{' '}
          the day of your wedding.
        </p>
      </div>
    </section>
  );
}
