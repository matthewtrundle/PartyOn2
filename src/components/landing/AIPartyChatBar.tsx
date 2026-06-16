'use client';

/**
 * Free-form party-planner chat bar.
 *
 * Dropped into the middle of the AI-test bachelor landing page via the
 * LandingPageTemplate.aiChatSlot prop. The customer types one prompt
 * ("12 guys, lake house weekend, mostly beer and tequila") and a single
 * round-trip to /api/v1/ai-party-planner:
 *
 *   1. Calls an LLM to extract { partyType, headcount, eventDays }
 *   2. Runs the existing drink-planner engine for that combo
 *   3. Creates a GroupOrderV2 dashboard with the recommended cart
 *      already seeded
 *   4. Returns a /dashboard/<shareCode> URL + a human-readable summary
 *
 * UI states:
 *   - idle   : big input + "Plan my party →" button
 *   - thinking: animated thinking strip (cloud-powered chat session feel)
 *   - ready  : assistant summary card + "Open my dashboard →" CTA link
 *   - error  : inline retry
 *
 * Pure additive component — only the AI-test page mounts this. Nothing
 * about the live site changes.
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';

type PlannerItem = {
  handle: string;
  name: string;
  qty: number;
  price: number;
  category: string;
};

type PlannerResponse = {
  ok: true;
  shareCode: string;
  dashboardUrl: string;
  summary: string;
  extracted: { partyType: string; headcount: number; eventDays: number };
  recommendation: {
    packageName: string;
    totalDrinks: number;
    estimatedTotal: number;
    items: PlannerItem[];
  } | null;
};

type ErrorResponse = { ok: false; error: string };

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';
const CREAM = '#FFF7E1';

const EXAMPLE_PROMPTS = [
  '12 guys, 3-day bachelor at a lake house, mostly beer and tequila shots',
  '8 friends, Saturday boat day on Lake Travis, light beer + seltzers + ranch waters',
  '20 people, Friday night Airbnb rager, spirits and beer',
];

export default function AIPartyChatBar() {
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<'idle' | 'thinking' | 'ready' | 'error'>('idle');
  const [response, setResponse] = useState<PlannerResponse | null>(null);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (state === 'ready' && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [state]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || state === 'thinking') return;
    setError('');
    setState('thinking');
    setResponse(null);

    try {
      const res = await fetch('/api/v1/ai-party-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const json = (await res.json()) as PlannerResponse | ErrorResponse;
      if (!res.ok || !json.ok) {
        setError(('error' in json && json.error) || 'Something went sideways. Try again?');
        setState('error');
        return;
      }
      setResponse(json);
      setState('ready');
    } catch (err) {
      console.error('[AIPartyChatBar] submit failed', err);
      setError('Network blip — try again.');
      setState('error');
    }
  }

  function applyExample(text: string) {
    setPrompt(text);
    inputRef.current?.focus();
  }

  return (
    <section
      className="py-16 md:py-20"
      style={{ background: CREAM }}
      aria-labelledby="ai-chat-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-3"
            style={{ background: NAVY, color: GOLD }}
          >
            ⚡ AI PACKAGE BUILDER · BETA
          </div>
          <h2
            id="ai-chat-heading"
            className="font-heading text-3xl md:text-4xl font-bold tracking-wide"
            style={{ color: NAVY }}
          >
            Describe your party. We&apos;ll build the order.
          </h2>
          <p className="mt-3 text-gray-700 text-sm md:text-base">
            Type how many people, how long, and what they drink. The agent
            spins up your cart and hands you a link — no checkout questions,
            no quiz, no waiting.
          </p>
        </div>

        {/* Input form */}
        {state !== 'ready' && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl p-4 sm:p-5 shadow-lg"
            style={{
              background: '#FFFFFF',
              border: `2px solid ${NAVY}`,
              boxShadow: `0 4px 0 ${NAVY}, 0 12px 32px rgba(10,15,25,0.18)`,
            }}
          >
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={state === 'thinking'}
              rows={3}
              placeholder="e.g. 12 guys, 3-day bachelor weekend at a lake house, mostly beer and tequila"
              className="w-full resize-none rounded-lg border-2 border-gray-200 px-4 py-3 text-base focus:border-brand-blue focus:outline-none focus:ring-0 transition-colors disabled:opacity-60"
              style={{ color: NAVY }}
              aria-label="Describe your party"
            />

            {/* Example prompts */}
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  type="button"
                  key={ex}
                  onClick={() => applyExample(ex)}
                  disabled={state === 'thinking'}
                  className="text-xs sm:text-sm rounded-full px-3 py-1.5 transition-colors disabled:opacity-60"
                  style={{
                    background: '#F4F4F4',
                    color: NAVY,
                    border: '1px solid #D8D8D8',
                  }}
                >
                  &ldquo;{ex.length > 60 ? `${ex.slice(0, 58)}…` : ex}&rdquo;
                </button>
              ))}
            </div>

            {/* Submit */}
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-500">
                Powered by Claude · takes ~5 seconds
              </p>
              <button
                type="submit"
                disabled={!prompt.trim() || state === 'thinking'}
                className="rounded-lg px-5 py-3 text-sm sm:text-base font-bold tracking-[0.08em] transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: GOLD,
                  color: NAVY,
                  border: `2px solid ${NAVY}`,
                  boxShadow: `0 3px 0 ${NAVY}`,
                }}
              >
                {state === 'thinking' ? 'Thinking…' : 'PLAN MY PARTY →'}
              </button>
            </div>

            {state === 'thinking' && (
              <div className="mt-4 flex items-center gap-3 rounded-lg px-3 py-3" style={{ background: '#F8F4E1', border: `1.5px solid ${GOLD}` }}>
                <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: NAVY }} />
                <span className="text-sm text-gray-800">
                  Reading your party · matching the catalog · spinning up your dashboard…
                </span>
              </div>
            )}

            {state === 'error' && error && (
              <div className="mt-4 rounded-lg px-3 py-3 text-sm" style={{ background: '#FFE6E6', color: '#7A1F1F', border: '1.5px solid #E58A8A' }}>
                {error}
              </div>
            )}
          </form>
        )}

        {/* Result card */}
        {state === 'ready' && response && (
          <div
            ref={resultRef}
            className="rounded-2xl p-5 sm:p-6 shadow-lg"
            style={{
              background: '#FFFFFF',
              border: `2px solid ${NAVY}`,
              boxShadow: `0 4px 0 ${NAVY}, 0 12px 32px rgba(10,15,25,0.18)`,
            }}
          >
            {/* User's prompt as a chat bubble */}
            <div className="flex justify-end mb-3">
              <div
                className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm"
                style={{ background: '#F0F4F8', color: NAVY }}
              >
                {prompt}
              </div>
            </div>

            {/* Assistant summary */}
            <div className="flex justify-start mb-4">
              <div
                className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed"
                style={{ background: NAVY, color: '#FFFFFF' }}
              >
                <div className="font-bold mb-2" style={{ color: GOLD }}>
                  ✓ Got it — here&apos;s your order
                </div>
                <p>{response.summary}</p>
                {response.recommendation && (
                  <p className="mt-2 text-xs opacity-80">
                    {response.recommendation.totalDrinks} drinks · est. $
                    {response.recommendation.estimatedTotal.toFixed(2)} subtotal
                  </p>
                )}
              </div>
            </div>

            {/* Itemized recommendation */}
            {response.recommendation && response.recommendation.items.length > 0 && (
              <div className="rounded-lg p-3 mb-4" style={{ background: CREAM, border: `1.5px solid ${GOLD}` }}>
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: NAVY }}>
                  WHAT&apos;S IN YOUR CART
                </div>
                <ul className="space-y-1 text-sm" style={{ color: NAVY }}>
                  {response.recommendation.items.slice(0, 10).map((it, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">
                        {it.qty}× {it.name}
                      </span>
                      <span className="flex-shrink-0 font-mono">${(it.price * it.qty).toFixed(2)}</span>
                    </li>
                  ))}
                  {response.recommendation.items.length > 10 && (
                    <li className="text-xs italic opacity-70 pt-1">
                      + {response.recommendation.items.length - 10} more…
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* CTA */}
            <a
              href={response.dashboardUrl}
              className="block w-full text-center rounded-lg px-5 py-4 text-base font-bold tracking-[0.08em] transition-transform hover:scale-[1.02]"
              style={{
                background: GOLD,
                color: NAVY,
                border: `2px solid ${NAVY}`,
                boxShadow: `0 3px 0 ${NAVY}`,
              }}
            >
              OPEN MY DASHBOARD →
            </a>
            <p className="text-xs text-center text-gray-500 mt-3">
              Cart is pre-loaded. You can edit, add, or share it from there.
            </p>

            {/* Try-again link */}
            <button
              type="button"
              onClick={() => {
                setState('idle');
                setResponse(null);
                setPrompt('');
              }}
              className="block mx-auto mt-3 text-xs underline text-gray-500 hover:text-gray-900"
            >
              ← Plan a different party
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
