'use client';

/**
 * Client shell for the Austin Bachelor Concierge landing page.
 *
 * Structure:
 *   - Sticky nav (Premier Concierge wordmark + Plan CTA + phone)
 *   - Hero (headline + subhead + primary CTA)
 *   - Trust bar (stats)
 *   - Services grid (6 tiles — drinks, boats, golf/brewery, ATVs,
 *     gun range, transportation)
 *   - How-it-works strip
 *   - Testimonials placeholder
 *   - Final CTA
 *   - Sticky mobile CTA
 *
 * The multi-step questionnaire opens on CTA click and posts to
 * /api/v1/concierge/lead which handles Lead upsert + GHL fire + Google
 * Sheet append. See ConciergeQuestionnaireModal for the form.
 */

import Image from 'next/image';
import { useState, type ReactElement } from 'react';
import ConciergeQuestionnaireModal from './ConciergeQuestionnaireModal';

// ─── Brand tokens ─────────────────────────────────────────────────
// Default (bachelor) theme values kept as top-level constants so
// existing sub-components can reference them. The main component
// overrides these via a theme object when variant='bachelorette' by
// passing the theme through props.
const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const CREAM = '#FAF6EE';
const CHARCOAL = '#1C2A3A';
const YELLOW = '#F2D34F';

type Variant = 'bachelor' | 'bachelorette';

type Theme = {
  primary: string;   // Deep base (headings, borders)
  accent: string;    // Chip / CTA background
  soft: string;      // Card/backing tint
  onAccent: string;  // Text color when placed on `accent`
  charcoal: string;  // Trust-bar / dark section
};

const THEMES: Record<Variant, Theme> = {
  bachelor: {
    primary: NAVY,
    accent: GOLD,
    soft: CREAM,
    onAccent: NAVY,
    charcoal: CHARCOAL,
  },
  bachelorette: {
    primary: '#7A1E4A',       // deep raspberry
    accent: '#E8B4CE',        // rose
    soft: '#FFF4F8',          // blush
    onAccent: '#3F0F27',
    charcoal: '#3F0F27',
  },
};

type Copy = {
  hero: {
    eyebrow: string;
    h1a: string;              // pre-accent line
    h1b: string;              // accented line (uses theme accent)
    subhead: string;
  };
  trustStats: { label: string; stat: string }[];
  ctaLabels: {
    primary: string;
    secondary: string;
    services: string;
    finalCta: string;
    stickyMobile: string;
  };
  servicesHeading: string;
  servicesSub: string;
  finalCta: { h2: string; sub: string };
  confirmation: string;
};

const COPY_BY_VARIANT: Record<Variant, Copy> = {
  bachelor: {
    hero: {
      eyebrow: '🥃 AUSTIN, TX · FULL-SERVICE PLANNING',
      h1a: 'Premier Concierge',
      h1b: 'Bachelor Party Planning',
      subhead:
        'One weekend. One concierge. Boats on Lake Travis, drinks delivered to the dock, brewery tours, ATVs, gun range, and transportation — all planned before the groom lands.',
    },
    trustStats: [
      { label: 'Austin bachelor weekends served', stat: '500+' },
      { label: 'Google rating', stat: '5.0★' },
      { label: 'Vendors coordinated', stat: '30+' },
      { label: 'Concierge response', stat: '<24h' },
    ],
    ctaLabels: {
      primary: 'PLAN MY WEEKEND — FREE',
      secondary: 'or call (737) 371-9700',
      services: 'START PLANNING → 3 MIN',
      finalCta: 'START PLANNING — FREE →',
      stickyMobile: 'PLAN MY WEEKEND →',
    },
    servicesHeading: 'Everything for the weekend, in one plan',
    servicesSub:
      'Pick the pieces you want on the questionnaire. We book the vendors, stock the boat, and confirm every reservation before you land.',
    finalCta: {
      h2: 'One form. Your whole weekend, handled.',
      sub: "Fill it out. We'll come back within 24 hours with a plan + a fixed quote. No pressure, no upsells — just the weekend the group wanted.",
    },
    confirmation:
      "🎉 Got it — your concierge will reach out within 24 hours. Check your email for confirmation.",
  },
  bachelorette: {
    hero: {
      eyebrow: '🥂 AUSTIN, TX · BACHELORETTE PLANNING',
      h1a: 'Premier Concierge',
      h1b: 'Bachelorette Party Planning',
      subhead:
        "One weekend. One concierge. Rosé on Lake Travis, brunch on arrival, wineries in the Hill Country, spa recovery, and rides everywhere — all planned before the bride's flight lands.",
    },
    trustStats: [
      { label: 'Austin bachelorettes hosted', stat: '400+' },
      { label: 'Google rating', stat: '5.0★' },
      { label: 'Vendors coordinated', stat: '30+' },
      { label: 'Concierge response', stat: '<24h' },
    ],
    ctaLabels: {
      primary: 'PLAN THE WEEKEND — FREE',
      secondary: 'or call (737) 371-9700',
      services: 'START PLANNING → 3 MIN',
      finalCta: 'START PLANNING — FREE →',
      stickyMobile: 'PLAN THE WEEKEND →',
    },
    servicesHeading: 'The whole weekend, planned',
    servicesSub:
      "Tell us what your girls are into. We book the boat, stock the champagne, and lock in every reservation before you fly.",
    finalCta: {
      h2: 'One form. Whole weekend. Zero group-chat chaos.',
      sub: "Fill it out. Your concierge follows up within 24 hours with a plan + a fixed quote. No hidden fees — just the weekend the bride actually wants.",
    },
    confirmation:
      "🎉 Got it — your concierge will reach out within 24 hours. Check your email for confirmation.",
  },
};

