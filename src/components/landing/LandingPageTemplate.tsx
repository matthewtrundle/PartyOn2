'use client';

// SHARED landing-page template — all 4 event landing pages render through this.
// Pass a config (see types.ts) to customize copy, theme, packages, FAQs, etc.

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PackageBuilderModal from './PackageBuilderModal';
import QuickBuyModal from './QuickBuyModal';
import HeroBackdrop from './sections/HeroBackdrop';
import PackageCard from './sections/PackageCard';
import { PhoneIcon, ChatIcon, CheckIcon } from './sections/icons';
import type { LandingConfig, Catalog, Package } from './types';
import type { UpsellProducts } from '@/lib/landing/getUpsellProducts';
import { generateFAQSchema } from '@/lib/seo/schemas';
import { trackContactClick } from '@/lib/analytics/ga4-events';
import { experimentsForPath, type BachelorHeroPayload, type CtaCopyPayload } from '@/lib/experiments/registry';
import { useVariant } from '@/lib/experiments/clientAssign';
import { useFunnelTracker } from '@/lib/experiments/funnelTrack';
import { useSearchParams } from 'next/navigation';

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
  /**
   * Optional last-minute catalog (deep-stock-only product pool). When
   * the customer picks a delivery date of today or tomorrow inside
   * either modal, we swap the active catalog to this one so they can
   * only order from items ops can absolutely fulfill in 24h.
   *
   * Pages that don't pre-fetch this just pass nothing — the modals
   * silently fall back to the regular catalog regardless of date.
   */
  lastMinuteCatalog?: Catalog;
  upsellProducts?: UpsellProducts;
  /**
   * Optional content block injected just below the trust bar / above
   * "PAIN → SOLUTION". Used by the AI-test bachelor page to drop an
   * AIPartyChatBar in the middle of the funnel without forking the
   * whole template. When `undefined`, nothing renders — every existing
   * landing page passes nothing, so behavior on the live site is
   * identical.
   */
  aiChatSlot?: ReactNode;
};

