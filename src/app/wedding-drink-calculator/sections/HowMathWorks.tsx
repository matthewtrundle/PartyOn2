import type { ReactElement } from 'react';

/**
 * "How the math works" — editorial publication treatment. Cream
 * background, drop-cap opening paragraph, gold rules between sections,
 * generous reading column width. Solid SEO content kept verbatim, just
 * styled for the wedding audience.
 */
export default function HowMathWorks(): ReactElement {
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-2xl mx-auto px-6">
        {/* Section heading */}
        <div className="text-center mb-16 md:mb-20">
          <div className="h-px w-12 bg-[#C8A96A] mx-auto mb-8" />
          <p className="text-xs tracking-[0.5em] text-[#7E5A40] uppercase font-light mb-8">
            The Method
          </p>
          <h2 className="font-heading text-4xl md:text-5xl text-[#2A2218] font-light leading-[1.05] tracking-tight">
            How the math
            <span className="block italic font-extralight text-[#7E5A40]">
              works.
            </span>
          </h2>
        </div>

        <div className="space-y-8 text-[#2A2218]">
          {/* Drop-cap opening */}
          <p className="text-lg leading-[1.7] font-light text-gray-800">
            <span className="float-left mr-3 mt-1 font-heading text-7xl text-[#C8A96A] font-extralight italic leading-[0.85]">
              F
            </span>
            or wedding receptions of three hours or more, a reliable starting
            point is <em className="text-[#2A2218]">guests × (hours + 1)</em>.
            The +1 covers the cocktail-hour spike at the front of the
            night, when most guests pick up their first two drinks fast. A
            100-guest, 5-hour reception comes out to around{' '}
            <span className="text-[#2A2218] tracking-wide">600 drinks</span>{' '}
            total.
          </p>

          <p className="text-lg leading-[1.7] font-light text-gray-800">
            From there we split the total roughly: spirits 50%, beer 30%,
            wine 15%, seltzers 5%. If you add cocktail kits, the spirits
            share drops and the kits absorb part of the mix. Wedding bars
            tilt heavier toward mixed drinks than house parties; the
            calculator reflects that.
          </p>
        </div>

        {/* Three common mistakes — set apart with gold rule */}
        <div className="mt-16 pt-16 border-t border-[#C8A96A]/30">
          <p className="text-xs tracking-[0.5em] uppercase text-[#7E5A40] font-light mb-8">
            Three common mistakes
          </p>
          <ol className="space-y-8 list-none">
            <li className="grid grid-cols-[40px_1fr] gap-5 items-start">
              <span className="font-heading text-2xl text-[#C8A96A] font-extralight italic leading-none">
                01
              </span>
              <div>
                <p className="font-heading text-xl text-[#2A2218] font-light leading-tight mb-2">
                  Counting kids and non-drinkers as drinkers.
                </p>
                <p className="text-base text-gray-700 leading-relaxed font-light">
                  Subtract guests under 21 plus anyone you know doesn&apos;t
                  drink before entering the number. Easy way to over-order
                  by fifteen to twenty percent.
                </p>
              </div>
            </li>
            <li className="grid grid-cols-[40px_1fr] gap-5 items-start">
              <span className="font-heading text-2xl text-[#C8A96A] font-extralight italic leading-none">
                02
              </span>
              <div>
                <p className="font-heading text-xl text-[#2A2218] font-light leading-tight mb-2">
                  Forgetting late arrivals.
                </p>
                <p className="text-base text-gray-700 leading-relaxed font-light">
                  Out-of-town guests often arrive after the ceremony. Round
                  hours up if you&apos;re close to the limit; running out at
                  10 pm is much worse than six unopened bottles.
                </p>
              </div>
            </li>
            <li className="grid grid-cols-[40px_1fr] gap-5 items-start">
              <span className="font-heading text-2xl text-[#C8A96A] font-extralight italic leading-none">
                03
              </span>
              <div>
                <p className="font-heading text-xl text-[#2A2218] font-light leading-tight mb-2">
                  Skipping the ice and water.
                </p>
                <p className="text-base text-gray-700 leading-relaxed font-light">
                  One bag of ice per ten guests is included in the result
                  panel above. Add bottled water to your shopping list
                  separately — it isn&apos;t alcohol, but every wedding
                  needs it.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Austin notes */}
        <div className="mt-16 pt-16 border-t border-[#C8A96A]/30">
          <p className="text-xs tracking-[0.5em] uppercase text-[#7E5A40] font-light mb-8">
            Austin Notes
          </p>
          <div className="space-y-6 text-lg leading-[1.7] font-light text-gray-800">
            <p>
              Party On Delivery is a TABC-licensed alcohol delivery company
              serving the Austin area. We deliver to wedding venues across
              Lake Travis, downtown Austin, Hill Country, South Austin, and
              the Westlake area. For deliveries outside Austin city limits,
              lead time is usually forty-eight hours. We&apos;ll review your
              shopping list with you before delivery and answer questions
              about quantity, brand swaps, or substitutions.
            </p>
            <p>
              Wedding party order minimums and delivery windows are set per
              zone — check the order page for specifics.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
