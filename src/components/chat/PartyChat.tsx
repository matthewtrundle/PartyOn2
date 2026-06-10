'use client';

/**
 * PARTY ON DELIVERY CHAT
 *
 * Floating chat-bubble in the bottom-right corner. Same idea as the
 * Premier Party Cruises V2 site's chatbot — light conversational
 * tone, fast collection of qualifying answers via buttons + slider +
 * date-picker, ends with a personalized drink-order recommendation.
 *
 * Steps:
 *   1. Party type           — button grid (single select)
 *   2. Date of event        — date picker (defaults to today+7)
 *   3. # of people          — slider 4–100
 *   4. Contact info         — name / email / phone
 *   5. Recommendation       — top picks based on party type + headcount,
 *                             with CTAs to open the package builder or
 *                             go to the matching landing page
 *
 * All submissions create a Lead via POST /api/v1/chat/submit (same
 * downstream behavior as the /event-quiz quiz endpoint — appears in
 * Brian's Stuff → Leads with metadata.chatQuiz). If the chosen date is
 * today or tomorrow, the destination landing page automatically loads
 * the last-minute catalog (handled by LandingPageTemplate already).
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  PARTY_TYPE_LABEL,
  type PartyType,
} from '@/lib/eventQuiz/routing';
import { sendLeadEvent } from '@/lib/leads/client';

type RecommendedItem = {
  handle: string;
  name: string;
  image?: string;
  price: number;
  qty: number;
};
type Recommendation = {
  occasion: string;
  packageName: string;
  packageBlurb: string;
  packageServes: string;
  packageImage: string;
  items: RecommendedItem[];
  estimatedTotal: number;
  missingHandles: string[];
};

type Step = 'party' | 'date' | 'headcount' | 'contact' | 'results';

const PARTY_OPTIONS: PartyType[] = [
  'just-deliver',
  'bachelor',
  'bachelorette',
  'corporate',
  'wedding',
  'boat',
  'house',
  'hotel',
];

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';

export default function PartyChat() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('party');
  const [partyType, setPartyType] = useState<PartyType | null>(null);
  // Default delivery date: 7 days out. Picker enforces today as the
  // minimum (no past dates).
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [deliveryDate, setDeliveryDate] = useState<string>(defaultDate);
  const [headcount, setHeadcount] = useState<number>(12);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLastMinute, setIsLastMinute] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Reset everything when the user closes the panel without finishing.
  // Skips reset if they completed (kept the recommendation visible if
  // re-opened the same session).
  useEffect(() => {
    if (!open && step !== 'results') {
      setStep('party');
      setError(null);
    }
  }, [open, step]);

  const choosePartyType = (p: PartyType) => {
    setPartyType(p);
    void sendLeadEvent({
      type: 'STEP_COMPLETE',
      widget: 'OTHER',
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      fieldName: 'chat_party_type',
      fieldValue: p,
      metadata: { flow: 'chat', step: 'party', partyType: p },
    });
    setStep('date');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyType || !firstName || !email) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/chat/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          firstName,
          lastName: lastName || null,
          email,
          phone: phone || null,
          partyType,
          headcount,
          deliveryDate,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Could not save your info.');
      }
      setRecommendation(json.recommendation ?? null);
      setIsLastMinute(!!json.isLastMinute);
      setRedirectTo(json.redirectTo ?? null);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  };

  // FAB (closed state)
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Chat with Party On Delivery"
        className="fixed z-[150] rounded-full shadow-2xl transition-transform hover:scale-[1.05]"
        style={{
          right: 20,
          bottom: 20,
          width: 64,
          height: 64,
          background: GOLD,
          color: NAVY,
          border: `3px solid ${NAVY}`,
          boxShadow: `0 6px 0 ${NAVY}, 0 12px 24px rgba(0,0,0,0.25)`,
        }}
      >
        <span className="text-3xl leading-none" role="img" aria-label="party">
          🥂
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed z-[150] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
      style={{
        right: 20,
        bottom: 20,
        width: 'min(420px, calc(100vw - 40px))',
        height: 'min(640px, calc(100vh - 100px))',
        background: '#FFFFFF',
        border: `2px solid ${NAVY}`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: NAVY, color: '#FFFFFF', borderBottom: `3px solid ${GOLD}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: GOLD, color: NAVY }}
          >
            🥂
          </div>
          <div className="min-w-0">
            <div className="font-heading text-base font-bold leading-tight tracking-wide">
              Party On Delivery
            </div>
            <div className="text-[11px] opacity-80 leading-tight">
              Plan your party in 30 seconds
            </div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}
        >
          ×
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {step === 'party' && (
          <ChatBubble
            from="bot"
            content={
              <>
                <div className="mb-3">
                  Hey 👋 — what kind of party are you planning?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PARTY_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => choosePartyType(p)}
                      className="text-left px-3 py-2 rounded-md text-xs font-bold transition-transform hover:scale-[1.02]"
                      style={{
                        background:
                          p === 'just-deliver' ? GOLD : '#FFFFFF',
                        color: NAVY,
                        border:
                          p === 'just-deliver'
                            ? `2px solid ${NAVY}`
                            : `1.5px solid #E5E7EB`,
                        boxShadow:
                          p === 'just-deliver'
                            ? `0 3px 0 ${NAVY}`
                            : '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      {p === 'just-deliver' ? '⚡ ' : ''}
                      {PARTY_TYPE_LABEL[p]}
                    </button>
                  ))}
                </div>
              </>
            }
          />
        )}

        {step === 'date' && (
          <>
            {partyType && (
              <ChatBubble
                from="user"
                content={PARTY_TYPE_LABEL[partyType]}
              />
            )}
            <ChatBubble
              from="bot"
              content={
                <>
                  <div className="mb-3">
                    Got it. When&apos;s the event? Today and tomorrow are
                    fair game — we&apos;ll swap in our 24-hr menu so you only
                    see what&apos;s deep in stock.
                  </div>
                  <input
                    type="date"
                    value={deliveryDate}
                    min={todayStr}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full rounded-md border-2 px-3 py-2 text-sm font-bold"
                    style={{ borderColor: NAVY, color: NAVY }}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => setStep('headcount')}
                      className="px-4 py-2 rounded-md font-bold text-xs tracking-widest"
                      style={{
                        background: GOLD,
                        color: NAVY,
                        border: `2px solid ${NAVY}`,
                      }}
                    >
                      NEXT →
                    </button>
                  </div>
                </>
              }
            />
          </>
        )}

        {step === 'headcount' && (
          <>
            <ChatBubble from="user" content={prettyDate(deliveryDate)} />
            <ChatBubble
              from="bot"
              content={
                <>
                  <div className="mb-3">
                    How many drinkers? Slide to dial it in.
                  </div>
                  <div className="text-center mb-2">
                    <span
                      className="font-heading text-4xl font-bold"
                      style={{ color: NAVY }}
                    >
                      {headcount}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">people</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={100}
                    step={1}
                    value={headcount}
                    onChange={(e) => setHeadcount(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: GOLD }}
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>4</span>
                    <span>100</span>
                  </div>
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => setStep('contact')}
                      className="px-4 py-2 rounded-md font-bold text-xs tracking-widest"
                      style={{
                        background: GOLD,
                        color: NAVY,
                        border: `2px solid ${NAVY}`,
                      }}
                    >
                      NEXT →
                    </button>
                  </div>
                </>
              }
            />
          </>
        )}

        {step === 'contact' && (
          <>
            <ChatBubble
              from="user"
              content={`${headcount} people · ${prettyDate(deliveryDate)}`}
            />
            <ChatBubble
              from="bot"
              content={
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  data-lead-capture="manual"
                  data-lead-widget="CONTACT_FORM"
                  className="space-y-2"
                >
                  <div className="mb-2">
                    Last bit — drop your info and I&apos;ll build your
                    recommendation:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ChatInput
                      label="First name"
                      value={firstName}
                      onChange={setFirstName}
                      required
                    />
                    <ChatInput
                      label="Last name"
                      value={lastName}
                      onChange={setLastName}
                    />
                  </div>
                  <ChatInput
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={setEmail}
                  />
                  <ChatInput
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                  />
                  {error && (
                    <div
                      className="rounded-md p-2 text-xs"
                      style={{ background: '#FEE2E2', color: '#991B1B' }}
                    >
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !firstName || !email}
                    className="w-full py-3 rounded-md font-bold text-sm tracking-widest disabled:opacity-40 mt-2"
                    style={{
                      background: GOLD,
                      color: NAVY,
                      border: `2px solid ${NAVY}`,
                      boxShadow: `0 3px 0 ${NAVY}`,
                    }}
                  >
                    {submitting ? 'BUILDING…' : 'SHOW MY DRINKS →'}
                  </button>
                </form>
              }
            />
          </>
        )}

        {step === 'results' && recommendation && (
          <ResultsView
            firstName={firstName}
            recommendation={recommendation}
            isLastMinute={isLastMinute}
            redirectTo={redirectTo ?? '/'}
            headcount={headcount}
            deliveryDate={deliveryDate}
          />
        )}

        {step === 'results' && !recommendation && (
          <ChatBubble
            from="bot"
            content={
              <>
                <div className="mb-3">
                  You&apos;re all set, {firstName} 🎉 — I&apos;ll email you
                  the full menu and details. Head over to the order page
                  to start your drink list:
                </div>
                <a
                  href={redirectTo ?? '/'}
                  className="inline-block w-full text-center py-2.5 rounded-md font-bold text-xs tracking-widest"
                  style={{
                    background: GOLD,
                    color: NAVY,
                    border: `2px solid ${NAVY}`,
                    boxShadow: `0 3px 0 ${NAVY}`,
                  }}
                >
                  OPEN MY MENU →
                </a>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}

/**
 * Final view inside the chat — recommended order at the top, with a
 * "see full menu" CTA below that hands the customer off to the matching
 * landing page (where they can browse the catalog with the auto-engaged
 * last-minute mode if today/tomorrow).
 */
