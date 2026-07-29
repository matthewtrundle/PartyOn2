'use client';

/**
 * Partner Pitch Deck — /partners/pitch
 *
 * 5-slide horizontal deck. Allan walks through it in meetings with luxury STR
 * property managers; also lives behind QR codes on Premier boats so it must
 * work on mobile (vertical-scroll fallback under md).
 *
 * One-off page — content is hardcoded inline, no abstractions.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import PartnerDashboardMock from '@/components/partners/PartnerDashboardMock';

const TOTAL_SLIDES = 5;

// Slide indices with dark backgrounds — controls accent color of the nav UI
// (yellow on dark slides, blue on cream slides).
const DARK_SLIDES = new Set([0, 4]);

const CALENDLY_URL =
  process.env.NEXT_PUBLIC_PARTNER_CALENDLY_URL ||
  'https://123.partyondelivery.com/partnership-call';

export default function PartnerPitchDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  // Track viewport (desktop = horizontal deck, mobile = vertical scroll)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Respect prefers-reduced-motion — skip slide transitions, jump-cut instead
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Keyboard navigation (desktop only — mobile scrolls naturally)
  useEffect(() => {
    if (!isDesktop) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlide(0);
        setHasInteracted(true);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlide(TOTAL_SLIDES - 1);
        setHasInteracted(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDesktop]);

  const goNext = () => {
    setHasInteracted(true);
    setCurrentSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
  };
  const goPrev = () => {
    setHasInteracted(true);
    setCurrentSlide((s) => Math.max(s - 1, 0));
  };
  const goTo = (i: number) => {
    setHasInteracted(true);
    setCurrentSlide(Math.max(0, Math.min(i, TOTAL_SLIDES - 1)));
  };

  const onCurrentDark = DARK_SLIDES.has(currentSlide);
  const accent = onCurrentDark ? 'text-brand-yellow' : 'text-brand-blue';
  const accentBg = onCurrentDark ? 'bg-brand-yellow' : 'bg-brand-blue';

  return (
    <>
      <Navigation hidden />
      <div className="md:overflow-hidden md:h-screen md:w-screen md:fixed md:inset-0">
        {/* Slide track — flex column on mobile (natural scroll), flex row on
            desktop with translateX driven by currentSlide. */}
        <div
          className="flex flex-col md:flex-row md:h-screen"
          style={
            isDesktop
              ? {
                  transform: `translateX(-${currentSlide * 100}vw)`,
                  transition: reduceMotion || !hasInteracted
                    ? 'none'
                    : 'transform 500ms ease-out',
                }
              : undefined
          }
        >
          <Slide1 />
          <Slide2 />
          <Slide3 />
          <Slide4 />
          <Slide5 />
        </div>

        {/* Click zones — desktop only. Left third = prev, right third = next,
            middle does nothing so clicks on actual content don't advance. */}
        {isDesktop && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={goPrev}
              className="hidden md:block fixed top-0 left-0 h-screen w-1/3 z-10 cursor-w-resize bg-transparent"
              style={{ pointerEvents: currentSlide === 0 ? 'none' : 'auto' }}
            />
            <button
              type="button"
              aria-label="Next slide"
              onClick={goNext}
              className="hidden md:block fixed top-0 right-0 h-screen w-1/3 z-10 cursor-e-resize bg-transparent"
              style={{ pointerEvents: currentSlide === TOTAL_SLIDES - 1 ? 'none' : 'auto' }}
            />
          </>
        )}

        {/* Bottom nav — chevrons, dots, counter. Hidden on mobile. */}
        {isDesktop && (
          <>
            {/* Left chevron */}
            <button
              type="button"
              onClick={goPrev}
              disabled={currentSlide === 0}
              aria-label="Previous slide"
              className={`hidden md:flex fixed bottom-6 left-6 z-20 h-12 w-12 items-center justify-center rounded-full transition-opacity disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                onCurrentDark ? 'focus-visible:ring-brand-yellow' : 'focus-visible:ring-brand-blue'
              } ${accent}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {/* Right chevron */}
            <button
              type="button"
              onClick={goNext}
              disabled={currentSlide === TOTAL_SLIDES - 1}
              aria-label="Next slide"
              className={`hidden md:flex fixed bottom-6 right-6 z-20 h-12 w-12 items-center justify-center rounded-full transition-opacity disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                onCurrentDark ? 'focus-visible:ring-brand-yellow' : 'focus-visible:ring-brand-blue'
              } ${accent}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
            </button>

            {/* Dots */}
            <div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 z-20 gap-3">
              {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === currentSlide}
                  className={`h-2 w-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    i === currentSlide
                      ? `${accentBg} w-8`
                      : onCurrentDark
                      ? 'bg-cream/30'
                      : 'bg-navy/30'
                  } ${onCurrentDark ? 'focus-visible:ring-brand-yellow' : 'focus-visible:ring-brand-blue'}`}
                />
              ))}
            </div>

            {/* Counter */}
            <div
              ref={counterRef}
              aria-live="polite"
              className={`hidden md:block fixed bottom-7 right-24 z-20 font-heading font-semibold tracking-[0.15em] text-sm ${accent}`}
            >
              {String(currentSlide + 1).padStart(2, '0')} / {String(TOTAL_SLIDES).padStart(2, '0')}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ============================================================================
 * SLIDE 1 — Hero / Intro (navy)
 * ========================================================================== */
