'use client';

/**
 * EVENT QUIZ MODAL — 3-step paid-ad funnel router.
 *
 * Lives on top of the bachelor landing page at /event-quiz. Can't be
 * dismissed. Three steps:
 *
 *   1. Party type — single select
 *      ("Order Drinks Now" short-circuits → contact step)
 *   2. Needs — multi-select
 *   3. Contact info — name, email, phone
 *
 * No delivery-timing step. Delivery date is collected on the destination
 * landing page (PackageBuilderModal + QuickBuyModal), and the catalog
 * there auto-switches to the last-minute menu when the date is today
 * or tomorrow.
 *
 * Style notes (matches landing-page theme):
 *   - Order Drinks Now → big yellow button, black font, dark border
 *   - 6 party-type buttons cycle a left-to-right gold shimmer in
 *     sequence, 500ms per button (subtle ad-style motion that draws
 *     the eye through all options without being annoying)
 *
 * On submit: POST /api/v1/event-quiz/submit → Lead + welcome email +
 * redirect to /<landing-page>?welcome=1.
 */
import { useState } from 'react';
import {
  PARTY_TYPE_LABEL,
  EVENT_NEED_LABEL,
  type PartyType,
  type DeliveryTiming,
  type EventNeed,
} from '@/lib/eventQuiz/routing';
import { sendLeadEvent } from '@/lib/leads/client';

const NAVY = '#0A1F33';
const GOLD = '#F2D34F'; // brand-yellow — matches bachelor landing theme.primary
const GOLD_HOVER = '#FACC15';
const CREAM = '#FAF6EE';

const PARTY_OPTIONS_SECONDARY: PartyType[] = [
  'bachelor',
  'bachelorette',
  'corporate',
  'wedding',
  'boat',
  'house',
  'hotel',
];
const NEEDS_OPTIONS: EventNeed[] = [
  'stock-drinks',
  'transportation',
  'party-boat',
  'tour',
  'event-rentals',
];

type Step = 'party' | 'needs' | 'contact';

