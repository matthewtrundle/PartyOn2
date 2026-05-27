'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import { trackMetaEvent } from '@/components/MetaPixel';

type Props = {
  /** Latest computed plan from the calculator above; null until first render. */
  plan: WeddingPlan | null;
  /**
   * Where the submission is happening on the page. Sent as a parameter on
   * the generate_lead event so we can split conversion rate by placement
   * (mid-page right under the calculator vs end-of-page hard CTA).
   */
  placement: 'inline' | 'bottom';
  /** Optional heading override; defaults to "Get Your Wedding Bar Quote". */
  heading?: string;
  /** Optional subhead override. */
  subhead?: string;
};

/**
 * Maps a calculator output item name to the underlying product handle in
 * Postgres. Items not in this map fall through — admin reviews the draft
 * order and adds them manually. We always send `bag-of-ice-7-lbs` as the
 * fallback so the API's `items.min(1)` validation always passes.
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
 * Reusable wedding-bar quote form. Used in two places on
 * /wedding-drink-calculator:
 *   - inline directly below the calculator widget
 *   - bottom of the page (wrapped in <QuoteFormSection> with gray bg)
 * Both placements post to /api/v1/landing/quote and fire identical
 * tracking events; the only difference is the `placement` parameter on
 * generate_lead, which lets us split conversion rate by placement in GA4.
 */
export default function QuoteFormCard({
  plan,
  placement,
  heading = 'Get Your Wedding Bar Quote',
  subhead = "We'll email an editable invoice within 15 minutes — built from the calculator above. Adjust quantities, brands, and delivery details before you pay. No credit card to start.",
}: Props): ReactElement {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  // Make the input + button ids unique per placement so two instances on
  // the same page don't share form controls or break label-for accessibility.
  const idPrefix = `qf-${placement}`;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

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

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 30);

    const summary = plan
      ? [
          `Calculator state: ${plan.summary.guests} guests × ${plan.summary.hours} hours = ${plan.totalDrinks} drinks.`,
          `Categories: ${plan.summary.categories.join(', ')}.`,
          `Submitted from: ${placement === 'inline' ? 'calculator inline form' : 'bottom-of-page form'}.`,
          unmappedNames.length > 0
            ? `Unmapped items (operator to add): ${unmappedNames.join('; ')}.`
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      : `No calculator state captured. Submitted from ${placement === 'inline' ? 'calculator inline form' : 'bottom-of-page form'}.`;

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

      // Conversion firing — Meta + GA4 + Google Ads. All gated so missing
      // pixels / env vars are silent no-ops.
      trackMetaEvent('Lead', {
        content_name: 'Wedding Bar Quote',
        content_category: 'wedding-drink-calculator',
        placement,
      });

      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          form_id: 'wedding-bar-quote',
          placement,
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
    <div>
      <div className="text-center mb-8">
        <h2 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-3">
          {heading}
        </h2>
        <p className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto">
          {subhead}
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
            <label htmlFor={`${idPrefix}-name`} className="block text-base font-semibold text-gray-900 mb-1">
              Your name <span className="text-red-600">*</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="input-premium w-full"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-email`} className="block text-base font-semibold text-gray-900 mb-1">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id={`${idPrefix}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input-premium w-full"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-phone`} className="block text-base font-semibold text-gray-900 mb-1">
              Phone <span className="text-sm font-normal text-gray-600">(used for delivery-day reach)</span>
            </label>
            <input
              id={`${idPrefix}-phone`}
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
  );
}
