import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { generateFAQSchema } from '@/lib/seo/schemas';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CalculatorClient from './CalculatorClient';

/**
 * Public-facing Wedding Drink Calculator route.
 * Target keyword: "wedding drink calculator" (vol 1,900, KD 8).
 *
 * Server component for SEO metadata + structured data. The interactive
 * calculator is a client component (CalculatorClient.tsx) that reuses
 * src/lib/weddingDrinkCalculator.ts.
 */

export const metadata: Metadata = {
  title: 'Wedding Drink Calculator | Austin Wedding Alcohol Quantities | Party On Delivery',
  description:
    'Free wedding drink calculator. Get exact beer, wine, spirits, and seltzer counts for your Austin wedding reception. Built by Austin\'s alcohol-delivery team.',
  alternates: {
    canonical: 'https://partyondelivery.com/wedding-drink-calculator',
  },
  openGraph: {
    title: 'Wedding Drink Calculator — How Much Alcohol For Your Austin Wedding?',
    description:
      'Plug in guest count and reception hours; get exact case + bottle counts. Free tool from Austin\'s wedding alcohol delivery team.',
    url: 'https://partyondelivery.com/wedding-drink-calculator',
    type: 'website',
  },
};

const FAQS = [
  {
    question: 'How much alcohol do I need for my wedding?',
    answer:
      'A common rule for receptions of 3+ hours is guest count multiplied by hours plus one. A 100-guest, 5-hour reception works out to about 600 drinks. The calculator above applies that formula and splits the result across beer, wine, and spirits based on your bar style.',
  },
  {
    question: 'How do I count guests who don\'t drink alcohol?',
    answer:
      'Subtract non-drinkers from your guest count before entering the number, then add a few non-alcoholic options separately. We typically suggest adding water, soda, or mocktail kits — those aren\'t in the calculator output but should be on your shopping list.',
  },
  {
    question: 'What if my reception runs longer than expected?',
    answer:
      'Add an hour of buffer to the input. Wedding bars often slow down after dinner, but late-night guests will keep drinking. It\'s safer to round up than to run out.',
  },
  {
    question: 'Does this account for signature cocktails?',
    answer:
      'Yes — select "Cocktail Kits" as one of the categories. The calculator reduces the spirits share and adds 3 cocktail kits sized for your crowd. Each kit serves about 16 drinks.',
  },
  {
    question: 'Can you deliver this order in Austin?',
    answer:
      'Yes. Party On Delivery handles alcohol delivery for weddings across the Austin area. Use the order link in the result panel to start a wedding-tagged order — we\'ll review the list with you before delivery.',
  },
];

const HOW_TO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to calculate alcohol for an Austin wedding reception',
  description:
    'Free calculator from Party On Delivery. Enter guest count and reception hours; get exact beer, wine, spirits, and seltzer counts.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Count your drinking-age guests',
      text: 'Take your full guest list and subtract guests under 21, designated drivers, and anyone you know doesn\'t drink.',
    },
    {
      '@type': 'HowToStep',
      name: 'Multiply guests × (hours + 1)',
      text: 'For a reception of 3+ hours, total drinks ≈ guests × (hours + 1). A 100-guest, 5-hour reception ≈ 600 drinks.',
    },
    {
      '@type': 'HowToStep',
      name: 'Split across categories',
      text: 'A typical wedding bar splits the total roughly: spirits 50%, beer 30%, wine 15%, seltzers 5%. Adjust if you offer cocktail kits.',
    },
    {
      '@type': 'HowToStep',
      name: 'Convert drinks → bottles + cases',
      text: 'Beer 12-packs serve 12. Wine 750ml serves 5. Liquor 750ml serves 17. Round up.',
    },
  ],
};

export default function WeddingDrinkCalculatorPage(): ReactElement {
  const faqSchema = generateFAQSchema(FAQS);
  return (
    <>
      <Navigation />
      <main className="bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(HOW_TO_SCHEMA) }}
        />

        <section className="relative bg-gradient-to-b from-gray-50 to-white mt-24 pt-12 pb-8">
          <div className="container-custom max-w-5xl">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-[0.1em] text-gray-900 text-center">
              Wedding Drink Calculator
            </h1>
            <p className="mt-4 text-base md:text-lg text-gray-700 text-center max-w-3xl mx-auto">
              How much alcohol for your Austin wedding? Enter guest count and reception
              hours below — we’ll size beer, wine, spirits, and seltzers for you.
              Built by Austin’s wedding alcohol delivery team.
            </p>
          </div>
        </section>

        <section className="bg-white py-8">
          <div className="container-custom max-w-5xl">
            <CalculatorClient />
          </div>
        </section>

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
                  guests under 21 plus anyone you know doesn’t drink before entering
                  the number. Easy way to over-order by 15-20%.
                </li>
                <li>
                  <strong>Forgetting late arrivals.</strong> Out-of-town guests often
                  arrive after the ceremony. Round hours up if you’re close to the
                  limit; running out at 10pm is much worse than 6 unopened bottles.
                </li>
                <li>
                  <strong>Skipping the ice and water.</strong> One bag of ice per 10
                  guests is included in the result panel below. Add bottled water on the
                  shopping list separately — it isn’t alcohol, but every wedding
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
                outside Austin city limits, lead time is usually 48 hours. We’ll
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

        <section className="bg-white section-padding">
          <div className="container-custom max-w-4xl">
            <h2 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="card">
                  <h3 className="font-heading text-lg font-bold tracking-[0.08em] text-gray-900 mb-2">
                    {f.question}
                  </h3>
                  <p className="text-base text-gray-700 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 section-padding">
          <div className="container-custom max-w-4xl text-center">
            <h2 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-4">
              Ready to order your wedding bar?
            </h2>
            <p className="text-base md:text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
              Take the result above and place a wedding-tagged order. We’ll review
              the list with you before delivery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/order?type=wedding" className="btn-primary inline-flex items-center justify-center">
                Start Wedding Order
              </Link>
              <Link href="/weddings" className="btn-secondary inline-flex items-center justify-center">
                Wedding Services
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