export default function EventQuizModal() {
  const [step, setStep] = useState<Step>('party');
  const [partyType, setPartyType] = useState<PartyType | null>(null);
  const [needs, setNeeds] = useState<Set<EventNeed>>(new Set());

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choosePartyType = (p: PartyType) => {
    setPartyType(p);
    void sendLeadEvent({
      type: 'STEP_COMPLETE',
      widget: 'CONTACT_FORM',
      page: '/event-quiz',
      fieldName: 'party_type',
      fieldValue: p,
      metadata: { flow: 'event-quiz', step: 'party', partyType: p },
    });
    // "Just deliver drinks now" skips the needs step.
    setStep(p === 'just-deliver' ? 'contact' : 'needs');
  };

  const toggleNeed = (n: EventNeed) => {
    setNeeds((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const advanceFromNeeds = () => {
    void sendLeadEvent({
      type: 'STEP_COMPLETE',
      widget: 'CONTACT_FORM',
      page: '/event-quiz',
      fieldName: 'needs',
      metadata: { flow: 'event-quiz', step: 'needs', needs: Array.from(needs) },
    });
    setStep('contact');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyType || !firstName || !email) return;
    setError(null);
    setSubmitting(true);
    try {
      // Backend still accepts a `timing` field — send 'future' as a sentinel
      // since we no longer ask. Landing-page date picker is the real source
      // of truth for delivery timing now.
      const timingSentinel: DeliveryTiming = 'future';
      const res = await fetch('/api/v1/event-quiz/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          firstName,
          lastName: lastName || null,
          email,
          phone: phone || null,
          partyType,
          timing: timingSentinel,
          needs: Array.from(needs),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Could not save your info.');
      }
      window.location.href = json.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  const totalSteps = partyType === 'just-deliver' ? 2 : 3;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(5,10,20,0.82)' }}
    >
      {/* Animation keyframes for the sequential shimmer effect on party
          buttons. Injected globally because <style jsx> would scope it
          per-element. */}
      <style jsx global>{`
        @keyframes pod-quiz-shimmer {
          0% { transform: translateX(-110%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(110%); opacity: 0; }
        }
        .pod-shimmer-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          border-radius: 0.5rem;
        }
        .pod-shimmer-overlay::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          left: 0;
          width: 40%;
          background: linear-gradient(
            120deg,
            transparent 0%,
            rgba(255,255,255,0) 20%,
            rgba(255,255,255,0.6) 50%,
            rgba(255,255,255,0) 80%,
            transparent 100%
          );
          transform: translateX(-110%);
          animation: pod-quiz-shimmer 4s linear infinite;
          animation-delay: var(--shimmer-delay, 0s);
        }
      `}</style>

      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
        style={{ background: CREAM }}
      >
        {/* HEADER */}
        <div
          className="px-5 py-4"
          style={{ background: NAVY, color: '#FFFFFF', borderBottom: `3px solid ${GOLD}` }}
        >
          <div
            className="text-[10px] font-bold tracking-widest"
            style={{ color: GOLD }}
          >
            {step === 'party' && `STEP 1 OF ${totalSteps}`}
            {step === 'needs' && `STEP 2 OF ${totalSteps}`}
            {step === 'contact' && 'FINAL STEP'}
          </div>
          <div className="font-heading text-xl md:text-2xl font-bold leading-tight mt-1">
            {step === 'party' && 'What kind of party are you planning?'}
            {step === 'needs' && 'What do you need help with?'}
            {step === 'contact' && "Last step — we'll send you the playbook."}
          </div>
          <div className="text-xs opacity-85 mt-0.5">
            Quick — takes 30 seconds. Then we route you to the right page.
          </div>
        </div>

        {/* Progress dots */}
        <div className="px-5 pt-3 pb-2 flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepIdx =
              step === 'party' ? 0 : step === 'needs' ? 1 : totalSteps - 1;
            return (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{ background: i <= stepIdx ? GOLD : '#E5E7EB' }}
              />
            );
          })}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'party' && (
            <div className="space-y-3">
              {/* Primary CTA — big yellow, black font, dark border, no shimmer
                  (it's already the loudest button on the screen) */}
              <button
                type="button"
                onClick={() => choosePartyType('just-deliver')}
                className="w-full rounded-lg py-4 px-5 font-heading text-xl md:text-2xl font-bold tracking-wider transition-transform hover:scale-[1.01]"
                style={{
                  background: GOLD,
                  color: NAVY,
                  border: `3px solid ${NAVY}`,
                  boxShadow: `0 6px 0 ${NAVY}, 0 10px 20px rgba(10,15,25,0.25)`,
                }}
              >
                ⚡ ORDER DRINKS NOW
              </button>
              <div className="text-center text-xs text-gray-500 uppercase tracking-widest font-bold">
                — or pick your occasion —
              </div>
              {/* 6 (actually 7) party-type buttons. Each has a shimmer overlay
                  with a staggered animation-delay so the highlight sweeps
                  through them in sequence, 500ms apart. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PARTY_OPTIONS_SECONDARY.map((p, idx) => (
                  <PartyTypeButton
                    key={p}
                    label={PARTY_TYPE_LABEL[p]}
                    selected={partyType === p}
                    onClick={() => choosePartyType(p)}
                    shimmerDelay={`${idx * 0.5}s`}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 'needs' && (
            <div>
              <p className="text-xs text-gray-600 mb-3 text-center">
                Pick as many as apply — we&apos;ll loop in the right team.
              </p>
              <div className="grid grid-cols-1 gap-2.5 max-w-lg mx-auto">
                {NEEDS_OPTIONS.map((n) => (
                  <CheckboxRow
                    key={n}
                    label={EVENT_NEED_LABEL[n]}
                    checked={needs.has(n)}
                    onClick={() => toggleNeed(n)}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                No matches? That&apos;s fine — skip ahead, we&apos;ll cover it on the call.
              </p>
            </div>
          )}

          {step === 'contact' && (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-3 max-w-lg mx-auto"
              data-lead-capture="manual"
              data-lead-widget="CONTACT_FORM"
            >
              <p className="text-xs text-gray-700 mb-2 text-center">
                Drop your info — we&apos;ll send you the playbook of everything we
                cover (delivery, rentals, boats, bartenders, concierge) and a
                link to start your drink order.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="First name"
                  required
                  value={firstName}
                  onChange={setFirstName}
                />
                <Input label="Last name" value={lastName} onChange={setLastName} />
              </div>
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={setEmail}
              />
              <Input
                label="Phone (for text reminders)"
                type="tel"
                value={phone}
                onChange={setPhone}
              />
              {error && (
                <div
                  className="rounded-md p-2.5 text-sm"
                  style={{
                    background: '#FEE2E2',
                    color: '#991B1B',
                    border: '1px solid #FCA5A5',
                  }}
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || !firstName || !email}
                className="w-full py-3.5 rounded-md font-bold tracking-widest text-sm disabled:opacity-40 transition-transform hover:scale-[1.01]"
                style={{
                  background: GOLD,
                  color: NAVY,
                  border: `3px solid ${NAVY}`,
                  boxShadow: `0 4px 0 ${NAVY}`,
                }}
              >
                {submitting ? 'LOCKING IT IN…' : 'GET ME TO MY DRINKS →'}
              </button>
              <p className="text-[10px] text-gray-500 text-center leading-snug">
                We&apos;ll never spam you. TABC-licensed alcohol retailer — must be
                21+ at delivery.
              </p>
            </form>
          )}
        </div>

        {/* Footer — back + next */}
        {step !== 'contact' && (
          <div
            className="px-5 py-3 border-t flex items-center justify-between gap-3"
            style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
          >
            <button
              onClick={() => {
                if (step === 'needs') setStep('party');
              }}
              disabled={step === 'party'}
              className="px-4 py-2 rounded-md font-semibold text-sm disabled:opacity-30"
              style={{ background: '#F3F4F6', color: NAVY }}
            >
              ← Back
            </button>
            {step === 'needs' && (
              <button
                onClick={advanceFromNeeds}
                className="px-6 py-2.5 rounded-md font-bold text-sm tracking-wider"
                style={{
                  background: GOLD,
                  color: NAVY,
                  border: `2px solid ${NAVY}`,
                }}
              >
                Next →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Party-type tile button. Bold black border, soft cream interior, gold
 * fill on hover/select. A `pod-shimmer-overlay` element sits on top with
 * a staggered animation-delay so a thin gold sweep travels through each
 * card in sequence.
 */
function PartyTypeButton({
  label,
  selected,
  onClick,
  shimmerDelay,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  shimmerDelay: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-lg py-3.5 px-4 text-left font-bold text-sm md:text-base transition-all hover:scale-[1.02] overflow-hidden"
      style={{
        background: selected ? GOLD : '#FFFFFF',
        color: NAVY,
        border: `2px solid ${selected ? GOLD_HOVER : NAVY}`,
        boxShadow: selected
          ? `0 4px 0 ${NAVY}`
          : `0 3px 0 ${NAVY}, 0 1px 3px rgba(0,0,0,0.06)`,
      }}
    >
      <span className="relative z-10">{label}</span>
      {/* Shimmer overlay — staggered per index. */}
      <span
        className="pod-shimmer-overlay"
        style={{ ['--shimmer-delay' as string]: shimmerDelay }}
        aria-hidden
      />
    </button>
  );
}

function CheckboxRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-md p-3 text-left transition-colors"
      style={{
        background: checked ? `${GOLD}22` : '#FFFFFF',
        border: `2px solid ${checked ? GOLD_HOVER : '#E5E7EB'}`,
        color: NAVY,
      }}
    >
      <span
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 font-bold"
        style={{
          background: checked ? GOLD : '#FFFFFF',
          border: `2px solid ${checked ? GOLD_HOVER : '#9CA3AF'}`,
          color: NAVY,
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
}

function Input({
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
        className="block text-[10px] font-bold tracking-widest mb-1"
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
        className="w-full rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
        style={{ color: NAVY }}
      />
    </div>
  );
}
