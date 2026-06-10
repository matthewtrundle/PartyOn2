import type { ReactElement } from 'react';

/**
 * Replaces the generic "Pain → Solution" block on the calculator.
 * Editorial-estate treatment: gold-numbered rows on cream, generous
 * vertical rhythm, no card chrome. Each fact is a stand-alone column.
 *
 * The refund callout sits below the three numbered facts, framed by a
 * single gold hairline — a quiet statement, not a callout box.
 */
export default function WhyYouNeedUs(): ReactElement {
  const facts = [
    {
      n: '01',
      h: 'Most mobile bartenders are "dry hire."',
      p: 'They’ll pour for you all night, but they can’t legally bring the alcohol. Texas law requires a TABC-licensed retailer for the delivery itself — so your bartender shows up with shakers and shows out with shakers, and the alcohol is your problem.',
    },
    {
      n: '02',
      h: 'Total Wine and Spec’s probably won’t deliver to your venue.',
      p: 'Most venues aren’t on their delivery routes. Even when they’ll go to the address, the window won’t match your coordinator’s timeline — you’ll get a four-hour window on a random weekday, not "4 pm Saturday, dock entrance, cold." Don’t find out at the last minute that the run-of-show falls apart.',
    },
    {
      n: '03',
      h: 'So most couples end up doing a Costco run themselves.',
      p: 'That’s the trap. The week of your wedding, you and your partner are loading carts at Spec’s, fighting traffic to Wimberley, icing it all down in your Airbnb bathtub. Not how you should be spending the seventy-two hours before the ceremony.',
    },
  ];

  return (
    <section className="py-14 md:py-20 bg-[#FBF6EC]">
      <div className="max-w-3xl mx-auto px-6">
        {/* Section heading */}
        <div className="text-center mb-10 md:mb-14">
          <div className="h-px w-12 bg-[#C8A96A] mx-auto mb-5" />
          <p className="text-xs tracking-[0.5em] text-[#7E5A40] uppercase font-light mb-5">
            Things No One Tells You
          </p>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-[#2A2218] font-light leading-[1.05] tracking-tight">
            Why your wedding alcohol
            <span className="block italic font-extralight text-[#7E5A40] mt-1">
              is harder than it looks.
            </span>
          </h2>
        </div>

        {/* Numbered rows */}
        <div className="space-y-10 md:space-y-12">
          {facts.map((f) => (
            <div
              key={f.n}
              className="grid md:grid-cols-[88px_1fr] gap-4 md:gap-12 items-start"
            >
              <div className="font-heading text-5xl md:text-6xl text-[#C8A96A] font-extralight leading-none italic">
                {f.n}
              </div>
              <div>
                <h3 className="font-heading text-2xl md:text-3xl text-[#2A2218] mb-5 leading-[1.15] font-light tracking-tight">
                  {f.h}
                </h3>
                <p className="text-base md:text-lg text-gray-700 leading-relaxed font-light">
                  {f.p}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Refund promise — framed by a single gold rule, set apart */}
        <div className="mt-12 md:mt-16 relative">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-[#C8A96A]" />
          <div className="pl-8 md:pl-12">
            <p className="text-xs tracking-[0.5em] text-[#C8A96A] uppercase mb-5 font-light">
              The Over-Ordering Fix
            </p>
            <p className="font-heading text-2xl md:text-3xl text-[#2A2218] mb-5 leading-[1.15] font-light tracking-tight">
              100% refund on up to 25% of your order.
            </p>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed font-light">
              Order extra so you don&apos;t run out — drop the unopened cases back
              at our store the day after the wedding and we refund up to a
              quarter of the total, same day. No restocking fees, no
              questions. You can&apos;t run out, and you can&apos;t over-pay.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
