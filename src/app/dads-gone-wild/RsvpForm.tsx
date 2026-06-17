'use client';

import { useState, type ReactElement } from 'react';

const MIN_ADULTS = 1;
const MAX_ADULTS = 20;
const MIN_KIDS = 0;
const MAX_KIDS = 20;

interface RsvpFormProps {
  /** Invite slug stored with each RSVP (e.g. "dads-gone-wild"). */
  event: string;
  /** Host name used in the confirmation copy ("aboard the S.S. {host}"). */
  hostName: string;
}

interface StepperProps {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}

const stepBtn =
  'flex h-12 w-12 items-center justify-center rounded-lg border-2 border-white/40 bg-transparent text-2xl leading-none text-white transition-colors hover:border-white';

const fieldLabel = 'font-sans text-base font-semibold tracking-[0.04em] text-gray-200';

const textInput =
  'mt-2 w-full rounded-lg border border-white/25 bg-white/[0.08] px-4 py-3.5 font-sans text-base text-white placeholder:text-white/40 transition-colors focus:border-brand-yellow focus:outline-none';

/** Round-number stepper used for both the adults and kids counts. */
function Stepper({ label, value, onDec, onInc }: StepperProps): ReactElement {
  return (
    <div>
      <div className={fieldLabel}>{label}</div>
      <div className="mt-2 flex items-center gap-4">
        <button type="button" onClick={onDec} aria-label={`Decrease ${label}`} className={stepBtn}>
          −
        </button>
        <span className="min-w-[44px] text-center font-fraunces text-[34px] font-medium italic text-brand-yellow">
          {value}
        </span>
        <button type="button" onClick={onInc} aria-label={`Increase ${label}`} className={stepBtn}>
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Inline RSVP form for the boat-party invite. Validates name (required),
 * clamps the steppers, shows a live "total heads" count, and on a successful
 * POST to /api/events/rsvp flips to a confirmation state. "Edit my answer"
 * returns to the form with all entered values preserved.
 */
export default function RsvpForm({ event, hostName }: RsvpFormProps): ReactElement {
  const [name, setName] = useState('');
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [dish, setDish] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const totalHeads = adults + kids;
  const nameError = triedSubmit && !name.trim();

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      setTriedSubmit(true);
      return;
    }
    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          name: name.trim(),
          adults,
          kids,
          dish: dish.trim(),
          website_url: honeypot,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setServerError(data?.error || 'Something went sideways. Try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError('Network hiccup — try that one more time.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const confirmName = name.trim() || 'Captain Anonymous';
    const headsLabel = `${totalHeads} ${totalHeads === 1 ? 'head' : 'heads'}`;
    const dishLine = dish.trim()
      ? `You're on the hook for: ${dish.trim()}. No backsies.`
      : "You didn't say what you're bringing. The pressure is now immense.";

    return (
      <div className="rounded-2xl border border-brand-yellow/40 bg-white/[0.06] p-8 text-center">
        <div className="font-heading text-3xl font-bold uppercase text-brand-yellow">
          You&apos;re On The Boat
        </div>
        <p className="editorial mt-2.5 text-[19px] text-white">
          {`${confirmName}, that's ${headsLabel} aboard the S.S. ${hostName}.`}
        </p>
        <p className="mt-3 text-sm text-gray-200">{dishLine}</p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-[22px] rounded-lg border-2 border-white bg-transparent px-6 py-3 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10"
        >
          Edit my answer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Honeypot — hidden from humans; bots that fill it are silently dropped. */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <label className="block">
        <span className={fieldLabel}>Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Captain ___________"
          className={textInput}
        />
        {nameError && (
          <span className="mt-1.5 block text-sm text-brand-yellow">
            We need a name, mystery sailor.
          </span>
        )}
      </label>

      <Stepper
        label="Adults (dads count double, emotionally)"
        value={adults}
        onDec={() => setAdults((v) => Math.max(MIN_ADULTS, v - 1))}
        onInc={() => setAdults((v) => Math.min(MAX_ADULTS, v + 1))}
      />

      <Stepper
        label="Kids (free labor / lifeguards)"
        value={kids}
        onDec={() => setKids((v) => Math.max(MIN_KIDS, v - 1))}
        onInc={() => setKids((v) => Math.min(MAX_KIDS, v + 1))}
      />

      <label className="block">
        <span className={fieldLabel}>What are you bringing?</span>
        <input
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          placeholder="Queso. Always queso."
          className={textInput}
        />
      </label>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-white/5 px-[18px] py-3.5">
        <span className="font-sans text-sm font-semibold text-gray-200">Total heads aboard</span>
        <span className="font-fraunces text-[28px] font-medium italic text-brand-yellow">
          {totalHeads}
        </span>
      </div>

      {serverError && <p className="text-sm text-brand-yellow">{serverError}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-lg bg-brand-yellow p-[18px] font-sans text-base font-bold uppercase tracking-[0.08em] text-gray-900 transition-colors hover:bg-yellow-400 disabled:opacity-60"
      >
        {submitting ? 'Locking It In…' : 'Lock It In'}
      </button>
    </div>
  );
}
