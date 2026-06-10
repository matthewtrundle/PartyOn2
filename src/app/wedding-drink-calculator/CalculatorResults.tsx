'use client';

import type { ReactElement } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import ResultsQuoteCapture from './sections/ResultsQuoteCapture';

interface Props {
  plan: WeddingPlan;
}

const CATEGORY_LABEL: Record<string, string> = {
  beer: 'Beer',
  wine: 'Wine',
  spirits: 'Spirits',
  seltzers: 'Seltzers',
  'cocktail-kits': 'Cocktail Kits',
  champagne: 'Champagne',
  ice: 'Ice',
};

/**
 * Result panel — editorial layout with a monumental drink count as the
 * hero number and a hairline-organized shopping list.
 *
 * The previous in-result email-capture form was removed 2026-05-27: it
 * posted to /api/leads/drink-calculator (lead-only, no email, no draft
 * order), creating user confusion (people thought they'd submitted a
 * real quote). The single conversion goal now lives in QuoteFormCard,
 * rendered inline below the calculator AND at the bottom of the page
 * via QuoteFormSection.
 *
 * Counts only — no pricing claims (hard-stop rule).
 */
export default function CalculatorResults({ plan }: Props): ReactElement {
  const grouped = plan.items.reduce<Record<string, typeof plan.items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* The Number — hero stat */}
      <div className="border-b border-[#2A2218]/10 pb-4">
        <p className="text-xs tracking-[0.4em] uppercase text-[#7E5A40] mb-2 font-light">
          Your Wedding Bar Plan
        </p>
        <p className="font-heading text-5xl md:text-6xl lg:text-7xl font-extralight text-[#2A2218] leading-[0.95] italic">
          {plan.totalDrinks.toLocaleString()}
        </p>
        <p className="text-xs tracking-[0.35em] uppercase text-[#C8A96A] mt-1.5 font-light">
          Drinks Total
        </p>
        <p className="text-xs text-gray-500 mt-2 font-light tracking-wide">
          For {plan.summary.guests} guests across {plan.summary.hours} hours.
        </p>
      </div>

      {/* Shopping list */}
      <div>
        <p className="text-xs tracking-[0.4em] uppercase text-[#7E5A40] mb-3 font-light">
          Shopping List
        </p>
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="font-heading text-base text-[#2A2218] font-light tracking-tight mb-2 italic">
                {CATEGORY_LABEL[category] ?? category}
              </p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-baseline justify-between gap-4 text-sm text-gray-700 font-light pb-1.5 border-b border-[#2A2218]/8 last:border-0"
                  >
                    <span className="flex-1 leading-snug">{item.name}</span>
                    <span className="text-[#2A2218] tracking-wide font-normal whitespace-nowrap">
                      {item.quantity} {item.unit}
                      {item.quantity > 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Email-first capture at the peak-intent moment — converts the
          "I have my number" moment into a real, editable quote. The full
          list above stays free; this is the page's primary conversion. */}
      <ResultsQuoteCapture plan={plan} />
    </div>
  );
}