export default function LandingPageTemplate({
  config,
  catalog,
  lastMinuteCatalog,
  upsellProducts,
  aiChatSlot,
}: Props) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [quickBuyPkg, setQuickBuyPkg] = useState<Package | null>(null);
  // Live mode flag — flipped by the modals when the customer picks a
  // today/tomorrow delivery date so the catalog narrows to the
  // last-minute pool. Kept on the template so both modals share state.
  const [lastMinuteMode, setLastMinuteMode] = useState(false);
  const activeCatalog =
    lastMinuteMode && lastMinuteCatalog ? lastMinuteCatalog : catalog;
  // Accordion state for the HOW IT WORKS section — first step open by default.
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([0]));
  const T = config.theme;

  // ─── Experiments wiring ─────────────────────────────────────────
  // For each running experiment on this path, assign a variant + fold
  // its payload into the copy that renders below. First variant is
  // always control so the page never regresses on fresh visitors.
  const pagePath = `/${config.slug}`;
  const activeExperiments = experimentsForPath(pagePath);

  const heroExp = activeExperiments.find((e) => e.key.includes('hero-headline'));
  const heroVariantKeys = heroExp?.variants.map((v) => v.key) ?? ['control'];
  const { variant: heroVariantKey } = useVariant(
    heroExp?.key ?? 'noop-hero',
    heroVariantKeys,
  );
  const heroVariantPayload = heroExp?.variants.find((v) => v.key === heroVariantKey)
    ?.payload as BachelorHeroPayload | undefined;

  const ctaExp = activeExperiments.find((e) => e.key.includes('primary-cta'));
  const ctaVariantKeys = ctaExp?.variants.map((v) => v.key) ?? ['control'];
  const { variant: ctaVariantKey } = useVariant(
    ctaExp?.key ?? 'noop-cta',
    ctaVariantKeys,
  );
  const ctaVariantPayload = ctaExp?.variants.find((v) => v.key === ctaVariantKey)
    ?.payload as CtaCopyPayload | undefined;

  // Effective copy = variant override OR config default.
  // ?welcome=1 (set by the /event-quiz redirect) further overrides the
  // hero copy with the "Step one: drinks → rest of weekend" framing.
  const searchParams = useSearchParams();
  const cameFromQuiz = searchParams?.get('welcome') === '1';

  const heroEyebrow = cameFromQuiz
    ? 'WELCOME — STEP 1 OF 2'
    : heroVariantPayload?.eyebrow ?? config.heroEyebrow;
  const heroHeadline = cameFromQuiz
    ? "Step one: Let's get started with"
    : heroVariantPayload?.headline ?? config.heroHeadline;
  const heroHeadlineAccent = cameFromQuiz
    ? 'your drinks.'
    : heroVariantPayload?.headlineAccent ?? config.heroHeadlineAccent;
  const heroSubhead = cameFromQuiz
    ? "Then we'll plan the rest of your weekend. Pick a package below or build your own — your contact info is already on file so checkout takes 30 seconds."
    : heroVariantPayload?.subhead ?? config.heroSubhead;
  const primaryCtaText = ctaVariantPayload?.primary ?? config.ctaText;

  // Funnel tracker — fires LeadEvents stamped with the bachelor-hero key
  // (the most consequential one). The CTA experiment piggybacks via
  // per-call `experimentKey` overrides when we fire the CTA click event.
  const funnel = useFunnelTracker({
    experimentKey: heroExp?.key,
    variant: heroVariantKey,
  });

  // Fire landing_view exactly once per session per variant.
  useEffect(() => {
    funnel.track('landing_view', { metadata: { slug: config.slug } });
  }, [funnel, config.slug]);

  const openBuilder = (e?: React.MouseEvent) => {
    e?.preventDefault();
    funnel.track('hero_cta_click', {
      experimentKey: ctaExp?.key ?? heroExp?.key,
      variant: ctaExp ? ctaVariantKey : heroVariantKey,
      metadata: { source: 'hero-cta', ctaText: primaryCtaText },
    });
    funnel.track('builder_open', { metadata: { source: 'hero-cta' } });
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

  const onPackageClick = (pkg: Package, modal: 'quickbuy' | 'builder') => {
    funnel.track('package_card_click', {
      metadata: { package: pkg.name, modal },
    });
    funnel.track(modal === 'quickbuy' ? 'quickbuy_open' : 'builder_open', {
      metadata: { package: pkg.name },
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
            onClick={() => trackContactClick('phone', 'header', occasion, config.phoneTel)}
            className="text-sm sm:text-base font-semibold"
            style={{ color: T.blue }}
          >
            <span className="hidden sm:inline">Call </span>
            {config.phoneDisplay}
          </a>
        </div>
      </header>

      {/* HERO — one cinematic photo (or slow crossfade), navy glass panel */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <HeroBackdrop
            images={
              config.heroImages && config.heroImages.length > 0
                ? config.heroImages
                : [
                    {
                      src: config.heroImage,
                      alt: `${config.eventLabel} — Party On Delivery, Austin TX`,
                    },
                  ]
            }
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, ${T.navy}E6 0%, ${T.navy}CC 45%, ${T.navy}66 100%)`,
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 w-full">
          <div
            className="max-w-3xl rounded-2xl p-6 sm:p-8 md:p-10 animate-fade-up"
            style={{
              background: `${T.navy}B8`,
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            {/*
              The keyword-rich eyebrow (e.g. "AUSTIN BACHELOR PARTY ALCOHOL
              DELIVERY") is the page's <h1>. The big lifestyle line below it
              is <h2>. Visual rendering is unchanged — only the semantic tags
              swap. Google reads the H1 as the page's primary topic, so it
              needs to carry the head term, not the lifestyle copy.
            */}
            <h1
              className="inline-block text-xs sm:text-sm font-bold tracking-[0.15em] px-3 py-1.5 rounded mb-6 shadow-lg"
              style={{ background: T.primary, color: T.primaryText }}
            >
              {heroEyebrow}
            </h1>

            <h2
              className="font-heading font-bold text-white text-4xl sm:text-5xl md:text-7xl leading-[1.05] tracking-tight mb-5"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
            >
              {heroHeadline}
              <span className="block" style={{ color: T.primary }}>
                {heroHeadlineAccent}
              </span>
            </h2>

            {config.heroBullets && config.heroBullets.length > 0 ? (
              <ul
                className="text-base sm:text-lg text-white mb-8 max-w-2xl space-y-1.5"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
              >
                {config.heroBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 leading-snug">
                    <span
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: T.primary }}
                    >
                      <CheckIcon className="w-5 h-5" />
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
                {heroSubhead}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <button
                type="button"
                onClick={openBuilder}
                className="inline-flex items-center justify-center font-bold text-base sm:text-lg px-8 py-5 rounded-lg tracking-[0.08em] transition-colors shadow-xl"
                style={{ background: T.primary, color: T.primaryText }}
              >
                {primaryCtaText}
              </button>
              {config.planningCallUrl && (
                <a
                  href={config.planningCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackContactClick('planning_call', 'hero', occasion, config.planningCallUrl)
                  }
                  className="inline-flex items-center justify-center border-2 border-white text-white font-semibold text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 rounded-lg tracking-[0.08em] transition-transform hover:scale-[1.02] hover:bg-white/15 whitespace-nowrap"
                >
                  {config.secondaryCtaText ?? 'SCHEDULE A 10-MIN CALL →'}
                </a>
              )}
            </div>

            {/* Call/text-or-tap row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/90 mb-4">
              <a
                href={config.phoneTel}
                onClick={() => trackContactClick('phone', 'hero', occasion, config.phoneTel)}
                className="inline-flex items-center gap-1.5 font-semibold hover:text-white"
              >
                <PhoneIcon className="w-4 h-4" /> Call {config.phoneDisplay}
              </a>
              <a
                href={`sms:${config.phoneTel.replace('tel:', '')}`}
                onClick={() =>
                  trackContactClick(
                    'sms',
                    'hero',
                    occasion,
                    `sms:${config.phoneTel.replace('tel:', '')}`,
                  )
                }
                className="inline-flex items-center gap-1.5 font-semibold hover:text-white"
              >
                <ChatIcon className="w-4 h-4" /> Text us
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

      {/* OPTIONAL AI CHAT SLOT — only the AI-test bachelor page passes
          this. Sits between the trust bar and the pain/solution section
          so the bar lives in the "middle of the page" per the brief. */}
      {aiChatSlot}

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
                onCta={() => {
                  onPackageClick(pkg, 'builder');
                  openBuilder();
                }}
                onBuyNow={(p) => {
                  onPackageClick(p, 'quickbuy');
                  setQuickBuyPkg(p);
                }}
              />
            ))}
          </div>

          <p className="text-center text-gray-600 mt-16">
            {config.customLine.split('—')[0]}
            <a
              href={config.phoneTel}
              onClick={() =>
                trackContactClick('phone', 'packages_custom_line', occasion, config.phoneTel)
              }
              className="font-bold underline"
              style={{ color: T.blue }}
            >
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
                        <p className="editorial text-sm md:text-base text-gray-600 mt-1 leading-snug">
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
                    {/* Brand blue, not theme yellow — yellow-on-white fails contrast. */}
                    <span className="mt-1 flex-shrink-0" style={{ color: T.blue }}>
                      <CheckIcon className="w-5 h-5" />
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
                <p className="editorial text-lg text-gray-100 leading-relaxed mb-5">
                  &ldquo;{r.quote}&rdquo;
                </p>
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
                className="inline-flex items-center justify-center font-bold text-lg px-10 py-5 rounded-lg tracking-[0.08em] transition-colors shadow-xl"
                style={{ background: T.primary, color: T.primaryText }}
              >
                {config.ctaText}
              </button>
              {config.planningCallUrl && (
                <a
                  href={config.planningCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackContactClick(
                      'planning_call',
                      'final_cta',
                      occasion,
                      config.planningCallUrl,
                    )
                  }
                  className="inline-flex items-center justify-center border-2 border-white text-white font-semibold text-base sm:text-lg px-5 sm:px-8 py-4 sm:py-5 rounded-lg tracking-[0.08em] transition-transform hover:scale-[1.02] hover:bg-white/15 whitespace-nowrap"
                >
                  {config.secondaryCtaText ?? 'SCHEDULE A 10-MIN CALL →'}
                </a>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/90 font-semibold">
              <a
                href={config.phoneTel}
                onClick={() => trackContactClick('phone', 'final_cta', occasion, config.phoneTel)}
                className="inline-flex items-center gap-1.5 hover:text-white"
              >
                <PhoneIcon className="w-4 h-4" /> Call {config.phoneDisplay}
              </a>
              <a
                href={`sms:${config.phoneTel.replace('tel:', '')}`}
                onClick={() =>
                  trackContactClick(
                    'sms',
                    'final_cta',
                    occasion,
                    `sms:${config.phoneTel.replace('tel:', '')}`,
                  )
                }
                className="inline-flex items-center gap-1.5 hover:text-white"
              >
                <ChatIcon className="w-4 h-4" /> Text us
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
          className="flex-1 inline-flex items-center justify-center border-2 font-bold py-3 rounded-lg text-sm whitespace-nowrap"
          style={{ borderColor: T.navy, color: T.navy }}
        >
          Build my package
        </button>
        <button
          type="button"
          onClick={openBuilder}
          className="flex-1 inline-flex items-center justify-center font-bold py-3 rounded-lg text-sm whitespace-nowrap"
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
        catalog={activeCatalog}
        hasLastMinuteCatalog={!!lastMinuteCatalog}
        lastMinuteMode={lastMinuteMode}
        onLastMinuteModeChange={setLastMinuteMode}
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
