'use client';

// SHARED landing-page template — all 4 event landing pages render through this.
// Pass a config (see types.ts) to customize copy, theme, packages, FAQs, etc.

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PackageBuilderModal from './PackageBuilderModal';
import QuickBuyModal from './QuickBuyModal';
import HeroSlideshow from './HeroSlideshow';
import type { LandingConfig, Catalog, Package, ThemeColors } from './types';
import type { UpsellProducts } from '@/lib/landing/getUpsellProducts';
import { generateFAQSchema } from '@/lib/seo/schemas';

// All 4 /austin-*-delivery landing pages. Used to render an "other event
// types we cover" cross-link section near the final CTA — gives sibling
// pages reciprocal internal links (was 0 cross-linking before).
const ALL_AUSTIN_LANDING_PAGES = [
  {
    slug: 'austin-bachelor-party-delivery',
    title: 'Bachelor Parties',
    blurb:
      'Beer, liquor, and cocktail kits to Airbnbs, Lake Travis docks, and party buses.',
  },
  {
    slug: 'austin-bachelorette-party-delivery',
    title: 'Bachelorette Parties',
    blurb:
      'Champagne, rosé, and brunch mimosa bars to your weekend home base.',
  },
  {
    slug: 'austin-corporate-event-delivery',
    title: 'Corporate Events',
    blurb:
      'Premium spirits and bar setups for offsites, client dinners, and team events.',
  },
  {
    slug: 'austin-wedding-weekend-delivery',
    title: 'Wedding Weekends',
    blurb:
      'Welcome reception, rehearsal dinner, reception bar, and after-party — coordinated.',
  },
];

type Props = {
  config: LandingConfig;
  catalog: Catalog;
  upsellProducts?: UpsellProducts;
};

