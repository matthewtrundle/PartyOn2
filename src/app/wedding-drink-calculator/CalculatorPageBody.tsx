'use client';

import { useState, type ReactElement } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import { trackCTAClick } from '@/lib/analytics/ga4-events';
import { weddingConfig } from '@/components/landing/configs/wedding';
import CalculatorClient from './CalculatorClient';
import CalculatorHero from './sections/CalculatorHero';
import WhyYouNeedUs from './sections/WhyYouNeedUs';
import ReceptionPackagesColumns from './sections/ReceptionPackagesColumns';
import GuaranteeRow from './sections/GuaranteeRow';
import EditorialReviews from './sections/EditorialReviews';
import HowMathWorks from './sections/HowMathWorks';
import FaqColumn from './sections/FaqColumn';
import QuoteFormCard from './sections/QuoteFormCard';
import QuoteFormSection from './sections/QuoteFormSection';
import MobileStickyCta from './sections/MobileStickyCta';
import type { Faq } from '@/components/landing/types';

type Props = {
  faqs: Faq[];
};

/**
 * Top-level interactive body for /wedding-drink-calculator. Owns the
 * calculator-plan state so the quote form section near the bottom of the
 * page can populate hidden item handles + guest count when the visitor
 * submits.
 *
 * Editorial-estate design pass: each section component owns its own
 * full-bleed background and vertical rhythm. This file just composes
 * them in order.
 */
export default function CalculatorPageBody({ faqs }: Props): ReactElement {
  const [plan, setPlan] = useState<WeddingPlan | null>(null);

  const scrollToQuoteForm = () => {
    trackCTAClick(
      'Get My Wedding Bar Quote',
      '#quote-form',
      'wedding_calc_package',
    );
    const el = document.getElementById('quote-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <CalculatorHero />

      {/* B. Calculator tool — editorial header above the inputs */}
      <section id="calculator" className="bg-white py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 md:mb-20 max-w-2xl mx-auto">
            <div className="h-px w-12 bg-[#C8A96A] mx-auto mb-8" />
            <p className="text-xs tracking-[0.5em] text-[#7E5A40] uppercase font-light mb-8">
              Begin Here
            </p>
            <h2 className="font-heading text-4xl md:text-5xl text-[#2A2218] font-light leading-[1.05] tracking-tight">
              The wedding drink
              <span className="block italic font-extralight text-[#7E5A40]">
                calculator.
              </span>
            </h2>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed font-light mt-6">
              Adjust the inputs on the left. Your shopping list builds in
              real time on the right.
            </p>
          </div>
          <CalculatorClient onResultsComputed={setPlan} />

          {/* Inline quote form — same component / same endpoint as the
              bottom-of-page form, kept inside the calculator section so it
              reads as the natural next step. Editorial hairline divider
              keeps the visual rhythm consistent with the section above. */}
          <div className="mt-16 md:mt-20 pt-12 md:pt-16 border-t border-[#2A2218]/10 max-w-3xl mx-auto">
            <QuoteFormCard plan={plan} placement="inline" />
          </div>
        </div>
      </section>

      {/* C. Why your wedding alcohol is harder than it looks */}
      <WhyYouNeedUs />

      {/* D. 3 Sample Reception Bar Packages — wedding-specific editorial layout */}
      <ReceptionPackagesColumns onPrimaryCta={scrollToQuoteForm} />

      {/* E. Hormozi-style guarantee, treated as editorial manifesto */}
      <GuaranteeRow />

      {/* F. Named reviews — wedding-specific editorial treatment */}
      <EditorialReviews reviews={weddingConfig.reviews} />

      {/* G. How the math works — publication treatment */}
      <HowMathWorks />

      {/* H. FAQ — hairline-divided column */}
      <FaqColumn faqs={faqs} />

      {/* I. Quote Form — single conversion goal */}
      <QuoteFormSection plan={plan} />

      {/* J. Mobile sticky CTA */}
      <MobileStickyCta />
    </>
  );
}
