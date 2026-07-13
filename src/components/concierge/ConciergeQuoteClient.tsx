'use client';

/**
 * Interactive Concierge Quote editor.
 *
 * Customer can:
 *   - Toggle activities on/off
 *   - Adjust headcount per activity (defaults to top-level headcount)
 *   - Pick date + time per activity
 *   - Leave notes per activity
 *   - See live subtotal + 25% deposit + remaining balance
 *   - Accept & pay deposit via Stripe Checkout
 *
 * Persistence: every edit debounces a PATCH to
 *   /api/v1/concierge/quote/[leadId]
 * which writes back to Lead.metadata.quote so the state survives
 * refresh / email re-clicks / late-night revisits.
 *
 * Placeholder pricing per founder spec — real vendor rates get plugged
 * into ACTIVITY_CATALOG later without touching this component.
 */

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import Link from 'next/link';
import {
  ACTIVITY_CATALOG,
  DEPOSIT_PERCENT,
  computeQuoteTotals,
  type ActivityKey,
  type Quote,
  type QuoteItem,
} from '@/lib/concierge/quote';

// ─── Brand tokens (mirror ConciergeLandingClient) ────────────────
const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const RASPBERRY = '#7A1E4A';
const ROSE = '#E8B4CE';
const CREAM = '#FAF6EE';
const BLUSH = '#FFF4F8';

type Theme = {
  primary: string;
  accent: string;
  soft: string;
  onAccent: string;
};

const THEMES: Record<'bachelor' | 'bachelorette', Theme> = {
  bachelor: { primary: NAVY, accent: GOLD, soft: CREAM, onAccent: NAVY },
  bachelorette: { primary: RASPBERRY, accent: ROSE, soft: BLUSH, onAccent: '#3F0F27' },
};

type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type Props = {
  leadId: string;
  customer: Customer;
  initialQuote: Quote;
};

const TIME_SLOTS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
];

