import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { generateFAQSchema } from '@/lib/seo/schemas';
import Footer from '@/components/Footer';
import CalculatorPageBody from './CalculatorPageBody';

/**
 * Public-facing Wedding Drink Calculator route.
 * Target keyword: "wedding drink calculator" (vol 1,900, KD 8).
 *
 * Server component for SEO metadata + structured data. The interactive
 * calculator, quote form, and Wes/Hormozi sections live in
 * CalculatorPageBody (client) which shares state between them.
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
    q: 'How much alcohol do I need for my wedding?',
    a:
      'A common rule for receptions of 3+ hours is guest count multiplied by hours plus one. A 100-guest, 5-hour reception works out to about 600 drinks. The calculator above applies that formula and splits the result across beer, wine, and spirits based on your bar style.',
  },
  {
    q: 'How do I count guests who don\'t drink alcohol?',
    a:
      'Subtract non-drinkers from your guest count before entering the number, then add a few non-alcoholic options separately. We typically suggest adding water, soda, or mocktail kits — those aren\'t in the calculator output but should be on your shopping list.',
  },
  {
    q: 'What if my reception runs longer than expected?',
    a:
      'Add an hour of buffer to the input. Wedding bars often slow down after dinner, but late-night guests will keep drinking. It\'s safer to round up than to run out.',
  },
  {
    q: 'Does this account for signature cocktails?',
    a:
      'Yes — select "Cocktail Kits" as one of the categories. The calculator reduces the spirits share and adds 3 cocktail kits sized for your crowd. Each kit serves about 16 drinks.',
  },
  {
    q: 'Can you deliver this order in Austin?',
    a:
      'Yes. Party On Delivery handles alcohol delivery for weddings across the Austin area. Use the quote form below the calculator to start a wedding-tagged order — we\'ll review the list with you before delivery.',
  },
  {
    q: 'Can I return bottles we didn\'t open?',
    a:
      'Yes — we can take back unopened cases for a partial refund (depending on volume) or leave everything with you. Your call. Decision made at delivery.',
  },
  {
    q: 'Do you set up the bar or just deliver?',
    a:
      'Both options. Standard delivery drops everything at your venue, on time and cold. We can also coordinate timing and handoff with your bartender or venue staff so the run-of-show stays clean — just note what level of support you need on the quote form.',
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
  const faqSchema = generateFAQSchema(
    FAQS.map((f) => ({ question: f.q, answer: f.a })),
  );
  // Note: no <Navigation /> on this page. It's a dedicated paid-ad landing
  // target and CRO best practice for cold traffic is zero exit paths above
  // the conversion goal. Brand identity lives in the hero's corner marks
  // (Est. Austin / No. 01 — Reception · Bar · Delivery). Footer stays for
  // TABC compliance + phone-call CTA.
  return (
    <>
      <main className="bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(HOW_TO_SCHEMA) }}
        />

        <CalculatorPageBody faqs={FAQS} />
      </main>
      <Footer />
    </>
  );
}
