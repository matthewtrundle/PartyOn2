'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { DrinkCategory } from '@/lib/drinkPlannerTypes';
import { calculateWeddingPlan, type WeddingPlan } from '@/lib/weddingDrinkCalculator';
import CalculatorResults from './CalculatorResults';

type Props = {
  /** Fires whenever the computed plan changes — used by the quote-form section
      below the calculator to populate hidden items + guest count. */
  onResultsComputed?: (plan: WeddingPlan) => void;
};

const CATEGORY_OPTIONS: { id: DrinkCategory; label: string; hint: string }[] = [
  { id: 'beer', label: 'Beer', hint: 'Domestic + craft mix' },
  { id: 'wine', label: 'Wine', hint: 'Red + white split' },
  { id: 'spirits', label: 'Spirits', hint: 'Tequila, vodka, bourbon' },
  { id: 'seltzers', label: 'Seltzers', hint: 'High Noon, White Claw' },
  { id: 'cocktail-kits', label: 'Cocktail Kits', hint: 'Pre-built signature drinks' },
  { id: 'champagne', label: 'Champagne', hint: 'For toasts' },
];

const QUICK_GUEST_VALUES = [50, 75, 100, 125, 150, 200];
const QUICK_HOUR_VALUES = [3, 4, 5, 6];

/**
 * Interactive wedding drink calculator. Editorial-pragmatic treatment:
 * each input group sits in a subtle bordered card so visitors get clear
 * visual containment (the previous all-hairline-no-chrome version was
 * pretty but cost usability for cold paid traffic). Inputs themselves
 * still use the editorial hairline-underline style — the card chrome
 * groups them, the input chrome stays minimal.
 *
 * Inputs left, results right on desktop. Single column on mobile.
 */
export default function CalculatorClient({ onResultsComputed }: Props = {}): ReactElement {
  const [guests, setGuests] = useState(100);
  const [hours, setHours] = useState(5);
  const [categories, setCategories] = useState<DrinkCategory[]>(['beer', 'wine', 'spirits']);

  const plan: WeddingPlan = useMemo(
    () => calculateWeddingPlan({ guests, hours, categories }),
    [guests, hours, categories],
  );

  useEffect(() => {
    onResultsComputed?.(plan);
  }, [plan, onResultsComputed]);

  const toggleCategory = (cat: DrinkCategory) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  return (
    <div className="grid lg:grid-cols-5 gap-10 lg:gap-16">
      {/* Inputs column */}
      <div className="lg:col-span-2 space-y-5">
        {/* Guest count */}
        <fieldset className="bg-white border border-[#2A2218]/12 rounded-lg p-6 md:p-7 shadow-[0_1px_0_rgba(42,34,24,0.04)]">
          <legend className="block text-sm tracking-[0.25em] text-[#7E5A40] uppercase mb-3 font-medium">
            Guest Count
          </legend>
          <p className="text-sm text-gray-500 mb-5 font-light">
            Drinking-age guests only.
          </p>
          <input
            id="guests"
            type="number"
            min={5}
            max={300}
            step={5}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full bg-transparent border-0 border-b border-[#2A2218]/20 px-0 py-3 font-heading text-3xl text-[#2A2218] focus:border-[#C8A96A] focus:outline-none focus:ring-0 transition-colors font-light"
            aria-label="Guest count"
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_GUEST_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setGuests(v)}
                className={`px-4 py-2 rounded-lg text-xs tracking-[0.2em] uppercase transition-colors font-light ${
                  guests === v
                    ? 'bg-[#2A2218] text-[#C8A96A]'
                    : 'border border-[#2A2218]/15 text-[#7E5A40] hover:border-[#C8A96A] hover:text-[#2A2218]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Reception length */}
        <fieldset className="bg-white border border-[#2A2218]/12 rounded-lg p-6 md:p-7 shadow-[0_1px_0_rgba(42,34,24,0.04)]">
          <legend className="block text-sm tracking-[0.25em] text-[#7E5A40] uppercase mb-3 font-medium">
            Reception Length
          </legend>
          <p className="text-sm text-gray-500 mb-5 font-light">
            Cocktail hour through last call.
          </p>
          <input
            id="hours"
            type="number"
            min={2}
            max={12}
            step={1}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full bg-transparent border-0 border-b border-[#2A2218]/20 px-0 py-3 font-heading text-3xl text-[#2A2218] focus:border-[#C8A96A] focus:outline-none focus:ring-0 transition-colors font-light"
            aria-label="Reception length in hours"
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_HOUR_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setHours(v)}
                className={`px-4 py-2 rounded-lg text-xs tracking-[0.2em] uppercase transition-colors font-light ${
                  hours === v
                    ? 'bg-[#2A2218] text-[#C8A96A]'
                    : 'border border-[#2A2218]/15 text-[#7E5A40] hover:border-[#C8A96A] hover:text-[#2A2218]'
                }`}
              >
                {v}h
              </button>
            ))}
          </div>
        </fieldset>

        {/* Bar style */}
        <fieldset className="bg-white border border-[#2A2218]/12 rounded-lg p-6 md:p-7 shadow-[0_1px_0_rgba(42,34,24,0.04)]">
          <legend className="block text-sm tracking-[0.25em] text-[#7E5A40] uppercase mb-5 font-medium">
            Bar Style
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORY_OPTIONS.map((opt) => {
              const selected = categories.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleCategory(opt.id)}
                  className={`text-left p-4 rounded-lg border transition-colors ${
                    selected
                      ? 'border-[#C8A96A] bg-[#FBF6EC]'
                      : 'border-[#2A2218]/15 hover:border-[#7E5A40] bg-white'
                  }`}
                  aria-pressed={selected}
                >
                  <span className="block text-base font-medium text-[#2A2218] mb-0.5">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-gray-500 font-light tracking-wide">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Results column — sits in a cream card so it reads as the natural
          counterpart to the input cards, but the cream tint quietly
          signals "this is the output side." */}
      <div className="lg:col-span-3">
        <div className="bg-[#FBF6EC]/60 border border-[#2A2218]/12 rounded-lg p-6 md:p-10 shadow-[0_1px_0_rgba(42,34,24,0.04)]">
          <CalculatorResults plan={plan} />
        </div>
      </div>
    </div>
  );
}
