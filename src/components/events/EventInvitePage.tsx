'use client';

/**
 * EVENT INVITE PAGE (invitee-facing)
 *
 * Single full-page component that renders the public party-invite UX. A
 * server component wraps this and hands it the resolved event + curated
 * drink options.
 *
 * Flow:
 *   1. Hero with countdown, host, date, location, big RSVP CTA
 *   2. RSVP card (name, email, phone, +1 count, message)
 *   3. On submit → auto-pop OrderDrinksModal (BYOB ordering)
 *   4. Vibes gallery, details strip, day-of contact
 *   5. Bottom share-bar — copy link / SMS / Facebook
 *
 * Visually mirrors the landing-page template so the brand carries through.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useLeadCapture } from '@/lib/leads/client';
import type { EventInvite } from '@/lib/events/types';
import { EVENT_THEMES } from '@/lib/events/theme';
import type { DrinkOption } from './OrderDrinksModal';
import EventDrinksMenuModal from './EventDrinksMenuModal';
import type { CuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { loadRsvp, saveRsvp, loadCart } from '@/lib/events/sessionStore';

type Props = {
  event: EventInvite;
  /** Kept for backward compat — used by the legacy compact modal. */
  drinkOptions: DrinkOption[];
  /** Full a-la-carte catalog (same as bachelor landing page). */
  catalog: CuratedCatalog;
};

