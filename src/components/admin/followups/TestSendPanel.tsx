'use client';

/**
 * Send any journey step to an arbitrary address with sample payload,
 * [TEST]-prefixed. Bypasses flags and the send window, not suppressions.
 * Data: POST /api/ops/followups/test-send.
 */

import { useState, type ReactElement } from 'react';

const JOURNEY_OPTIONS: Array<{ key: string; label: string; steps: number }> = [
  { key: 'abandoned-quote', label: 'Abandoned quote', steps: 2 },
  { key: 'unpaid-invoice', label: 'Unpaid invoice', steps: 2 },
  { key: 'partner-inquiry', label: 'Partner inquiry', steps: 2 },
  { key: 'contact-form', label: 'Contact form', steps: 2 },
  { key: 'newsletter-welcome', label: 'Newsletter welcome', steps: 1 },
  { key: 'affiliate-apply', label: 'Affiliate application', steps: 2 },
  { key: 'event-quiz', label: 'Event quiz (step 2 only)', steps: 2 },
  { key: 'post-purchase-review', label: 'Post-purchase review', steps: 1 },
];

export default function TestSendPanel(): ReactElement {
  const [journeyKey, setJourneyKey] = useState('abandoned-quote');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const maxSteps = JOURNEY_OPTIONS.find((j) => j.key === journeyKey)?.steps ?? 1;

  const send = async (): Promise<void> => {
    setBusy(true);
    setResult('');
    try {
      const res = await fetch('/api/ops/followups/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyKey, step, email }),
      });
      const json = await res.json();
      setResult(json.success ? `Sent to ${email}` : `Failed: ${json.error}`);
    } catch {
      setResult('Failed: network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-1">Test Send</h2>
      <p className="text-sm text-gray-500 mb-4">
        Sends the real copy with sample data, subject prefixed [TEST]. Use your own inbox.
      </p>
      <div className="grid gap-3 md:grid-cols-4">
        <select
          value={journeyKey}
          onChange={(e) => {
            setJourneyKey(e.target.value);
            setStep(1);
          }}
          className="input-premium md:col-span-1"
        >
          {JOURNEY_OPTIONS.map((j) => (
            <option key={j.key} value={j.key}>
              {j.label}
            </option>
          ))}
        </select>
        <select
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          className="input-premium md:col-span-1"
        >
          {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              Step {n}
            </option>
          ))}
        </select>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@partyondelivery.com"
          className="input-premium md:col-span-1"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !email.includes('@')}
          className="btn-primary disabled:opacity-50 md:col-span-1"
        >
          {busy ? 'Sending…' : 'Send Test'}
        </button>
      </div>
      {result && (
        <p className={`text-sm mt-3 ${result.startsWith('Sent') ? 'text-green-700' : 'text-red-600'}`}>
          {result}
        </p>
      )}
    </div>
  );
}
