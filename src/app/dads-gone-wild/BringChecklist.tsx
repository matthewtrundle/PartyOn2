'use client';

import { useState, type ReactElement, type ReactNode } from 'react';

interface BringItem {
  id: string;
  title: string;
  note: ReactNode;
}

const ITEMS: BringItem[] = [
  {
    id: 'app',
    title: 'An app or shareable snack',
    note: "Potluck rule #1. Chips don't count unless there's queso.",
  },
  {
    id: 'drink',
    title: 'Your own beverages',
    note: (
      <>
        {'Or skip the store run — '}
        <a
          href="https://partyondelivery.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-brand-blue underline"
        >
          partyondelivery.com
        </a>
        {' delivers cold ones to the dock.'}
      </>
    ),
  },
  {
    id: 'towel',
    title: "A towel you don't love",
    note: 'Lake water has plans for it.',
  },
];

/** Inline check mark (icons are SVG per house rules, never glyphs/emoji). */
function CheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-white" aria-hidden="true" fill="none">
      <path d="M20 6L9 17l-5-5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Interactive potluck checklist. Each row toggles "packed" on tap (entire row
 * is the target); the tally line under the list reacts to the checked count.
 * The embedded partyondelivery.com link stops propagation so it never toggles
 * the row.
 */
export default function BringChecklist(): ReactElement {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string): void =>
    setChecked((s) => ({ ...s, [id]: !s[id] }));

  const checkedCount = ITEMS.filter((i) => checked[i.id]).length;
  const tally =
    checkedCount === 0
      ? 'Packed nothing yet. Bold.'
      : checkedCount >= ITEMS.length
        ? "Fully packed. You're the favorite child now."
        : `${checkedCount} of ${ITEMS.length} packed. Keep going.`;

  return (
    <div>
      {/* One column on mobile; two-up grid with equal-height rows on desktop. */}
      <div className="grid grid-cols-1 gap-2.5 md:auto-rows-fr md:grid-cols-2 md:gap-4">
        {ITEMS.map((item) => {
          const on = !!checked[item.id];
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              onClick={() => toggle(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(item.id);
                }
              }}
              className={`flex w-full cursor-pointer items-center gap-3.5 rounded-xl border p-4 text-left shadow-sm transition-colors hover:border-brand-blue ${
                on ? 'border-brand-blue bg-brand-blue/[0.07]' : 'border-gray-200 bg-white'
              }`}
            >
              <span
                className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded border-2 ${
                  on ? 'border-brand-blue bg-brand-blue' : 'border-gray-300'
                }`}
              >
                {on && <CheckIcon />}
              </span>
              <span className="flex-1">
                <span
                  className={`block font-sans text-[15px] font-semibold text-gray-900 ${
                    on ? 'line-through opacity-[0.55]' : ''
                  }`}
                >
                  {item.title}
                </span>
                <span className="mt-0.5 block text-sm text-gray-500">{item.note}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3.5 text-sm text-gray-500">{tally}</p>
    </div>
  );
}