export default function EventInvitePage({ event, catalog }: Props) {
  const theme = EVENT_THEMES[event.theme];

  // RSVP state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'rsvped'>('idle');
  const [showDrinks, setShowDrinks] = useState(false);
  const rsvpRef = useRef<HTMLDivElement>(null);

  // On mount, hydrate from localStorage (24h TTL). Lets a returning
  // invitee skip re-entering their RSVP info AND pick up an in-progress
  // drink order. Also pops a small "resume" callout if they have unfinished
  // drink selections waiting.
  const [hasUnfinishedCart, setHasUnfinishedCart] = useState(false);
  useEffect(() => {
    const stored = loadRsvp(event.slug);
    if (stored) {
      if (stored.firstName) setFirstName(stored.firstName);
      if (stored.lastName) setLastName(stored.lastName);
      if (stored.email) setEmail(stored.email);
      if (stored.phone) setPhone(stored.phone);
      if (stored.guestCount) setGuests(stored.guestCount);
      if (stored.message) setMessage(stored.message);
      // Email is the strongest signal someone actually finished the RSVP.
      if (stored.email && stored.firstName) setStatus('rsvped');
    }
    const cart = loadCart(event.slug);
    if (cart && Object.values(cart.selection).some((n) => n > 0)) {
      setHasUnfinishedCart(true);
    }
  }, [event.slug]);

  // Whenever the RSVP fields change, snapshot to localStorage so a tab
  // close doesn't lose progress. Debounced lightly so we don't write on
  // every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (firstName || email || phone) {
        saveRsvp(event.slug, {
          firstName,
          lastName,
          email,
          phone,
          guestCount: guests,
          message,
        });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [event.slug, firstName, lastName, email, phone, guests, message]);

  // Live countdown
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 60);
    return () => clearInterval(t);
  }, []);
  const countdown = useMemo(() => {
    const start = new Date(event.startsAt).getTime();
    const diff = start - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return { days, hours, minutes };
  }, [now, event.startsAt]);

  const formattedDate = useMemo(() => {
    const d = new Date(event.startsAt);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: event.timezone,
    });
  }, [event.startsAt, event.timezone]);
  const formattedTime = useMemo(() => {
    const d = new Date(event.startsAt);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: event.timezone,
    });
  }, [event.startsAt, event.timezone]);

  // Lead capture wired in (this is a form-bearing page too).
  const lead = useLeadCapture({ widget: 'CONTACT_FORM', page: `/events/${event.slug}` });

  const handleRsvp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) return;
    lead.onFormSubmit(
      { firstName, lastName, email, phone },
      {
        eventSlug: event.slug,
        eventTitle: event.title,
        flow: 'event-rsvp',
        guests,
      },
    );
    setStatus('rsvped');
    // Auto-open the BYOB modal if drinks are enabled.
    if (event.drinks.enabled) {
      setTimeout(() => setShowDrinks(true), 400);
    }
  };

  const scrollToRsvp = () => {
    rsvpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://partyondelivery.com/events/${event.slug}`;

  return (
    <div className="min-h-screen" style={{ background: theme.cream, color: theme.navy }}>
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0">
          <Image
            src={event.heroImage}
            alt={event.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,15,25,0.35) 0%, rgba(10,15,25,0.7) 100%)',
            }}
          />
        </div>
        <div className="relative max-w-5xl mx-auto px-5 md:px-8 pt-24 md:pt-32 pb-12 md:pb-16 text-white">
          <div
            className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: theme.primary, color: theme.primaryText }}
          >
            🎉 YOU&apos;RE INVITED
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight tracking-[0.02em] mb-4">
            {event.title}
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mb-6 opacity-95">{event.tagline}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mb-7">
            <Pill icon="📅" label="When" value={`${formattedDate} · ${formattedTime}`} />
            <Pill icon="📍" label="Where" value={event.venue} sub={event.cityState} />
            <Pill icon="👤" label="Host" value={event.hostName} sub={event.hostTagline} />
          </div>

          {countdown && (
            <div
              className="inline-flex gap-2 md:gap-3 mb-7 px-4 py-2 rounded-md backdrop-blur"
              style={{ background: 'rgba(0,0,0,0.35)' }}
            >
              <CountdownCell n={countdown.days} label="days" />
              <CountdownCell n={countdown.hours} label="hrs" />
              <CountdownCell n={countdown.minutes} label="min" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={scrollToRsvp}
              className="px-7 py-4 rounded-md font-bold text-sm md:text-base tracking-wider transition-transform hover:scale-[1.02]"
              style={{ background: theme.primary, color: theme.primaryText }}
            >
              {status === 'rsvped' ? "✓ YOU'RE IN — ORDER DRINKS" : 'RSVP NOW →'}
            </button>
            {status === 'rsvped' && event.drinks.enabled && (
              <button
                onClick={() => setShowDrinks(true)}
                className="px-7 py-4 rounded-md font-bold text-sm md:text-base tracking-wider border-2 border-white text-white hover:bg-white/15"
              >
                🍸 ORDER YOUR DRINKS →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* DESCRIPTION + DETAILS */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2
              className="font-heading text-2xl md:text-3xl font-bold mb-4 tracking-wide"
              style={{ color: theme.navy }}
            >
              The deal
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-gray-800 whitespace-pre-line">
              {event.description}
            </p>
          </div>
          <div>
            <h3
              className="font-heading text-lg font-bold mb-3 tracking-wide"
              style={{ color: theme.navy }}
            >
              Need to know
            </h3>
            <ul className="space-y-2">
              {event.details.map((d) => (
                <li key={d.label} className="text-sm">
                  <span className="font-bold" style={{ color: theme.navy }}>
                    {d.label}:
                  </span>{' '}
                  <span className="text-gray-700">{d.value}</span>
                </li>
              ))}
            </ul>
            {event.dayOfContactName && event.dayOfContactPhone && (
              <div
                className="mt-4 rounded-md p-3 text-xs"
                style={{ background: theme.cream, border: `1px solid ${theme.primary}55` }}
              >
                <div className="font-bold mb-0.5">Day-of contact</div>
                <div>
                  {event.dayOfContactName} · {event.dayOfContactPhone}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* RSVP CARD */}
      <section
        ref={rsvpRef}
        id="rsvp"
        className="py-12 md:py-16"
        style={{ background: theme.navy, color: '#FFFFFF' }}
      >
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <div className="text-center mb-6">
            <div
              className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-3"
              style={{ background: theme.primary, color: theme.primaryText }}
            >
              STEP 1 OF 2 · RSVP
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-wide mb-2">
              {status === 'rsvped' ? "You're on the list." : 'Lock in your spot.'}
            </h2>
            <p className="text-sm md:text-base opacity-90 max-w-xl mx-auto">
              {status === 'rsvped'
                ? `Nice, ${firstName}. Next up — order your drinks so you've got exactly what you want when you walk in.`
                : 'Quick form. 30 seconds. Then pick your drinks so the bar is stocked when you arrive.'}
            </p>
          </div>

          {status === 'idle' ? (
            <form
              onSubmit={handleRsvp}
              noValidate
              data-lead-capture="manual"
              data-lead-widget="CONTACT_FORM"
              className="bg-white rounded-xl p-5 md:p-6 shadow-xl space-y-3"
              style={{ color: theme.navy }}
            >
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First name"
                  required
                  value={firstName}
                  onChange={setFirstName}
                  onBlur={(v) => lead.onBlurField('firstName', v, { firstName: v })}
                />
                <Input
                  label="Last name"
                  value={lastName}
                  onChange={setLastName}
                  onBlur={(v) => lead.onBlurField('lastName', v, { lastName: v })}
                />
              </div>
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={setEmail}
                onBlur={(v) => lead.onBlurField('email', v, { email: v })}
              />
              <Input
                label="Phone (for text reminders)"
                type="tel"
                value={phone}
                onChange={setPhone}
                onBlur={(v) => lead.onBlurField('phone', v, { phone: v })}
              />
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">
                  HOW MANY OF YOU?
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    className="w-10 h-10 rounded-md bg-gray-100 font-bold"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold w-10 text-center">{guests}</span>
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.min(10, g + 1))}
                    className="w-10 h-10 rounded-md font-bold"
                    style={{ background: theme.primary, color: theme.primaryText }}
                  >
                    +
                  </button>
                  <span className="text-xs text-gray-500 ml-2">
                    Including you. +1s welcome, just give us a heads-up.
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">
                  MESSAGE TO THE HOST (OPTIONAL)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Can't wait. Bringing the karaoke speaker."
                  className="w-full rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 rounded-md font-bold tracking-wider transition-transform hover:scale-[1.01]"
                style={{ background: theme.primary, color: theme.primaryText }}
              >
                LOCK IN MY RSVP →
              </button>
              <p className="text-[11px] text-gray-500 text-center pt-1">
                We&apos;ll send a text reminder the day before. No spam, ever.
              </p>
            </form>
          ) : (
            <div
              className="bg-white rounded-xl p-6 md:p-8 shadow-xl text-center"
              style={{ color: theme.navy }}
            >
              <div
                className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ background: theme.primary, color: theme.primaryText }}
              >
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">
                RSVP confirmed for {firstName} {lastName}
              </h3>
              <p className="text-sm text-gray-700 mb-5">
                {guests > 1
                  ? `${guests} of you on the list.`
                  : "You're on the list."}{' '}
                We&apos;ll text {phone || 'you'} the day before with parking + arrival
                tips.
              </p>
              {event.drinks.enabled && (
                <>
                  {hasUnfinishedCart && (
                    <div
                      className="mb-3 rounded-md p-2.5 text-xs text-left"
                      style={{
                        background: theme.cream,
                        color: theme.navy,
                        border: `1px solid ${theme.primary}55`,
                      }}
                    >
                      ⏱ <strong>Picked up where you left off</strong> — we saved your
                      drink order. Click below to finish before the cutoff.
                    </div>
                  )}
                  <button
                    onClick={() => setShowDrinks(true)}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-md font-bold tracking-wider"
                    style={{ background: theme.primary, color: theme.primaryText }}
                  >
                    {hasUnfinishedCart ? '🍸 FINISH YOUR ORDER →' : '🍸 ORDER YOUR DRINKS →'}
                  </button>
                </>
              )}
              <p className="text-[11px] text-gray-500 mt-3">
                Free delivery to the venue. Pay your own way. Your name on the box.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* VIBES GALLERY */}
      {event.gallery && event.gallery.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="max-w-5xl mx-auto px-5 md:px-8">
            <h2
              className="font-heading text-2xl md:text-3xl font-bold mb-5 tracking-wide text-center"
              style={{ color: theme.navy }}
            >
              The vibes
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
              {event.gallery.map((img, i) => (
                <div
                  key={img}
                  className="relative aspect-square rounded-md overflow-hidden"
                  style={{ gridColumn: i === 0 ? 'span 2' : undefined, gridRow: i === 0 ? 'span 2' : undefined }}
                >
                  <Image src={img} alt={`Vibe ${i + 1}`} fill className="object-cover" sizes="(min-width:768px) 20vw, 50vw" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SHARE BAR */}
      <section className="py-10 md:py-12" style={{ background: theme.cream }}>
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <h2
            className="font-heading text-xl md:text-2xl font-bold mb-2 tracking-wide"
            style={{ color: theme.navy }}
          >
            Know someone who&apos;d roll with us?
          </h2>
          <p className="text-sm text-gray-700 mb-4">
            Share the invite — they RSVP, they order their own drinks, everyone shows up ready.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <ShareButton
              label="Copy link"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  void navigator.clipboard.writeText(shareUrl);
                }
              }}
              theme={theme}
            />
            <a
              href={`sms:?&body=${encodeURIComponent(
                `You're invited: ${event.title} — ${shareUrl}`,
              )}`}
              className="px-5 py-2.5 rounded-md font-bold text-sm tracking-wider transition-transform hover:scale-[1.02]"
              style={{ background: theme.primary, color: theme.primaryText }}
            >
              💬 TEXT INVITE
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-md font-bold text-sm tracking-wider bg-white border-2"
              style={{ borderColor: theme.navy, color: theme.navy }}
            >
              ⓕ FACEBOOK
            </a>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Powered by Party On Delivery · partyondelivery.com
          </p>
        </div>
      </section>

      {/* DRINK ORDER MODAL — full a-la-carte step flow (mirrors bachelor
          landing page Package Builder, minus contact + delivery forms since
          we already have those from the RSVP + event). */}
      <EventDrinksMenuModal
        open={showDrinks}
        onClose={() => setShowDrinks(false)}
        event={event}
        theme={theme}
        catalog={catalog}
        guestName={`${firstName} ${lastName}`.trim()}
        guestEmail={email}
        guestPhone={phone}
      />
    </div>
  );
}

function Pill({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-md px-3 py-2 backdrop-blur"
      style={{ background: 'rgba(0,0,0,0.35)' }}
    >
      <div className="text-[10px] font-bold tracking-widest opacity-80">
        {icon} {label}
      </div>
      <div className="text-sm font-bold leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[11px] opacity-80 leading-tight">{sub}</div>}
    </div>
  );
}

function CountdownCell({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center min-w-[44px]">
      <div className="text-2xl md:text-3xl font-bold leading-none">{n}</div>
      <div className="text-[10px] uppercase tracking-widest opacity-80 mt-0.5">{label}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">
        {label.toUpperCase()}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        className="w-full rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

function ShareButton({
  label,
  onClick,
  theme,
}: {
  label: string;
  onClick: () => void;
  theme: { navy: string };
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="px-5 py-2.5 rounded-md font-bold text-sm tracking-wider bg-white border-2"
      style={{ borderColor: theme.navy, color: theme.navy }}
    >
      {copied ? '✓ COPIED' : `🔗 ${label.toUpperCase()}`}
    </button>
  );
}
