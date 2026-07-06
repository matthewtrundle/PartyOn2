'use client';

/**
 * Live copy editor for follow-up emails: pick a journey step, edit subject +
 * body, save. Overrides persist in the DB and take effect on the engine's
 * next tick — no deploy. Empty fields fall back to the code defaults.
 * Data: GET/PUT /api/ops/followups/copy.
 */

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { renderTemplate } from '@/lib/followups/copy';

interface StepCopy {
  subject: string;
  body: string;
}
interface TokenDoc {
  token: string;
  description: string;
}
interface CopyResponse {
  success: boolean;
  defaults: Record<string, StepCopy[]>;
  tokens: Record<string, TokenDoc[]>;
  overrides: Record<string, Record<number, { subject?: string; body?: string }>>;
}

/** Sample values for the live preview (mirrors the test-send payload). */
const PREVIEW_TOKENS: Record<string, string> = {
  firstName: 'Sarah',
  guestCount: '25',
  resumeLink: 'https://partyondelivery.com/order',
  deliveryDate: 'Saturday, July 18',
  invoiceLink: 'https://partyondelivery.com/invoice/sample',
  businessName: 'Sample Rentals LLC',
  reviewLink: 'https://123.partyondelivery.com/reviews',
};

export default function CopyEditorPanel(): ReactElement {
  const [data, setData] = useState<CopyResponse | null>(null);
  const [journeyKey, setJourneyKey] = useState('abandoned-quote');
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const load = async (): Promise<CopyResponse | null> => {
    try {
      const res = await fetch('/api/ops/followups/copy');
      const json = (await res.json()) as CopyResponse;
      if (json.success) {
        setData(json);
        return json;
      }
    } catch {
      setStatus('Failed to load copy');
    }
    return null;
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Journey steps that actually have copy (skips event-quiz's empty step 1).
  const editableSteps = useMemo(() => {
    if (!data) return [];
    return (data.defaults[journeyKey] ?? [])
      .map((copy, i) => ({ step: i + 1, hasCopy: Boolean(copy.subject && copy.body) }))
      .filter((s) => s.hasCopy)
      .map((s) => s.step);
  }, [data, journeyKey]);

  // Sync the form whenever the selection (or data) changes.
  useEffect(() => {
    if (!data) return;
    const effectiveStep = editableSteps.includes(step) ? step : (editableSteps[0] ?? 1);
    if (effectiveStep !== step) {
      setStep(effectiveStep);
      return;
    }
    const override = data.overrides[journeyKey]?.[effectiveStep];
    const defaults = data.defaults[journeyKey]?.[effectiveStep - 1];
    setSubject(override?.subject ?? defaults?.subject ?? '');
    setBody(override?.body ?? defaults?.body ?? '');
    setStatus('');
  }, [data, journeyKey, step, editableSteps]);

  const isOverridden = Boolean(data?.overrides[journeyKey]?.[step]);
  const defaults = data?.defaults[journeyKey]?.[step - 1];

  const save = async (reset = false): Promise<void> => {
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch('/api/ops/followups/copy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyKey,
          step,
          subject: reset ? '' : subject,
          body: reset ? '' : body,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus(reset ? 'Reset to default.' : 'Saved — live on the next engine run (≤15 min).');
        await load();
      } else {
        setStatus(`Save failed: ${json.error}`);
      }
    } catch {
      setStatus('Save failed: network error');
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return <div className="card text-sm text-gray-500">Loading copy editor…</div>;
  }

  const previewBody = renderTemplate(body, PREVIEW_TOKENS);
  const previewSubject = subject.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, n) => PREVIEW_TOKENS[n] ?? '');

  return (
    <div className="card">
      <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-1">Edit Email Copy</h2>
      <p className="text-sm text-gray-500 mb-4">
        Changes save to the database and apply to the next send — no deploy. Curly-brace tokens
        fill in per customer; a line whose token has no value is dropped from the email.
      </p>

      <div className="grid gap-3 md:grid-cols-3 mb-4">
        <select
          value={journeyKey}
          onChange={(e) => setJourneyKey(e.target.value)}
          className="input-premium"
        >
          {Object.keys(data.defaults).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <select
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          className="input-premium"
        >
          {editableSteps.map((n) => (
            <option key={n} value={n}>
              Touch {n}
            </option>
          ))}
        </select>
        <div className="flex items-center">
          {isOverridden ? (
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1">
              customized — default is preserved underneath
            </span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-1">
              using default copy
            </span>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-base font-semibold text-gray-700 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input-premium w-full"
          maxLength={200}
        />
      </div>

      <div className="mb-3">
        <label className="block text-base font-semibold text-gray-700 mb-1">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="input-premium w-full font-mono text-sm"
          maxLength={8000}
        />
      </div>

      <div className="mb-4 text-sm text-gray-500">
        <span className="font-semibold text-gray-700">Tokens for this journey: </span>
        {(data.tokens[journeyKey] ?? []).map((t) => (
          <span key={t.token} className="inline-block mr-3" title={t.description}>
            <code className="bg-gray-100 rounded px-1">{`{${t.token}}`}</code>
          </span>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={busy || !subject.trim() || !body.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save Copy'}
        </button>
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={busy || !isOverridden}
          className="btn-secondary disabled:opacity-50"
        >
          Reset to Default
        </button>
        {defaults && (
          <button
            type="button"
            onClick={() => {
              setSubject(defaults.subject);
              setBody(defaults.body);
            }}
            disabled={busy}
            className="btn-ghost"
          >
            Load Default Into Editor
          </button>
        )}
      </div>
      {status && (
        <p className={`text-sm mb-4 ${status.startsWith('Save failed') ? 'text-red-600' : 'text-green-700'}`}>
          {status}
        </p>
      )}

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <p className="text-xs text-gray-500 mb-2">
          Preview with sample data (Sarah, 25 guests) — use Test Send below to see the real email.
        </p>
        <p className="text-sm font-semibold text-gray-900 mb-2">Subject: {previewSubject}</p>
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{previewBody}</pre>
        <p className="text-sm text-gray-800 mt-4 whitespace-pre-wrap">{'Allan\nParty On Delivery'}</p>
        <p className="text-xs text-gray-500 mt-3">
          Party On Delivery · 7600 N Lamar #A2, Austin, TX 78752 · Unsubscribe
        </p>
      </div>
    </div>
  );
}
