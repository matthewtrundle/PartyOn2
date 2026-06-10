'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import type { WeddingPlan } from '@/lib/weddingDrinkCalculator';
import { submitWeddingQuote } from './submitWeddingQuote';

type Props = {
  /** Current calculator plan — submitted with the quote so the emailed
      invoice matches exactly what the visitor is looking at. */
  plan: WeddingPlan | null;
};

/**
 * Soft, email-first capture attached directly to the calculator results —
 * the peak-intent moment. The full count + shopping list stay free; this
 * converts the "I have my number" moment into a real, editable quote
 * instead of letting the visitor leave with the list and never come back.
 *
 * Posts to the SAME endpoint as QuoteFormCard (a real draft order, not a
 * dead-end lead) and fires generate_lead with placement="results", so GA4
 * can show how much of conversion this entry point drives. This is the
 * deliberate, clearly-labeled replacement for the in-result capture removed
 * 2026-05-27 — the copy here makes it unambiguous what happens next, which
 * is exactly what the earlier version got wrong.
 */
export default function ResultsQuoteCapture({ plan }: Props): ReactElement {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    // Name is optional here (email-first). Fall back to the email local-part
    // so the draft order isn't nameless — the operator reviews it anyway.
    const customerName =
      firstName.trim() || email.split('@')[0]?.trim() || 'Wedding guest';

    try {
      const { invoiceUrl: url } = await submitWeddingQuote({
        plan,
        customerName,
        customerEmail: email,
        placement: 'results',
      });
      setInvoiceUrl(url);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Submit failed');
    }
  };

  if (status === 'success') {
    return (
      <div className="mt-5 pt-5 border-t border-[#2A2218]/10">
        <p className="font-heading text-lg text-[#2A2218] italic mb-1">
          Sent — check your inbox.
        </p>
        <p className="text-sm text-gray-700 font-light mb-3">
          We emailed this exact list to{' '}
          <strong className="text-[#2A2218]">{email}</strong> as an editable
          invoice. Adjust quantities, brands, and delivery before you pay.
        </p>
        {invoiceUrl && (
          <a
            href={invoiceUrl}
            className="inline-flex items-center justify-center gap-2 bg-[#C8A96A] text-[#1a1410] hover:bg-[#d8b97a] transition-colors duration-300 px-6 py-2.5 text-xs tracking-[0.25em] uppercase font-medium rounded-lg"
          >
            Open My Invoice →
          </a>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 pt-5 border-t border-[#2A2218]/10"
    >
      <p className="text-xs tracking-[0.4em] uppercase text-[#7E5A40] mb-1 font-light">
        Want this as a ready-to-order list?
      </p>
      <p className="text-sm text-gray-700 font-light mb-3">
        We&apos;ll email this exact plan as an editable invoice — adjust it
        before you pay. No card to start.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          placeholder="First name (optional)"
          aria-label="First name (optional)"
          className="input-premium w-full sm:w-40"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@email.com"
          aria-label="Email"
          className="input-premium w-full flex-1"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="btn-cart whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === 'submitting' ? 'Sending…' : 'Email me my list →'}
        </button>
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600 mt-2">
          {errorMsg}. Try again or call{' '}
          <a href="tel:7373719700" className="font-semibold underline">
            (737) 371-9700
          </a>
          .
        </p>
      )}

      <p className="text-xs text-gray-500 mt-2 font-light">
        No spam. TABC-licensed retailer. Must be 21+ at delivery.
      </p>
    </form>
  );
}
