'use client';

/**
 * EVENT BYOB DRINK MENU MODAL
 *
 * Step-by-step a-la-carte ordering pop-up for invitees who already
 * RSVPed. Mirrors the bachelor landing-page PackageBuilderModal exactly,
 * except:
 *
 *   - No contact form (name/email/phone pre-filled from RSVP)
 *   - No date/time/address picker (locked to the event)
 *   - No packages — pure a-la-carte from the curated catalog
 *   - Final confirmation copy: "See you at the party. Your drinks will
 *     show up cold and ready to enjoy."
 *
 * Steps:
 *   1. Beer & Seltzers (stepOneCategories)
 *   2. Liquor & Cocktail Kits (stepTwoCategories)
 *   3. Sodas & Mixers (stepThreeCategories)
 *   4. Review & Pay
 *
 * Catalog comes from src/lib/landing/getCuratedCatalog.ts — same data
 * the bachelor landing page uses, so the menus stay perfectly in sync.
 */
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useLeadCapture } from '@/lib/leads/client';
import type { CuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { loadCart, saveCart, clearCart } from '@/lib/events/sessionStore';
import type {
  BuilderCategory,
  BuilderProduct,
} from '@/components/landing/types';
import type { EventInvite } from '@/lib/events/types';
import type { EventColorTheme } from '@/lib/events/theme';

type Props = {
  open: boolean;
  onClose: () => void;
  event: EventInvite;
  theme: EventColorTheme;
  catalog: CuratedCatalog;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
};

type Selection = Record<string, number>;

const STEPS: Array<{ key: string; label: string }> = [
  { key: 'beer', label: 'Beer & Seltzers' },
  { key: 'liquor', label: 'Liquor & Cocktail Kits' },
  { key: 'mixers', label: 'Sodas & Mixers' },
  { key: 'review', label: 'Review & Pay' },
];

const STEP_BLURB: Record<string, string> = {
  beer: 'Stock up on what you actually drink. Bottles arrive ice-cold 30 min before showtime.',
  liquor: 'Bottles for shots + mixed drinks, plus pre-made cocktail kits if you want zero work.',
  mixers: 'Sodas, juices, and ice — the stuff everyone forgets.',
};

// Smart encode: if the DB stored a URL-encoded path, don't re-encode.
const encodeImg = (src?: string): string | undefined => {
  if (!src) return undefined;
  return /%[0-9A-Fa-f]{2}/.test(src) ? src : encodeURI(src);
};

export default function EventDrinksMenuModal({
  open,
  onClose,
  event,
  theme,
  catalog,
  guestName,
  guestEmail,
  guestPhone,
}: Props) {
  const { stepOneCategories, stepTwoCategories, stepThreeCategories, productById } =
    catalog;

  const [stepIndex, setStepIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const lead = useLeadCapture({ widget: 'A_LA_CARTE', page: `/events/${event.slug}` });

  // Hydrate selection from localStorage when the modal opens (24h TTL).
  // Lets a customer close the tab, come back tomorrow, and pick up exactly
  // where they left off.
  useEffect(() => {
    if (!open) return;
    const stored = loadCart(event.slug);
    if (stored && Object.keys(stored.selection).length > 0) {
      setSelection(stored.selection);
      setStepIndex(Math.min(stored.stepIndex, STEPS.length - 1));
    }
  }, [open, event.slug]);

  // Snapshot the selection + step on every change so we never lose state
  // mid-flow. Wait until at least one item is in the cart so we don't
  // litter localStorage with empty rows.
  useEffect(() => {
    if (!open || submitted) return;
    const itemCount = Object.values(selection).reduce((s, n) => s + (n || 0), 0);
    if (itemCount > 0) {
      saveCart(event.slug, { selection, stepIndex });
    }
  }, [open, submitted, selection, stepIndex, event.slug]);

  // Fire step-complete events so we can see drop-off in the lead funnel.
  useEffect(() => {
    if (!open) return;
    lead.onStepComplete(`event_drinks_step_${stepIndex}`, {
      stepKey: STEPS[stepIndex]?.key,
      itemCount: Object.values(selection).reduce((s, n) => s + (n || 0), 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, open]);

  // Reset state when closing so reopening starts fresh.
  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setSelection({});
      setSubmitted(false);
      setSubmitting(false);
    }
  }, [open]);

  const lineItems = useMemo(() => {
    return Object.entries(selection)
      .filter(([, n]) => n > 0)
      .map(([id, qty]) => {
        const product = productById[id];
        return product
          ? { product, qty, lineTotal: Number(product.price) * qty }
          : null;
      })
      .filter((li): li is NonNullable<typeof li> => !!li);
  }, [selection, productById]);

  const subtotal = useMemo(
    () => lineItems.reduce((s, li) => s + li.lineTotal, 0),
    [lineItems],
  );
  const itemCount = useMemo(
    () => lineItems.reduce((s, li) => s + li.qty, 0),
    [lineItems],
  );

  const inc = (id: string) =>
    setSelection((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setSelection((s) => ({
      ...s,
      [id]: Math.max(0, (s[id] ?? 0) - 1),
    }));

  // Once the cart goes 0 → ≥1 item AND we have RSVP info, schedule an
  // abandoned-cart nudge. The endpoint is idempotent on the server side
  // (Lead row update with metadata) so we can call it whenever — but we
  // only fire it once per modal open to avoid spam.
  const [nudgeScheduled, setNudgeScheduled] = useState(false);
  useEffect(() => {
    if (nudgeScheduled || !open || submitted) return;
    if (!guestEmail || !guestName) return;
    const itemCount = Object.values(selection).reduce((s, n) => s + (n || 0), 0);
    if (itemCount === 0) return;
    setNudgeScheduled(true);
    const [first, ...rest] = guestName.split(' ');
    const subtotalEstimate = Object.entries(selection).reduce((sum, [id, qty]) => {
      const p = productById[id];
      return p ? sum + Number(p.price) * (qty ?? 0) : sum;
    }, 0);
    void fetch('/api/v1/events/abandon-nudge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        eventSlug: event.slug,
        eventTitle: event.title,
        firstName: first,
        lastName: rest.join(' '),
        email: guestEmail,
        phone: guestPhone || null,
        itemCount,
        cartTotal: Number(subtotalEstimate.toFixed(2)),
        resumeUrl: `/events/${event.slug}`,
      }),
    }).catch(() => {
      // Silent — if it fails we'll just miss that one abandoned-cart
      // opportunity; not worth blocking the UX over.
    });
  }, [
    open,
    submitted,
    selection,
    guestEmail,
    guestName,
    guestPhone,
    event.slug,
    event.title,
    productById,
    nudgeScheduled,
  ]);

  const next = () => setStepIndex((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStepIndex((s) => Math.max(0, s - 1));
  const isLastStep = stepIndex === STEPS.length - 1;

  const handleSubmit = () => {
    if (submitting || itemCount === 0) return;
    setSubmitting(true);

    const items = lineItems.map((li) => ({
      handle: li.product.sku ?? '',
      name: li.product.name,
      qty: li.qty,
      unitPrice: Number(li.product.price),
    }));

    lead.onCheckoutStart(
      {
        firstName: guestName.split(' ')[0],
        lastName: guestName.split(' ').slice(1).join(' '),
        email: guestEmail,
        phone: guestPhone,
      },
      {
        eventSlug: event.slug,
        eventTitle: event.title,
        flow: 'event-alacarte',
        itemCount,
        subtotal,
      },
      items,
    );

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        `pod_event_order_${event.slug}`,
        JSON.stringify({
          items,
          subtotal,
          guestName,
          guestEmail,
          guestPhone,
          submittedAt: new Date().toISOString(),
        }),
      );
    }

    // Order locked in — clear the saved cart so the abandoned-cart cron
    // doesn't keep nudging this user.
    clearCart(event.slug);

    // Mockup: short delay then show confirmation. Real version will
    // create a DraftOrder + redirect to embedded Stripe checkout.
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 500);
  };

  if (!open) return null;

  const formattedDate = new Date(event.startsAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: event.timezone,
  });
  const formattedTime = new Date(event.startsAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone,
  });

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(10,15,25,0.78)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* HEADER */}
        <div
          className="px-5 py-4 flex items-start justify-between"
          style={{ background: theme.navy, color: '#FFFFFF' }}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-widest opacity-80">
              {submitted
                ? "YOU'RE LOCKED IN"
                : `STEP ${stepIndex + 1} OF ${STEPS.length} · ${STEPS[stepIndex].label}`}
            </div>
            <div className="font-heading text-xl font-bold leading-tight mt-1 truncate">
              {submitted ? 'See you at the party' : (
                <>
                  Order your drinks,{' '}
                  <span style={{ color: theme.primary }}>{guestName.split(' ')[0]}</span>
                </>
              )}
            </div>
            <div className="text-xs opacity-80 mt-0.5 truncate">
              {event.venue} · {formattedDate} · {formattedTime}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <span className="text-white text-xl leading-none">×</span>
          </button>
        </div>

        {submitted ? (
          <SubmittedView
            event={event}
            theme={theme}
            guestName={guestName}
            itemCount={itemCount}
            subtotal={subtotal}
            lineItems={lineItems}
            onClose={onClose}
            formattedDate={formattedDate}
            formattedTime={formattedTime}
          />
        ) : (
          <>
            {/* Step progress bar */}
            <div className="px-5 pt-3 pb-1 flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    background: i <= stepIndex ? theme.primary : '#E5E7EB',
                  }}
                />
              ))}
            </div>

            {/* Locked-in delivery banner — replaces the address/date form */}
            <div className="px-5 pt-3">
              <div
                className="rounded-md p-3 flex items-start gap-2 text-xs"
                style={{
                  background: theme.cream,
                  color: theme.navy,
                  border: `1px solid ${theme.primary}55`,
                }}
              >
                <span className="text-lg leading-none">✓</span>
                <div className="min-w-0">
                  <div className="font-bold mb-0.5">
                    Delivery locked in — nothing else to fill out
                  </div>
                  <div className="text-gray-700">
                    {event.address} · {formattedDate} at {formattedTime}
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    For {guestName} · {guestEmail}
                    {guestPhone ? ` · ${guestPhone}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {stepIndex === 0 && (
                <ProductGridStep
                  title="Beer & Seltzers"
                  blurb={STEP_BLURB.beer}
                  categories={stepOneCategories}
                  selection={selection}
                  onInc={inc}
                  onDec={dec}
                  theme={theme}
                  tabbed
                />
              )}
              {stepIndex === 1 && (
                <ProductGridStep
                  title="Liquor & Cocktail Kits"
                  blurb={STEP_BLURB.liquor}
                  categories={stepTwoCategories}
                  selection={selection}
                  onInc={inc}
                  onDec={dec}
                  theme={theme}
                  tabbed
                />
              )}
              {stepIndex === 2 && (
                <ProductGridStep
                  title="Sodas & Mixers"
                  blurb={STEP_BLURB.mixers}
                  categories={stepThreeCategories}
                  selection={selection}
                  onInc={inc}
                  onDec={dec}
                  theme={theme}
                />
              )}
              {stepIndex === 3 && (
                <ReviewStep
                  theme={theme}
                  event={event}
                  guestName={guestName}
                  guestEmail={guestEmail}
                  guestPhone={guestPhone}
                  lineItems={lineItems}
                  subtotal={subtotal}
                  formattedDate={formattedDate}
                  formattedTime={formattedTime}
                />
              )}
            </div>

            {/* STICKY FOOTER */}
            <div className="px-5 py-3 border-t bg-white" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  {itemCount} item{itemCount === 1 ? '' : 's'} · Free delivery
                </span>
                <span className="font-bold text-lg" style={{ color: theme.navy }}>
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={stepIndex === 0 ? onClose : prev}
                  className="py-3 rounded-md font-semibold text-sm"
                  style={{ background: '#F3F4F6', color: theme.navy }}
                >
                  {stepIndex === 0 ? 'Skip for now' : '← Back'}
                </button>
                {isLastStep ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || itemCount === 0}
                    className="py-3 rounded-md font-bold text-sm tracking-wide transition-transform disabled:opacity-40 hover:scale-[1.01]"
                    style={{ background: theme.primary, color: theme.primaryText }}
                  >
                    {submitting
                      ? 'Locking it in…'
                      : itemCount === 0
                        ? 'Pick at least one'
                        : `Pay · $${subtotal.toFixed(2)} →`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={next}
                    className="py-3 rounded-md font-bold text-sm tracking-wide transition-transform hover:scale-[1.01]"
                    style={{ background: theme.primary, color: theme.primaryText }}
                  >
                    {stepIndex === 0 ? 'Start →' : 'Next →'}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Mockup mode — real version routes to secure Stripe checkout with your name on the box.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Step renderer (a slim copy of the bachelor PackageBuilder's ProductGridStep)
// -------------------------------------------------------------------------
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
  theme: EventColorTheme;
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

  const visibleCats = tabbed ? categories.filter((c) => c.key === activeKey) : categories;

  return (
    <div>
      <h2
        className="font-heading text-xl md:text-2xl font-bold mb-1 leading-tight"
        style={{ color: theme.navy }}
      >
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
                  className="ml-1 text-[10px] opacity-70"
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
                  <h3
                    className="font-heading font-bold text-sm uppercase tracking-widest"
                    style={{ color: theme.navy }}
                  >
                    {cat.label}
                  </h3>
                  <span className="text-[10px] text-gray-400">
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
                    {isExpanded
                      ? `Show top picks`
                      : `View all ${extraCount + cat.products.length} ${cat.label.toLowerCase()} →`}
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
  theme: EventColorTheme;
}) {
  const selected = qty > 0;
  return (
    <div
      className="relative rounded-xl bg-white overflow-hidden flex flex-col transition-all duration-200"
      style={{
        border: selected ? `2px solid ${theme.primary}` : '1px solid #E5E7EB',
        boxShadow: selected
          ? '0 4px 12px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.04)',
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
      </div>
      <div className="flex-1 p-2.5 flex flex-col">
        <div
          className="font-semibold text-xs leading-tight line-clamp-2 min-h-[28px]"
          style={{ color: theme.navy }}
        >
          {product.name}
        </div>
        {product.detail && (
          <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{product.detail}</div>
        )}
        <div className="text-sm font-bold mt-1" style={{ color: theme.navy }}>
          ${Number(product.price).toFixed(2)}
        </div>
        <div className="mt-2 flex items-center gap-1">
          {qty === 0 ? (
            <button
              onClick={onInc}
              className="w-full py-1.5 rounded-md text-xs font-bold tracking-wide transition-transform hover:scale-[1.02]"
              style={{ background: theme.primary, color: theme.primaryText }}
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={onDec}
                className="w-7 h-7 rounded-md font-bold"
                style={{ background: '#F3F4F6', color: theme.navy }}
              >
                −
              </button>
              <span className="text-sm font-bold" style={{ color: theme.navy }}>
                {qty}
              </span>
              <button
                onClick={onInc}
                className="w-7 h-7 rounded-md font-bold"
                style={{ background: theme.primary, color: theme.primaryText }}
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

// -------------------------------------------------------------------------
// Review step
// -------------------------------------------------------------------------
function ReviewStep({
  theme,
  event,
  guestName,
  guestEmail,
  guestPhone,
  lineItems,
  subtotal,
  formattedDate,
  formattedTime,
}: {
  theme: EventColorTheme;
  event: EventInvite;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  lineItems: { product: BuilderProduct; qty: number; lineTotal: number }[];
  subtotal: number;
  formattedDate: string;
  formattedTime: string;
}) {
  return (
    <div>
      <h2
        className="font-heading text-xl md:text-2xl font-bold mb-1 leading-tight"
        style={{ color: theme.navy }}
      >
        Review your order
      </h2>
      <p className="text-xs text-gray-600 mb-3">
        Everything below is locked in. Hit pay and your bottles roll up with your name on
        the box.
      </p>

      <div
        className="rounded-md p-3 mb-3 text-sm"
        style={{ background: theme.cream, border: `1px solid ${theme.primary}55` }}
      >
        <div className="font-bold mb-1" style={{ color: theme.navy }}>
          🚚 Delivery
        </div>
        <div className="text-gray-700">
          <strong>{event.venue}</strong> · {event.address}
        </div>
        <div className="text-gray-700">
          {formattedDate} · arriving 30 min before {formattedTime}
        </div>
      </div>

      <div
        className="rounded-md p-3 mb-3 text-sm"
        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
      >
        <div className="font-bold mb-1" style={{ color: theme.navy }}>
          👤 For
        </div>
        <div className="text-gray-700">{guestName}</div>
        <div className="text-gray-500 text-xs">
          {guestEmail}
          {guestPhone ? ` · ${guestPhone}` : ''}
        </div>
      </div>

      {lineItems.length === 0 ? (
        <div className="rounded-md p-4 text-sm text-gray-600 bg-gray-50 border border-gray-200 text-center">
          No drinks yet — go back and pick a few.
        </div>
      ) : (
        <div className="rounded-md bg-white border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-bold tracking-widest text-gray-500">
            YOUR DRINKS ({lineItems.length} item{lineItems.length === 1 ? '' : 's'})
          </div>
          <ul className="divide-y divide-gray-100">
            {lineItems.map((li) => (
              <li key={li.product.id} className="px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate" style={{ color: theme.navy }}>
                    <span style={{ color: theme.primary }}>{li.qty}×</span> {li.product.name}
                  </div>
                  {li.product.detail && (
                    <div className="text-[11px] text-gray-500 truncate">{li.product.detail}</div>
                  )}
                </div>
                <div className="text-sm font-bold whitespace-nowrap" style={{ color: theme.navy }}>
                  ${li.lineTotal.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: theme.navy }}>
              Subtotal
            </span>
            <span className="text-base font-bold" style={{ color: theme.navy }}>
              ${subtotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-500 mt-3 leading-snug">
        Free delivery to the venue. Separate bill — only you pay for your stuff. Bottles
        arrive ice-cold 30 min before showtime.
      </p>
    </div>
  );
}

// -------------------------------------------------------------------------
// Confirmation view
// -------------------------------------------------------------------------
function SubmittedView({
  event,
  theme,
  guestName,
  itemCount,
  subtotal,
  lineItems,
  onClose,
  formattedDate,
  formattedTime,
}: {
  event: EventInvite;
  theme: EventColorTheme;
  guestName: string;
  itemCount: number;
  subtotal: number;
  lineItems: { product: BuilderProduct; qty: number; lineTotal: number }[];
  onClose: () => void;
  formattedDate: string;
  formattedTime: string;
}) {
  return (
    <div className="px-6 py-8 text-center overflow-y-auto">
      <div
        className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
        style={{ background: theme.primary, color: theme.primaryText }}
      >
        <span className="text-3xl">✓</span>
      </div>
      <h2
        className="font-heading text-2xl md:text-3xl font-bold mb-2 leading-tight"
        style={{ color: theme.navy }}
      >
        See you at the party, {guestName.split(' ')[0]}.
      </h2>
      <p className="text-base text-gray-800 mb-5 max-w-md mx-auto">
        Your drinks will show up cold and ready to enjoy.
      </p>

      <div
        className="rounded-md p-4 mb-4 max-w-md mx-auto text-left"
        style={{ background: theme.cream, color: theme.navy }}
      >
        <div className="font-bold text-sm mb-2">📦 Delivery details</div>
        <div className="text-sm">
          <strong>{event.venue}</strong> · {event.address}
        </div>
        <div className="text-sm">
          {formattedDate} · arriving 30 min before {formattedTime}
        </div>
        <div className="text-xs text-gray-700 mt-2">
          {itemCount} item{itemCount === 1 ? '' : 's'} · ${subtotal.toFixed(2)} · your
          name on the box
        </div>
      </div>

      {lineItems.length > 0 && (
        <details
          className="mb-4 max-w-md mx-auto text-left rounded-md bg-white border border-gray-200"
        >
          <summary
            className="cursor-pointer px-3 py-2 text-xs font-bold tracking-widest"
            style={{ color: theme.navy }}
          >
            VIEW YOUR ORDER ↓
          </summary>
          <ul className="divide-y divide-gray-100">
            {lineItems.map((li) => (
              <li
                key={li.product.id}
                className="px-3 py-2 flex justify-between gap-3 text-xs"
              >
                <span className="text-gray-800 truncate">
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

      <div
        className="rounded-md p-3 mb-4 max-w-md mx-auto text-xs text-left"
        style={{ background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' }}
      >
        <div className="font-bold mb-1">What happens next</div>
        <ol className="list-decimal pl-4 space-y-0.5">
          <li>Confirmation text from POD with your order summary.</li>
          <li>Day-before reminder + driver ETA.</li>
          <li>Bottles dropped at the venue with your name on the box.</li>
        </ol>
      </div>

      <button
        onClick={onClose}
        className="px-6 py-3 rounded-md font-bold text-sm tracking-wide"
        style={{ background: theme.navy, color: '#FFFFFF' }}
      >
        Back to the invite →
      </button>
    </div>
  );
}