// ─── Services ──────────────────────────────────────────────────────
type Service = {
  key: string;
  title: string;
  blurb: string;
  emoji: string;
  imgSrc: string;
  imgAlt: string;
  chip: string;
};

const SERVICES_BY_VARIANT: Record<Variant, Service[]> = {
  bachelor: [
    {
      key: 'boat-rental',
      title: 'Private Party Boats',
      blurb:
        'Lake Travis captained cruises — 4 to 40 guys, from cocktail rides to overnight charters. Docked at the marina where Premier lives.',
      emoji: '🛥️',
      imgSrc: '/images/destinations/lake-travis-boats.webp',
      imgAlt: 'Party boats docked on Lake Travis at sunset',
      chip: 'Most-booked',
    },
    {
      key: 'drink-delivery',
      title: 'Drink Delivery to the Dock',
      blurb:
        'Beer, liquor, seltzers, cocktail kits — iced and staged at the marina before you board. We already stock the boats.',
      emoji: '🥃',
      imgSrc: '/images/services/bach-parties/late-night-party-supplies.webp',
      imgAlt: 'Late-night party supplies laid out for delivery',
      chip: 'Free · no minimum',
    },
    {
      key: 'golf-brewery-tour',
      title: 'Golf & Brewery Tours',
      blurb:
        'Top-nine courses, small-batch breweries in East Austin, whiskey rooms. Curated tastings + tee times booked for the group.',
      emoji: '⛳',
      imgSrc: '/images/destinations/east-austin-brewery.webp',
      imgAlt: 'East Austin brewery interior with taproom bar',
      chip: 'Guys weekend',
    },
    {
      key: 'atv-tour',
      title: 'ATV & Off-Road Tours',
      blurb:
        'Hill Country trails, mud tracks, sunset rides. Guided groups with equipment, coolers optional (we can send them).',
      emoji: '🚙',
      imgSrc: '/images/destinations/hill-country-winery.webp',
      imgAlt: 'Texas Hill Country vista at golden hour',
      chip: 'Adrenaline',
    },
    {
      key: 'gun-range',
      title: 'Gun Range Experience',
      blurb:
        'Private lane blocks at Texas premier shooting ranges. Instructor-led sessions, pistol + rifle, all skill levels welcome.',
      emoji: '🎯',
      imgSrc: '/images/services/bach-parties/bachelor-party-epic.webp',
      imgAlt: 'Bachelor party group toasting at the range',
      chip: 'Only-in-Texas',
    },
    {
      key: 'transportation',
      title: 'Group Transportation',
      blurb:
        'Party bus, sprinter vans, and black car service. Airport pickup, downtown → lake shuttles, and late-night rides home.',
      emoji: '🚐',
      imgSrc: '/images/destinations/6th-street-entertainment.webp',
      imgAlt: '6th Street Austin nightlife strip',
      chip: 'Airport → Airport',
    },
  ],
  bachelorette: [
    {
      key: 'boat-rental',
      title: 'Private Party Boats',
      blurb:
        'Sunset cruises on Lake Travis with your girls. Captained charters, floating rosé bars, and the best sunset photos of the weekend.',
      emoji: '🛥️',
      imgSrc: '/images/destinations/lake-travis-boats.webp',
      imgAlt: 'Party boats on Lake Travis at sunset',
      chip: 'Most-booked',
    },
    {
      key: 'drink-delivery',
      title: 'Rosé, Bubbly & Cocktail Delivery',
      blurb:
        "Champagne towers, brunch mimosa bars, batched margaritas — iced and staged wherever you're staying. Free delivery, no minimum.",
      emoji: '🥂',
      imgSrc: '/images/services/bach-parties/bachelorette-champagne-tower.webp',
      imgAlt: 'Bachelorette champagne tower ready for a toast',
      chip: 'Free · no minimum',
    },
    {
      key: 'brunch-mimosa',
      title: 'Brunch & Mimosa Bars',
      blurb:
        'Private chef brunch at the Airbnb, mimosa bar set up on arrival, and reservations at the best Austin brunch spots — locked in before you fly.',
      emoji: '🥞',
      imgSrc: '/images/services/bach-parties/brunch-mimosa-bar.webp',
      imgAlt: 'Bachelorette brunch mimosa bar spread',
      chip: 'Weekend must',
    },
    {
      key: 'winery-tour',
      title: 'Wine & Winery Tours',
      blurb:
        'Hill Country wineries, curated tastings, and vineyard photo stops. Guided tours with rides — no designated driver needed.',
      emoji: '🍷',
      imgSrc: '/images/destinations/hill-country-winery.webp',
      imgAlt: 'Hill Country winery at golden hour',
      chip: 'Vineyard vibes',
    },
    {
      key: 'spa-day',
      title: 'Spa & Recovery Day',
      blurb:
        'In-Airbnb massages, blowouts on demand, mobile mani/pedi. The reset the group needs between the boat and the club.',
      emoji: '💆‍♀️',
      imgSrc: '/images/destinations/the-domain-upscale.webp',
      imgAlt: 'Upscale Austin lifestyle imagery',
      chip: 'Recovery',
    },
    {
      key: 'transportation',
      title: 'Group Transportation',
      blurb:
        'Sprinter vans, black cars, and party shuttles. Airport pickup, downtown → lake shuttles, and safe rides between every spot.',
      emoji: '🚐',
      imgSrc: '/images/destinations/rainey-street-nightlife.webp',
      imgAlt: 'Rainey Street nightlife district',
      chip: 'Airport → Airport',
    },
  ],
};

