'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import { trackMetaEvent } from '@/components/MetaPixel';

type Props = {
  /** Latest computed plan from the calculator above; null until first render. */
  plan: WeddingPlan | null;
};

/**
 * Maps a calculator output item name to the underlying product handle in
 * Postgres. Handles were grepped out of src/lib/landing/getOccasionPackages.ts
 * (the curated catalog used by the Wes-template Quick-Buy modal).
 *
 * Items not in this map fall through — admin reviews the draft order and
 * adds them manually. We always send `bag-of-ice-7-lbs` as the fallback so
 * the API's `items.min(1)` validation always passes.
 */
const ITEM_NAME_TO_HANDLE: Record<string, string> = {
  'Miller Lite (24-pack)': 'miller-lite-24-pack-12oz-can',
  'Modelo Especial (24-pack)': 'modelo-especial-24pack-12oz-cans',
  'Austin Beerworks Variety (12-pack)': 'austin-beerworks-variety-pack-12-pack-12oz-can',
  'High Noon Variety (12-pack)':
    'high-noon-vodka-soda-combo-3-each-grapefruit-9-pineapple-9-black-cherry-9-watermelon-9-355ml-12-pack',
  'White Claw Variety (24-pack)': 'white-claw-variety-24-pack-12oz-can',
  'Dark Horse Pinot Grigio (750ml)': 'dark-horse-pinot-grigio-750ml-bottle',
  '14 Hands Cabernet Sauvignon (750ml)': '14-hands-cabernet-sauvignon',
  'Espolon Tequila Blanco (750ml)': 'espolon-tequila-blanco-80-1l',
  "Tito's Handmade Vodka (1L)": 'titos-handmade-vodka-80-1lt',
  'Still Austin Bourbon (750ml)': 'jameson-irish-whiskey-1',
  'Champagne / Prosecco (750ml)': 'chandon-california-brut-750ml',
  'Ice Bags': 'bag-of-ice-7-lbs',
};

/**
 * Section I — the single conversion goal. Replaces the dual CTA section
 * from the old page. Posts to /api/v1/landing/quote with the calculator
 * state baked in.
 */
export default function QuoteFormSection({ plan }: Props): ReactElement {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    // Map calculator output → product handles where we can. Always include
    // bag-of-ice as a safety net so the API's items.min(1) check passes
    // even if every shopping-list item failed to map.
    const items: { handle: string; qty: number }[] = [];
    const unmappedNames: string[] = [];
    if (plan) {
      for (const item of plan.items) {
        const handle = ITEM_NAME_TO_HANDLE[item.name];
        if (handle) items.push({ handle, qty: item.quantity });
        else unmappedNames.push(`${item.quantity}× ${item.name}`);
      }
    }
    if (items.length === 0) {
      items.push({ handle: 'bag-of-ice-7-lbs', qty: 4 });
    }

    // Default delivery date = 30 days out. Customer can edit on the invoice page.
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 30);

    // Stash the full calculator summary in admin-visible notes so an operator
    // can sanity-check the auto-mapped line items, swap brands, and add any
    // items that didn't map (cocktail kits today, future skus tomorrow).
    const summary = plan
      ? [
          `Calculator state: ${plan.summary.guests} guests × ${plan.summary.hours} hours = ${plan.totalDrinks} drinks.`,
          `Categories: ${plan.summary.categories.join(', ')}.`,
          unmappedNames.length > 0
            ? `Unmapped items (operator to add): ${unmappedNames.join('; ')}.`
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      : 'No calculator state captured.';

    try {
      const res = await fetch('/api/v1/landing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'quote',
          occasion: 'wedding',
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          groupSize: plan?.summary.guests ?? 100,
          deliveryDate: deliveryDate.toISOString().slice(0, 10),
          items,
          deliveryNotes: summary,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Submit failed');
      }
      setInvoiceUrl(body.invoiceUrl ?? null);
      setStatus('success');

      // Conversion firing — Meta + GA4 + Google Ads. All three are guarded
      // so a missing pixel / env var is a silent no-op rather than a throw.
      trackMetaEvent('Lead', {
        content_name: 'Wedding Bar Quote',
        content_category: 'wedding-drink-calculator',
      });

      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          form_id: 'wedding-bar-quote',
          page_location: window.location.href,
          value: plan?.totalDrinks ?? 0,
        });

        const conversionId = process.env.NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID;
        if (conversionId) {
          window.gtag('event', 'conversion', {
            send_to: conversionId,
            value: 0,
            currency: 'USD',
          });
        }
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Submit failed');
    }
  };

  return (
    <section id="quote-form" className="bg-gray-50 section-padding">
      <div className="container-custom max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-3">
            Get Your Wedding Bar Quote
          </h2>
          <p className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto">
            We&apos;ll email an editable invoice within 15 minutes — built from the
            calculator above. Adjust quantities, brands, and delivery details
            before you pay. No credit card to start.
          </p>
        </div>

        {status === 'success' ? (
          <div className="card border-brand-blue/40 bg-white text-center py-10">
            <h3 className="font-heading text-2xl text-gray-900 mb-3">
              Quote sent! Check your inbox.
            </h3>
            <p className="text-base text-gray-700 mb-6">
              We emailed your editable invoice to{' '}
              <strong className="text-gray-900">{email}</strong>. You can review
              and adjust before you pay.
            </p>
            {invoiceUrl && (
              <a
                href={invoiceUrl}
                className="btn-primary inline-flex items-center justify-center"
              >
                Open My Invoice →
              </a>
            )}
            <p className="text-sm text-gray-600 mt-6">
              Questions? Call or text{' '}
              <a href="tel:7373719700" className="font-semibold text-brand-blue">
                (737) 371-9700
              </a>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card bg-white space-y-5">
            <div>
              <label htmlFor="qf-name" className="block text-base font-semibold text-gray-900 mb-1">
                Your name <span className="text-red-600">*</span>
              </label>
              <input
                id="qf-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="input-premium w-full"
              />
            </div>
            <div>
              <label htmlFor="qf-email" className="block text-base font-semibold text-gray-900 mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="qf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-premium w-full"
              />
            </div>
            <div>
              <label htmlFor="qf-phone" className="block text-base font-semibold text-gray-900 mb-1">
                Phone <span className="text-sm font-normal text-gray-600">(used for delivery-day reach)</span>
              </label>
              <input
                id="qf-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className="input-premium w-full"
              />
            </div>

            {plan && (
              <p className="text-sm text-gray-600 border-l-2 border-brand-blue/40 pl-3">
                Based on your inputs above: <strong>{plan.summary.guests} guests</strong>{' '}
                × <strong>{plan.summary.hours} hours</strong> = ~{plan.totalDrinks} drinks
                across {plan.summary.categories.join(', ')}.
              </p>
            )}

            {status === 'error' && (
              <p className="text-sm text-red-600">
                {errorMsg}. Try again or call{' '}
                <a href="tel:7373719700" className="font-semibold underline">
                  (737) 371-9700
                </a>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="btn-cart w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Sending…' : 'Get My Wedding Bar Quote →'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              No spam. TABC-licensed retailer. Must be 21+ at delivery.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
