'use client';

// SHARED package builder modal — used by ALL landing pages.
// Accepts a `config` prop (LandingConfig) so styling, copy, and steps
// can be customized per event type without forking the component.

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useLeadCapture } from '@/lib/leads/client';
import { fireLeadConversionAndFlush } from '@/lib/leads/fireLeadConversion';
import { getAttribution } from '@/lib/analytics/attribution';
import { trackContactClick } from '@/lib/analytics/ga4-events';
import { trackFunnelStep } from '@/lib/experiments/funnelTrack';
import type { FunnelStep } from '@/lib/experiments/funnelSteps';
import { isLastMinuteDate } from '@/lib/lastMinute/dates';
import { useDeliveryWindow } from '@/lib/deliveryWindow/window';
import type {
  LandingConfig,
  BuilderProduct,
  Selection,
  BuilderCategory,
  Catalog,
} from './types';
import type { UpsellProducts, UpsellProduct } from '@/lib/landing/getUpsellProducts';
import UpsellOverlay from './UpsellOverlay';
import EmbeddedCheckoutPanel from './EmbeddedCheckoutPanel';
import {
  BoltIcon,
  CheckCircleIcon,
  UsersIcon,
  CalendarIcon,
  BoxIcon,
} from './sections/icons';
import {
  getDeliveryWindows,
  isSunday,
  SUNDAY_CLOSED_NOTE,
  DEFAULT_DELIVERY_WINDOW,
} from '@/lib/landing/deliveryWindows';

type Props = {
  open: boolean;
  onClose: () => void;
  config: LandingConfig;
  /**
   * Already-resolved catalog — either the curated catalog or the
   * last-minute catalog depending on `lastMinuteMode` controlled by
   * the parent template.
   */
  catalog: Catalog;
  /** True when the parent has a last-minute catalog pre-fetched. */
  hasLastMinuteCatalog?: boolean;
  /** Parent's state — used to drive the banner + product pool. */
  lastMinuteMode?: boolean;
  /** Called when the chosen delivery date crosses the today/tomorrow
   *  threshold so the parent can swap the catalog. */
  onLastMinuteModeChange?: (next: boolean) => void;
  upsellProducts?: UpsellProducts;
};

// Smart encode: if the DB already stored a URL-encoded path (e.g. "%20"
// for spaces), don't re-encode — that double-encodes ("%2520") and Next/Image
// returns 400. If it's a raw URL with literal spaces, encode it once.
const encodeImg = (src?: string): string | undefined => {
  if (!src) return undefined;
  return /%[0-9A-Fa-f]{2}/.test(src) ? src : encodeURI(src);
};

