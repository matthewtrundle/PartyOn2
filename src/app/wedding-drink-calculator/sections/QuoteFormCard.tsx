'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import { submitWeddingQuote } from './submitWeddingQuote';

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

    try {
      const { invoiceUrl: url } = await submitWeddingQuote({
        plan,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        placement,
      });
      setInvoiceUrl(url);
      setStatus('success');
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
              className="inline-flex items-center justify-center gap-3 bg-[#C8A96A] text-[#1a1410] hover:bg-[#d8b97a] transition-colors duration-300 px-8 py-3 text-sm tracking-[0.25em] uppercase font-medium rounded-lg"
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
