'use client';

import type { ReactElement } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import QuoteFormCard from './QuoteFormCard';

type Props = {
  plan: WeddingPlan | null;
};

/**
 * Section I — the bottom-of-page conversion goal. Renders QuoteFormCard
 * inside a gray full-bleed strip so it reads as a distinct page section.
 * The mid-page placement of the same form sits inside the calculator
 * section in CalculatorPageBody (white bg, inline visual).
 */
export default function QuoteFormSection({ plan }: Props): ReactElement {
  return (
    <section id="quote-form" className="bg-gray-50 section-padding">
      <div className="container-custom max-w-3xl">
        <QuoteFormCard plan={plan} placement="bottom" />
      </div>
    </section>
  );
}
