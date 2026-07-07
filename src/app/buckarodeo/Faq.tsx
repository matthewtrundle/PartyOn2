'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Do I have to be 21+?',
    a: 'Yes — everyone ordering must be 21 or older, and we verify age at checkout. Please drink responsibly.',
  },
  {
    q: 'How does sharing within my group work?',
    a: 'Tap Start Your Order and we spin up a private page for your crew. Use the Share button inside to pull everyone in — they add their picks to the same cooler.',
  },
  {
    q: 'When do I need to order by?',
    a: 'No minimum — order whatever you like. Just get it in by 24 hours ahead — Saturday, July 11 — so it’s iced and on your boat before you board.',
  },
  {
    q: 'How much is delivery?',
    a: 'Delivery is free — we bring it straight to your boat at the Lake Travis dock. No minimum, no fees.',
  },
  {
    q: 'Not sure what to get?',
    a: 'No worries — recommendations live right inside your dashboard once you start. Ranch water, beer, seltzers, tequila, margs, and mixers are all a tap away.',
  },
];

/** FAQ accordion — one panel open at a time (first open by default). */
export default function Faq(): ReactElement {
  const [open, setOpen] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((item, i) => {
        const isOpen = i === open;
        return (
          <div key={item.q} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-heading text-[19px] font-bold tracking-[0.03em] text-gray-900"
            >
              {item.q}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`shrink-0 text-brand-blue transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {isOpen && (
              <p className="px-6 pb-6 text-base leading-relaxed text-gray-700">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