function fmt$(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export default function ConciergeQuoteClient({
  leadId,
  customer,
  initialQuote,
}: Props): ReactElement {
  const theme = THEMES[initialQuote.variant];
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // ─── Autosave (debounced) ─────────────────────────────────────
  const savedOnceRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Skip the very first render — the quote came from the server.
    if (!savedOnceRef.current) {
      savedOnceRef.current = true;
      return;
    }
    setSaveState('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/concierge/quote/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote }),
        });
        if (!res.ok) {
          setSaveState('error');
          return;
        }
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1200);
      } catch (err) {
        console.error('[concierge quote] autosave failed', err);
        setSaveState('error');
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [quote, leadId]);

  const totals = useMemo(() => computeQuoteTotals(quote), [quote]);
  const enabledCount = quote.items.filter((it) => it.enabled).length;

  function updateItem(key: ActivityKey, patch: Partial<QuoteItem>) {
    setQuote((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.activityKey === key ? { ...it, ...patch } : it,
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateTopLevel(patch: Partial<Pick<Quote, 'headcount' | 'arrivalDate' | 'departureDate'>>) {
    setQuote((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  }

  async function payDeposit() {
    if (checkingOut) return;
    if (totals.subtotal <= 0) {
      setCheckoutError('Turn on at least one activity before paying the deposit.');
      return;
    }
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      const res = await fetch(`/api/v1/concierge/quote/${leadId}/checkout`, {
        method: 'POST',
      });
      const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) {
        setCheckoutError(json.error || 'Could not start checkout — try again.');
        setCheckingOut(false);
        return;
      }
      window.location.href = json.url;
    } catch (err) {
      console.error('[concierge quote] checkout failed', err);
      setCheckoutError('Network blip — try again.');
      setCheckingOut(false);
    }
  }

  const isPaid = quote.status === 'deposit-paid';

  return (
    <main
      className="min-h-screen"
      style={{ background: theme.soft, color: theme.primary }}
    >
      {/* Header */}
      <header
        className="text-white"
        style={{
          background: theme.primary,
          borderBottom: `3px solid ${theme.accent}`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div
            className="text-[10px] font-bold tracking-[0.24em] mb-1"
            style={{ color: theme.accent }}
          >
            PREMIER CONCIERGE · AUSTIN
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            {customer.firstName
              ? `${customer.firstName}'s`
              : 'Your'} Austin{' '}
            {quote.variant} weekend quote
          </h1>
          <p className="mt-2 text-sm opacity-85">
            Tweak activities, headcount, and dates below. Your total updates
            live. Pay the 25% deposit to lock in your vendors.
          </p>
        </div>
      </header>

      {isPaid && <DepositPaidBanner />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-32 lg:pb-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ── Left column — trip + activities ─────────────────── */}
        <section>
          <TripCard
            theme={theme}
            headcount={quote.headcount}
            arrivalDate={quote.arrivalDate}
            departureDate={quote.departureDate}
            onUpdate={updateTopLevel}
          />

          <div className="mt-6 mb-3 flex items-baseline justify-between">
            <h2
              className="font-heading text-xl font-bold tracking-tight"
              style={{ color: theme.primary }}
            >
              Activities & services
            </h2>
            <div className="text-xs text-gray-500">
              {enabledCount} of {quote.items.length} on
            </div>
          </div>

          <div className="space-y-3">
            {quote.items.map((it) => (
              <ActivityCard
                key={it.activityKey}
                theme={theme}
                item={it}
                onUpdate={(patch) => updateItem(it.activityKey, patch)}
                onToggle={() =>
                  updateItem(it.activityKey, { enabled: !it.enabled })
                }
              />
            ))}
          </div>

          <div className="mt-6 rounded-lg p-4 text-sm bg-white" style={{ border: `1.5px solid ${theme.accent}` }}>
            <div className="text-[10px] font-bold tracking-widest mb-1" style={{ color: theme.primary }}>
              💧 RECOMMENDED DRINKS
            </div>
            <p className="text-gray-700 text-sm">
              Drink delivery is priced per person above ({fmt$(ACTIVITY_CATALOG['drink-delivery'].pricePerPerson)}/head).
              After you pay the deposit, your concierge will send a follow-up with the recommended drinks list from
              our engine — quantities auto-scale to your final headcount + party type. You can edit that list
              before delivery.
            </p>
          </div>

          {saveState !== 'idle' && (
            <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
              {saveState === 'saving' && '💾 Saving…'}
              {saveState === 'saved' && (
                <span style={{ color: '#0F8141' }}>✓ Saved</span>
              )}
              {saveState === 'error' && (
                <span style={{ color: '#C0392B' }}>⚠ Save failed — retry on next edit</span>
              )}
            </div>
          )}
        </section>

        {/* ── Right column — totals + deposit ─────────────────── */}
        <aside>
          <TotalsCard
            theme={theme}
            subtotal={totals.subtotal}
            depositAmount={totals.depositAmount}
            remaining={totals.remaining}
            isPaid={isPaid}
            checkingOut={checkingOut}
            checkoutError={checkoutError}
            onPay={payDeposit}
          />

          <ContactCard theme={theme} customer={customer} />
        </aside>
      </div>

      {/* Mobile sticky deposit bar */}
      {!isPaid && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 border-t-2 lg:hidden"
          style={{
            background: '#FFFFFF',
            borderColor: theme.primary,
            boxShadow: '0 -4px 18px rgba(10,15,25,0.15)',
          }}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-gray-500">
                DEPOSIT DUE TODAY
              </div>
              <div className="text-lg font-bold" style={{ color: theme.primary }}>
                {fmt$(totals.depositAmount)}
              </div>
            </div>
            <button
              type="button"
              onClick={payDeposit}
              disabled={checkingOut || totals.subtotal <= 0}
              className="rounded-lg px-5 py-3 text-sm font-heading font-bold tracking-[0.10em] transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: theme.accent,
                color: theme.onAccent,
                border: `2px solid ${theme.primary}`,
                boxShadow: `0 3px 0 ${theme.primary}`,
              }}
            >
              {checkingOut ? 'STARTING…' : 'PAY DEPOSIT →'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function TripCard({
  theme,
  headcount,
  arrivalDate,
  departureDate,
  onUpdate,
}: {
  theme: Theme;
  headcount: number;
  arrivalDate: string;
  departureDate: string;
  onUpdate: (patch: Partial<Pick<Quote, 'headcount' | 'arrivalDate' | 'departureDate'>>) => void;
}) {
  return (
    <div
      className="rounded-lg p-4 bg-white"
      style={{ border: `1.5px solid ${theme.primary}` }}
    >
      <div
        className="text-[10px] font-bold tracking-widest mb-2"
        style={{ color: theme.primary }}
      >
        TRIP DETAILS
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Default headcount">
          <input
            type="number"
            min={1}
            max={500}
            value={headcount}
            onChange={(e) => {
              const n = Math.max(1, Math.min(500, Number(e.target.value) || 1));
              onUpdate({ headcount: n });
            }}
            className="w-full rounded-md border-2 border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-current"
            style={{ color: theme.primary }}
          />
        </Field>
        <Field label="Arrival">
          <input
            type="date"
            value={arrivalDate}
            onChange={(e) => onUpdate({ arrivalDate: e.target.value })}
            className="w-full rounded-md border-2 border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-current"
            style={{ color: theme.primary }}
          />
        </Field>
        <Field label="Departure">
          <input
            type="date"
            value={departureDate}
            onChange={(e) => onUpdate({ departureDate: e.target.value })}
            className="w-full rounded-md border-2 border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-current"
            style={{ color: theme.primary }}
          />
        </Field>
      </div>
    </div>
  );
}

function ActivityCard({
  theme,
  item,
  onUpdate,
  onToggle,
}: {
  theme: Theme;
  item: QuoteItem;
  onUpdate: (patch: Partial<QuoteItem>) => void;
  onToggle: () => void;
}) {
  const entry = ACTIVITY_CATALOG[item.activityKey];
  if (!entry) return null;
  const lineTotal = item.enabled ? entry.pricePerPerson * item.headcount : 0;
  const on = item.enabled;

  return (
    <div
      className="rounded-lg overflow-hidden bg-white transition-all"
      style={{
        border: `${on ? 2 : 1.5}px solid ${on ? theme.primary : '#E5E7EB'}`,
        boxShadow: on ? `0 3px 0 ${theme.primary}18` : 'none',
        opacity: on ? 1 : 0.72,
      }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center"
          style={{
            background: on ? theme.accent : '#FFFFFF',
            border: `2px solid ${on ? theme.accent : '#D1D5DB'}`,
          }}
          aria-hidden
        >
          {on && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.onAccent}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div className="text-2xl flex-shrink-0" aria-hidden>
          {entry.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-base leading-tight truncate"
            style={{ color: theme.primary }}
          >
            {entry.label}
          </div>
          <div className="text-xs text-gray-600 truncate">{entry.blurb}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className="font-mono text-sm font-bold"
            style={{ color: theme.primary }}
          >
            {fmt$(lineTotal)}
          </div>
          <div className="text-[10px] text-gray-500">
            {fmt$(entry.pricePerPerson)}/pp · {entry.durationHours}h
          </div>
        </div>
      </button>

      {/* Details editor (only visible when enabled) */}
      {on && (
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-4 pt-1"
          style={{ background: '#FAFAFA', borderTop: '1px solid #F0F0F0' }}
        >
          <Field label="People">
            <input
              type="number"
              min={1}
              max={500}
              value={item.headcount}
              onChange={(e) =>
                onUpdate({
                  headcount: Math.max(1, Math.min(500, Number(e.target.value) || 1)),
                })
              }
              className="w-full rounded-md border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-current"
              style={{ color: theme.primary }}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={item.scheduledDate}
              onChange={(e) => onUpdate({ scheduledDate: e.target.value })}
              className="w-full rounded-md border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-current"
              style={{ color: theme.primary }}
            />
          </Field>
          <Field label="Time">
            <select
              value={item.scheduledTime}
              onChange={(e) => onUpdate({ scheduledTime: e.target.value })}
              className="w-full rounded-md border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-current"
              style={{ color: theme.primary }}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-3">
            <Field label="Notes (optional)">
              <input
                type="text"
                value={item.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="e.g. best boat for 12 guys, avoid country music"
                className="w-full rounded-md border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-current"
                style={{ color: theme.primary }}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function TotalsCard({
  theme,
  subtotal,
  depositAmount,
  remaining,
  isPaid,
  checkingOut,
  checkoutError,
  onPay,
}: {
  theme: Theme;
  subtotal: number;
  depositAmount: number;
  remaining: number;
  isPaid: boolean;
  checkingOut: boolean;
  checkoutError: string | null;
  onPay: () => void;
}) {
  return (
    <div
      className="rounded-lg p-5 sticky top-4"
      style={{
        background: theme.primary,
        color: '#FFFFFF',
        border: `2px solid ${theme.accent}`,
      }}
    >
      <div
        className="text-[10px] font-bold tracking-[0.24em] mb-3"
        style={{ color: theme.accent }}
      >
        {isPaid ? 'DEPOSIT PAID' : 'YOUR TOTAL'}
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Subtotal" value={fmt$(subtotal)} />
        <Row
          label={`Deposit today (${Math.round(DEPOSIT_PERCENT * 100)}%)`}
          value={fmt$(depositAmount)}
          bold
          accent={theme.accent}
        />
        <Row
          label="Remaining (due 7d before)"
          value={fmt$(remaining)}
          small
        />
      </div>

      {!isPaid && (
        <>
          <button
            type="button"
            onClick={onPay}
            disabled={checkingOut || subtotal <= 0}
            className="w-full mt-5 rounded-lg py-4 text-base font-heading font-bold tracking-[0.10em] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed hidden lg:block"
            style={{
              background: theme.accent,
              color: theme.onAccent,
              border: `2px solid ${theme.accent}`,
              boxShadow: `0 3px 0 rgba(0,0,0,0.35)`,
            }}
          >
            {checkingOut ? 'STARTING CHECKOUT…' : 'ACCEPT & PAY DEPOSIT →'}
          </button>
          <p className="text-xs opacity-70 mt-3">
            Secured by Stripe. Deposit locks in your vendors. Remaining balance
            is due 7 days before the first activity.
          </p>
          {checkoutError && (
            <div
              className="mt-3 rounded p-2 text-xs"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#FFCFCF' }}
            >
              {checkoutError}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContactCard({ theme, customer }: { theme: Theme; customer: Customer }) {
  return (
    <div
      className="mt-4 rounded-lg p-4 bg-white text-sm"
      style={{ border: `1.5px solid #E5E7EB` }}
    >
      <div
        className="text-[10px] font-bold tracking-widest mb-2"
        style={{ color: theme.primary }}
      >
        YOU
      </div>
      <div style={{ color: theme.primary }}>
        {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Concierge lead'}
      </div>
      <div className="text-xs text-gray-600 truncate">{customer.email}</div>
      {customer.phone && (
        <div className="text-xs text-gray-600">{customer.phone}</div>
      )}
      <div className="text-[10px] text-gray-500 mt-3">
        Wrong info?{' '}
        <a
          href="mailto:concierge@partyondelivery.com"
          className="underline"
          style={{ color: theme.primary }}
        >
          Reply to your quote email
        </a>{' '}
        and we&rsquo;ll update it.
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-widest text-gray-500 mb-1">
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  small,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  small?: boolean;
  accent?: string;
}) {
  return (
    <div
      className={`flex justify-between items-baseline ${small ? 'text-xs opacity-80' : 'text-sm'}`}
      style={accent ? { color: accent } : undefined}
    >
      <span className={bold ? 'font-bold' : ''}>{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}

function DepositPaidBanner() {
  return (
    <div
      className="text-white text-center py-3 px-4 text-sm font-bold"
      style={{ background: '#0F8141' }}
    >
      🎉 Deposit paid — your concierge will confirm every vendor within 24
      hours. Check your email for the receipt.
      <span className="ml-2 opacity-90">
        <Link href="/" className="underline">
          Back to POD
        </Link>
      </span>
    </div>
  );
}
