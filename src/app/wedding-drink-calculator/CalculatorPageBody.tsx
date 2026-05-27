'use client';

import Link from 'next/link';
import { useState, type ReactElement } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import { trackCTAClick } from '@/lib/analytics/ga4-events';
import PackageCardGrid from '@/components/landing/sections/PackageCardGrid';
import ReviewsSection from '@/components/landing/sections/ReviewsSection';
import { weddingConfig } from '@/components/landing/configs/wedding';
import CalculatorClient from './CalculatorClient';
import CalculatorHero from './sections/CalculatorHero';
import WhyYouNeedUs from './sections/WhyYouNeedUs';
import GuaranteeRow from './sections/GuaranteeRow';
import HowMathWorks from './sections/HowMathWorks';
import QuoteFormSection from './sections/QuoteFormSection';
import MobileStickyCta from './sections/MobileStickyCta';
import { RECEPTION_PACKAGES, WEDDING_THEME } from './sections/receptionPackages';
import type { Faq } from '@/components/landing/types';

type Props = {
  faqs: Faq[];
};

/**
 * Top-level interactive body for /wedding-drink-calculator. Owns the
 * calculator-plan state so the quote form section near the bottom of the
 * page can populate hidden item handles + guest count when the visitor
 * submits.
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

      {/* B. Calculator tool — unchanged mechanics, plus result-state callback */}
      <section id="calculator" className="bg-white py-12">
        <div className="container-custom max-w-5xl">
          <CalculatorClient onResultsComputed={setPlan} />
        </div>
      </section>

      {/* C. Why you need us — three facts couples don't realize + refund promise */}
      <WhyYouNeedUs />

      {/* D. 3 Sample Reception Bar Packages */}
      <PackageCardGrid
        packages={RECEPTION_PACKAGES}
        theme={WEDDING_THEME}
        eyebrow="SAMPLE RECEPTION BAR PACKAGES · 100 GUESTS"
        headline="Three tiers. Same 100-guest reception. Pick your level."
        blurb="Same crowd, three price points — so you can compare apples to apples. Final quote scales to your actual guest count + bar style."
        primaryCtaLabel="Get My Wedding Bar Quote →"
        onPrimaryCta={scrollToQuoteForm}
        footer={
          <div className="text-center mt-12">
            <p className="text-base text-gray-600 mb-3">
              Need full-weekend coordination (welcome reception → ceremony → after-party)?
            </p>
            <Link
              href="/austin-wedding-weekend-delivery"
              className="inline-flex items-center font-semibold text-brand-blue hover:underline"
            >
              Build your weekend at /austin-wedding-weekend-delivery →
            </Link>
          </div>
        }
      />

      {/* E. Hormozi Guarantee Row */}
      <GuaranteeRow />

      {/* F. Named Reviews */}
      <ReviewsSection
        reviews={weddingConfig.reviews}
        theme={WEDDING_THEME}
        eyebrow="★★★★★ 5.0 ON GOOGLE"
        headline="The vendor every Austin wedding planner books first."
      />

      {/* G. How the math works — kept verbatim for SEO */}
      <HowMathWorks />

      {/* H. FAQ — 5 original + 2 new */}
      <section className="bg-white section-padding">
        <div className="container-custom max-w-4xl">
          <h2 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map((f) => (
              <div key={f.q} className="card">
                <h3 className="font-heading text-lg font-bold tracking-[0.08em] text-gray-900 mb-2">
                  {f.q}
                </h3>
                <p className="text-base text-gray-700 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* I. Quote Form — single conversion goal */}
      <QuoteFormSection plan={plan} />

      {/* J. Mobile sticky CTA */}
      <MobileStickyCta />
    </>
  );
}