function ResultsView({
  firstName,
  recommendation,
  isLastMinute,
  redirectTo,
  headcount,
  deliveryDate,
}: {
  firstName: string;
  recommendation: Recommendation;
  isLastMinute: boolean;
  redirectTo: string;
  headcount: number;
  deliveryDate: string;
}) {
  const fullMenuUrl = `${redirectTo}&date=${deliveryDate}&people=${headcount}`;

  return (
    <div className="space-y-3">
      <ChatBubble
        from="bot"
        content={
          <>
            Built it — {firstName}, here&apos;s what I&apos;d order for{' '}
            <strong>{headcount} people</strong> on{' '}
            <strong>{prettyDate(deliveryDate)}</strong>:
          </>
        }
      />
      {isLastMinute && (
        <div
          className="rounded-md p-2 text-[11px] font-bold leading-snug"
          style={{ background: GOLD, color: NAVY, border: `2px solid ${NAVY}` }}
        >
          ⚡ LAST-MINUTE MODE — the full menu below is filtered to
          deep-stock items we can deliver in 24h.
        </div>
      )}

      {/* Recommendation card */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: `2px solid ${NAVY}` }}
      >
        <div
          className="px-3 py-2"
          style={{ background: NAVY, color: '#FFFFFF' }}
        >
          <div className="text-[10px] font-bold tracking-widest" style={{ color: GOLD }}>
            YOUR RECOMMENDED ORDER
          </div>
          <div className="font-heading text-base font-bold leading-tight">
            {recommendation.packageName}
          </div>
          <div className="text-[11px] opacity-80">{recommendation.packageServes}</div>
        </div>
        <div className="bg-white px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto">
          {recommendation.items.map((it) => (
            <div key={it.handle} className="flex items-center gap-2">
              <div
                className="relative w-10 h-10 flex-shrink-0 rounded bg-gray-50"
                style={{ border: '1px solid #E5E7EB' }}
              >
                {it.image && (
                  <Image
                    src={it.image}
                    alt={it.name}
                    fill
                    className="object-contain p-0.5"
                    sizes="40px"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-xs font-bold leading-tight truncate"
                  style={{ color: NAVY }}
                >
                  {it.qty}× {it.name}
                </div>
                <div className="text-[10px] text-gray-500">
                  ${(it.price * it.qty).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{ background: '#FAF6EE', borderTop: '1px solid #E5E7EB' }}
        >
          <span className="text-xs font-bold" style={{ color: NAVY }}>
            Subtotal
          </span>
          <span className="font-heading text-lg font-bold" style={{ color: NAVY }}>
            ${recommendation.estimatedTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* CTAs */}
      <a
        href={fullMenuUrl}
        className="block w-full text-center py-3 rounded-md font-bold text-sm tracking-widest"
        style={{
          background: GOLD,
          color: NAVY,
          border: `3px solid ${NAVY}`,
          boxShadow: `0 4px 0 ${NAVY}`,
        }}
      >
        START MY ORDER ON THE FULL MENU →
      </a>
      <p className="text-[10px] text-gray-500 text-center">
        We sent the recommendation + full menu link to your inbox too.
      </p>
    </div>
  );
}

// ─── Small subcomponents ──────────────────────────────────────────────

function ChatBubble({
  from,
  content,
}: {
  from: 'bot' | 'user';
  content: React.ReactNode;
}) {
  const isBot = from === 'bot';
  return (
    <div className={`flex mb-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className="rounded-2xl px-3 py-2 max-w-[85%] text-sm leading-snug"
        style={{
          background: isBot ? '#FFFFFF' : GOLD,
          color: NAVY,
          border: isBot ? '1.5px solid #E5E7EB' : `2px solid ${NAVY}`,
          borderTopLeftRadius: isBot ? 4 : undefined,
          borderTopRightRadius: !isBot ? 4 : undefined,
        }}
      >
        {content}
      </div>
    </div>
  );
}

function ChatInput({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="block text-[9px] font-bold tracking-widest mb-0.5"
        style={{ color: '#6B7280' }}
      >
        {label.toUpperCase()}
        {required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md px-2.5 py-2 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
        style={{ color: NAVY }}
      />
    </div>
  );
}

function prettyDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
