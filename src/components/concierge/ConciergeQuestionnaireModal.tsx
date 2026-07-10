'use client';

/**
 * Premier Concierge — 6-step planning questionnaire.
 *
 * Step order (contact LAST per founder spec so the customer commits
 * before they type their email):
 *   1. Headcount
 *   2. Arrival + departure dates
 *   3. Party type (bachelor / bachelorette / weekend / corporate / other)
 *   4. Budget per person (chip picker)
 *   5. Activities & services checkboxes (multi-select)
 *   6. Contact info + notes
 *
 * Submit → POST /api/v1/concierge/lead which handles Lead upsert +
 * GHL fire + Google Sheet append.
 */

import { useMemo, useState, type ReactElement, type FormEvent } from 'react';

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const CREAM = '#FAF6EE';

type PartyType = 'bachelor' | 'bachelorette' | 'weekend' | 'corporate' | 'other';
type Activity =
  | 'drink-delivery'
  | 'boat-rental'
  | 'golf-brewery-tour'
  | 'atv-tour'
  | 'gun-range'
  | 'transportation'
  | 'not-sure';

const HEADCOUNT_CHIPS = [4, 6, 8, 10, 12, 15, 20, 25];

const PARTY_TYPES: { key: PartyType; label: string; emoji: string }[] = [
  { key: 'bachelor', label: 'Bachelor', emoji: '🥃' },
  { key: 'bachelorette', label: 'Bachelorette', emoji: '🥂' },
  { key: 'weekend', label: 'Guys weekend', emoji: '🎣' },
  { key: 'corporate', label: 'Corporate offsite', emoji: '💼' },
  { key: 'other', label: 'Something else', emoji: '✨' },
];

const BUDGET_TIERS = [
  { key: '$200/pp', label: '$200/person', sub: 'Boat + drinks basics' },
  { key: '$400/pp', label: '$400/person', sub: 'Boat + drinks + 1 activity' },
  { key: '$600/pp', label: '$600/person', sub: 'Multi-day, 2+ activities' },
  { key: '$800/pp', label: '$800/person', sub: 'Premium boats + tours + rides' },
  { key: '$1000+/pp', label: '$1,000+/person', sub: 'Full concierge, no limits' },
];

const ACTIVITIES: { key: Activity; label: string; emoji: string }[] = [
  { key: 'boat-rental', label: 'Private party boat rental', emoji: '🛥️' },
  { key: 'drink-delivery', label: 'Drink delivery to the dock', emoji: '🥃' },
  { key: 'golf-brewery-tour', label: 'Golf & brewery tour', emoji: '⛳' },
  { key: 'atv-tour', label: 'ATV / off-road tour', emoji: '🚙' },
  { key: 'gun-range', label: 'Gun range experience', emoji: '🎯' },
  { key: 'transportation', label: 'Group transportation', emoji: '🚐' },
  { key: 'not-sure', label: "Not sure yet — recommend for me", emoji: '💡' },
];

