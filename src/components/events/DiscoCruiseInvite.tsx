'use client';

/**
 * 4th of July Disco Cruise Drink Delivery — 3-step invite.
 *
 *   Step 1 · Choose your favorite cocktails & beverages
 *   Step 2 · Schedule delivery   (pick 1 of 3 fixed slots)
 *   Step 3 · Party On!           (contact + pay)
 *
 * Receives a pre-grouped list of product sections (boat-party order:
 * cocktails first, then seltzers, beer, spirits, wine, mixers, supplies)
 * from the server page. Each section renders a product-card grid with
 * the image, title, price, and +/- qty controls — same visual language
 * as the dashboard's ProductBrowse so the page feels native.
 *
 * Address is hard-coded (Premier Party Cruises marina). No group
 * ordering — each guest places an individual DraftOrder and gets their
 * own /invoice/<token> to pay. Submit re-uses POST /api/v1/landing/quote
 * with mode='pay-now'.
 */

import { useMemo, useState, type ReactElement, type FormEvent } from 'react';

export type DiscoCruiseProduct = {
  id: string;
  variantId: string;
  title: string;
  price: number;
  imageUrl?: string;
  handle: string;
};

export type DiscoCruiseSection = {
  type: string;
  emoji: string;
  products: DiscoCruiseProduct[];
};

type Selection = Record<string, number>;

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';
const CREAM = '#FFF7E1';
const RED = '#B81F2C';
const BLUE = '#143C7A';

const FIXED_ADDRESS = {
  line1: '13993 FM 2769',
  city: 'Leander',
  state: 'TX',
  zip: '78641',
};

type DeliverySlot = {
  id: string;
  eventLabel: string;
  eventWindow: string;
  deliveryLabel: string;
  /** ISO yyyy-mm-dd in America/Chicago. */
  deliveryDate: string;
  /** Human-readable time persisted to DraftOrder.deliveryTime. */
  deliveryTime: string;
};

// Delivery times are one hour before each event start time. America/Chicago.
const SLOTS: DeliverySlot[] = [
  {
    id: 'jul3-afternoon',
    eventLabel: 'July 3 · Afternoon Cruise',
    eventWindow: '1:00 PM – 5:00 PM',
    deliveryLabel: 'Delivery at 12:00 PM',
    deliveryDate: '2026-07-03',
    deliveryTime: '12:00 PM',
  },
  {
    id: 'jul3-evening',
    eventLabel: 'July 3 · Evening Cruise',
    eventWindow: '6:00 PM – 10:00 PM',
    deliveryLabel: 'Delivery at 5:00 PM',
    deliveryDate: '2026-07-03',
    deliveryTime: '5:00 PM',
  },
  {
    id: 'jul4-day',
    eventLabel: 'July 4 · Day Cruise',
    eventWindow: '11:00 AM – 3:00 PM',
    deliveryLabel: 'Delivery at 10:00 AM',
    deliveryDate: '2026-07-04',
    deliveryTime: '10:00 AM',
  },
];

type Props = { sections: DiscoCruiseSection[] };

