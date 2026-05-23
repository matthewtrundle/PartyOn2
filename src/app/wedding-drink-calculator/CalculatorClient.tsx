'use client';

import { useMemo, useState, type ReactElement } from 'react';
import type { DrinkCategory } from '@/lib/drinkPlannerTypes';
import { calculateWeddingPlan, type WeddingPlan } from '@/lib/weddingDrinkCalculator';
import CalculatorResults from './CalculatorResults';

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
 * Interactive wedding drink calculator. Wraps `calculateWeddingPlan` and
 * renders inline results as the user adjusts inputs.
 */
export default function CalculatorClient(): ReactElement {
  const [guests, setGuests] = useState(100);
  const [hours, setHours] = useState(5);
  const [categories, setCategories] = useState<DrinkCategory[]>(['beer', 'wine', 'spirits']);

  const plan: WeddingPlan = useMemo(
    () => calculateWeddingPlan({ guests, hours, categories }),
    [guests, hours, categories],
  );

  const toggleCategory = (cat: DrinkCategory) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Inputs */}
      <div className="lg:col-span-2 space-y-6">
        <div className="card">
          <label htmlFor="guests" className="block text-base font-semibold text-gray-900 mb-2">
            Guest count
          </label>
          <p className="text-sm text-gray-600 mb-3">Drinking-age guests only.</p>
          <input
            id="guests"
            type="number"
            min={5}
            max={300}
            step={5}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="input-premium w-full"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_GUEST_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setGuests(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium tracking-[0.05em] transition-colors ${
                  guests === v
                    ? 'bg-brand-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <label htmlFor="hours" className="block text-base font-semibold text-gray-900 mb-2">
            Reception length (hours)
          </label>
          <p className="text-sm text-gray-600 mb-3">Cocktail hour through last call.</p>
          <input
            id="hours"
            type="number"
            min={2}
            max={12}
            step={1}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="input-premium w-full"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_HOUR_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setHours(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium tracking-[0.05em] transition-colors ${
                  hours === v
                    ? 'bg-brand-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {v}h
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="block text-base font-semibold text-gray-900 mb-3">Bar style</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map((opt) => {
              const selected = categories.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleCategory(opt.id)}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${
                    selected
                      ? 'border-brand-blue bg-brand-blue/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={selected}
                >
                  <span className="block text-base font-semibold text-gray-900">{opt.label}</span>
                  <span className="block text-sm text-gray-600 mt-0.5">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="lg:col-span-3">
        <CalculatorResults plan={plan} />
      </div>
    </div>
  );
}