// Default arrival date = ~30 days out. Weekend rendezvous is the modal norm.
function defaultArrival(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}
function defaultDeparture(): string {
  const d = new Date();
  d.setDate(d.getDate() + 32);
  return d.toISOString().slice(0, 10);
}

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function ConciergeQuestionnaireModal({
  onClose,
  onSuccess,
}: Props): ReactElement {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // ─── Form state ───────────────────────────────────────────────
  const [headcount, setHeadcount] = useState<number>(10);
  const [customHead, setCustomHead] = useState<string>('');
  const [arrivalDate, setArrivalDate] = useState<string>(defaultArrival());
  const [departureDate, setDepartureDate] = useState<string>(defaultDeparture());
  const [partyType, setPartyType] = useState<PartyType>('bachelor');
  const [budget, setBudget] = useState<string>('$400/pp');
  const [activities, setActivities] = useState<Activity[]>([
    'boat-rental',
    'drink-delivery',
  ]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  function toggleActivity(a: Activity) {
    setActivities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  const effectiveHead = useMemo(() => {
    if (customHead.trim()) {
      const n = Number(customHead);
      if (Number.isFinite(n) && n > 0) return Math.min(500, Math.round(n));
    }
    return headcount;
  }, [customHead, headcount]);

  function canAdvanceFrom(s: number): boolean {
    if (s === 1) return effectiveHead >= 1;
    if (s === 2) return !!arrivalDate && !!departureDate && arrivalDate <= departureDate;
    if (s === 3) return !!partyType;
    if (s === 4) return !!budget;
    if (s === 5) return activities.length > 0;
    if (s === 6)
      return (
        firstName.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      );
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canAdvanceFrom(6) || submitting) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/concierge/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          headcount: effectiveHead,
          arrivalDate,
          departureDate,
          partyType,
          budgetPerPerson: budget,
          activities,
          notes: notes.trim(),
          source: 'premier-concierge-bachelor',
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || 'Something went wrong. Try again?');
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch (err) {
      console.error('[concierge modal] submit failed', err);
      setError('Network blip — try again.');
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(5,10,20,0.75)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col"
        style={{ background: CREAM }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{
            background: NAVY,
            color: '#FFFFFF',
            borderBottom: `3px solid ${GOLD}`,
          }}
        >
          <div>
            <div
              className="text-[10px] font-bold tracking-widest"
              style={{ color: GOLD }}
            >
              STEP {step} OF 6
            </div>
            <div className="font-heading text-lg font-bold tracking-wide">
              Premier Concierge
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-gray-200">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%`, background: GOLD }}
          />
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 1 && (
            <Step
              title="How many guys?"
              subtitle="Approximate is fine — you can adjust later."
            >
              <div className="flex flex-wrap gap-2 mb-3">
                {HEADCOUNT_CHIPS.map((n) => (
                  <ChipButton
                    key={n}
                    active={headcount === n && !customHead}
                    onClick={() => {
                      setHeadcount(n);
                      setCustomHead('');
                    }}
                  >
                    {n} {n === 25 ? '+' : ''}
                  </ChipButton>
                ))}
              </div>
              <label className="text-xs font-bold tracking-widest text-gray-500">
                OR ENTER A NUMBER
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={customHead}
                onChange={(e) => setCustomHead(e.target.value)}
                placeholder="e.g. 14"
                className="mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
                style={{ color: NAVY }}
              />
            </Step>
          )}

          {step === 2 && (
            <Step
              title="When's the weekend?"
              subtitle="Arrival and departure — approximate is fine."
            >
              <label className="text-xs font-bold tracking-widest text-gray-500">
                ARRIVAL
              </label>
              <input
                type="date"
                required
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="mt-1 mb-4 w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
                style={{ color: NAVY }}
              />
              <label className="text-xs font-bold tracking-widest text-gray-500">
                DEPARTURE
              </label>
              <input
                type="date"
                required
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
                style={{ color: NAVY }}
              />
              {arrivalDate > departureDate && (
                <p className="mt-2 text-xs text-red-600">
                  Departure must be after arrival.
                </p>
              )}
            </Step>
          )}

          {step === 3 && (
            <Step title="What kind of weekend?" subtitle="Pick one.">
              <div className="grid grid-cols-1 gap-2">
                {PARTY_TYPES.map((p) => (
                  <BigCard
                    key={p.key}
                    active={partyType === p.key}
                    onClick={() => setPartyType(p.key)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.emoji}</span>
                      <span className="font-heading font-bold text-base tracking-wide">
                        {p.label}
                      </span>
                    </div>
                  </BigCard>
                ))}
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step
              title="Ballpark budget?"
              subtitle="Per person, all-in. We stay under it — no surprise line items."
            >
              <div className="grid grid-cols-1 gap-2">
                {BUDGET_TIERS.map((b) => (
                  <BigCard
                    key={b.key}
                    active={budget === b.key}
                    onClick={() => setBudget(b.key)}
                  >
                    <div>
                      <div className="font-heading font-bold text-lg tracking-tight">
                        {b.label}
                      </div>
                      <div className="text-xs opacity-80">{b.sub}</div>
                    </div>
                  </BigCard>
                ))}
              </div>
            </Step>
          )}

          {step === 5 && (
            <Step
              title="What are you into?"
              subtitle="Pick everything that interests the group — we'll price it all."
            >
              <div className="grid grid-cols-1 gap-2">
                {ACTIVITIES.map((a) => {
                  const on = activities.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => toggleActivity(a.key)}
                      className="rounded-lg px-3 py-3 text-left transition-transform hover:scale-[1.01] flex items-center gap-3"
                      style={{
                        background: on ? NAVY : '#FFFFFF',
                        color: on ? '#FFFFFF' : NAVY,
                        border: `2px solid ${NAVY}`,
                        boxShadow: on ? `0 3px 0 ${NAVY}` : 'none',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                        style={{
                          background: on ? GOLD : '#FFFFFF',
                          border: `2px solid ${on ? GOLD : NAVY}`,
                        }}
                      >
                        {on && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={NAVY}
                            strokeWidth={4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xl">{a.emoji}</span>
                      <span className="font-bold text-sm sm:text-base">
                        {a.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 6 && (
            <Step
              title="Where can we reach you?"
              subtitle="One quick follow-up email within 24 hours — no spam."
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
                  style={{ color: NAVY }}
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
                  style={{ color: NAVY }}
                />
              </div>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
                style={{ color: NAVY }}
              />
              <input
                type="tel"
                placeholder="Phone (optional — for faster follow-up)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
                style={{ color: NAVY }}
              />
              <textarea
                placeholder="Anything else we should know? (venue preferences, groom's picky about drinks, etc.)"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none resize-none"
                style={{ color: NAVY }}
              />
              {error && (
                <div
                  className="mt-3 rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: '#FFE6E6',
                    color: '#7A1F1F',
                    border: '1.5px solid #E58A8A',
                  }}
                >
                  {error}
                </div>
              )}
            </Step>
          )}
        </div>

        {/* Footer nav */}
        <div
          className="px-5 py-3 flex items-center justify-between gap-3"
          style={{
            background: '#FFFFFF',
            borderTop: `1.5px solid #E5E7EB`,
          }}
        >
          <button
            type="button"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5 | 6) : s))}
            disabled={step === 1}
            className="rounded-lg px-4 py-2.5 text-sm font-bold tracking-[0.08em] transition-transform hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: '#FFFFFF',
              color: NAVY,
              border: `2px solid ${NAVY}`,
            }}
          >
            ← Back
          </button>
          {step < 6 ? (
            <button
              type="button"
              onClick={() =>
                canAdvanceFrom(step) &&
                setStep((s) => (s < 6 ? ((s + 1) as 1 | 2 | 3 | 4 | 5 | 6) : s))
              }
              disabled={!canAdvanceFrom(step)}
              className="rounded-lg px-5 py-2.5 text-sm font-bold tracking-[0.08em] transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: GOLD,
                color: NAVY,
                border: `2px solid ${NAVY}`,
                boxShadow: `0 3px 0 ${NAVY}`,
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canAdvanceFrom(6)}
              className="rounded-lg px-5 py-3 text-sm font-heading font-bold tracking-[0.12em] transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: GOLD,
                color: NAVY,
                border: `2px solid ${NAVY}`,
                boxShadow: `0 3px 0 ${NAVY}`,
              }}
            >
              {submitting ? 'SENDING…' : 'SEND MY PLAN →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Primitives ─────────────────────────────────────────────────────

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3
        className="font-heading text-xl font-bold tracking-tight mb-1"
        style={{ color: NAVY }}
      >
        {title}
      </h3>
      {subtitle && <p className="text-sm text-gray-700 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-bold transition-transform hover:scale-[1.03]"
      style={{
        background: active ? NAVY : '#FFFFFF',
        color: active ? GOLD : NAVY,
        border: `2px solid ${NAVY}`,
        boxShadow: active ? `0 2px 0 ${NAVY}` : 'none',
      }}
    >
      {children}
    </button>
  );
}

function BigCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg px-4 py-3 transition-transform hover:scale-[1.01]"
      style={{
        background: active ? NAVY : '#FFFFFF',
        color: active ? '#FFFFFF' : NAVY,
        border: `2px solid ${NAVY}`,
        boxShadow: active ? `0 3px 0 ${NAVY}` : 'none',
      }}
    >
      {children}
    </button>
  );
}