export default function DiscoCruiseInvite({ sections }: Props): ReactElement {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selection, setSelection] = useState<Selection>({});
  const [slotId, setSlotId] = useState<string>(SLOTS[0].id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(true);

  // Flat product index for cheap subtotal + summary lookups.
  const productById = useMemo(() => {
    const map = new Map<string, DiscoCruiseProduct>();
    for (const section of sections) {
      for (const p of section.products) map.set(p.id, p);
    }
    return map;
  }, [sections]);

  const subtotal = useMemo(() => {
    let sum = 0;
    for (const [id, qty] of Object.entries(selection)) {
      const p = productById.get(id);
      if (p && qty > 0) sum += p.price * qty;
    }
    return sum;
  }, [selection, productById]);

  const itemCount = useMemo(
    () => Object.values(selection).reduce((s, q) => s + q, 0),
    [selection],
  );

  const slot = SLOTS.find((s) => s.id === slotId) ?? SLOTS[0];

  function setQty(productId: string, qty: number) {
    setSelection((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  }

  function inc(productId: string) {
    setQty(productId, (selection[productId] ?? 0) + 1);
  }
  function dec(productId: string) {
    setQty(productId, Math.max(0, (selection[productId] ?? 0) - 1));
  }

  function canAdvanceFrom(s: 1 | 2 | 3): boolean {
    if (s === 1) return itemCount > 0;
    if (s === 2) return SLOTS.some((x) => x.id === slotId);
    return ageConfirmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && name.trim().length > 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canAdvanceFrom(3) || submitting) return;

    setError(null);
    setSubmitting(true);

    const items = Object.entries(selection)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const p = productById.get(id);
        return p?.handle ? { handle: p.handle, qty } : null;
      })
      .filter((x): x is { handle: string; qty: number } => x !== null);

    if (items.length === 0) {
      setError('Add at least one item before continuing.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/landing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'pay-now',
          occasion: 'disco-cruise-event',
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          groupSize: 1,
          deliveryDate: slot.deliveryDate,
          deliveryTime: slot.deliveryTime,
          deliveryAddress: FIXED_ADDRESS.line1,
          deliveryCity: FIXED_ADDRESS.city,
          deliveryZip: FIXED_ADDRESS.zip,
          deliveryNotes: `4th of July Disco Cruise — ${slot.eventLabel}, event ${slot.eventWindow}.`,
          items,
        }),
      });
      const json = (await res.json()) as
        | { success: true; invoiceUrl?: string; checkoutUrl?: string }
        | { success: false; error?: string };
      if (!res.ok || !json.success) {
        const err = (json as { error?: string }).error;
        setError(err || 'Could not create your order. Try again?');
        setSubmitting(false);
        return;
      }
      const url = (json as { invoiceUrl?: string; checkoutUrl?: string }).checkoutUrl
        ?? (json as { invoiceUrl?: string }).invoiceUrl;
      if (url) {
        window.location.href = url;
      } else {
        setError('Order created but no payment link returned. Try refreshing.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('[DiscoCruiseInvite] submit failed', err);
      setError('Network blip — try again.');
      setSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen" style={{ background: CREAM }}>
      <Hero />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-32">
        <StepHeader step={step} setStep={setStep} canAdvance={canAdvanceFrom} />

        {step === 1 && (
          <StepOne
            sections={sections}
            selection={selection}
            inc={inc}
            dec={dec}
          />
        )}

        {step === 2 && (
          <StepTwo slotId={slotId} setSlotId={setSlotId} />
        )}

        {step === 3 && (
          <StepThree
            slot={slot}
            itemCount={itemCount}
            subtotal={subtotal}
            selection={selection}
            productById={productById}
            name={name}
            email={email}
            phone={phone}
            ageConfirmed={ageConfirmed}
            setName={setName}
            setEmail={setEmail}
            setPhone={setPhone}
            setAgeConfirmed={setAgeConfirmed}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      {/* Sticky footer cart on step 1 + 2 — same pattern as the dashboard
          bottom bar so the user always knows where they are. */}
      {step !== 3 && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 border-t-2"
          style={{ background: '#FFFFFF', borderColor: NAVY, boxShadow: '0 -6px 24px rgba(10,15,25,0.18)' }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-gray-500">
                {itemCount === 0 ? 'YOUR CART' : `${itemCount} ITEM${itemCount === 1 ? '' : 'S'}`}
              </div>
              <div
                className="font-heading text-lg sm:text-2xl font-bold tracking-wide"
                style={{ color: NAVY }}
              >
                ${subtotal.toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                disabled={step === 1}
                className="rounded-lg px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold tracking-[0.08em] transition-transform hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: '#FFFFFF',
                  color: NAVY,
                  border: `2px solid ${NAVY}`,
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (canAdvanceFrom(step)) setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
                }}
                disabled={!canAdvanceFrom(step)}
                className="rounded-lg px-4 sm:px-6 py-3 text-xs sm:text-base font-bold tracking-[0.08em] transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: GOLD,
                  color: NAVY,
                  border: `2px solid ${NAVY}`,
                  boxShadow: `0 3px 0 ${NAVY}`,
                }}
              >
                {step === 1 ? 'Schedule delivery →' : 'Continue →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────

function Hero() {
  return (
    <header
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 60%, ${RED} 130%)`,
        color: '#FFFFFF',
      }}
    >
      <div className="absolute inset-0 opacity-30" aria-hidden style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 1px, transparent 2px), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.2) 1px, transparent 2px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14 text-center">
        <div
          className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-3"
          style={{ background: GOLD, color: NAVY }}
        >
          🎆 PRIVATE EVENT INVITE
        </div>
        <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-wide leading-tight">
          4th of July Disco Cruise
          <br />
          <span style={{ color: GOLD }}>Drink Delivery</span>
        </h1>
        <p className="mt-4 text-sm md:text-base opacity-90 max-w-xl mx-auto">
          Pre-order your drinks for the cruise. Delivered straight to the
          dock — pick your time, pick your drinks, hop on the boat.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm" style={{ background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
          📍 13993 FM 2769, Leander, TX 78641
        </div>
      </div>
    </header>
  );
}

// ─── Step header ─────────────────────────────────────────────────────

function StepHeader({
  step,
  setStep,
  canAdvance,
}: {
  step: 1 | 2 | 3;
  setStep: (s: 1 | 2 | 3) => void;
  canAdvance: (s: 1 | 2 | 3) => boolean;
}) {
  const labels: Record<1 | 2 | 3, string> = {
    1: 'Choose your favorite cocktails & beverages',
    2: 'Schedule delivery',
    3: 'Party On!',
  };
  return (
    <div className="pt-6 pb-2">
      <div className="flex items-center justify-between gap-2 mb-3">
        {[1, 2, 3].map((n) => {
          const idx = n as 1 | 2 | 3;
          const isActive = step === idx;
          const isDone = step > idx;
          const clickable = isDone || isActive || canAdvance(step);
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                if (idx < step || (idx === step + 1 && canAdvance(step))) setStep(idx);
              }}
              disabled={!clickable}
              className="flex-1 rounded-lg px-2 sm:px-3 py-2 text-left transition-colors"
              style={{
                background: isActive ? NAVY : isDone ? '#FFFFFF' : '#F0F0F0',
                color: isActive ? GOLD : isDone ? NAVY : '#9CA3AF',
                border: `2px solid ${isActive || isDone ? NAVY : '#D1D5DB'}`,
              }}
            >
              <div className="text-[10px] font-bold tracking-widest">
                STEP {n}
              </div>
              <div className="text-xs sm:text-sm font-bold leading-tight">
                {labels[idx]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1 — Product picker ────────────────────────────────────────

function StepOne({
  sections,
  selection,
  inc,
  dec,
}: {
  sections: DiscoCruiseSection[];
  selection: Selection;
  inc: (id: string) => void;
  dec: (id: string) => void;
}) {
  return (
    <div className="mt-4 space-y-8">
      {sections.map((section) => (
        <SectionBlock
          key={section.type}
          section={section}
          selection={selection}
          inc={inc}
          dec={dec}
        />
      ))}
    </div>
  );
}

function SectionBlock({
  section,
  selection,
  inc,
  dec,
}: {
  section: DiscoCruiseSection;
  selection: Selection;
  inc: (id: string) => void;
  dec: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-2xl sm:text-3xl" aria-hidden>
          {section.emoji}
        </span>
        <h2
          className="font-heading text-xl sm:text-2xl font-bold tracking-wide"
          style={{ color: NAVY }}
        >
          {section.type}
        </h2>
        <span className="text-xs sm:text-sm text-gray-500">
          {section.products.length} {section.products.length === 1 ? 'option' : 'options'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {section.products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            qty={selection[p.id] ?? 0}
            onInc={() => inc(p.id)}
            onDec={() => dec(p.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  qty,
  onInc,
  onDec,
}: {
  product: DiscoCruiseProduct;
  qty: number;
  onInc: () => void;
  onDec: () => void;
}) {
  const inCart = qty > 0;
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col transition-transform hover:scale-[1.02]"
      style={{
        background: '#FFFFFF',
        border: `${inCart ? '2.5px' : '1.5px'} solid ${inCart ? NAVY : '#E5E7EB'}`,
        boxShadow: inCart ? `0 3px 0 ${NAVY}` : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="relative w-full aspect-square overflow-hidden"
        style={{ background: '#F4F4F4' }}
      >
        {product.imageUrl ? (
          // Plain img is fine here — the catalog uses external CDN URLs and
          // we don't want to wrestle with next.config remote patterns for a
          // private event page.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain p-2"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">
            🍾
          </div>
        )}
        {inCart && (
          <div
            className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ background: NAVY, color: GOLD }}
          >
            {qty} in cart
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div
          className="text-xs sm:text-sm font-bold leading-tight line-clamp-2"
          style={{ color: NAVY }}
        >
          {product.title}
        </div>
        <div
          className="mt-1 text-sm font-mono"
          style={{ color: NAVY }}
        >
          ${product.price.toFixed(2)}
        </div>
        <div className="mt-3 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={onDec}
            disabled={qty === 0}
            aria-label={`Decrease ${product.title}`}
            className="w-9 h-9 rounded-md text-base font-bold disabled:opacity-30 transition-transform active:scale-95"
            style={{
              background: '#FFFFFF',
              color: NAVY,
              border: `1.5px solid ${NAVY}`,
            }}
          >
            −
          </button>
          <div
            className="text-base font-bold w-6 text-center"
            style={{ color: NAVY }}
          >
            {qty}
          </div>
          <button
            type="button"
            onClick={onInc}
            aria-label={`Add ${product.title}`}
            className="flex-1 rounded-md py-2 text-xs sm:text-sm font-bold tracking-wide transition-transform active:scale-95"
            style={{
              background: GOLD,
              color: NAVY,
              border: `1.5px solid ${NAVY}`,
            }}
          >
            {inCart ? '+' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 — Schedule delivery ─────────────────────────────────────

function StepTwo({
  slotId,
  setSlotId,
}: {
  slotId: string;
  setSlotId: (id: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm text-gray-700 mb-4">
        Pick your cruise window. We deliver to the dock <strong>one hour
        before the event starts</strong> so your drinks are iced and ready.
      </p>
      <div className="space-y-3 mb-6">
        {SLOTS.map((slot) => {
          const isActive = slotId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSlotId(slot.id)}
              className="w-full text-left rounded-lg p-4 transition-transform hover:scale-[1.01]"
              style={{
                background: isActive ? NAVY : '#FFFFFF',
                color: isActive ? '#FFFFFF' : NAVY,
                border: `2px solid ${NAVY}`,
                boxShadow: isActive ? `0 3px 0 ${NAVY}` : 'none',
              }}
            >
              <div className="flex items-baseline gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1"
                  style={{
                    borderColor: isActive ? GOLD : NAVY,
                    background: isActive ? GOLD : '#FFFFFF',
                  }}
                  aria-hidden
                />
                <div className="flex-1">
                  <div className="font-heading text-base sm:text-lg font-bold tracking-wide">
                    {slot.eventLabel}
                  </div>
                  <div
                    className="text-xs sm:text-sm opacity-90"
                    style={isActive ? { color: GOLD } : {}}
                  >
                    Event window {slot.eventWindow}
                  </div>
                  <div className="text-xs sm:text-sm mt-1 opacity-80">
                    ⚡ {slot.deliveryLabel}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <DeliveryAddressCard />
    </div>
  );
}

function DeliveryAddressCard() {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: '#FFFFFF', border: `2px solid #E5E7EB` }}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0" aria-hidden>
          📍
        </div>
        <div>
          <div className="text-xs font-bold tracking-widest" style={{ color: NAVY }}>
            DELIVERY ADDRESS · LOCKED
          </div>
          <div className="text-sm sm:text-base font-bold mt-1" style={{ color: NAVY }}>
            {FIXED_ADDRESS.line1}
            <br />
            {FIXED_ADDRESS.city}, {FIXED_ADDRESS.state} {FIXED_ADDRESS.zip}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Marina dock for the disco cruise — same drop-off for all three windows.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 — Party On! (contact + pay) ──────────────────────────────

function StepThree({
  slot,
  itemCount,
  subtotal,
  selection,
  productById,
  name,
  email,
  phone,
  ageConfirmed,
  setName,
  setEmail,
  setPhone,
  setAgeConfirmed,
  submitting,
  error,
  onSubmit,
}: {
  slot: DeliverySlot;
  itemCount: number;
  subtotal: number;
  selection: Selection;
  productById: Map<string, DiscoCruiseProduct>;
  name: string;
  email: string;
  phone: string;
  ageConfirmed: boolean;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  setPhone: (v: string) => void;
  setAgeConfirmed: (v: boolean) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
}) {
  const lineItems = Object.entries(selection)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({
      product: productById.get(id),
      qty,
    }))
    .filter((x): x is { product: DiscoCruiseProduct; qty: number } => !!x.product);

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      {/* Order summary */}
      <div
        className="rounded-lg p-4"
        style={{ background: '#FFFFFF', border: `2px solid ${NAVY}` }}
      >
        <div className="text-xs font-bold tracking-widest mb-2" style={{ color: NAVY }}>
          YOUR ORDER
        </div>
        <ul className="space-y-1 text-sm" style={{ color: NAVY }}>
          {lineItems.map(({ product, qty }) => (
            <li key={product.id} className="flex justify-between gap-2">
              <span className="truncate">
                {qty}× {product.title}
              </span>
              <span className="font-mono flex-shrink-0">
                ${(product.price * qty).toFixed(2)}
              </span>
            </li>
          ))}
          {lineItems.length === 0 && (
            <li className="text-gray-500 italic">No items yet — go back to step 1.</li>
          )}
        </ul>
        <div
          className="mt-3 pt-3 flex justify-between font-bold border-t"
          style={{ borderColor: '#E5E7EB', color: NAVY }}
        >
          <span>Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})</span>
          <span className="font-mono">${subtotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Delivery fee + tax calculated at the next step.
        </p>
      </div>

      {/* Schedule recap */}
      <div
        className="rounded-lg p-4"
        style={{ background: CREAM, border: `1.5px solid ${GOLD}` }}
      >
        <div className="text-xs font-bold tracking-widest" style={{ color: NAVY }}>
          SCHEDULE
        </div>
        <div className="text-sm mt-1" style={{ color: NAVY }}>
          <strong>{slot.eventLabel}</strong> — event {slot.eventWindow}
          <br />
          ⚡ {slot.deliveryLabel} to {FIXED_ADDRESS.line1}, {FIXED_ADDRESS.city}
        </div>
      </div>

      {/* Contact */}
      <div
        className="rounded-lg p-4"
        style={{ background: '#FFFFFF', border: `1.5px solid #E5E7EB` }}
      >
        <div className="text-xs font-bold tracking-widest mb-3" style={{ color: NAVY }}>
          YOUR INFO
        </div>
        <div className="space-y-2">
          <input
            type="text"
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
            style={{ color: NAVY }}
          />
          <input
            type="email"
            required
            placeholder="Email — we'll send your receipt + delivery alert"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
            style={{ color: NAVY }}
          />
          <input
            type="tel"
            placeholder="Phone (optional — for delivery coordination)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base focus:border-brand-blue focus:outline-none"
            style={{ color: NAVY }}
          />
        </div>
      </div>

      {/* 21+ confirm */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={ageConfirmed}
          onChange={(e) => setAgeConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
        />
        <span className="text-sm text-gray-800 leading-snug">
          <span className="font-semibold">
            I&apos;m 21+ and confirm someone 21+ will be at the marina
          </span>{' '}
          to accept the order and show ID at delivery. (TABC requirement.)
        </span>
      </label>

      {error && (
        <div
          className="rounded-lg px-3 py-3 text-sm"
          style={{ background: '#FFE6E6', color: '#7A1F1F', border: '1.5px solid #E58A8A' }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || itemCount === 0 || !ageConfirmed || !name.trim() || !email.trim()}
        className="w-full rounded-lg py-4 text-base font-heading font-bold tracking-[0.12em] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: GOLD,
          color: NAVY,
          border: `2px solid ${NAVY}`,
          boxShadow: `0 4px 0 ${NAVY}`,
        }}
      >
        {submitting ? 'CREATING ORDER…' : `🎉 PARTY ON · PAY $${subtotal.toFixed(2)} →`}
      </button>
      <p className="text-xs text-center text-gray-500">
        Secure checkout via Stripe. Your card is charged on the next screen.
      </p>
    </form>
  );
}
