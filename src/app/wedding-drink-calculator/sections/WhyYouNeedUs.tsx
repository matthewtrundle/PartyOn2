import type { ReactElement } from 'react';

/**
 * Replaces the generic "Pain → Solution" block on the calculator. Most
 * couples don't realize the structural reasons they can't just "have the
 * bartender bring it" or "have Total Wine deliver to the venue" — this
 * section lays out the facts so they understand why a TABC-licensed
 * delivery partner like POD is the only path that actually works.
 *
 * Three concrete facts + the refund promise = removes the over-ordering
 * objection the calculator itself triggers (people see "600 drinks" and
 * worry they'll be stuck with cases).
 */
export default function WhyYouNeedUs(): ReactElement {
  return (
    <section className="py-20" style={{ background: '#FBF6EC' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <p
          className="text-center font-semibold tracking-[0.18em] text-sm mb-4"
          style={{ color: '#7E5A40' }}
        >
          THINGS NO ONE TELLS YOU
        </p>
        <h2
          className="font-heading text-3xl md:text-5xl font-bold text-center mb-10 leading-tight"
          style={{ color: '#2A2218' }}
        >
          Why your wedding alcohol is harder than it looks.
        </h2>

        <div className="space-y-6 text-base md:text-lg text-gray-800 leading-relaxed">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <p className="font-bold mb-2" style={{ color: '#2A2218' }}>
              1. Most mobile bartenders are &ldquo;dry hire.&rdquo;
            </p>
            <p>
              They&apos;ll pour for you all night, but they can&apos;t legally bring
              the alcohol. Texas law requires a TABC-licensed retailer for
              the delivery itself — so your bartender shows up with shakers
              and shows out with shakers, and the alcohol is your problem.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <p className="font-bold mb-2" style={{ color: '#2A2218' }}>
              2. Total Wine and Spec&apos;s probably won&apos;t deliver to your venue.
            </p>
            <p>
              Most venues aren&apos;t on their delivery routes. And even if
              they&apos;ll go to the address, the delivery window won&apos;t match your
              coordinator&apos;s timeline — you&apos;ll get a four-hour window on a
              random weekday, not &ldquo;4pm Saturday, dock entrance, cold.&rdquo; Don&apos;t
              find out at the last minute that the run-of-show falls apart.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <p className="font-bold mb-2" style={{ color: '#2A2218' }}>
              3. So most couples end up doing a Costco run themselves.
            </p>
            <p>
              That&apos;s the trap. The week of your wedding, you and your
              partner are loading carts at Spec&apos;s, fighting traffic to
              Wimberley, icing it all down in your Airbnb bathtub. Not how
              you should be spending the 72 hours before the ceremony.
            </p>
          </div>

          <div
            className="rounded-xl p-6 shadow-sm border-2"
            style={{
              background: '#FBF6EC',
              borderColor: '#C8A96A',
            }}
          >
            <p className="font-bold mb-2" style={{ color: '#2A2218' }}>
              The over-ordering fix: 100% refund on up to 25% of your order.
            </p>
            <p style={{ color: '#2A2218' }}>
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