function Slide1() {
  return (
    <section
      aria-label="Slide 1 of 5: Party On Delivery partner program intro"
      className="relative w-full md:w-screen md:h-screen md:flex-shrink-0 bg-navy text-cream font-manrope flex"
    >
      <div className="container mx-auto max-w-7xl px-8 md:px-12 py-16 md:py-20 flex flex-col justify-center w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left 55% */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="font-heading font-extrabold text-xl md:text-2xl tracking-[0.05em] text-white mb-10">
              PARTY ON DELIVERY
            </div>
            <div className="eyebrow text-[11px] md:text-xs font-semibold tracking-[0.18em] uppercase text-brand-yellow mb-5">
              Partner Program
            </div>
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.01em] text-white mb-8">
              The bar program your luxury rentals
              <br />
              <span className="font-fraunces italic font-normal text-brand-yellow">
                have been missing.
              </span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-cream/80 max-w-xl mb-10 leading-relaxed">
              TABC-licensed alcohol delivery, signature cocktail kits, bartender coordination,
              and full bar setup. Built for the bookings that matter.
            </p>
            <div className="eyebrow text-[10px] md:text-xs font-semibold tracking-[0.18em] uppercase text-brand-blue">
              For luxury STR property managers · Austin, TX
            </div>
          </div>
          {/* Right 45% — image */}
          <div className="lg:col-span-5 relative h-[300px] sm:h-[400px] lg:h-[560px] rounded-lg overflow-hidden">
            <Image
              src="/email-assets/pod-cocktail-kits.jpg"
              alt="POD signature cocktail kits — Rum Punch, Arnold Palmer, Austin Ritas"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-navy/70 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * SLIDE 2 — Capabilities (cream)
 * ========================================================================== */
function Slide2() {
  const cards = [
    {
      img: '/email-assets/pod-cocktail-kits.jpg',
      alt: 'Signature cocktail kit dispensers branded with Austin-themed names',
      eyebrow: 'Cocktail Kits',
      title: '20+ signature cocktails.',
      desc: 'Pre-batched, self-serve dispensers branded with Austin-themed names. Texas spirits, Fresh Victor mixers. Mocktails included.',
    },
    {
      img: '/email-assets/pod-stocked-fridge.jpg',
      alt: 'Stocked fridge sorted by use case',
      eyebrow: 'Pre-Stocking',
      title: 'The fridge is ready.',
      desc: 'Sorted by use case. Welcome cocktails chilled. Pool-day cans within reach. Same-day restock if guests run out.',
    },
    {
      img: '/email-assets/pod-finished-drink.jpg',
      alt: 'Finished signature cocktail with fresh garnish',
      eyebrow: 'Presentation',
      title: 'What guests pour.',
      desc: 'Real glassware, fresh garnishes, mixed properly. This is what shows up in their photos — not a red Solo cup.',
    },
  ];

  return (
    <section
      aria-label="Slide 2 of 5: What POD handles"
      className="relative w-full md:w-screen md:h-screen md:flex-shrink-0 bg-cream text-gray-900 font-manrope flex flex-col"
    >
      <div className="container mx-auto max-w-7xl px-8 md:px-12 py-16 md:py-20 flex-1 flex flex-col justify-center">
        <div className="mb-10 md:mb-14">
          <div className="eyebrow text-[11px] md:text-xs font-semibold tracking-[0.18em] uppercase text-brand-blue mb-4">
            What POD handles
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl leading-[1] tracking-[-0.01em] text-gray-900">
            One vendor.{' '}
            <span className="font-fraunces italic font-normal text-brand-blue">
              The whole bar program.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {cards.map((c) => (
            <div key={c.eyebrow} className="bg-white rounded-lg overflow-hidden shadow-lg flex flex-col">
              <div className="relative aspect-[16/10] w-full bg-gray-100">
                <Image
                  src={c.img}
                  alt={c.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-6 md:p-7 flex flex-col flex-1">
                <div className="eyebrow text-[10px] md:text-xs font-semibold tracking-[0.18em] uppercase text-brand-blue mb-2">
                  {c.eyebrow}
                </div>
                <div className="font-heading font-extrabold text-2xl md:text-3xl tracking-[-0.005em] text-gray-900 mb-3 leading-tight">
                  {c.title}
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="bg-brand-blue text-white py-5 px-6 overflow-hidden">
        <div className="font-heading font-bold text-sm md:text-base tracking-[0.1em] uppercase text-center whitespace-nowrap overflow-hidden text-ellipsis">
          <span className="text-brand-yellow">★</span> TABC LICENSED &nbsp;
          <span className="text-brand-yellow">★</span> 20+ COCKTAILS &nbsp;
          <span className="text-brand-yellow">★</span> LAKE DELIVERY &nbsp;
          <span className="text-brand-yellow">★</span> SAME-DAY RESTOCK &nbsp;
          <span className="text-brand-yellow">★</span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * SLIDE 3 — Partner Dashboard (cream)
 * ========================================================================== */
function Slide3() {
  const features = [
    {
      title: 'Real-time order pipeline',
      desc: 'Booked, en route, delivered. Every order across your portfolio at a glance.',
    },
    {
      title: 'Revenue tracked by property',
      desc: 'MTD totals, MoM change, and which properties drive your revenue.',
    },
    {
      title: 'Order detail by event',
      desc: "Bachelor parties, weddings, corporate retreats — see what's coming and what just shipped.",
    },
  ];

  return (
    <section
      aria-label="Slide 3 of 5: Your partner dashboard"
      className="relative w-full md:w-screen md:h-screen md:flex-shrink-0 bg-cream text-gray-900 font-manrope flex"
    >
      <div className="container mx-auto max-w-7xl px-8 md:px-12 py-16 md:py-20 flex flex-col justify-center w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left 45% */}
          <div className="lg:col-span-5">
            <div className="eyebrow text-[11px] md:text-xs font-semibold tracking-[0.18em] uppercase text-brand-blue mb-4">
              Your partner dashboard
            </div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl leading-[1] tracking-[-0.01em] text-gray-900 mb-6">
              Your portfolio.
              <br />
              <span className="font-fraunces italic font-normal text-brand-blue">
                Live, in one place.
              </span>
            </h2>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-8 max-w-md">
              Every order across every property. Status from booked to delivered.
              Revenue tracked by property, by event, by month.
            </p>

            <div className="flex flex-col gap-5">
              {features.map((f) => (
                <div key={f.title} className="border-l-[3px] border-brand-blue pl-4">
                  <div className="font-heading font-bold text-lg md:text-xl tracking-[-0.005em] text-gray-900 mb-1">
                    {f.title}
                  </div>
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right 55% — interactive dashboard mock (FiveStar Vacation Rentals
              fixture: KPIs, sparkline, recent orders). Real component, not
              a static image, so it renders identically across environments. */}
          <div className="lg:col-span-7">
            <PartnerDashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * SLIDE 4 — How Partnership Works (cream + navy bottom band)
 * ========================================================================== */
function Slide4() {
  const steps = [
    {
      n: '01',
      title: 'We give you a branded link.',
      desc: 'Custom URL or QR code for your guest welcome packet or check-in email. Optional white-label.',
    },
    {
      n: '02',
      title: 'Guests order direct.',
      desc: 'From our menu or pre-built party packages. ID verification at delivery. Zero back-and-forth with your team.',
    },
    {
      n: '03',
      title: 'We handle everything.',
      desc: 'Delivery, setup, optional bartender, restock, breakdown. You earn revenue share on every order.',
    },
  ];

  return (
    <section
      aria-label="Slide 4 of 5: How partnership works"
      className="relative w-full md:w-screen md:h-screen md:flex-shrink-0 bg-cream text-gray-900 font-manrope flex flex-col"
    >
      <div className="container mx-auto max-w-7xl px-8 md:px-12 py-16 md:py-20 flex-1 flex flex-col justify-center">
        <div className="mb-10 md:mb-14">
          <div className="eyebrow text-[11px] md:text-xs font-semibold tracking-[0.18em] uppercase text-brand-blue mb-4">
            How partnership works
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl leading-[1] tracking-[-0.01em] text-gray-900">
            Three steps.{' '}
            <span className="font-fraunces italic font-normal text-brand-blue">
              Then we disappear.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((s) => (
            <div key={s.n} className="bg-white rounded-lg shadow-lg p-7 md:p-8 flex flex-col">
              <div className="font-fraunces italic text-5xl md:text-6xl text-brand-blue leading-none mb-3">
                {s.n}
              </div>
              <div className="font-heading font-extrabold text-xl md:text-2xl tracking-[-0.005em] text-gray-900 mb-3 leading-snug">
                {s.title}
              </div>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom band — TABC differentiator */}
      <div className="bg-navy text-cream py-8 md:py-10 px-8 md:px-12">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-12 gap-6 md:gap-10 items-center">
            <div className="md:col-span-9">
              <div className="eyebrow text-[10px] md:text-xs font-semibold tracking-[0.18em] uppercase text-brand-yellow mb-2">
                The legal differentiator
              </div>
              <div className="font-heading font-extrabold text-xl md:text-2xl lg:text-3xl tracking-[-0.005em] leading-tight">
                We hold the <span className="text-brand-yellow">TABC license</span>.{' '}
                <span className="text-cream/60">You hold zero liability.</span>
              </div>
            </div>
            <div className="md:col-span-3 flex md:justify-end">
              <div className="bg-brand-yellow text-navy font-heading font-extrabold tracking-[0.05em] uppercase text-sm md:text-base text-center px-5 py-3 rounded-md leading-tight">
                TABC Licensed
                <br />&amp; Insured
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * SLIDE 5 — CTA Close (navy)
 * ========================================================================== */
function Slide5() {
  const benefits = [
    'TABC-licensed — zero liability for you',
    'Hotel-grade service that lifts review scores',
    'Revenue share on every order',
    'Hands-off — we handle delivery, setup, restock',
    'White-label option for your portfolio',
  ];

  return (
    <section
      aria-label="Slide 5 of 5: Get started"
      className="relative w-full md:w-screen md:h-screen md:flex-shrink-0 bg-navy text-cream font-manrope flex"
    >
      <div className="container mx-auto max-w-7xl px-8 md:px-12 py-16 md:py-20 flex flex-col justify-center w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left 55% — benefits */}
          <div className="lg:col-span-7">
            <div className="eyebrow text-[11px] md:text-xs font-semibold tracking-[0.18em] uppercase text-brand-yellow mb-5">
              Let&apos;s talk
            </div>
            <h2 className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.01em] text-white mb-10">
              Ready to add POD
              <br />
              <span className="font-fraunces italic font-normal text-brand-yellow">
                to your portfolio?
              </span>
            </h2>
            <ul className="flex flex-col gap-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-base md:text-lg text-cream/90">
                  <span className="text-brand-yellow font-bold text-xl leading-none mt-0.5">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right 45% — CTA card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-lg shadow-2xl p-8 md:p-10 flex flex-col gap-5">
              <div className="eyebrow text-[10px] md:text-xs font-bold tracking-[0.18em] uppercase text-navy">
                Get started
              </div>
              <Link
                href="/partners/vacation-rentals"
                className="block w-full bg-brand-blue hover:bg-brand-blue-dark text-white text-center font-heading font-bold tracking-[0.08em] uppercase text-base md:text-lg px-6 py-5 rounded-lg transition-colors"
              >
                Get the partner one-pager →
              </Link>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-sm md:text-base text-brand-blue hover:text-brand-blue-dark underline underline-offset-4 transition-colors"
              >
                Or schedule a meeting directly
              </a>
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100 tracking-wide">
                partyondelivery.com/partners/vacation-rentals
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 md:mt-16 text-center text-xs md:text-sm text-cream/50 tracking-wide">
          Allan · allan@partyondelivery.com · partyondelivery.com
        </div>
      </div>
    </section>
  );
}
