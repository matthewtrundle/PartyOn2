import type { ReactElement } from 'react';

/**
 * "How the math works" content section. Kept verbatim from the original
 * server-rendered page — solid SEO content for the long-tail keyword
 * cluster around "how much alcohol for X guest wedding".
 */
export default function HowMathWorks(): ReactElement {
  return (
    <section className="bg-gray-50 section-padding">
      <div className="container-custom max-w-4xl">
        <h2 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-6">
          How the math works
        </h2>
        <div className="prose prose-gray max-w-none text-base md:text-lg leading-relaxed">
          <p>
            For wedding receptions of 3 hours or more, a reliable starting point is{' '}
            <strong>guests &times; (hours + 1)</strong>. The +1 covers the cocktail
            hour spike at the front of the night, when most guests pick up their first
            two drinks fast. A 100-guest, 5-hour reception comes out to around 600
            drinks total.
          </p>
          <p>
            From there we split the total roughly: <strong>spirits 50%</strong>,{' '}
            <strong>beer 30%</strong>, <strong>wine 15%</strong>,{' '}
            <strong>seltzers 5%</strong>. If you add cocktail kits, the spirits share
            drops and the kits absorb part of the mix. Wedding bars tilt heavier
            toward mixed drinks than house parties; the calculator reflects that.
          </p>
          <h3 className="font-heading text-2xl tracking-[0.08em] mt-8 mb-3">
            Three common mistakes
          </h3>
          <ol>
            <li>
              <strong>Counting kids and non-drinkers as drinkers.</strong> Subtract
              guests under 21 plus anyone you know doesn&apos;t drink before entering
              the number. Easy way to over-order by 15-20%.
            </li>
            <li>
              <strong>Forgetting late arrivals.</strong> Out-of-town guests often
              arrive after the ceremony. Round hours up if you&apos;re close to the
              limit; running out at 10pm is much worse than 6 unopened bottles.
            </li>
            <li>
              <strong>Skipping the ice and water.</strong> One bag of ice per 10
              guests is included in the result panel below. Add bottled water on the
              shopping list separately — it isn&apos;t alcohol, but every wedding
              needs it.
            </li>
          </ol>
          <h3 className="font-heading text-2xl tracking-[0.08em] mt-8 mb-3">
            Austin-specific notes
          </h3>
          <p>
            Party On Delivery is a TABC-licensed alcohol delivery company serving the
            Austin area. We deliver to wedding venues across Lake Travis, downtown
            Austin, Hill Country, South Austin, and the Westlake area. For deliveries
            outside Austin city limits, lead time is usually 48 hours. We&apos;ll
            review your shopping list with you before delivery and answer questions
            about quantity, brand swaps, or substitutions.
          </p>
          <p>
            Wedding party order minimums and delivery windows are set per zone —
            check the order page for specifics.
          </p>
        </div>
      </div>
    </section>
  );
}