const STEPS = [
  {
    n: '01',
    title: 'Tell us the vibe',
    body: '3-minute questionnaire — who, when, how much, what you like.',
  },
  {
    n: '02',
    title: 'We plan the weekend',
    body: 'Our concierge stitches boat, drinks, activities, and rides into one plan.',
  },
  {
    n: '03',
    title: 'You show up',
    body: 'Everything is booked, iced, and staged before the groom lands.',
  },
];

type ClientProps = {
  variant?: Variant;
};

export default function ConciergeLandingClient({
  variant = 'bachelor',
}: ClientProps): ReactElement {
  const theme = THEMES[variant];
  const copy = COPY_BY_VARIANT[variant];
  const services = SERVICES_BY_VARIANT[variant];
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleSuccess() {
    setOpen(false);
    setConfirmed(true);
    // Scroll to top so the confirmation banner is immediately visible.
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{ background: theme.soft, color: theme.primary }}
    >
      <TopNav theme={theme} copy={copy} onCtaClick={() => setOpen(true)} />

      {confirmed && (
        <ConfirmationBanner text={copy.confirmation} />
      )}

      <Hero theme={theme} copy={copy} onCtaClick={() => setOpen(true)} />
      <TrustBar theme={theme} stats={copy.trustStats} />
      <ServicesGrid
        theme={theme}
        copy={copy}
        services={services}
        onCtaClick={() => setOpen(true)}
      />
      <HowItWorks theme={theme} copy={copy} onCtaClick={() => setOpen(true)} />
      <FinalCta theme={theme} copy={copy} onCtaClick={() => setOpen(true)} />

      {/* Sticky mobile CTA */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 border-t-2 md:hidden"
        style={{
          background: '#FFFFFF',
          borderColor: theme.primary,
          boxShadow: '0 -4px 18px rgba(10,15,25,0.15)',
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-gray-500">
              FREE PLANNING
            </div>
            <div className="text-sm font-bold" style={{ color: theme.primary }}>
              Concierge response in 24h
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg px-5 py-3 text-sm font-bold tracking-[0.08em] transition-transform hover:scale-[1.03]"
            style={{
              background: theme.accent,
              color: theme.onAccent,
              border: `2px solid ${theme.primary}`,
              boxShadow: `0 3px 0 ${theme.primary}`,
            }}
          >
            {copy.ctaLabels.stickyMobile}
          </button>
        </div>
      </div>

      {open && (
        <ConciergeQuestionnaireModal
          variant={variant}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </main>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────

function TopNav({
  theme,
  copy,
  onCtaClick,
}: {
  theme: Theme;
  copy: Copy;
  onCtaClick: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md"
      style={{
        background: `${theme.primary}EB`,
        borderBottom: `2px solid ${theme.accent}`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span
            className="font-heading text-lg sm:text-xl font-bold tracking-[0.15em]"
            style={{ color: theme.accent }}
          >
            PREMIER
          </span>
          <span
            className="font-heading text-lg sm:text-xl font-bold tracking-[0.15em] text-white"
          >
            CONCIERGE
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="tel:+17373719700"
            className="hidden sm:inline-flex items-center gap-1 text-white text-sm font-bold hover:opacity-80"
          >
            <PhoneIcon /> (737) 371-9700
          </a>
          <button
            type="button"
            onClick={onCtaClick}
            className="rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold tracking-[0.08em] transition-transform hover:scale-[1.03]"
            style={{
              background: theme.accent,
              color: theme.onAccent,
              border: '2px solid #1a1a1a',
            }}
          >
            {copy.ctaLabels.stickyMobile}
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────

function Hero({
  theme,
  copy,
  onCtaClick,
}: {
  theme: Theme;
  copy: Copy;
  onCtaClick: () => void;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/destinations/lake-travis-boats.webp"
          alt="Lake Travis party boats at golden hour"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${theme.primary}99 0%, ${theme.primary}D9 100%)`,
          }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-24 lg:py-32 text-center text-white">
        <div
          className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-4"
          style={{ background: theme.accent, color: theme.onAccent }}
        >
          {copy.hero.eyebrow}
        </div>
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
          {copy.hero.h1a}
          <br />
          <span style={{ color: theme.accent }}>{copy.hero.h1b}</span>
        </h1>
        <p className="mt-5 text-base md:text-lg opacity-90 max-w-2xl mx-auto">
          {copy.hero.subhead}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCtaClick}
            className="rounded-lg px-6 py-4 text-base md:text-lg font-heading font-bold tracking-[0.12em] transition-transform hover:scale-[1.03]"
            style={{
              background: theme.accent,
              color: theme.onAccent,
              border: `2px solid ${theme.primary}`,
              boxShadow: `0 4px 0 ${theme.primary}`,
            }}
          >
            {copy.ctaLabels.primary}
          </button>
          <a
            href="tel:+17373719700"
            className="text-sm sm:text-base font-bold text-white hover:opacity-80 flex items-center gap-1.5"
          >
            <PhoneIcon /> {copy.ctaLabels.secondary}
          </a>
        </div>
        <p className="mt-4 text-xs opacity-70">
          3-minute questionnaire · concierge follows up within 24 hours
        </p>
      </div>
    </section>
  );
}

// ─── Trust bar ──────────────────────────────────────────────────────

function TrustBar({
  theme,
  stats,
}: {
  theme: Theme;
  stats: { label: string; stat: string }[];
}) {
  return (
    <section
      className="text-white py-6 sm:py-8"
      style={{ background: theme.charcoal, borderBottom: `2px solid ${theme.accent}` }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <div
              className="font-heading text-2xl md:text-4xl font-bold"
              style={{ color: theme.accent }}
            >
              {s.stat}
            </div>
            <div className="text-xs sm:text-sm uppercase tracking-widest opacity-80 mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Services grid ─────────────────────────────────────────────────

function ServicesGrid({
  theme,
  copy,
  services,
  onCtaClick,
}: {
  theme: Theme;
  copy: Copy;
  services: Service[];
  onCtaClick: () => void;
}) {
  return (
    <section id="services" className="py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="text-xs font-bold tracking-[0.22em] text-gray-500 mb-2">
            WHAT WE COORDINATE
          </div>
          <h2
            className="font-heading text-3xl md:text-4xl font-bold tracking-tight"
            style={{ color: theme.primary }}
          >
            {copy.servicesHeading}
          </h2>
          <p className="mt-3 text-gray-700 max-w-2xl mx-auto">
            {copy.servicesSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <ServiceCard key={s.key} service={s} theme={theme} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={onCtaClick}
            className="rounded-lg px-6 py-4 text-base font-heading font-bold tracking-[0.12em] transition-transform hover:scale-[1.03]"
            style={{
              background: theme.accent,
              color: theme.onAccent,
              border: `2px solid ${theme.primary}`,
              boxShadow: `0 4px 0 ${theme.primary}`,
            }}
          >
            {copy.ctaLabels.services}
          </button>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  theme,
}: {
  service: Service;
  theme: Theme;
}) {
  return (
    <article
      className="rounded-2xl overflow-hidden flex flex-col shadow-sm transition-transform hover:scale-[1.02]"
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${theme.primary}`,
        boxShadow: `0 3px 0 ${theme.primary}18`,
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={service.imgSrc}
          alt={service.imgAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 55%, ${theme.primary}99 100%)`,
          }}
        />
        <div
          className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest"
          style={{ background: theme.accent, color: theme.onAccent }}
        >
          {service.chip}
        </div>
        <div
          className="absolute bottom-3 left-3 text-3xl leading-none"
          aria-hidden
        >
          {service.emoji}
        </div>
      </div>
      <div className="p-4 sm:p-5 flex-1">
        <h3
          className="font-heading text-lg sm:text-xl font-bold tracking-tight mb-1"
          style={{ color: theme.primary }}
        >
          {service.title}
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          {service.blurb}
        </p>
      </div>
    </article>
  );
}

// ─── How it works ──────────────────────────────────────────────────

function HowItWorks({
  theme,
  copy,
  onCtaClick,
}: {
  theme: Theme;
  copy: Copy;
  onCtaClick: () => void;
}) {
  return (
    <section
      className="py-14 md:py-20"
      style={{ background: theme.primary, color: '#FFFFFF' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div
            className="text-xs font-bold tracking-[0.22em] mb-2"
            style={{ color: theme.accent }}
          >
            HOW IT WORKS
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            Three moves. Then the weekend runs itself.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${theme.accent}`,
              }}
            >
              <div
                className="font-heading text-3xl font-bold"
                style={{ color: theme.accent }}
              >
                {s.n}
              </div>
              <div className="font-heading text-xl font-bold tracking-wide mt-2">
                {s.title}
              </div>
              <div className="text-sm opacity-90 mt-2">{s.body}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={onCtaClick}
            className="rounded-lg px-6 py-4 text-base font-heading font-bold tracking-[0.12em] transition-transform hover:scale-[1.03]"
            style={{
              background: theme.accent,
              color: theme.onAccent,
              border: `2px solid ${YELLOW}`,
              boxShadow: `0 4px 0 rgba(0,0,0,0.4)`,
            }}
          >
            {copy.ctaLabels.stickyMobile}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────

function FinalCta({
  theme,
  copy,
  onCtaClick,
}: {
  theme: Theme;
  copy: Copy;
  onCtaClick: () => void;
}) {
  return (
    <section className="py-14 md:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2
          className="font-heading text-3xl md:text-4xl font-bold tracking-tight"
          style={{ color: theme.primary }}
        >
          {copy.finalCta.h2}
        </h2>
        <p className="mt-3 text-gray-700 max-w-2xl mx-auto">
          {copy.finalCta.sub}
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onCtaClick}
            className="rounded-lg px-8 py-4 text-lg font-heading font-bold tracking-[0.12em] transition-transform hover:scale-[1.03]"
            style={{
              background: theme.accent,
              color: theme.onAccent,
              border: `2px solid ${theme.primary}`,
              boxShadow: `0 4px 0 ${theme.primary}`,
            }}
          >
            {copy.ctaLabels.finalCta}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Confirmation banner (post-submit) ─────────────────────────────

function ConfirmationBanner({ text }: { text: string }) {
  return (
    <div
      className="text-white text-center py-3 px-4 text-sm font-bold"
      style={{ background: '#0F8141' }}
    >
      {text}
    </div>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1 .37 1.98.72 2.92a2 2 0 0 1-.45 2.11L8.09 10.09a16 16 0 0 0 6 6l1.34-1.34a2 2 0 0 1 2.11-.45c.94.35 1.92.59 2.92.72A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
