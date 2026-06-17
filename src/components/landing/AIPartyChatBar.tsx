'use client';

/**
 * Free-form party-planner chat bar — TWO-STAGE FLOW.
 *
 *   Stage 1: customer types a description → submit → backend uses Claude
 *            to extract { partyType, headcount, eventDays, drinkCategories }
 *            and returns 5 budget chips ($20/$40/$60/$80/$100 per person).
 *   Stage 2: customer taps a chip → backend runs the drink-planner with
 *            the chosen categories + budget-scales the qty → creates a
 *            GroupOrderV2 with cart seeded → returns dashboard link.
 *
 * UI states:
 *   - idle       : big input + "Plan my party →" button
 *   - thinking   : animated thinking strip while LLM extracts
 *   - budget     : chat-style "Got it!" bubble + 5 budget chip buttons
 *   - building   : same bubble + spinner while engine + DB run
 *   - ready      : final summary card with itemized cart + OPEN MY DASHBOARD
 *   - error      : inline retry
 *
 * Backed by POST /api/v1/ai-party-planner. The route detects which stage
 * by the presence of `extracted` + `budgetCents` in the body.
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';

type Extracted = {
  partyType: string;
  headcount: number;
  eventDays: number;
  drinkCategories: string[];
  reasoning?: string;
};

type BudgetOption = {
  cents: number;
  perPersonDollars: number;
  totalDollars: number;
  label: string;
  sublabel: string;
};

type ExtractResponse = {
  ok: true;
  stage: 'needs-budget';
  extracted: Extracted;
  budgetOptions: BudgetOption[];
};

type PlannerItem = {
  handle: string;
  name: string;
  qty: number;
  price: number;
  category: string;
};

type BuildResponse = {
  ok: true;
  stage: 'done';
  shareCode: string;
  dashboardUrl: string;
  summary: string;
  extracted: Extracted;
  budgetCents: number;
  recommendation: {
    packageName: string;
    totalDrinks: number;
    estimatedTotal: number;
    items: PlannerItem[];
  };
};

type ErrorResponse = { ok: false; error: string; detail?: string };

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';
const CREAM = '#FFF7E1';

const EXAMPLE_PROMPTS = [
  '12 guys, 3-day bachelor at a lake house, mostly beer and tequila shots',
  '8 friends, Saturday boat day on Lake Travis, light beer + seltzers + ranch waters',
  '20 people, Friday night Airbnb rager, spirits and beer',
];

type Stage = 'idle' | 'thinking' | 'budget' | 'building' | 'ready' | 'error';

export default function AIPartyChatBar() {
  const [prompt, setPrompt] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [budgetOptions, setBudgetOptions] = useState<BudgetOption[] | null>(null);
  const [response, setResponse] = useState<BuildResponse | null>(null);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if ((stage === 'ready' || stage === 'budget') && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [stage]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || stage === 'thinking') return;
    setError('');
    setStage('thinking');
    setResponse(null);
    setExtracted(null);
    setBudgetOptions(null);

    try {
      const res = await fetch('/api/v1/ai-party-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const json = (await res.json()) as ExtractResponse | ErrorResponse;
      if (!res.ok || !json.ok) {
        const errJson = json as ErrorResponse;
        setError(errJson.error || 'Something went sideways. Try again?');
        setStage('error');
        return;
      }
      if (json.stage === 'needs-budget') {
        setExtracted(json.extracted);
        setBudgetOptions(json.budgetOptions);
        setStage('budget');
      }
    } catch (err) {
      console.error('[AIPartyChatBar] extract failed', err);
      setError('Network blip — try again.');
      setStage('error');
    }
  }

  async function pickBudget(option: BudgetOption) {
    if (!extracted) return;
    setError('');
    setStage('building');

    try {
      const res = await fetch('/api/v1/ai-party-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          stage: 'build',
          extracted,
          budgetCents: option.cents,
        }),
      });
      const json = (await res.json()) as BuildResponse | ErrorResponse;
      if (!res.ok || !json.ok) {
        const errJson = json as ErrorResponse;
        setError(errJson.error || 'Order build failed. Try a different budget?');
        setStage('error');
        return;
      }
      if (json.stage === 'done') {
        setResponse(json);
        setStage('ready');
      }
    } catch (err) {
      console.error('[AIPartyChatBar] build failed', err);
      setError('Network blip on order build — try again.');
      setStage('error');
    }
  }

  function reset() {
    setStage('idle');
    setResponse(null);
    setExtracted(null);
    setBudgetOptions(null);
    setPrompt('');
    setError('');
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
            Type how many people, how long, and what they drink. Pick a
            budget. The agent spins up your cart and hands you a link — no
            quiz, no waiting.
          </p>
        </div>

        {/* Stage: idle / thinking / error → input form */}
        {(stage === 'idle' || stage === 'thinking' || stage === 'error') && (
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
              disabled={stage === 'thinking'}
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
                  disabled={stage === 'thinking'}
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
                disabled={!prompt.trim() || stage === 'thinking'}
                className="rounded-lg px-5 py-3 text-sm sm:text-base font-bold tracking-[0.08em] transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: GOLD,
                  color: NAVY,
                  border: `2px solid ${NAVY}`,
                  boxShadow: `0 3px 0 ${NAVY}`,
                }}
              >
                {stage === 'thinking' ? 'Thinking…' : 'PLAN MY PARTY →'}
              </button>
            </div>

            {stage === 'thinking' && (
              <div className="mt-4 flex items-center gap-3 rounded-lg px-3 py-3" style={{ background: '#F8F4E1', border: `1.5px solid ${GOLD}` }}>
                <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: NAVY }} />
                <span className="text-sm text-gray-800">
                  Reading your party · matching the catalog…
                </span>
              </div>
            )}

            {stage === 'error' && error && (
              <div className="mt-4 rounded-lg px-3 py-3 text-sm" style={{ background: '#FFE6E6', color: '#7A1F1F', border: '1.5px solid #E58A8A' }}>
                {error}
              </div>
            )}
          </form>
        )}

        {/* Stage: budget — show extracted summary + 5 chips */}
        {(stage === 'budget' || stage === 'building') && extracted && (
          <div
            ref={resultRef}
            className="rounded-2xl p-5 sm:p-6 shadow-lg"
            style={{
              background: '#FFFFFF',
              border: `2px solid ${NAVY}`,
              boxShadow: `0 4px 0 ${NAVY}, 0 12px 32px rgba(10,15,25,0.18)`,
            }}
          >
            {/* User's prompt */}
            <div className="flex justify-end mb-3">
              <div
                className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm"
                style={{ background: '#F0F4F8', color: NAVY }}
              >
                {prompt}
              </div>
            </div>

            {/* Assistant: "Got it!" + extracted summary + chips */}
            <div className="flex justify-start mb-4">
              <div
                className="max-w-[95%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed"
                style={{ background: NAVY, color: '#FFFFFF' }}
              >
                <div className="font-bold mb-2" style={{ color: GOLD }}>
                  ✓ Got it — what&apos;s the budget?
                </div>
                <p className="mb-2">
                  {humanExtracted(extracted)}
                </p>
                <p className="text-xs opacity-80">
                  Tap a budget below and I&apos;ll build the order to fit.
                </p>
              </div>
            </div>

            {/* Budget chips */}
            {budgetOptions && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                {budgetOptions.map((opt, i) => {
                  const isFirst = i === 0;
                  const isLast = i === budgetOptions.length - 1;
                  return (
                    <button
                      key={opt.cents}
                      type="button"
                      onClick={() => pickBudget(opt)}
                      disabled={stage === 'building'}
                      className="rounded-lg px-3 py-3 sm:py-4 transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-left"
                      style={{
                        background: '#FFFFFF',
                        color: NAVY,
                        border: `2px solid ${NAVY}`,
                        boxShadow: `0 2px 0 ${NAVY}`,
                      }}
                    >
                      <div className="font-heading font-bold text-base sm:text-lg tracking-wide">
                        ${opt.totalDollars}
                      </div>
                      <div className="text-xs opacity-70">
                        ${opt.perPersonDollars}/person
                        {isFirst ? ' · light' : isLast ? ' · top shelf' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {stage === 'building' && (
              <div className="mt-3 flex items-center gap-3 rounded-lg px-3 py-3" style={{ background: '#F8F4E1', border: `1.5px solid ${GOLD}` }}>
                <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: NAVY }} />
                <span className="text-sm text-gray-800">
                  Building your cart · spinning up the dashboard…
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={reset}
              className="block mx-auto mt-3 text-xs underline text-gray-500 hover:text-gray-900"
            >
              ← Start over
            </button>
          </div>
        )}

        {/* Stage: ready — final summary + Open Dashboard */}
        {stage === 'ready' && response && (
          <div
            ref={resultRef}
            className="rounded-2xl p-5 sm:p-6 shadow-lg"
            style={{
              background: '#FFFFFF',
              border: `2px solid ${NAVY}`,
              boxShadow: `0 4px 0 ${NAVY}, 0 12px 32px rgba(10,15,25,0.18)`,
            }}
          >
            <div className="flex justify-end mb-3">
              <div
                className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm"
                style={{ background: '#F0F4F8', color: NAVY }}
              >
                {prompt}
              </div>
            </div>

            <div className="flex justify-start mb-4">
              <div
                className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed"
                style={{ background: NAVY, color: '#FFFFFF' }}
              >
                <div className="font-bold mb-2" style={{ color: GOLD }}>
                  ✓ Built your order
                </div>
                <p>{response.summary}</p>
                <p className="mt-2 text-xs opacity-80">
                  {response.recommendation.totalDrinks} drinks · est. $
                  {response.recommendation.estimatedTotal.toFixed(2)} subtotal
                </p>
              </div>
            </div>

            {response.recommendation.items.length > 0 && (
              <div className="rounded-lg p-3 mb-4" style={{ background: CREAM, border: `1.5px solid ${GOLD}` }}>
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: NAVY }}>
                  WHAT&apos;S IN YOUR CART
                </div>
                <ul className="space-y-1 text-sm" style={{ color: NAVY }}>
                  {response.recommendation.items.slice(0, 12).map((it, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">
                        {it.qty}× {it.name}
                      </span>
                      <span className="flex-shrink-0 font-mono">${(it.price * it.qty).toFixed(2)}</span>
                    </li>
                  ))}
                  {response.recommendation.items.length > 12 && (
                    <li className="text-xs italic opacity-70 pt-1">
                      + {response.recommendation.items.length - 12} more…
                    </li>
                  )}
                </ul>
              </div>
            )}

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

            <button
              type="button"
              onClick={reset}
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

function humanExtracted(x: Extracted): string {
  const day = x.eventDays >= 2 ? `${x.eventDays}-day` : '1-day';
  const party = x.partyType === 'just-deliver' ? 'drop-off' : x.partyType.replace('-', ' ');
  const cats = humanCategories(x.drinkCategories);
  return `${x.headcount} people, ${day} ${party} party, heavy on ${cats}.`;
}

function humanCategories(cats: string[]): string {
  const labels = cats.map((c) => (c === 'cocktail-kits' ? 'cocktail kits' : c));
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}
