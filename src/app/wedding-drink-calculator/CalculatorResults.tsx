'use client';

import Link from 'next/link';
import { useState, type ReactElement, type FormEvent } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';

interface Props {
  plan: WeddingPlan;
}

/**
 * Result panel for the wedding drink calculator. Shows the bottle/case
 * breakdown and exposes a lead-capture form that posts to
 * /api/leads/drink-calculator with partyType=wedding.
 *
 * Counts only — no pricing claims (hard-stop rule).
 */
export default function CalculatorResults({ plan }: Props): ReactElement {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/leads/drink-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          email,
          guestCount: plan.summary.guests,
          hours: plan.summary.hours,
          drinkingLevel: 'average',
          partyType: 'wedding',
          drinkPreference: 'good_mix',
          addChampagne: plan.summary.categories.includes('champagne'),
          addCocktailKits: plan.summary.categories.includes('cocktail-kits'),
          totalDrinks: plan.totalDrinks,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Submit failed');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Submit failed');
    }
  };

  const grouped = plan.items.reduce<Record<string, typeof plan.items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-br from-brand-blue/5 to-white border-brand-blue/20">
        <p className="text-sm font-semibold tracking-[0.08em] text-brand-blue uppercase mb-2">
          Your wedding bar plan
        </p>
        <p className="text-4xl md:text-5xl font-heading tracking-[0.05em] text-gray-900">
          {plan.totalDrinks.toLocaleString()} drinks
        </p>
        <p className="text-sm text-gray-700 mt-2">
          For {plan.summary.guests} guests × {plan.summary.hours} hours.
        </p>
      </div>

      <div className="card">
        <h3 className="font-heading text-lg font-bold tracking-[0.08em] text-gray-900 mb-4">
          Shopping list
        </h3>
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="text-sm font-semibold tracking-[0.05em] text-gray-700 uppercase mb-2">
                {category.replace('-', ' ')}
              </p>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.name} className="flex justify-between text-base text-gray-900">
                    <span>{item.name}</span>
                    <span className="font-semibold">
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

      <div className="card">
        {status === 'success' ? (
          <div className="text-center py-2">
            <p className="text-base font-semibold text-gray-900 mb-2">
              We&apos;ll email you the shopping list.
            </p>
            <Link href="/order?type=wedding" className="btn-primary inline-flex items-center justify-center mt-2">
              Start Wedding Order
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-heading text-lg font-bold tracking-[0.08em] text-gray-900">
              Email me this plan
            </h3>
            <p className="text-sm text-gray-700">
              We&apos;ll save the shopping list and follow up with delivery options. No
              spam. No pricing yet.
            </p>
            <div>
              <label htmlFor="first-name" className="block text-base font-medium text-gray-900 mb-1">
                First name
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="input-premium w-full"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-base font-medium text-gray-900 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-premium w-full"
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="btn-cart w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Sending...' : 'Email Me This Plan'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
