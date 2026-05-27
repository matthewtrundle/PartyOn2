import type { ReactElement } from 'react';
import type { Review } from '@/components/landing/types';

type Props = {
  reviews: Review[];
};

/**
 * Wedding-calculator-specific reviews. Editorial column treatment with
 * giant gold serif quote marks, generous body type, attribution in
 * tracked small-caps. Replaces the shared ReviewsSection on this page
 * only — the 4 Wes pages keep the original treatment.
 */
export default function EditorialReviews({ reviews }: Props): ReactElement {
  return (
    <section className="py-24 md:py-32 bg-[#1a1410] text-white relative overflow-hidden">
      {/* Faint gold corner marks for editorial atmosphere */}
      <div className="absolute top-10 left-10 hidden md:block">
        <p className="text-[#C8A96A]/40 tracking-[0.4em] text-[10px] uppercase font-light">
          Reviews · No. 02
        </p>
      </div>
      <div className="absolute top-10 right-10 hidden md:block">
        <p className="text-[#C8A96A]/40 tracking-[0.4em] text-[10px] uppercase font-light">
          5.0 / 5.0
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 md:mb-24 max-w-2xl mx-auto">
          <div className="h-px w-12 bg-[#C8A96A] mx-auto mb-8" />
          <p className="text-xs tracking-[0.5em] text-[#C8A96A] uppercase mb-8 font-light">
            ★ 5.0 on Google
          </p>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-light leading-[1.05] tracking-tight">
            The vendor every Austin
            <span className="block italic font-extralight text-[#C8A96A]">
              wedding planner books first.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10 md:gap-14">
          {reviews.map((r) => (
            <article key={r.author} className="relative pt-10">
              {/* Giant gold open-quote */}
              <span
                aria-hidden="true"
                className="absolute -top-2 -left-1 font-heading text-7xl md:text-8xl text-[#C8A96A] font-extralight italic leading-none select-none"
              >
                &ldquo;
              </span>

              <p className="relative text-base md:text-lg text-white/85 leading-[1.65] font-light mb-10">
                {r.quote}
              </p>

              <div className="border-t border-[#C8A96A]/30 pt-5">
                <p className="font-heading text-xl text-white font-light tracking-tight mb-1">
                  {r.author}
                </p>
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#C8A96A]/70 font-light">
                  {r.detail}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