export default function PackageBuilderModal({
  open,
  onClose,
  config,
  catalog,
  hasLastMinuteCatalog,
  lastMinuteMode,
  onLastMinuteModeChange,
  upsellProducts,
}: Props) {
  const T = config.theme;
  const M = config.modal;
  const STEPS = M.steps;
  const { stepOneCategories, stepTwoCategories, stepThreeCategories, productById } = catalog;

  const [stepIndex, setStepIndex] = useState(0);
  const [people, setPeople] = useState(M.defaultPeople);
  // Pre-fill the date from the entrance-gate choice. If the visitor
  // told us "Today or Tomorrow" up-front, default to today; otherwise
  // leave the picker empty (user can still type or pick a date).
  const { isLastMinute: gateIsLastMinute } = useDeliveryWindow();
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(() =>
    gateIsLastMinute ? new Date() : null,
  );
  const [selection, setSelection] = useState<Selection>({});
  const [extraSelection, setExtraSelection] = useState<string[]>([]);

  // Whenever the customer picks a date OR the entrance-gate choice
  // flips, decide whether to engage last-minute mode. The picked date
  // wins; if it's null, we fall back to the gate's signal so the
  // catalog narrows immediately even before they hit the basics step.
  useEffect(() => {
    if (!onLastMinuteModeChange || !hasLastMinuteCatalog) return;
    const fromDate = isLastMinuteDate(deliveryDate);
    onLastMinuteModeChange(fromDate || (deliveryDate === null && gateIsLastMinute));
  }, [deliveryDate, gateIsLastMinute, hasLastMinuteCatalog, onLastMinuteModeChange]);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Austin');
  const [deliveryZip, setDeliveryZip] = useState('');
  const [deliveryTime, setDeliveryTime] = useState(DEFAULT_DELIVERY_WINDOW);
  const [submitMode, setSubmitMode] = useState<'quote' | 'checkout'>('quote');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Age compliance — required checkbox on the review step. The landing
  // pages skip the site-wide entrance gate (see AgeVerification.tsx), so
  // this is where 21+ gets confirmed. Never pre-checked.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const handleAgeConfirmedChange = (checked: boolean) => {
    setAgeConfirmed(checked);
    if (checked) {
      try {
        // Same flag the site-wide gate reads — checking the box here means
        // the rest of the site won't re-prompt on this device.
        localStorage.setItem('age_verified', 'true');
      } catch {
        /* localStorage disabled — checkbox state alone still gates submit */
      }
    }
  };
  // Embedded Stripe Checkout session client_secret. When set, modal body
  // swaps to the inline checkout panel — no navigation.
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  // Used as a hard fallback if Stripe.js can't load client-side.
  // Legacy state — kept null now that submit redirects to the dashboard
  // instead of the invoice/embedded-checkout flow. The JSX branch that
  // reads it is unreachable but left in place to keep this diff focused.
  const [invoiceFallbackUrl] = useState<string | null>(null);

  // Upsell overlay — fires once when the user reaches the review step.
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellShown, setUpsellShown] = useState(false);
  // ProductIds that were added via the upsell overlay (used to tag the API
  // submission so we can track upsell revenue separately).
  const [upsellAddedIds, setUpsellAddedIds] = useState<Set<string>>(new Set());

  // Lead capture — fires partial-submit beacons on contact-field debounce
  // + step completions + final submit. Silent on failure.
  const lead = useLeadCapture({ widget: 'PACKAGE_BUILDER', page: `/${config.slug}` });
  const lastCaptureRef = useRef<{ name: string; email: string; phone: string }>({
    name: '',
    email: '',
    phone: '',
  });
  // Debounced partial-submit: fire ~750ms after the customer stops typing
  // in any of the three contact fields, so each field's value is recorded
  // exactly once even if they tab around.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const prev = lastCaptureRef.current;
      const identify = {
        firstName: contactName || undefined,
        email: contactEmail || undefined,
        phone: contactPhone || undefined,
      };
      if (contactName && contactName !== prev.name) {
        lead.onBlurField('name', contactName, identify);
      }
      if (contactEmail && contactEmail !== prev.email) {
        lead.onBlurField('email', contactEmail, identify);
      }
      if (contactPhone && contactPhone !== prev.phone) {
        lead.onBlurField('phone', contactPhone, identify);
      }
      lastCaptureRef.current = {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
      };
    }, 750);
    return () => clearTimeout(t);
  }, [contactName, contactEmail, contactPhone, open, lead]);
  // Fire STEP_COMPLETE every time we advance steps so we can see drop-off.
  useEffect(() => {
    if (!open) return;
    const stepKey = STEPS[stepIndex]?.key;
    lead.onStepComplete(`step_${stepIndex}_view`, {
      stepKey,
      people,
      itemCount: Object.values(selection).reduce((s, n) => s + (n || 0), 0),
    });
    // Also fire the canonical funnel step for the Experiments dashboard.
    // Map modal step keys → FunnelStep names.
    const funnelMap: Record<string, FunnelStep> = {
      basics: 'builder_step_basics',
      beer: 'builder_step_beer',
      liquor: 'builder_step_liquor',
      mixers: 'builder_step_mixers',
      review: 'builder_step_review',
    };
    const funnelStep = stepKey ? funnelMap[stepKey] : undefined;
    if (funnelStep) {
      trackFunnelStep({
        step: funnelStep,
        widget: 'PACKAGE_BUILDER',
        metadata: { stepIndex, people },
      });
    }
    // We only care about stepIndex changing; ignore lead/STEPS in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, open]);

  // Fire contact_filled funnel step once when at least one of name/email/phone
  // has a value. Deduped via trackFunnelStep's session-scoped set.
  useEffect(() => {
    if (!open) return;
    if (contactName || contactEmail || contactPhone) {
      trackFunnelStep({
        step: 'contact_filled',
        widget: 'PACKAGE_BUILDER',
      });
    }
  }, [open, contactName, contactEmail, contactPhone]);

  // Trigger upsell as soon as the user scrolls the review step toward the
  // contact/payment form. We attach an IntersectionObserver to the contact-
  // section sentinel further down (see contactSentinelRef). Once it's seen,
  // pop the upsell overlay immediately. We INTENTIONALLY don't read or
  // write the previous sessionStorage 'upsell-shown' key — Brian wants this
  // to fire every time a customer goes through the flow, not just once.
  const contactSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open || stepIndex !== 4 || upsellShown || !upsellProducts) return;
    const el = contactSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setUpsellOpen(true);
          setUpsellShown(true);
          io.disconnect();
        }
      },
      // Fire slightly BEFORE the sentinel hits the viewport so it pops as
      // the user is starting to scroll toward contact info.
      { root: null, rootMargin: '0px 0px -25% 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, stepIndex, upsellShown, upsellProducts]);

  useEffect(() => {
    if (!open) {
      setUpsellOpen(false);
      setUpsellShown(false);
    }
  }, [open]);

  // Adding an upsell product = bump it in the selection map (using the
  // product's BuilderProduct id key the rest of the modal already speaks).
  // We synthesize a placeholder id matching the convention used for items
  // already in the catalog so quantity / pricing flows through.
  const handleUpsellAdd = (p: UpsellProduct) => {
    // Find the matching BuilderProduct in the catalog (by sku=handle).
    const all = [
      ...stepOneCategories,
      ...stepTwoCategories,
      ...stepThreeCategories,
    ].flatMap((c) => [...c.products, ...(c.extras ?? [])]);
    const match = all.find((bp) => bp.sku === p.handle);
    if (match) {
      setSelection((s) => ({ ...s, [match.id]: (s[match.id] ?? 0) + 1 }));
      setUpsellAddedIds((s) => new Set(s).add(match.id));
    } else {
      // Not in any step's catalog — graft a synthetic entry so it counts
      // toward the total. The submit handler maps lineItems back to the
      // server endpoint via product.sku, so handle is enough.
      const synthId = `upsell-${p.handle}`;
      productById[synthId] = {
        id: synthId,
        name: p.name,
        detail: p.detail,
        price: p.unitPrice,
        emoji: '🥂',
        accent: 'bg-amber-400',
        image: p.image,
        sku: p.handle,
      };
      setSelection((s) => ({ ...s, [synthId]: (s[synthId] ?? 0) + 1 }));
      setUpsellAddedIds((s) => new Set(s).add(synthId));
    }
  };

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const setQty = (id: string, qty: number) =>
    setSelection((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  const incQty = (id: string) => setQty(id, (selection[id] ?? 0) + 1);
  const decQty = (id: string) => setQty(id, Math.max(0, (selection[id] ?? 0) - 1));

  const lineItems = useMemo(
    () =>
      Object.entries(selection)
        .map(([id, qty]) => {
          const p = productById[id];
          if (!p) return null;
          return { product: p, qty, lineTotal: p.price * qty };
        })
        .filter(Boolean) as { product: BuilderProduct; qty: number; lineTotal: number }[],
    [selection],
  );

  const total = lineItems.reduce((s, li) => s + li.lineTotal, 0);
  const perPerson = people > 0 ? total / people : 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  const next = () => setStepIndex((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStepIndex((s) => Math.max(0, s - 1));

  const formatDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  // Occasion is derived from the landing-page slug, e.g.
  // "austin-bachelor-party-delivery" → "bachelor".
  const occasion = useMemo(() => {
    const slug = config.slug || '';
    if (slug.includes('bachelorette')) return 'bachelorette';
    if (slug.includes('bachelor')) return 'bachelor';
    if (slug.includes('corporate')) return 'corporate';
    if (slug.includes('wedding')) return 'wedding';
    return 'bachelor';
  }, [config.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);

    // JS-side required-field validation (replaces native HTML5 popups,
    // which we suppress with noValidate on the form).
    if (!contactName || !contactEmail || !contactPhone) {
      setSubmitError('Please add your name, email, and phone so we can confirm your order.');
      setSubmitting(false);
      return;
    }

    // Age compliance — the landing pages skip the entrance gate, so the
    // 21+ confirmation is required here before anything is created.
    if (!ageConfirmed) {
      setSubmitError('Please confirm everyone receiving this delivery is 21 or older.');
      setSubmitting(false);
      return;
    }

    // Address fields are optional from this surface — the dashboard
    // collects delivery address on its own checkout step.

    // Sundays are closed. Block submit and recommend Saturday evening.
    if (deliveryDate && isSunday(deliveryDate.toISOString().slice(0, 10))) {
      setSubmitError(SUNDAY_CLOSED_NOTE);
      setSubmitting(false);
      return;
    }

    const items = lineItems
      .map((li) => ({
        // BuilderProduct.sku is the underlying Postgres product handle.
        handle: li.product.sku || '',
        qty: li.qty,
        viaUpsell: upsellAddedIds.has(li.product.id),
      }))
      .filter((i) => i.handle);

    if (items.length === 0) {
      setSubmitError('No items in your cart — pick a few products first.');
      setSubmitting(false);
      return;
    }

    // Fire lead-capture submit BEFORE the network call so we never lose
    // a partial -> submitted state transition due to API errors.
    const leadIdentify = {
      firstName: contactName,
      email: contactEmail,
      phone: contactPhone,
    };
    const leadMeta = {
      occasion,
      groupSize: people,
      mode: submitMode,
      itemCount: items.length,
    };
    if (submitMode === 'checkout') {
      lead.onCheckoutStart(leadIdentify, leadMeta, items);
    } else {
      lead.onFormSubmit(leadIdentify, leadMeta, items);
    }
    // Canonical funnel step for the Experiments dashboard.
    trackFunnelStep({
      step: 'checkout_start',
      widget: 'PACKAGE_BUILDER',
      metadata: { mode: submitMode, itemCount: items.length },
    });

    try {
      // Map the landing-page `occasion` ('bachelor' / 'bachelorette' /
      // 'corporate' / 'wedding') to the quote-start endpoint's partyType
      // enum. The four occasions match 1:1; the endpoint accepts the
      // others too if we ever wire up a non-landing-page entry.
      const partyType = occasion as
        | 'bachelor' | 'bachelorette' | 'corporate' | 'wedding';
      // Split full name on first space — most customers enter "First Last".
      const [firstName, ...rest] = contactName.trim().split(/\s+/);
      const lastName = rest.join(' ') || null;

      const deliveryDateIso = deliveryDate
        ? deliveryDate.toISOString().slice(0, 10)
        : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const res = await fetch('/api/v1/quote/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: contactEmail,
          phone: contactPhone,
          partyType,
          headcount: people,
          deliveryDate: deliveryDateIso,
          // Items selected in the modal — already in the
          // [{ handle, qty }] shape the endpoint speaks.
          recommendedItems: items.map((it) => ({
            handle: it.handle,
            qty: it.qty,
          })),
          source: 'package-builder',
          // First-touch UTM + ad click ids (gclid etc.) so the Lead row
          // can be joined back to the ad click that produced it.
          attribution: getAttribution(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to create your order. Try again.');
      }

      // Fire the lead conversion (Meta + GA4 generate_lead + Ads) and wait
      // (≤400ms) for gtag to flush — the hard redirect below would otherwise
      // race the hit out of existence (gtag loads lazyOnload). Tagged with
      // this page's occasion so each campaign optimizes toward its own
      // leads; value is the order subtotal in USD for value-based bidding.
      await fireLeadConversionAndFlush({
        occasion,
        placement: 'package-builder',
        value: total,
      });

      // Stash host participant id so the dashboard recognizes the
      // visitor as the order owner.
      if (json.hostParticipantId && json.shareCode) {
        try {
          localStorage.setItem(
            `dashboard_participant_${json.shareCode}`,
            json.hostParticipantId,
          );
        } catch {
          /* localStorage disabled — dashboard will still work, the
             user just won't be auto-recognized on this device */
        }
      }

      // Hard redirect to the dashboard — the cart is already
      // populated server-side, and the welcome email with this URL is
      // already on its way.
      window.location.href = json.redirectTo;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStepIndex(0);
    setSelection({});
    setSubmitted(false);
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setDeliveryDate(null);
    setPeople(M.defaultPeople);
    setExtraSelection([]);
    setAgeConfirmed(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-3 sm:px-6 py-4 sm:py-8"
      role="dialog"
      aria-modal="true"
      data-builder-version="shared-v1"
    >
      <button
        aria-label="Close package builder"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background: `${T.navy}DD`,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        tabIndex={-1}
      />

      <div
        className="relative w-full max-w-4xl flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          maxHeight: '96vh',
          minHeight: 'min(540px, 96vh)',
          background: T.cream,
          border: `1px solid ${T.primary}33`,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-105"
          style={{ background: `${T.navy}D9`, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
        >
          ×
        </button>

        <div
          className="px-5 sm:px-7 pt-5 pb-4 flex-shrink-0 text-white"
          style={{ background: T.navy }}
        >
          <div className="flex items-center gap-3 pr-12">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center font-heading font-bold text-sm flex-shrink-0"
              style={{ background: T.primary, color: T.primaryText }}
            >
              POD
            </div>
            <div className="min-w-0">
              <div className="font-heading font-bold text-lg leading-tight">
                {M.title}
              </div>
              <div className="text-xs opacity-80">
                Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 mt-4">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{
                  background: i <= stepIndex ? T.primary : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </div>
          {/* Last-minute mode banner — pops the moment the customer picks
              today/tomorrow as their delivery date. Tells them the menu
              narrowed + why. */}
          {lastMinuteMode && hasLastMinuteCatalog && (
            <div
              className="mt-3 rounded-md px-3 py-2 text-xs font-bold leading-snug flex items-start gap-1.5"
              style={{ background: T.primary, color: T.primaryText }}
            >
              <BoltIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                <span className="tracking-wider">LAST-MINUTE MENU ACTIVE</span> —
                showing only deep-stock items we can deliver in 24h. Pick a date
                further out to see the full catalog.
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5">
          {submitted ? (
            <SuccessPanel
              mode={submitMode}
              phone={config.phoneDisplay}
              occasion={occasion}
              theme={T}
              modal={M}
              onReset={reset}
              onClose={onClose}
            />
          ) : checkoutSecret ? (
            <div>
              <div className="mb-3 text-center">
                <p
                  className="text-xs font-bold tracking-[0.22em] mb-1"
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
                onError={(err) => setSubmitError(err.message)}
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
              {stepIndex === 0 && (
                <BasicsStep
                  people={people}
                  setPeople={setPeople}
                  deliveryDate={deliveryDate}
                  setDeliveryDate={setDeliveryDate}
                  modal={M}
                  theme={T}
                  extraSelection={extraSelection}
                  setExtraSelection={setExtraSelection}
                />
              )}
              {stepIndex === 1 && (
                <ProductGridStep
                  title={M.steps[1].label}
                  blurb={M.beerStepBlurb}
                  categories={stepOneCategories}
                  selection={selection}
                  onInc={incQty}
                  onDec={decQty}
                  theme={T}
                />
              )}
              {stepIndex === 2 && (
                <ProductGridStep
                  title={M.steps[2].label}
                  blurb={M.liquorStepBlurb}
                  categories={stepTwoCategories}
                  selection={selection}
                  onInc={incQty}
                  onDec={decQty}
                  theme={T}
                  tabbed
                />
              )}
              {stepIndex === 3 && (
                <ProductGridStep
                  title={M.steps[3].label}
                  blurb={M.mixersStepBlurb}
                  categories={stepThreeCategories}
                  selection={selection}
                  onInc={incQty}
                  onDec={decQty}
                  theme={T}
                />
              )}
              {stepIndex === 4 && (
                <ReviewStep
                  contactSentinelRef={contactSentinelRef}
                  name={contactName}
                  email={contactEmail}
                  phone={contactPhone}
                  setName={setContactName}
                  setEmail={setContactEmail}
                  setPhone={setContactPhone}
                  ageConfirmed={ageConfirmed}
                  onAgeConfirmedChange={handleAgeConfirmedChange}
                  deliveryAddress={deliveryAddress}
                  deliveryCity={deliveryCity}
                  deliveryZip={deliveryZip}
                  deliveryTime={deliveryTime}
                  setDeliveryAddress={setDeliveryAddress}
                  setDeliveryCity={setDeliveryCity}
                  setDeliveryZip={setDeliveryZip}
                  setDeliveryTime={setDeliveryTime}
                  deliveryDate={deliveryDate}
                  formatDate={formatDate}
                  people={people}
                  lineItems={lineItems}
                  submitMode={submitMode}
                  setSubmitMode={setSubmitMode}
                  submitError={submitError}
                  onSubmit={handleSubmit}
                  modal={M}
                  theme={T}
                />
              )}
            </>
          )}
        </div>

        {!submitted && !checkoutSecret && (
          // Single-row sticky footer: [Back] [Running total + Per person]
          // [Next/Submit]. Totals dominate the eye, buttons smaller.
          // Hidden during embedded checkout — Stripe has its own Pay button.
          <div
            className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5"
            style={{
              background: T.navy,
              color: '#FFFFFF',
              borderTop: `3px solid ${T.primary}`,
            }}
          >
            <button
              onClick={prev}
              disabled={stepIndex === 0}
              className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white/10 whitespace-nowrap"
              style={{ color: '#FFFFFF' }}
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-center min-w-0">
              <div className="text-center">
                <div
                  className="text-xs font-bold uppercase tracking-[0.18em]"
                  style={{ color: T.primary, opacity: 0.95 }}
                >
                  Total
                </div>
                <div
                  className="font-heading font-bold leading-none"
                  style={{ color: T.primary, fontSize: 'clamp(1.4rem, 4.5vw, 2.1rem)' }}
                >
                  ${total.toFixed(2)}
                </div>
              </div>
              <div className="text-center pl-3 border-l border-white/15">
                <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-75">
                  Per {M.groupSizeUnit === 'people' ? 'person' : M.groupSizeUnit.replace(/s$/, '')} ({people})
                </div>
                <div
                  className="font-heading font-bold leading-none"
                  style={{ color: '#FFFFFF', fontSize: 'clamp(1.05rem, 3.5vw, 1.4rem)' }}
                >
                  ${perPerson.toFixed(2)}
                </div>
              </div>
            </div>

            {!isLastStep ? (
              <button
                onClick={next}
                className="px-4 py-2 text-xs sm:text-sm font-bold rounded-lg tracking-wide transition-all hover:scale-[1.03] shadow-md whitespace-nowrap"
                style={{ background: T.primary, color: T.primaryText }}
              >
                {stepIndex === 0 ? 'Start →' : 'Next →'}
              </button>
            ) : (
              // Review step — two CTAs at the bottom right. Both submit
              // the same form (handleSubmit creates a real dashboard
              // and redirects). "Send" = casual / send-me-the-link
              // intent; "Pay Now" = ready-to-check-out intent. Both
              // land on /dashboard/<code> where checkout lives.
              <div className="flex gap-2 items-center">
                <button
                  type="submit"
                  form="quote-form"
                  onClick={() => setSubmitMode('quote')}
                  disabled={submitting || !ageConfirmed}
                  title={!ageConfirmed ? 'Check the 21+ confirmation above to continue' : undefined}
                  className="px-3 py-2 text-xs sm:text-sm font-bold rounded-lg tracking-wide transition-all hover:scale-[1.03] shadow-md whitespace-nowrap disabled:opacity-60 disabled:hover:scale-100"
                  style={{
                    background: '#FFFFFF',
                    color: T.navy,
                    border: `2px solid ${T.navy}`,
                  }}
                >
                  {submitting ? '…' : 'Send →'}
                </button>
                <button
                  type="submit"
                  form="quote-form"
                  onClick={() => setSubmitMode('checkout')}
                  disabled={submitting || !ageConfirmed}
                  title={!ageConfirmed ? 'Check the 21+ confirmation above to continue' : undefined}
                  className="px-4 py-2 text-xs sm:text-sm font-bold rounded-lg tracking-wide transition-all hover:scale-[1.03] shadow-md whitespace-nowrap disabled:opacity-60 disabled:hover:scale-100"
                  style={{ background: T.primary, color: T.primaryText }}
                >
                  {submitting ? '…' : 'Pay Now →'}
                </button>
              </div>
            )}
          </div>
        )}

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

// ---------- INLINE CALENDAR ----------

function InlineCalendar({
  value,
  onChange,
  theme,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  theme: LandingConfig['theme'];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initial = value ?? today;
  const [view, setView] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });

  const goPrev = () =>
    setView((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 },
    );
  const goNext = () =>
    setView((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 },
    );

  const monthName = new Date(view.year, view.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSameDay = (a: Date, b: Date | null) =>
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isPast = (day: number) => {
    const d = new Date(view.year, view.month, day);
    return d < today;
  };

  return (
    <div
      className="rounded-lg border bg-white p-3 sm:p-4 select-none"
      style={{ borderColor: '#E5E7EB' }}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous month"
          className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
        >
          ‹
        </button>
        <div className="font-heading font-bold text-base" style={{ color: theme.navy }}>
          {monthName}
        </div>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next month"
          className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateObj = new Date(view.year, view.month, d);
          const selected = isSameDay(dateObj, value);
          const past = isPast(d);
          const isToday = isSameDay(dateObj, today);
          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => onChange(dateObj)}
              className="aspect-square rounded-md text-sm font-medium transition-all"
              style={
                past
                  ? { color: '#D1D5DB', cursor: 'not-allowed' }
                  : selected
                  ? { background: theme.primary, color: theme.primaryText, fontWeight: 700 }
                  : isToday
                  ? { color: theme.navy, border: `1.5px solid ${theme.blue}` }
                  : { color: theme.navy }
              }
            >
              {d}
            </button>
          );
        })}
      </div>
      {value && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Selected:{' '}
            <span className="font-bold" style={{ color: theme.navy }}>
              {value.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-500 hover:text-red-500"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- STEP COMPONENTS ----------

function BasicsStep({
  people,
  setPeople,
  deliveryDate,
  setDeliveryDate,
  modal,
  theme,
  extraSelection,
  setExtraSelection,
}: {
  people: number;
  setPeople: (n: number) => void;
  deliveryDate: Date | null;
  setDeliveryDate: (d: Date | null) => void;
  modal: LandingConfig['modal'];
  theme: LandingConfig['theme'];
  extraSelection: string[];
  setExtraSelection: (v: string[]) => void;
}) {
  const toggleExtra = (v: string) =>
    setExtraSelection(
      extraSelection.includes(v)
        ? extraSelection.filter((x) => x !== v)
        : [...extraSelection, v],
    );
  return (
    <div>
      <h2 className="font-heading text-xl md:text-2xl font-bold mb-1 leading-tight" style={{ color: theme.navy }}>
        {modal.basicsHeadline}
      </h2>
      <p className="text-xs text-gray-600 mb-3">{modal.basicsBlurb}</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          {/* Compact group-size row: label stacked on the left, slider + count on the right */}
          <div className="rounded-lg border bg-white p-3 flex items-center gap-3" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex-shrink-0">
              <div
                className="text-xs font-bold uppercase tracking-wider leading-tight"
                style={{ color: theme.navy }}
              >
                {modal.groupSizeLabel}
              </div>
              <div className="text-xs text-gray-500 leading-tight">
                {modal.groupSizeUnit}
              </div>
            </div>
            <input
              type="range"
              min={2}
              max={modal.groupSizeUnit === 'attendees' || modal.groupSizeUnit === 'guests' ? 200 : 30}
              value={people}
              onChange={(e) => setPeople(parseInt(e.target.value, 10))}
              className="flex-1 min-w-0"
              style={{ accentColor: theme.blue }}
            />
            <span
              className="font-heading text-2xl font-bold flex-shrink-0 min-w-[2rem] text-right"
              style={{ color: theme.blue }}
            >
              {people}
            </span>
          </div>

          {modal.extraQuestion && (
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.navy }}>
                {modal.extraQuestion.label}
              </label>
              <div className="rounded-lg border bg-white p-3 space-y-1.5" style={{ borderColor: '#E5E7EB' }}>
                {modal.extraQuestion.options.map((opt) => {
                  const checked = extraSelection.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer text-sm py-1 px-2 rounded transition-colors"
                      style={{
                        background: checked ? `${theme.primary}22` : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExtra(opt.value)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: theme.primary }}
                      />
                      <span style={{ color: theme.navy }}>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.navy }}>
            Delivery date
          </label>
          <InlineCalendar value={deliveryDate} onChange={setDeliveryDate} theme={theme} />
          <p className="text-xs text-gray-500 mt-2">
            48-hour notice gets you guaranteed pricing &amp; cold delivery.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductGridStep({
  title,
  blurb,
  categories,
  selection,
  onInc,
  onDec,
  theme,
  tabbed = false,
}: {
  title: string;
  blurb: string;
  categories: BuilderCategory[];
  selection: Selection;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  theme: LandingConfig['theme'];
  /** When true, render category labels as horizontal subtabs and only show one at a time. */
  tabbed?: boolean;
}) {
  const [activeKey, setActiveKey] = useState<string>(categories[0]?.key ?? '');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleCats = tabbed
    ? categories.filter((c) => c.key === activeKey)
    : categories;

  return (
    <div>
      <h2 className="font-heading text-xl md:text-2xl font-bold mb-1 leading-tight" style={{ color: theme.navy }}>
        {title}
      </h2>
      <p className="text-xs text-gray-600 mb-3">{blurb}</p>

      {tabbed && (
        <div
          className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-3 flex flex-wrap gap-1.5 overflow-x-auto"
          style={{ background: theme.cream }}
        >
          {categories.map((cat) => {
            const active = cat.key === activeKey;
            const count = cat.products.length + (cat.extras?.length ?? 0);
            return (
              <button
                key={cat.key}
                onClick={() => setActiveKey(cat.key)}
                className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all"
                style={{
                  background: active ? theme.primary : '#FFFFFF',
                  color: active ? theme.primaryText : theme.navy,
                  border: `1.5px solid ${active ? theme.primary : '#E5E7EB'}`,
                  boxShadow: active ? `0 2px 6px ${theme.primary}66` : 'none',
                }}
              >
                {cat.label}{' '}
                <span
                  className="ml-1 text-xs opacity-70"
                  style={{ color: active ? theme.primaryText : '#9CA3AF' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className={tabbed ? '' : 'space-y-5'}>
        {visibleCats.map((cat) => {
          const isExpanded = expanded.has(cat.key);
          const productsToShow = isExpanded
            ? [...cat.products, ...(cat.extras ?? [])]
            : cat.products;
          const extraCount = cat.extras?.length ?? 0;

          return (
            <div key={cat.key}>
              {!tabbed && (
                <div
                  className="sticky top-0 z-10 -mx-1 px-1 py-1.5 mb-2 flex items-baseline gap-2"
                  style={{ background: theme.cream }}
                >
                  <h3 className="font-heading font-bold text-sm uppercase tracking-widest" style={{ color: theme.navy }}>
                    {cat.label}
                  </h3>
                  <span className="text-xs text-gray-400">
                    ({cat.products.length + extraCount})
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {productsToShow.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    qty={selection[p.id] ?? 0}
                    onInc={() => onInc(p.id)}
                    onDec={() => onDec(p.id)}
                    theme={theme}
                  />
                ))}
              </div>
              {extraCount > 0 && (
                <div className="flex justify-center mt-3">
                  <button
                    onClick={() => toggleExpand(cat.key)}
                    className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all hover:scale-105"
                    style={{
                      background: '#FFFFFF',
                      color: theme.navy,
                      border: `1.5px solid ${theme.primary}`,
                    }}
                  >
                    {isExpanded ? `Show top picks` : `View all ${extraCount + cat.products.length} ${cat.label.toLowerCase()} →`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  qty,
  onInc,
  onDec,
  theme,
}: {
  product: BuilderProduct;
  qty: number;
  onInc: () => void;
  onDec: () => void;
  theme: LandingConfig['theme'];
}) {
  const selected = qty > 0;
  return (
    <div
      className="relative rounded-xl bg-white overflow-hidden flex flex-col transition-all duration-200"
      style={{
        border: selected ? `2px solid ${theme.primary}` : '1px solid #E5E7EB',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="relative w-full bg-white flex items-center justify-center flex-shrink-0 border-b border-gray-100"
        style={{ height: '110px' }}
      >
        {product.image ? (
          <Image
            src={encodeImg(product.image)!}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 18vw, 50vw"
            className="object-contain p-3"
          />
        ) : (
          <span className="text-4xl opacity-90">{product.emoji}</span>
        )}
        {selected && (
          <div
            className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-xs font-bold shadow"
            style={{ background: theme.primary, color: theme.primaryText }}
          >
            ×{qty}
          </div>
        )}
      </div>

      <div className="p-2.5 flex flex-col flex-1">
        <div
          className="text-xs font-bold leading-tight mb-1.5 text-center"
          style={{
            color: theme.navy,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.2em',
          }}
        >
          {product.name}
        </div>

        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-xs text-gray-500 truncate">
            {product.detail || ' '}
          </span>
          <span className="font-bold text-sm whitespace-nowrap" style={{ color: theme.blue }}>
            ${product.price}
          </span>
        </div>

        <div className="flex items-center justify-center mt-auto pt-1">
          {qty === 0 ? (
            <button
              onClick={onInc}
              className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold leading-none transition-all hover:scale-110 active:scale-95 shadow-sm"
              style={{ background: theme.primary, color: theme.primaryText }}
              aria-label={`Add ${product.name}`}
            >
              +
            </button>
          ) : (
            <div
              className="flex items-center gap-2 rounded-full px-1.5 py-1 transition-all"
              style={{ background: theme.primary, boxShadow: `0 2px 6px ${theme.primary}66` }}
            >
              <button
                onClick={onDec}
                className="w-7 h-7 rounded-full bg-white/70 hover:bg-white text-lg font-bold leading-none flex items-center justify-center transition-colors"
                style={{ color: theme.primaryText }}
                aria-label="Decrease"
              >
                −
              </button>
              <span className="font-bold text-sm w-5 text-center" style={{ color: theme.primaryText }}>
                {qty}
              </span>
              <button
                onClick={onInc}
                className="w-7 h-7 rounded-full bg-white/70 hover:bg-white text-lg font-bold leading-none flex items-center justify-center transition-colors"
                style={{ color: theme.primaryText }}
                aria-label="Increase"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  contactSentinelRef,
  name,
  email,
  phone,
  setName,
  setEmail,
  setPhone,
  ageConfirmed,
  onAgeConfirmedChange,
  deliveryAddress,
  deliveryCity,
  deliveryZip,
  deliveryTime,
  setDeliveryAddress,
  setDeliveryCity,
  setDeliveryZip,
  setDeliveryTime,
  deliveryDate,
  formatDate,
  people,
  lineItems,
  submitMode,
  setSubmitMode,
  submitError,
  onSubmit,
  modal,
  theme,
}: {
  contactSentinelRef?: React.RefObject<HTMLDivElement | null>;
  name: string;
  email: string;
  phone: string;
  setName: (s: string) => void;
  setEmail: (s: string) => void;
  setPhone: (s: string) => void;
  ageConfirmed: boolean;
  onAgeConfirmedChange: (checked: boolean) => void;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryZip: string;
  deliveryTime: string;
  setDeliveryAddress: (s: string) => void;
  setDeliveryCity: (s: string) => void;
  setDeliveryZip: (s: string) => void;
  setDeliveryTime: (s: string) => void;
  deliveryDate: Date | null;
  formatDate: (d: Date | null) => string;
  people: number;
  lineItems: { product: BuilderProduct; qty: number; lineTotal: number }[];
  submitMode: 'quote' | 'checkout';
  setSubmitMode: (m: 'quote' | 'checkout') => void;
  submitError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  modal: LandingConfig['modal'];
  theme: LandingConfig['theme'];
}) {
  // submitMode + setSubmitMode are still passed by the parent — the
  // sticky footer's Send / Pay Now buttons use them to tag intent on
  // each submission. There's no mode-toggle UI inside the review step
  // anymore; both buttons just call handleSubmit, which always creates
  // a dashboard and redirects. Reference once to keep eslint quiet
  // when the props aren't read inside this component body.
  void submitMode;
  void setSubmitMode;
  // Address fields are always optional from this surface — dashboard
  // collects them on its own checkout step.
  const addressRequired = false;
  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-1 leading-tight" style={{ color: theme.navy }}>
        Review your order
      </h2>
      <p className="text-xs text-gray-600 mb-3">
        We&apos;ll create your dashboard, email you the link, and drop you
        on the order page to keep shopping or check out.
      </p>

      {/* Compact event summary — totals live in the modal's sticky footer */}
      <div className="rounded-md px-3 py-2 mb-3 flex items-center justify-between gap-3 flex-wrap text-sm" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <span className="inline-flex items-center gap-x-2 flex-wrap" style={{ color: theme.navy }}>
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="w-4 h-4" /> <strong>{people}</strong> {modal.groupSizeUnit}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />{' '}
            <strong>{deliveryDate ? formatDate(deliveryDate) : 'TBD'}</strong>
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <BoxIcon className="w-4 h-4" />{' '}
            <strong>{lineItems.reduce((s, li) => s + li.qty, 0)}</strong> items
          </span>
        </span>
      </div>

      {lineItems.length > 0 && (
        <details className="mb-3 rounded-md bg-white" style={{ border: '1px solid #E5E7EB' }}>
          <summary className="cursor-pointer px-3 py-2 text-xs font-bold" style={{ color: theme.navy }}>
            View {lineItems.length} item{lineItems.length !== 1 ? 's' : ''} ↓
          </summary>
          <ul className="px-3 pb-2 space-y-1 text-xs">
            {lineItems.map((li) => (
              <li key={li.product.id} className="flex justify-between gap-3">
                <span className="text-gray-800">
                  <strong>{li.qty}×</strong> {li.product.name}
                </span>
                <span className="font-bold whitespace-nowrap" style={{ color: theme.navy }}>
                  ${li.lineTotal.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Sentinel that the parent's IntersectionObserver watches — when
          this scrolls into view (or near it), the upsell overlay pops. */}
      <div ref={contactSentinelRef} aria-hidden className="h-px -my-2" />

      <form
        id="quote-form"
        onSubmit={onSubmit}
        // Suppress native validation popovers — they collide with the
        // upsell overlay. handleSubmit() in the parent validates
        // required fields in JS and shows submitError instead.
        noValidate
        // Already calls useLeadCapture() — tell global watcher to skip.
        data-lead-capture="manual"
        data-lead-widget="PACKAGE_BUILDER"
        className="space-y-2.5"
      >
        <div className="grid sm:grid-cols-2 gap-2.5">
          <FormField label="Your name" required theme={theme}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white rounded-md px-3 py-2.5 text-base focus:outline-none transition-colors"
              style={{ border: '1.5px solid #E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = theme.blue)}
              onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              placeholder="Name"
            />
          </FormField>
          <FormField label="Phone" required theme={theme}>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white rounded-md px-3 py-2.5 text-base focus:outline-none transition-colors"
              style={{ border: '1.5px solid #E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = theme.blue)}
              onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              placeholder="(555) 555-5555"
            />
          </FormField>
        </div>
        <FormField label="Email" required theme={theme}>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white rounded-md px-3 py-2.5 text-base focus:outline-none transition-colors"
            style={{ border: '1.5px solid #E5E7EB' }}
            onFocus={(e) => (e.target.style.borderColor = theme.blue)}
            onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
            placeholder="you@email.com"
          />
        </FormField>

        {/* Delivery details — required for Pay Now; optional for Quote */}
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: '#E5E7EB' }}
        >
          <div className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
            Delivery {addressRequired ? '(required)' : '(optional — you can fill this in later)'}
          </div>
          <FormField label="Street address" required={addressRequired} theme={theme}>
            <input
              required={addressRequired}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full bg-white rounded-md px-3 py-2.5 text-base focus:outline-none transition-colors"
              style={{ border: '1.5px solid #E5E7EB' }}
              onFocus={(e) => (e.target.style.borderColor = theme.blue)}
              onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              placeholder="123 Main St"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <FormField label="City" theme={theme}>
              <input
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                className="w-full bg-white rounded-md px-3 py-2.5 text-base focus:outline-none transition-colors"
                style={{ border: '1.5px solid #E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = theme.blue)}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                placeholder="Austin"
              />
            </FormField>
            <FormField label="ZIP" required={addressRequired} theme={theme}>
              <input
                required={addressRequired}
                value={deliveryZip}
                onChange={(e) => setDeliveryZip(e.target.value)}
                className="w-full bg-white rounded-md px-3 py-2.5 text-base focus:outline-none transition-colors"
                style={{ border: '1.5px solid #E5E7EB' }}
                onFocus={(e) => (e.target.style.borderColor = theme.blue)}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                placeholder="78701"
              />
            </FormField>
          </div>
          <div className="mt-2.5">
            <FormField label="Delivery time window" theme={theme}>
              <select
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full bg-white rounded-md px-3 py-2.5 text-base focus:outline-none transition-colors"
                style={{ border: '1.5px solid #E5E7EB' }}
              >
                {getDeliveryWindows().map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {deliveryDate && isSunday(deliveryDate.toISOString().slice(0, 10)) && (
            <div
              className="mt-2.5 rounded-md p-2.5 text-sm leading-snug"
              style={{
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FCD34D',
              }}
            >
              {SUNDAY_CLOSED_NOTE}
            </div>
          )}
        </div>

        {/* Age compliance — required. The landing pages skip the site-wide
            entrance gate, so 21+ gets confirmed here instead. */}
        <label
          className="mt-3 flex items-start gap-3 rounded-md p-3 cursor-pointer select-none transition-colors"
          style={{
            background: '#FFFFFF',
            border: `1.5px solid ${ageConfirmed ? theme.blue : '#E5E7EB'}`,
          }}
        >
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => onAgeConfirmedChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer"
            style={{ accentColor: theme.blue }}
          />
          <span className="text-base leading-snug" style={{ color: theme.navy }}>
            <strong>Yes — everyone receiving this delivery is 21+.</strong>{' '}
            <span className="text-sm text-gray-600">
              TABC-licensed retailer. Valid ID checked at the door, no exceptions.
            </span>
          </span>
        </label>

        {submitError && (
          <div
            className="mt-3 rounded-md p-3 text-sm"
            style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}
          >
            {submitError}
          </div>
        )}

        {/* Submit lives in the sticky footer now — see PackageBuilderModal
            shell. The form is wired via form="quote-form" attribute. */}
      </form>

      <p className="text-sm text-gray-500 mt-3 leading-snug">{modal.emailNotice}</p>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
  theme,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  theme: LandingConfig['theme'];
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: theme.navy }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SuccessPanel({
  mode,
  phone,
  occasion,
  theme,
  modal,
  onReset,
  onClose,
}: {
  mode: 'quote' | 'checkout';
  phone: string;
  occasion: string;
  theme: LandingConfig['theme'];
  modal: LandingConfig['modal'];
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="max-w-md mx-auto text-center py-6">
      <div className="mb-3 flex justify-center" style={{ color: theme.blue }}>
        <CheckCircleIcon className="w-14 h-14" />
      </div>
      <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2" style={{ color: theme.navy }}>
        {mode === 'checkout' ? modal.successCheckoutHeadline : modal.successQuoteHeadline}
      </h2>
      <p className="text-gray-700 mb-5 text-sm leading-relaxed">
        {mode === 'checkout'
          ? "We've got your package. We'll text a payment link in 5 minutes — keep your phone handy."
          : "Check your inbox in a minute. Reply to that email if you want to tweak anything."}
      </p>
      <div className="rounded-lg p-4 mb-5 text-left" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
        <p className="text-xs text-gray-700 mb-1.5">
          <strong>Need it sooner?</strong> Call — we usually answer within 2 rings.
        </p>
        <a
          href={`tel:${phone.replace(/\D/g, '')}`}
          onClick={() =>
            trackContactClick(
              'phone',
              'builder_success',
              occasion,
              `tel:${phone.replace(/\D/g, '')}`,
            )
          }
          className="font-heading text-xl font-bold"
          style={{ color: theme.blue }}
        >
          {phone}
        </a>
      </div>
      <div className="flex gap-2 justify-center">
        <button
          onClick={onReset}
          className="px-4 py-2.5 text-sm bg-white font-bold rounded-lg transition-colors"
          style={{ border: '2px solid #E5E7EB', color: theme.navy }}
        >
          Build another
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-bold rounded-lg transition-all hover:scale-[1.02]"
          style={{ background: theme.primary, color: theme.primaryText }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