export default function LandingPageTemplate({ config, catalog, upsellProducts }: Props) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [quickBuyPkg, setQuickBuyPkg] = useState<Package | null>(null);
  // Accordion state for the HOW IT WORKS section — first step open by default.
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([0]));
  const T = config.theme;

  const openBuilder = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setBuilderOpen(true);
  };

  const toggleStep = (i: number) => {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // Derive occasion from slug for Quick-Buy submission.
  const occasion: 'bachelor' | 'bachelorette' | 'corporate' | 'wedding' = (() => {
    const s = config.slug || '';
    if (s.includes('bachelorette')) return 'bachelorette';
    if (s.includes('bachelor')) return 'bachelor';
    if (s.includes('corporate')) return 'corporate';
    return 'wedding';
  })();

  // FAQ schema — Schema.org FAQPage built from the same Q&A rendered
  // on the page. Eligible for FAQ rich-snippet treatment in SERPs.
  // Note: Google requires the schema's questions/answers to match the
  // visible content; we read directly from config.faqs so they can't
  // drift.
  const faqSchema = generateFAQSchema(
    config.faqs.map((f) => ({ question: f.q, answer: f.a }))
  );

  // Sibling landing pages (the other 3) for the cross-linking section.
  const siblingLandingPages = ALL_AUSTIN_LANDING_PAGES.filter(
    (p) => p.slug !== config.slug
  );

  return (
    <main className="bg-white text-gray-900">
      {/* FAQ schema — server-rendered into initial HTML so search crawlers see it */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Slim header */}
      <header
        className="sticky top-0 z-40 backdrop-blur border-b"
        style={{ background: 'rgba(255,255,255,0.95)', borderColor: '#F1F1F1' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/party-on-logo-main.svg"
              alt="Party On Delivery"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <a
            href={config.phoneTel}
            className="text-sm sm:text-base font-semibold"
            style={{ color: T.blue }}
          >
            <span className="hidden sm:inline">Call </span>
            {config.phoneDisplay}
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <HeroSlideshow />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, ${T.navy}EB 0%, ${T.navy}D9 45%, ${T.navy}8C 100%)`,
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 w-full">
          <div
            className="max-w-3xl rounded-2xl p-6 sm:p-8 md:p-10"
            style={{
              background: `${T.navy}B8`,
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            {/*
              Rendered as <h2> rather than <p> so the target keyword phrase
              (e.g. "AUSTIN BACHELOR PARTY ALCOHOL DELIVERY") is in a
              semantic heading element. Visual rendering is unchanged.
            */}
            <h2
              className="inline-block text-xs sm:text-sm font-bold tracking-[0.15em] px-3 py-1.5 rounded mb-6 shadow-lg"
              style={{ background: T.primary, color: T.primaryText }}
            >
              {config.heroEyebrow}
            </h2>

            <h1
              className="font-heading font-bold text-white text-4xl sm:text-5xl md:text-7xl leading-[1.05] tracking-tight mb-5"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
            >
              {config.heroHeadline}
              <span className="block" style={{ color: T.primary }}>
                {config.heroHeadlineAccent}
              </span>
            </h1>

            {config.heroBullets && config.heroBullets.length > 0 ? (
              <ul
                className="text-base sm:text-lg text-white mb-8 max-w-2xl space-y-1.5"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
              >
                {config.heroBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 leading-snug">
                    <span
                      className="flex-shrink-0 font-bold"
                      style={{ color: T.primary }}
                    >
                      ✓
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="text-lg sm:text-xl text-white mb-8 max-w-2xl leading-relaxed"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
              >
                {config.heroSubhead}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <button
                type="button"
                onClick={openBuilder}
                className="inline-flex items-center justify-center font-bold text-base sm:text-lg px-8 py-5 rounded-md tracking-wide transition-colors shadow-xl"
                style={{ background: T.primary, color: T.primaryText }}
              >
                {config.ctaText}
              </button>
              {config.planningCallUrl && (
                <a
                  href={config.planningCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border-2 border-white text-white font-semibold text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 rounded-md transition-transform hover:scale-[1.02] hover:bg-white/15 whitespace-nowrap"
                >
                  {config.secondaryCtaText ?? 'SCHEDULE A 10-MIN CALL →'}
                </a>
              )}
            </div>

            {/* Call/text-or-tap row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/90 mb-4">
              <a
                href={config.phoneTel}
                className="inline-flex items-center gap-1.5 font-semibold hover:text-white"
              >
                📞 Call {config.phoneDisplay}
              </a>
              <a
                href={`sms:${config.phoneTel.replace('tel:', '')}`}
                className="inline-flex items-center gap-1.5 font-semibold hover:text-white"
              >
                💬 Text us
              </a>
            </div>

            {config.heroTrustBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-semibold">
                {config.heroTrustBadges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section
        className="text-white py-8 border-b border-white/10"
        style={{ background: T.navy }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {config.trustStats.map((s) => (
            <div key={s.label}>
              <div
                className="font-heading text-3xl md:text-4xl font-bold"
                style={{ color: T.primary }}
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

      {/* PAIN → SOLUTION */}
      <section className="py-20" style={{ background: T.cream }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="font-heading text-3xl md:text-5xl font-bold mb-6 leading-tight"
            style={{ color: T.navy }}
          >
            {config.painHeadline}
          </h2>
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed">{config.painBody}</p>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="py-24 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <p
              className="font-bold tracking-[0.15em] text-sm mb-4"
              style={{ color: T.blue }}
            >
              {config.packagesEyebrow}
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6 leading-tight" style={{ color: T.navy }}>
              {config.packagesHeadline}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">{config.packagesBlurb}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {config.packages.map((pkg) => (
              <PackageCard
                key={pkg.name}
                pkg={pkg}
                theme={T}
                onCta={openBuilder}
                onBuyNow={(p) => setQuickBuyPkg(p)}
              />
            ))}
          </div>

          <p className="text-center text-gray-600 mt-16">
            {config.customLine.split('—')[0]}
            <a href={config.phoneTel} className="font-bold underline" style={{ color: T.blue }}>
              {' '}
              {config.phoneDisplay}
            </a>
          </p>
        </div>
      </section>

      {/* HOW IT WORKS — chevron accordion: stacked on mobile, staircase cascade on desktop */}
      <section className="py-12 md:py-20" style={{ background: T.cream }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h2
              className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold leading-tight"
              style={{ color: T.navy }}
            >
              {config.stepsHeadline}
            </h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            {config.steps.map((s, i) => {
              const isOpen = openSteps.has(i);
              // Desktop-only staircase: each step shifts further right.
              // Literal Tailwind classes (not CSS-var) so JIT compiles clean.
              const offsetClass =
                i === 0
                  ? 'md:ml-0'
                  : i === 1
                    ? 'md:ml-[9%]'
                    : i === 2
                      ? 'md:ml-[18%]'
                      : 'md:ml-[27%]';
              return (
                <div
                  key={s.n}
                  className={`rounded-2xl bg-white border overflow-hidden transition-shadow md:w-[73%] ${offsetClass}`}
                  style={{
                    borderColor: isOpen ? T.blue : '#E5E7EB',
                    boxShadow: isOpen
                      ? '0 10px 30px -12px rgba(11, 116, 184, 0.25)'
                      : '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleStep(i)}
                    aria-expanded={isOpen}
                    aria-controls={`step-panel-${i}`}
                    className="w-full flex items-center gap-4 sm:gap-5 p-4 sm:p-5 md:p-6 text-left"
                  >
                    <div
                      className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white font-heading font-bold text-lg sm:text-2xl md:text-3xl rounded-full"
                      style={{ background: T.blue }}
                    >
                      {s.n}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-heading text-base sm:text-xl md:text-2xl font-bold leading-tight"
                        style={{ color: T.navy }}
                      >
                        {s.title}
                      </h3>
                      {s.teaser && (
                        <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 italic leading-snug">
                          {s.teaser}
                        </p>
                      )}
                    </div>
                    <svg
                      className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 transition-transform"
                      style={{
                        color: T.blue,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div
                      id={`step-panel-${i}`}
                      className="px-4 sm:px-5 md:px-6 pb-5 md:pb-6 pt-1"
                    >
                      <div className="pl-0 sm:pl-[3.5rem] md:pl-[4.5rem]">
                        {s.image ? (
                          <div className="grid md:grid-cols-[1fr_minmax(0,16rem)] gap-5 items-start">
                            <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                              {s.body}
                            </p>
                            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                              <Image
                                src={s.image}
                                alt={s.title}
                                fill
                                sizes="(min-width: 768px) 16rem, 100vw"
                                className="object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                            {s.body}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHERE WE DELIVER */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 md:h-[28rem] rounded-2xl overflow-hidden">
              <Image
                src={config.venuesImage}
                alt="Where we deliver"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <p
                className="font-bold tracking-[0.15em] text-sm mb-3"
                style={{ color: T.blue }}
              >
                {config.venuesEyebrow}
              </p>
              <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6" style={{ color: T.navy }}>
                {config.venuesHeadline}
              </h2>
              <ul className="space-y-3">
                {config.venues.map((v) => (
                  <li key={v.area} className="flex gap-3">
                    <span className="text-xl mt-0.5" style={{ color: T.primary }}>
                      ✓
                    </span>
                    <div>
                      <span className="font-bold" style={{ color: T.navy }}>
                        {v.area}
                      </span>
                      <span className="text-gray-600"> — {v.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-20 text-white" style={{ background: T.navy }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p
              className="font-bold tracking-[0.15em] text-sm mb-3"
              style={{ color: T.primary }}
            >
              {config.reviewsEyebrow}
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              {config.reviewsHeadline}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {config.reviews.map((r) => (
              <div
                key={r.author}
                className="bg-white/5 backdrop-blur rounded-xl p-7"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="text-lg mb-3" style={{ color: T.primary }}>
                  ★★★★★
                </div>
                <p className="text-gray-100 leading-relaxed mb-5">&ldquo;{r.quote}&rdquo;</p>
                <div className="text-sm">
                  <div className="font-bold text-white">{r.author}</div>
                  <div className="opacity-70">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20" style={{ background: T.cream }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4" style={{ color: T.navy }}>
              {config.faqHeadline}
            </h2>
          </div>
          <div className="space-y-3">
            {config.faqs.map((f) => (
              <details
                key={f.q}
                className="group bg-white rounded-lg overflow-hidden"
                style={{ border: '1px solid #E5E7EB' }}
              >
                <summary
                  className="flex items-center justify-between cursor-pointer p-5 font-bold text-lg list-none"
                  style={{ color: T.navy }}
                >
                  <span>{f.q}</span>
                  <span
                    className="text-2xl group-open:rotate-45 transition-transform"
                    style={{ color: T.blue }}
                  >
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 text-gray-700 leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* OTHER AUSTIN EVENT TYPES — internal cross-link to sibling /austin-*-delivery pages */}
      {siblingLandingPages.length > 0 && (
        <section className="py-20 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2
              className="font-heading text-3xl md:text-4xl font-bold text-center mb-3"
              style={{ color: T.navy }}
            >
              Other Austin event types we cover
            </h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              Different occasion? Same on-time, ice-cold delivery — tailored to the event.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {siblingLandingPages.map((p) => (
                <Link
                  key={p.slug}
                  href={`/${p.slug}`}
                  className="block p-6 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all bg-white"
                >
                  <h3
                    className="font-heading text-xl font-bold mb-2 tracking-[0.05em]"
                    style={{ color: T.navy }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {p.blurb}
                  </p>
                  <span
                    className="text-sm font-semibold inline-flex items-center gap-1"
                    style={{ color: T.blue }}
                  >
                    See packages →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={config.finalCtaImage}
            alt="Austin event celebration"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0" style={{ background: `${T.navy}C7` }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          <div
            className="rounded-2xl p-8 sm:p-12 text-center text-white"
            style={{
              background: `${T.navy}D9`,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <h2
              className="font-heading text-4xl md:text-6xl font-bold mb-5 leading-tight"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
            >
              {config.finalCtaHeadline}{' '}
              <span style={{ color: T.primary }}>{config.finalCtaHeadlineAccent}</span>
            </h2>
            <p
              className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.55)' }}
            >
              {config.finalCtaSubhead}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <button
                type="button"
                onClick={openBuilder}
                className="inline-flex items-center justify-center font-bold text-lg px-10 py-5 rounded-md tracking-wide transition-colors shadow-xl"
                style={{ background: T.primary, color: T.primaryText }}
              >
                {config.ctaText}
              </button>
              {config.planningCallUrl && (
                <a
                  href={config.planningCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border-2 border-white text-white font-semibold text-base sm:text-lg px-5 sm:px-8 py-4 sm:py-5 rounded-md transition-transform hover:scale-[1.02] hover:bg-white/15 whitespace-nowrap"
                >
                  {config.secondaryCtaText ?? 'SCHEDULE A 10-MIN CALL →'}
                </a>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/90 font-semibold">
              <a href={config.phoneTel} className="hover:text-white">
                📞 Call {config.phoneDisplay}
              </a>
              <a
                href={`sms:${config.phoneTel.replace('tel:', '')}`}
                className="hover:text-white"
              >
                💬 Text us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center" style={{ background: T.navy }}>
        <p className="text-sm text-white opacity-70">
          © {new Date().getFullYear()} Party On Delivery — Austin&apos;s {config.audienceTitleCase.toLowerCase()} HQ.
          TABC-licensed alcohol retailer. Must be 21+ with valid ID at delivery.
        </p>
      </footer>

      {/* Sticky mobile CTA bar — outlined "Build My Package" on the left,
          solid "Checkout now" on the right. When the customer has already
          opened the builder (active state below) the bar continues to show
          the same two actions but the right button takes them straight to
          the Pay-now flow in the modal. */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 px-4 py-3 flex gap-2.5 shadow-2xl">
        <button
          type="button"
          onClick={openBuilder}
          className="flex-1 inline-flex items-center justify-center border-2 font-bold py-3 rounded-md text-xs whitespace-nowrap"
          style={{ borderColor: T.navy, color: T.navy }}
        >
          Build my package
        </button>
        <button
          type="button"
          onClick={openBuilder}
          className="flex-1 inline-flex items-center justify-center font-bold py-3 rounded-md text-xs whitespace-nowrap"
          style={{ background: T.primary, color: T.primaryText }}
        >
          Checkout now →
        </button>
      </div>
      <div className="md:hidden h-16" aria-hidden />

      {/* Modal */}
      <PackageBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        config={config}
        catalog={catalog}
        upsellProducts={upsellProducts}
      />
      {quickBuyPkg && (
        <QuickBuyModal
          open={true}
          onClose={() => setQuickBuyPkg(null)}
          pkg={quickBuyPkg}
          config={config}
          occasion={occasion}
          upsellProducts={upsellProducts}
        />
      )}
    </main>
  );
}

// Helper export to get a typed ReactNode where needed
export type { ReactNode };

// ----- Package card with itemized dropdown ---------------------------------

function PackageCard({
  pkg,
  theme: T,
  onCta,
  onBuyNow,
}: {
  pkg: Package;
  theme: ThemeColors;
  /** Opens the "Build my own" Package Builder modal. */
  onCta: () => void;
  /** Opens the Quick-Buy modal pre-loaded with this package. */
  onBuyNow: (pkg: Package) => void;
}) {
  const [open, setOpen] = useState(false);

  // Modern packages use lineItems + packagePrice + freebiesValue.
  // Legacy/static packages use items + price + save (string).
  const isLive = !!pkg.lineItems && pkg.packagePrice != null;

  const priceLabel = isLive ? `$${pkg.packagePrice}` : pkg.price ?? '';
  const saveLabel = isLive
    ? `Save $${pkg.freebiesValue ?? 0}`
    : pkg.save ?? '';

  const alcoholItems = (pkg.lineItems ?? []).filter((i) => !i.freebie);
  const freebieItems = (pkg.lineItems ?? []).filter((i) => i.freebie);

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col bg-white border-2 transition-all"
      style={{
        borderColor: pkg.featured ? T.primary : '#E5E7EB',
        boxShadow: pkg.featured
          ? '0 25px 50px -12px rgba(0,0,0,0.18)'
          : '0 1px 3px rgba(0,0,0,0.05)',
        transform: pkg.featured ? 'scale(1.03)' : 'none',
      }}
    >
      {pkg.featured && (
        <div
          className="absolute top-4 right-4 z-10 text-xs font-bold tracking-widest px-3 py-1 rounded-full"
          style={{ background: T.primary, color: T.primaryText }}
        >
          MOST BOOKED
        </div>
      )}
      <div className="relative w-full flex-shrink-0" style={{ height: '208px' }}>
        <Image
          src={pkg.image}
          alt={pkg.name}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-heading text-2xl font-bold leading-tight" style={{ color: T.navy }}>
            {pkg.name}
          </h3>
          {saveLabel && (
            <span
              className="text-xs font-bold px-2 py-1 rounded whitespace-nowrap"
              style={{ background: '#10B98119', color: '#047857' }}
            >
              {saveLabel}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-heading text-4xl font-bold" style={{ color: T.blue }}>
            {priceLabel}
          </span>
          <span className="text-sm text-gray-500">{pkg.serves}</span>
        </div>
        <p className="text-gray-600 mb-4 leading-relaxed">{pkg.blurb}</p>

        {/* Summary bullets — category roll-ups, not item names. The detailed
            list lives in the "See what's inside" dropdown below. */}
        {isLive && pkg.lineItems && pkg.lineItems.length > 0 && (
          <ul className="mb-4 space-y-1.5 text-sm text-gray-700">
            {summarizeAlcohol(alcoholItems).map((line, i) => (
              <li key={`sum-${i}`} className="flex items-start gap-2">
                <span className="mt-0.5 font-bold" style={{ color: T.primary }}>
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
            {freebieItems.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold" style={{ color: '#047857' }}>
                  ★
                </span>
                <span style={{ color: '#047857' }}>
                  <strong>Free party bundle:</strong>{' '}
                  {freebieItems
                    .map((f) => f.name.split(' • ')[0].replace(/^\d+\s*/, ''))
                    .slice(0, 4)
                    .join(', ')}
                  {freebieItems.length > 4 ? '…' : ''}
                </span>
              </li>
            )}
          </ul>
        )}

        {/* Itemized dropdown */}
        {isLive ? (
          <div className="mb-5 flex-1">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between text-left font-bold text-sm py-2 border-b transition-colors"
              style={{ color: T.navy, borderColor: '#E5E7EB' }}
              aria-expanded={open}
            >
              <span>
                {open ? 'Hide' : 'See'} what&apos;s inside ({pkg.lineItems!.length} items)
              </span>
              <span className="text-xs" style={{ color: T.blue }}>
                {open ? '▲' : '▼'}
              </span>
            </button>
            {open && (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5">
                    INCLUDED ALCOHOL
                  </div>
                  <ul className="space-y-1.5">
                    {alcoholItems.map((it, i) => (
                      <li
                        key={`a-${i}`}
                        className="flex justify-between gap-3 text-gray-700"
                      >
                        <span className="flex-1">
                          <span className="font-semibold" style={{ color: T.navy }}>
                            {it.qty}×
                          </span>{' '}
                          {it.name}
                        </span>
                        <span className="text-gray-500 whitespace-nowrap">
                          ${(it.unitPrice * it.qty).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {freebieItems.length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <div
                      className="text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: '#047857' }}
                    >
                      FREE PARTY SUPPLIES (BUNDLED IN)
                    </div>
                    <ul className="space-y-1.5">
                      {freebieItems.map((it, i) => (
                        <li
                          key={`f-${i}`}
                          className="flex justify-between gap-3 text-gray-700"
                        >
                          <span className="flex-1">
                            <span className="font-semibold" style={{ color: T.navy }}>
                              {it.qty}×
                            </span>{' '}
                            {it.name}
                          </span>
                          <span className="whitespace-nowrap font-semibold" style={{ color: '#047857' }}>
                            FREE (${(it.unitPrice * it.qty).toFixed(2)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : pkg.items ? (
          <ul className="space-y-2 mb-7 text-sm text-gray-700 flex-1">
            {pkg.items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 font-bold" style={{ color: T.primary }}>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onBuyNow(pkg)}
            className="block text-center font-bold py-4 px-6 rounded-md tracking-wide transition-all w-full hover:scale-[1.01] shadow-md"
            style={{ background: T.primary, color: T.primaryText }}
          >
            BUY THIS PACKAGE NOW →
          </button>
          <button
            type="button"
            onClick={onCta}
            className="block text-center font-bold py-3 px-6 rounded-md tracking-wide transition-colors w-full"
            style={{
              background: '#FFFFFF',
              color: T.navy,
              border: `2px solid ${T.navy}`,
            }}
          >
            Build my own
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- summarizeAlcohol: roll line items up into category-level bullets ----

import type { PackageLineItem } from './types';

/**
 * Reads the package's alcohol line items and returns 3–4 punchy summary
 * bullets the customer can scan in a second, e.g. "5 beer + seltzer packs
 * (108 cans)" / "3 premium spirit bottles" / "Wine & champagne for toasts".
 *
 * Heuristic-only — uses title patterns rather than productType so it works
 * for any future recipe additions.
 */
function summarizeAlcohol(items: PackageLineItem[]): string[] {
  const out: string[] = [];
  type Bucket = { qty: number; cans: number; bottles: number };
  const buckets: Record<string, Bucket> = {
    beer: { qty: 0, cans: 0, bottles: 0 },
    seltzer: { qty: 0, cans: 0, bottles: 0 },
    spirits: { qty: 0, cans: 0, bottles: 0 },
    wine: { qty: 0, cans: 0, bottles: 0 },
    mixer: { qty: 0, cans: 0, bottles: 0 },
  };

  for (const it of items) {
    const t = it.name.toLowerCase();
    const packMatch = it.name.match(/(\d+)\s*pack/i);
    const cans = packMatch ? parseInt(packMatch[1], 10) * it.qty : 0;
    if (
      /\b(beer|ipa|lager|hefe|pilsner|modelo|miller|coors|corona|michelob|lone star)\b/.test(t)
    ) {
      buckets.beer.qty += it.qty;
      buckets.beer.cans += cans;
    } else if (/\b(seltzer|high noon|white claw|truly|surfside)\b/.test(t)) {
      buckets.seltzer.qty += it.qty;
      buckets.seltzer.cans += cans;
    } else if (
      /\b(vodka|tequila|whiskey|whisky|bourbon|gin|rum|jameson|tito|espolon|casamigos|jack daniels|bulleit)\b/.test(t)
    ) {
      buckets.spirits.qty += it.qty;
      buckets.spirits.bottles += it.qty;
    } else if (
      /\b(wine|champagne|prosecco|rosé|rose|sauv|cab|pinot|veuve|chandon|whispering angel|josh cellars|14 hands|bogle|oyster bay|dark horse)\b/.test(t)
    ) {
      buckets.wine.qty += it.qty;
      buckets.wine.bottles += it.qty;
    } else {
      buckets.mixer.qty += it.qty;
    }
  }

  if (buckets.beer.qty + buckets.seltzer.qty > 0) {
    const totalPacks = buckets.beer.qty + buckets.seltzer.qty;
    const totalCans = buckets.beer.cans + buckets.seltzer.cans;
    const label = buckets.seltzer.qty > 0 && buckets.beer.qty > 0
      ? 'beer + seltzer packs'
      : buckets.seltzer.qty > 0
        ? 'hard-seltzer packs'
        : 'beer packs';
    out.push(
      totalCans > 0
        ? `${totalPacks} ${label} (${totalCans} cans)`
        : `${totalPacks} ${label}`,
    );
  }
  if (buckets.spirits.qty > 0) {
    out.push(`${buckets.spirits.qty} premium spirit bottle${buckets.spirits.qty !== 1 ? 's' : ''}`);
  }
  if (buckets.wine.qty > 0) {
    out.push(`${buckets.wine.qty} bottle${buckets.wine.qty !== 1 ? 's' : ''} of wine + champagne`);
  }
  if (buckets.mixer.qty > 0) {
    out.push('Mixers, juices, and chasers');
  }
  return out.slice(0, 4);
}
