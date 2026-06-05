'use client';

/**
 * EVENT QUIZ MODAL
 *
 * Renders on top of the bachelor landing page on /event-quiz. 4-step
 * wizard, can't be dismissed (the entire purpose of this page is to
 * route inbound ad traffic through the quiz):
 *
 *   1. Party type — single select
 *      ("Just deliver drinks now" short-circuits to contact, skipping
 *       the rest of the quiz)
 *   2. Delivery timing — single select
 *   3. Needs — multi-select
 *   4. Contact info — name, email, phone
 *
 * On submit: POST /api/v1/event-quiz/submit → creates Lead, sends
 * welcome email, returns the target landing-page URL. We then
 * window.location.href the user to that URL with ?welcome=1 so the
 * destination landing page renders its "Step one" hero.
 *
 * Field captures fire FIELD_BLUR lead events along the way (via the
 * global FormCaptureWatcher) so partial drop-offs still produce Leads
 * even if the user bails before step 4.
 */
import { useState } from 'react';
import {
  PARTY_TYPE_LABEL,
  DELIVERY_TIMING_LABEL,
  EVENT_NEED_LABEL,
  type PartyType,
  type DeliveryTiming,
  type EventNeed,
} from '@/lib/eventQuiz/routing';
import { sendLeadEvent } from '@/lib/leads/client';

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const CREAM = '#FAF6EE';

// ─── Step config ────────────────────────────────────────────────────
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
const TIMING_OPTIONS: DeliveryTiming[] = ['today', 'tomorrow', 'future'];
const NEEDS_OPTIONS: EventNeed[] = [
  'stock-drinks',
  'transportation',
  'party-boat',
  'tour',
  'event-rentals',
];

type Step = 'party' | 'timing' | 'needs' | 'contact';

export default function EventQuizModal() {
  const [step, setStep] = useState<Step>('party');
  const [partyType, setPartyType] = useState<PartyType | null>(null);
  const [timing, setTiming] = useState<DeliveryTiming | null>(null);
  const [needs, setNeeds] = useState<Set<EventNeed>>(new Set());

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Step transitions ─────────────────────────────────────────────
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
    // "Just deliver drinks now" short-circuits the quiz.
    if (p === 'just-deliver') {
      setStep('timing');
      return;
    }
    setStep('timing');
  };

  const chooseTiming = (t: DeliveryTiming) => {
    setTiming(t);
    void sendLeadEvent({
      type: 'STEP_COMPLETE',
      widget: 'CONTACT_FORM',
      page: '/event-quiz',
      fieldName: 'timing',
      fieldValue: t,
      metadata: { flow: 'event-quiz', step: 'timing', timing: t },
    });
    // Short-circuit: "Just deliver drinks now" jumps past the needs step.
    if (partyType === 'just-deliver') {
      setStep('contact');
      return;
    }
    setStep('needs');
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

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyType || !timing || !firstName || !email) return;
    setError(null);
    setSubmitting(true);
    try {
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
          timing,
          needs: Array.from(needs),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Could not save your info.');
      }
      // Redirect to the personalized landing page. ?welcome=1 query
      // param tells the landing page to render the "Step one ..." hero.
      window.location.href = json.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(5,10,20,0.82)' }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
        style={{ background: CREAM }}
      >
        {/* HEADER */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: NAVY, color: '#FFFFFF', borderBottom: `3px solid ${GOLD}` }}
        >
          <div className="min-w-0">
            <div
              className="text-[10px] font-bold tracking-widest"
              style={{ color: GOLD }}
            >
              {step === 'party' && 'STEP 1 OF 4'}
              {step === 'timing' && (partyType === 'just-deliver' ? 'STEP 2 OF 3' : 'STEP 2 OF 4')}
              {step === 'needs' && 'STEP 3 OF 4'}
              {step === 'contact' && 'FINAL STEP'}
            </div>
            <div className="font-heading text-xl md:text-2xl font-bold leading-tight mt-1">
              {step === 'party' && 'What kind of party are you planning?'}
              {step === 'timing' && 'When is your delivery?'}
              {step === 'needs' && 'What do you need help with?'}
              {step === 'contact' && 'Last step — we’ll send you the playbook.'}
            </div>
            <div className="text-xs opacity-85 mt-0.5">
              Quick — takes 30 seconds. Then we route you to the right page.
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="px-5 pt-3 pb-2 flex gap-1.5">
          {['party', 'timing', 'needs', 'contact'].map((s) => {
            const idx = ['party', 'timing', 'needs', 'contact'].indexOf(step);
            const sIdx = ['party', 'timing', 'needs', 'contact'].indexOf(s);
            // Hide the needs dot for the "just deliver" path.
            if (s === 'needs' && partyType === 'just-deliver') return null;
            return (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  background: sIdx <= idx ? GOLD : '#E5E7EB',
                }}
              />
            );
          })}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'party' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <OptionButton
                key="just-deliver"
                label={PARTY_TYPE_LABEL['just-deliver']}
                sub="Skip the planning — just get drinks ASAP"
                selected={partyType === 'just-deliver'}
                onClick={() => choosePartyType('just-deliver')}
                emphasis
              />
              {PARTY_OPTIONS.filter((p) => p !== 'just-deliver').map((p) => (
                <OptionButton
                  key={p}
                  label={PARTY_TYPE_LABEL[p]}
                  selected={partyType === p}
                  onClick={() => choosePartyType(p)}
                />
              ))}
            </div>
          )}

          {step === 'timing' && (
            <div className="grid grid-cols-1 gap-2.5 max-w-md mx-auto">
              {TIMING_OPTIONS.map((t) => (
                <OptionButton
                  key={t}
                  label={DELIVERY_TIMING_LABEL[t]}
                  sub={
                    t === 'today'
                      ? 'Same-day delivery, available where eligible'
                      : t === 'tomorrow'
                        ? "Guaranteed pricing, we'll lock your window"
                        : 'Schedule a delivery for any upcoming date'
                  }
                  selected={timing === t}
                  onClick={() => chooseTiming(t)}
                />
              ))}
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
                <Input
                  label="Last name"
                  value={lastName}
                  onChange={setLastName}
                />
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
                style={{ background: GOLD, color: NAVY }}
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
                if (step === 'timing') setStep('party');
                else if (step === 'needs') setStep('timing');
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
                style={{ background: GOLD, color: NAVY }}
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

// ─── Subcomponents ──────────────────────────────────────────────────
function OptionButton({
  label,
  sub,
  selected,
  onClick,
  emphasis,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-md p-3 transition-transform hover:scale-[1.01]"
      style={{
        background: selected ? GOLD : '#FFFFFF',
        color: selected ? NAVY : NAVY,
        border: `2px solid ${selected ? GOLD : emphasis ? GOLD : '#E5E7EB'}`,
        boxShadow: selected
          ? '0 4px 12px rgba(212,175,55,0.4)'
          : emphasis
            ? '0 2px 6px rgba(212,175,55,0.2)'
            : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="font-bold text-sm">{label}</div>
      {sub && <div className="text-[11px] opacity-75 mt-0.5">{sub}</div>}
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
        border: `2px solid ${checked ? GOLD : '#E5E7EB'}`,
        color: NAVY,
      }}
    >
      <span
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 font-bold"
        style={{
          background: checked ? GOLD : '#FFFFFF',
          border: `2px solid ${checked ? GOLD : '#9CA3AF'}`,
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
