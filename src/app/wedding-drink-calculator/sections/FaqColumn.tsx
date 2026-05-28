'use client';

import { useState, type ReactElement } from 'react';
import type { Faq } from '@/components/landing/types';

type Props = {
  faqs: Faq[];
};

/**
 * Editorial FAQ — no boxy cards. Each Q&A is a row separated by a
 * hairline rule, the question opens with a gold "+" marker that rotates
 * to "—" on open. Light, generous spacing.
 */
export default function FaqColumn({ faqs }: Props): ReactElement {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10 md:mb-12">
          <div className="h-px w-12 bg-[#C8A96A] mx-auto mb-5" />
          <p className="text-xs tracking-[0.5em] text-[#7E5A40] uppercase font-light mb-5">
            Frequently Asked
          </p>
          <h2 className="font-heading text-4xl md:text-5xl text-[#2A2218] font-light leading-[1.05] tracking-tight">
            Questions every couple
            <span className="block italic font-extralight text-[#7E5A40]">
              + planner asks.
            </span>
          </h2>
        </div>

        <div className="border-t border-[#2A2218]/10">
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={f.q}
                className="border-b border-[#2A2218]/10"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-baseline justify-between gap-6 py-5 md:py-6 text-left group"
                >
                  <span className="font-heading text-lg md:text-xl text-[#2A2218] font-light leading-[1.3] tracking-tight group-hover:text-[#7E5A40] transition-colors">
                    {f.q}
                  </span>
                  <span
                    className={`flex-shrink-0 font-heading text-2xl text-[#C8A96A] font-light leading-none transition-transform duration-300 ${
                      isOpen ? 'rotate-45' : 'rotate-0'
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-5 pr-10 md:pr-14">
                    <p className="text-base md:text-lg text-gray-700 leading-relaxed font-light">
                      {f.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
