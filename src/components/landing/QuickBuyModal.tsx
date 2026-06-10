'use client';

/**
 * QUICK-BUY MODAL
 *
 * Opened from a landing-page package card via "BUY THIS NOW". Lets the
 * customer:
 *   1. Scale headcount with a slider (auto-rescales all item quantities
 *      proportional to the recipe's defaultPeople)
 *   2. Optionally fine-tune individual item quantities
 *   3. Enter contact + delivery info
 *   4. Submit → creates a real Draft Order via /api/v1/landing/quote
 *      (pay-now mode) and redirects to /invoice/<token> for Stripe
 *      checkout
 *
 * Goal: minimize fields. The customer should only fill in what's
 * absolutely required to pay and schedule delivery.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLeadCapture } from '@/lib/leads/client';
import { trackFunnelStep } from '@/lib/experiments/funnelTrack';
import type { LandingConfig, Package } from './types';
import type { UpsellProducts, UpsellProduct } from '@/lib/landing/getUpsellProducts';
import UpsellOverlay from './UpsellOverlay';
import EmbeddedCheckoutPanel from './EmbeddedCheckoutPanel';
import {
  getDeliveryWindows,
  isSunday,
  SUNDAY_CLOSED_NOTE,
  DEFAULT_DELIVERY_WINDOW,
} from '@/lib/landing/deliveryWindows';

type Props = {
  open: boolean;
  onClose: () => void;
  pkg: Package;
  config: LandingConfig;
  occasion: 'bachelor' | 'bachelorette' | 'corporate' | 'wedding';
  upsellProducts?: UpsellProducts;
};

type LineState = {
  handle: string;
  name: string;
  unitPrice: number;
  freebie: boolean;
  qty: number;
  drinksPerUnit: number;
  /** Set true when added via the pre-checkout upsell overlay — flows to API for tracking. */
  viaUpsell?: boolean;
};

// Slider ranges by occasion. Bachelor/bachelorette parties top out
// reasonably small; corporate + weddings scale much higher. The "Other"
// field below the slider lets a user type any number above these bounds.
const PEOPLE_RANGE: Record<
  'bachelor' | 'bachelorette' | 'corporate' | 'wedding',
  { min: number; max: number }
> = {
  bachelor: { min: 4, max: 30 },
  bachelorette: { min: 4, max: 30 },
  corporate: { min: 4, max: 100 },
  wedding: { min: 4, max: 100 },
};
const ABSOLUTE_MIN = 1;
const ABSOLUTE_MAX = 500;

export default function QuickBuyModal({
  open,
  onClose,
  pkg,
  config,
  occasion,
  upsellProducts,
}: Props) {
  const T = config.theme;
  const defaultPeople = pkg.defaultPeople ?? 10;

  // Lead capture — fires partial-submit / checkout-start events to the
  // /api/v1/landing/lead-event endpoint. Silent on failure.
  const lead = useLeadCapture({ widget: 'QUICK_BUY', page: `/${config.slug}` });
  const { min: MIN_PEOPLE, max: MAX_PEOPLE } = PEOPLE_RANGE[occasion];

  const [people, setPeople] = useState(defaultPeople);
  const [lines, setLines] = useState<LineState[]>([]);
  // Indices the customer has explicitly confirmed they want to drop. Lines
  // stay visible at qty=0 so an accidental "-" doesn't lose the item — they
  // have to click the inline "Remove?" affordance to actually delete it.
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Austin');
  const [zip, setZip] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState(DEFAULT_DELIVERY_WINDOW);
  const deliveryWindows = useMemo(() => getDeliveryWindows(), []);
  const sundaySelected = isSunday(deliveryDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When set, swap the form view for the embedded Stripe Checkout panel.
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  // URL we redirect to if Stripe.js can't load in-page (fallback to the
  // /invoice/<token> page which has its own redirect-mode Stripe checkout).
  const [invoiceFallbackUrl, setInvoiceFallbackUrl] = useState<string | null>(null);

  // Upsell overlay — pops once when customer scrolls to the contact form.
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellShown, setUpsellShown] = useState(false);
  const contactRef = useRef<HTMLDivElement | null>(null);

  // Watch the contact section. Fire upsell as soon as the user starts
  // scrolling toward it (sentinel ratio just barely intersects). We
  // intentionally do NOT consult sessionStorage anymore — Brian wants the
  // upsell to fire every time someone heads into the contact/payment
  // section, not just once per browser. `upsellShown` still scopes it to
  // once per modal open so it doesn't re-pop after the user closes it.
  useEffect(() => {
    if (!open || !upsellProducts || upsellShown) return;
    if (!contactRef.current) return;
    const el = contactRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setUpsellOpen(true);
          setUpsellShown(true);
          io.disconnect();
        }
      },
      // rootMargin pulls the trigger zone up by 25% of the modal body so
      // the overlay appears the moment the customer starts scrolling
      // toward contact info, not after they've already started typing.
      { rootMargin: '0px 0px -25% 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, upsellProducts, upsellShown]);

  // Reset upsell state when the modal re-opens with a different package.
  useEffect(() => {
    if (!open) {
      setUpsellOpen(false);
      setUpsellShown(false);
    }
  }, [open]);

  // Add an upsell product into the cart as a new line (or bump qty if it's
  // already in the package).
  const handleUpsellAdd = (p: UpsellProduct) => {
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.handle === p.handle);
      if (existing >= 0) {
        // Already in the cart — bump qty AND mark as upsell so the
        // attribution stays even if the package recipe also includes it.
        return prev.map((l, i) =>
          i === existing ? { ...l, qty: l.qty + 1, viaUpsell: true } : l,
        );
      }
      return [
        ...prev,
        {
          handle: p.handle,
          name: p.name,
          unitPrice: p.unitPrice,
          freebie: false,
          qty: 1,
          drinksPerUnit: 0,
          viaUpsell: true,
        },
      ];
    });
  };

  // Initialize / re-initialize line items whenever the package changes.
  useEffect(() => {
    if (!pkg.lineItems) return;
    setLines(
      pkg.lineItems.map((li) => ({
        handle: li.handle || '',
        name: li.name,
        unitPrice: li.unitPrice,
        freebie: !!li.freebie,
        qty: li.qty,
        drinksPerUnit: li.drinksPerUnit ?? 0,
      })),
    );
    setPeople(defaultPeople);
    setRemoved(new Set());
  }, [pkg, defaultPeople]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Rescale all line items proportional to the headcount delta.
  const handlePeopleChange = (newPeople: number) => {
    setPeople(newPeople);
    if (!pkg.lineItems) return;
    const scale = newPeople / defaultPeople;
    setLines(
      pkg.lineItems.map((li) => ({
        handle: li.handle || '',
        name: li.name,
        unitPrice: li.unitPrice,
        freebie: !!li.freebie,
        qty: Math.max(li.freebie ? li.qty : 1, Math.ceil(li.qty * scale)),
        drinksPerUnit: li.drinksPerUnit ?? 0,
      })),
    );
  };

  const setLineQty = (idx: number, qty: number) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, qty: Math.max(0, qty) } : l)));
  };

  const paidLines = lines.filter((l, i) => !l.freebie && l.qty > 0 && !removed.has(i));
  const freeLines = lines.filter((l, i) => l.freebie && l.qty > 0 && !removed.has(i));
  const subtotal = paidLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const freebiesValue = freeLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const perPerson = people > 0 ? subtotal / people : 0;

  const canSubmit =
    !submitting &&
    name &&
    email &&
    phone &&
    address &&
    zip &&
    deliveryDate &&
    !sundaySelected &&
    paidLines.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const items = [...paidLines, ...freeLines]
        .filter((l) => l.handle && l.qty > 0)
        .map((l) => ({
          handle: l.handle,
          qty: l.qty,
          viaUpsell: l.viaUpsell === true,
        }));
      if (items.length === 0) {
        setError('Pick at least one item.');
        setSubmitting(false);
        return;
      }
      // Fire lead-event before the network call so we capture the submit
      // intent even if the quote API trips.
      lead.onCheckoutStart(
        { email, phone, firstName: name },
        {
          package: pkg.name,
          occasion,
          groupSize: people,
          itemCount: items.length,
        },
        items,
      );
      // Canonical funnel step for the Experiments dashboard.
      trackFunnelStep({
        step: 'checkout_start',
        widget: 'QUICK_BUY',
        metadata: { package: pkg.name, itemCount: items.length },
      });
      const res = await fetch('/api/v1/landing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'pay-now',
          occasion,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          groupSize: people,
          deliveryDate,
          deliveryTime,
          deliveryAddress: address,
          deliveryCity: city,
          deliveryZip: zip,
          items,
          deliveryNotes: `Quick-Buy from ${pkg.name} (${occasion} landing page)`,
          upsellVariantId: upsellProducts?.variantId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not create your order. Try again.');
      }
      if (!json.token) {
        throw new Error('No invoice token returned.');
      }

      // Try embedded Stripe Checkout first — keeps the customer in the
      // popup. Only attempt if the publishable key is exposed at build time;
      // otherwise the iframe would render "Failed to load Stripe.js".
      const hasPublishableKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (hasPublishableKey) {
        try {
          const co = await fetch(`/api/v1/invoice/${json.token}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embedded: true }),
          });
          const cj = await co.json();
          if (co.ok && cj.success && cj.clientSecret) {
            setInvoiceFallbackUrl(json.invoiceUrl ?? null);
            setCheckoutSecret(cj.clientSecret);
            return;
          }
        } catch {
          /* fall through to redirect flow */
        }
      }

      // Fallback: redirect to the editable invoice page (where the
      // existing redirect-mode Stripe checkout lives). Customer still
      // completes their order — just on the dedicated invoice page
      // instead of inside this modal.
      if (json.invoiceUrl) {
        window.location.href = json.invoiceUrl;
        return;
      }
      throw new Error('Could not start checkout.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(10,15,25,0.78)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-4xl max-h-[96vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ background: T.cream }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 sm:px-7 py-4 flex items-center justify-between"
          style={{ background: T.navy, color: '#FFFFFF' }}
        >
          <div>
            <p
              className="text-[10px] font-bold tracking-[0.2em] mb-0.5"
              style={{ color: T.primary }}
            >
              QUICK BUY
            </p>
            <h2 className="font-heading text-xl sm:text-2xl font-bold leading-tight">
              {pkg.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full w-9 h-9 flex items-center justify-center text-2xl leading-none hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable body — swaps to embedded Stripe checkout once a session is created */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5">
          {checkoutSecret ? (
            <div>
              <div className="mb-3 text-center">
                <p
                  className="text-[10px] font-bold tracking-[0.22em] mb-1"
                  style={{ color: T.primary }}
                >
                  SECURE CHECKOUT · STRIPE
                </p>
                <h3
                  className="font-heading text-xl font-bold leading-tight"
                  style={{ color: T.navy }}
                >
                  Almost there — confirm your payment.
                </h3>
              </div>
              <EmbeddedCheckoutPanel
                clientSecret={checkoutSecret}
                fallbackUrl={invoiceFallbackUrl ?? undefined}
                onError={(err) => setError(err.message)}
              />
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setCheckoutSecret(null)}
                  className="text-xs underline text-gray-500 hover:text-gray-700"
                >
                  ← Edit order details
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Headcount block — slider + stepper, no drinks summary */}
          <div className="mb-4 rounded-xl p-4 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2 gap-3">
              <label
                htmlFor="qb-people"
                className="font-heading font-bold text-base flex-shrink-0"
                style={{ color: T.navy }}
              >
                Headcount
              </label>
              {/* Big people count with −/+ steppers for fine-tuning */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handlePeopleChange(Math.max(ABSOLUTE_MIN, people - 1))
                  }
                  className="w-8 h-8 rounded-full text-lg font-bold leading-none transition-colors hover:bg-gray-100"
                  style={{ color: T.navy, border: '1.5px solid #E5E7EB' }}
                  aria-label="Decrease headcount"
                >
                  −
                </button>
                <div className="text-right min-w-[3rem]">
                  <div
                    className="font-heading font-bold text-3xl leading-none"
                    style={{ color: T.blue }}
                  >
                    {people}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 -mt-0.5">
                    people
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handlePeopleChange(Math.min(ABSOLUTE_MAX, people + 1))
                  }
                  className="w-8 h-8 rounded-full text-lg font-bold leading-none transition-colors hover:bg-gray-100"
                  style={{ color: T.navy, border: '1.5px solid #E5E7EB' }}
                  aria-label="Increase headcount"
                >
                  +
                </button>
              </div>
            </div>
            <input
              id="qb-people"
              type="range"
              min={MIN_PEOPLE}
              max={MAX_PEOPLE}
              value={Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, people))}
              onChange={(e) => handlePeopleChange(parseInt(e.target.value, 10))}
              className="w-full"
              style={{ accentColor: T.primary }}
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>{MIN_PEOPLE}</span>
              <span>{MAX_PEOPLE}</span>
            </div>
          </div>

          {/* Line items with qty controls */}
          <div className="mb-5 rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div
              className="px-4 py-2 text-[10px] font-bold tracking-widest"
              style={{ background: '#F9FAFB', color: T.navy }}
            >
              IN YOUR PACKAGE
            </div>
            <ul className="divide-y divide-gray-100">
              {lines.map((l, i) => {
                if (removed.has(i)) return null;
                const showRemove = l.qty === 0;
                return (
                <li
                  key={`${l.handle}-${i}`}
                  // Two-row layout: title on top, controls + price below.
                  // Keeps long product names from wrapping into 4+ lines on
                  // mobile because the stepper + price column was squeezing
                  // the title flex-1 to ~35% of the row.
                  className="px-4 py-2.5 transition-opacity"
                  style={{ opacity: l.qty === 0 ? 0.55 : 1 }}
                >
                  <div
                    className="text-sm font-semibold leading-snug"
                    style={{ color: T.navy }}
                  >
                    {l.name}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 mb-2">
                    {l.freebie ? (
                      <span style={{ color: '#047857' }}>FREE · party bundle</span>
                    ) : (
                      <>
                        ${l.unitPrice.toFixed(2)} each
                        {l.drinksPerUnit > 0 && l.qty > 0 && (
                          <span> · ≈{l.drinksPerUnit * l.qty} drinks</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">

                  {/* Inline "Remove?" affordance — only appears when qty=0.
                      Sits flush against the stepper so the cursor barely has
                      to move; one click drops the line. */}
                  {showRemove && (
                    <button
                      type="button"
                      onClick={() =>
                        setRemoved((s) => {
                          const n = new Set(s);
                          n.add(i);
                          return n;
                        })
                      }
                      className="text-[11px] font-semibold underline whitespace-nowrap px-1 py-0.5 rounded transition-colors hover:bg-red-50"
                      style={{ color: '#B91C1C' }}
                      aria-label={`Remove ${l.name} from package`}
                    >
                      Remove?
                    </button>
                  )}

                  <div
                    className="flex items-center gap-1 rounded-full px-1.5 py-0.5"
                    style={{ background: l.freebie ? '#F3F4F6' : T.primary }}
                  >
                    <button
                      type="button"
                      onClick={() => setLineQty(i, l.qty - 1)}
                      disabled={l.qty === 0}
                      className="w-6 h-6 rounded-full bg-white/80 hover:bg-white text-base leading-none font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: l.freebie ? '#6B7280' : T.primaryText }}
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span
                      className="w-6 text-center font-bold text-sm"
                      style={{ color: l.freebie ? '#374151' : T.primaryText }}
                    >
                      {l.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLineQty(i, l.qty + 1)}
                      className="w-6 h-6 rounded-full bg-white/80 hover:bg-white text-base leading-none font-bold"
                      style={{ color: l.freebie ? '#6B7280' : T.primaryText }}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                  <div
                    className="w-16 text-right text-sm font-bold whitespace-nowrap"
                    style={{ color: l.freebie ? '#047857' : T.navy }}
                  >
                    {l.qty === 0
                      ? '—'
                      : l.freebie
                        ? 'FREE'
                        : `$${(l.qty * l.unitPrice).toFixed(2)}`}
                  </div>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>

          {/* In-flow summary (small) — full totals live in sticky bottom bar */}
          <div className="mb-5 text-xs text-gray-500 text-center">
            ${freebiesValue.toFixed(0)} in free supplies bundled in
          </div>

          {/* Contact + delivery form */}
          <form
            id="qb-form"
            onSubmit={handleSubmit}
            // Suppress the native HTML5 validation popover so it doesn't
            // float over the upsell overlay or other parts of the modal.
            // JS-side canSubmit + handleSubmit guards still enforce the rules.
            noValidate
            // This modal already calls useLeadCapture() for each field, so
            // tell the global FormCaptureWatcher to skip — prevents double-
            // capture of identical fields.
            data-lead-capture="manual"
            data-lead-widget="QUICK_BUY"
            className="space-y-2.5"
          >
            <div ref={contactRef} className="text-[10px] font-bold tracking-widest text-gray-500">
              CONTACT
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) =>
                  lead.onBlurField('name', e.target.value, { firstName: e.target.value })
                }
                placeholder="Full name"
                className="bg-white rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
              />
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={(e) =>
                  lead.onBlurField('phone', e.target.value, { phone: e.target.value })
                }
                placeholder="Phone"
                className="bg-white rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => {
                trackFunnelStep({ step: 'contact_filled', widget: 'QUICK_BUY' });
                lead.onBlurField('email', e.target.value, { email: e.target.value });
              }}
              placeholder="Email"
              className="w-full bg-white rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
            />

            <div className="text-[10px] font-bold tracking-widest text-gray-500 pt-2">DELIVERY</div>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
              className="w-full bg-white rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="bg-white rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
              />
              <input
                required
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP"
                className="bg-white rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                required
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className="bg-white rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
              />
              <select
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="bg-white rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
                disabled={sundaySelected}
              >
                {deliveryWindows.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
            {sundaySelected && (
              <div
                className="rounded-md p-2.5 text-[11px] leading-snug"
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FCD34D',
                }}
              >
                {SUNDAY_CLOSED_NOTE}
              </div>
            )}

            {error && (
              <div
                className="rounded-md p-3 text-sm"
                style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}
              >
                {error}
              </div>
            )}

            <p className="text-[11px] text-gray-500 text-center pt-1">
              Next step: secure Stripe checkout. No payment is captured until you confirm.
            </p>
          </form>
            </>
          )}
        </div>

        {/* STICKY BOTTOM BAR — hidden during embedded checkout (Stripe has its own Pay button) */}
        <div
          className="flex-shrink-0 flex items-stretch gap-3 px-4 sm:px-5 py-3"
          style={{
            background: T.navy,
            color: '#FFFFFF',
            borderTop: `3px solid ${T.primary}`,
            display: checkoutSecret ? 'none' : undefined,
          }}
        >
          {/* Back: stacked label-over-arrow on the far left */}
          <button
            type="button"
            onClick={onClose}
            className="flex flex-col items-center justify-center px-2 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: '#FFFFFF', opacity: 0.85 }}
            aria-label="Back to packages"
          >
            <span className="text-[10px] sm:text-xs font-semibold leading-none">Back</span>
            <span className="text-base leading-none mt-0.5">←</span>
          </button>

          {/* Centered totals — Per Person and Total at SAME font size */}
          <div className="flex-1 flex items-center justify-center gap-3 sm:gap-4 min-w-0">
            <div className="text-center">
              <div
                className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: T.primary, opacity: 0.9 }}
              >
                Per person
              </div>
              <div
                className="font-heading font-bold leading-none"
                style={{ color: T.primary, fontSize: 'clamp(1.25rem, 4vw, 1.6rem)' }}
              >
                ${perPerson.toFixed(2)}
              </div>
            </div>
            <div className="text-center pl-3 border-l border-white/15">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] opacity-75">
                Total
              </div>
              <div
                className="font-heading font-bold leading-none"
                style={{ color: '#FFFFFF', fontSize: 'clamp(1.25rem, 4vw, 1.6rem)' }}
              >
                ${subtotal.toFixed(2)}
              </div>
            </div>
          </div>

          <button
            type="submit"
            form="qb-form"
            disabled={!canSubmit}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md whitespace-nowrap flex-shrink-0"
            style={{ background: T.primary, color: T.primaryText }}
          >
            {submitting ? '…' : 'Pay now →'}
          </button>
        </div>

        {upsellProducts && (
          <UpsellOverlay
            open={upsellOpen}
            products={upsellProducts}
            theme={T}
            onAdd={handleUpsellAdd}
            onClose={() => setUpsellOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
