/**
 * /reviews — the "Wall of Love": every harvested Google review, full text,
 * verbatim. This page is the click-through destination for every
 * "5.0 · 100+ Google reviews" strip on the landing pages, so the claim is
 * always one click from proof.
 *
 * Design: a navy "trophy case" hero — giant count-up 5.0, then the Review
 * Storm marquee drifting through the hero itself (same motion language as
 * the landers, so the click-through from a rating strip lands somewhere
 * that visibly belongs to the same system) — before the cream masonry
 * wall. Varied card heights + occasional inverted navy cards read as
 * authentic (uniform cards look staged); pain phrases are bolded so a
 * skimmer catches the exact worry they arrived with.
 *
 * Launch checklist (landing-page-launch skill):
 *  - Nav: renders <Navigation/> (fixed top-0 — hero clears it with pt-28+).
 *  - Age gate: exempt (nothing sold here; every CTA leads to pages that
 *    keep their own gate/checkout attestation) — see AgeVerification.tsx.
 *  - Registry: 'reviews' entry in lib/analytics/landing-pages.ts.
 *  - CTA instrumentation: TrackedLink with section 'reviews_wall'.
 *  - No AggregateRating JSON-LD: self-serving review markup is ineligible
 *    for rich results (2019) and risks a manual action.
 */

import type { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import TrackedLink from '@/components/analytics/TrackedLink';
import CountUpStat from '@/components/landing/sections/CountUpStat';
import { MarqueeRow } from '@/components/landing/sections/ReviewMarquee';
import ReviewerAvatar from '@/components/landing/sections/ReviewerAvatar';
import {
  CUSTOMER_REVIEWS,
  GOOGLE_RATING_DISPLAY,
  GOOGLE_REVIEW_COUNT_DISPLAY,
} from '@/lib/reviews/reviews';

export const metadata: Metadata = {
  title: `Party On Delivery Reviews — ${GOOGLE_RATING_DISPLAY}★ on Google | Austin Alcohol Delivery`,
  description: `Real Google reviews from ${GOOGLE_REVIEW_COUNT_DISPLAY} Austin parties: boat days, bachelorette weekends, weddings, and corporate events. Every quote verbatim.`,
  alternates: { canonical: 'https://partyondelivery.com/reviews' },
};

const NAVY = '#0A1F33';
const YELLOW = '#F2D34F';
const CREAM = '#FAF6EE';
const GOLD = '#B07D0A';

/** Occasion links under the header — the wall's conversion path back out. */
const PLAN_LINKS = [
  { href: '/austin-bachelor-party-delivery', label: 'Bachelor party' },
  { href: '/austin-bachelorette-party-delivery', label: 'Bachelorette' },
  { href: '/austin-wedding-weekend-delivery', label: 'Wedding weekend' },
  { href: '/austin-corporate-event-delivery', label: 'Corporate event' },
];

/** Bold the review's pain phrase inside its full quote (wall cards). */
function HighlightedQuote({
  quote,
  highlight,
  accent,
}: {
  quote: string;
  highlight?: string;
  accent: string;
}) {
  if (!highlight || !quote.includes(highlight)) return <>{quote}</>;
  const at = quote.indexOf(highlight);
  return (
    <>
      {quote.slice(0, at)}
      <strong className="font-bold" style={{ color: accent }}>
        {highlight}
      </strong>
      {quote.slice(at + highlight.length)}
    </>
  );
}

export default function ReviewsPage() {
  // Split the pool by parity so both marquee rows feel equally alive.
  const rowA = CUSTOMER_REVIEWS.filter((_, i) => i % 2 === 0);
  const rowB = CUSTOMER_REVIEWS.filter((_, i) => i % 2 === 1);

  return (
    <main className="min-h-screen" style={{ background: CREAM }}>
      <Navigation />

      {/* ── Trophy-case hero: the aggregate claim, enormous, then the storm ── */}
      <section
        className="relative overflow-hidden pb-14 pt-32 text-center md:pt-36"
        style={{
          background: `
            radial-gradient(ellipse 55% 40% at 50% 0%, rgba(242,211,79,0.14), transparent 70%),
            radial-gradient(ellipse 40% 35% at 12% 85%, rgba(59,130,246,0.10), transparent 70%),
            ${NAVY}`,
        }}
      >
        <div className="px-4 sm:px-6">
          <p
            className="mb-6 text-sm font-bold tracking-[0.22em]"
            style={{ color: YELLOW }}
          >
            REAL GOOGLE REVIEWS · EVERY WORD VERBATIM
          </p>

          {/* The number is the hero. Counts up 0 → 5.0 on arrival. */}
          <div
            className="font-heading flex items-baseline justify-center gap-4 leading-none"
            aria-label={`Rated ${GOOGLE_RATING_DISPLAY} out of 5 on Google`}
          >
            <CountUpStat
              stat={GOOGLE_RATING_DISPLAY}
              className="text-[7rem] font-bold text-white md:text-[9rem]"
            />
            <span
              className="text-3xl tracking-[0.1em] md:text-5xl"
              style={{ color: YELLOW }}
              aria-hidden="true"
            >
              ★★★★★
            </span>
          </div>

          <h1 className="font-heading mx-auto mb-3 mt-4 max-w-3xl text-3xl font-bold text-white md:text-5xl">
            {GOOGLE_REVIEW_COUNT_DISPLAY} Austin parties can&rsquo;t be wrong
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/75">
            Boat days, bachelorette weekends, weddings, corporate events —
            every review on this page is word-for-word from our Google profile.
          </p>

          <div className="mb-14 flex flex-wrap items-center justify-center gap-2.5">
            {PLAN_LINKS.map((l) => (
              <TrackedLink
                key={l.href}
                href={l.href}
                section="reviews_wall"
                buttonText={l.label}
                className="rounded-full border px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#F2D34F] hover:text-[#0A1F33]"
                style={{ borderColor: 'rgba(242,211,79,0.45)', background: 'rgba(255,255,255,0.06)' }}
              >
                Plan a {l.label.toLowerCase()} →
              </TrackedLink>
            ))}
          </div>
        </div>

        {/* The storm drifts through the hero itself — full-bleed. */}
        <MarqueeRow reviews={rowA} starColor={YELLOW} durationSeconds={58} />
        <div className="h-4" />
        <MarqueeRow reviews={rowB} starColor={YELLOW} reverse durationSeconds={74} />
      </section>

      {/* ── The wall — CSS-columns masonry, full verbatim quotes. ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-heading text-3xl font-bold md:text-4xl" style={{ color: NAVY }}>
            All of them. Word for word.
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            No edits, no cherry-picked fragments — the full reviews, exactly as posted.
          </p>
        </div>

        <div className="md:columns-2 lg:columns-3 [column-gap:1.25rem]">
          {CUSTOMER_REVIEWS.map((r, i) => {
            // Every ~6th card inverts to navy — rhythm that keeps a long
            // wall from flattening into wallpaper.
            const inverted = i % 6 === 2;
            return (
              <figure
                key={r.id}
                className="mb-5 break-inside-avoid rounded-xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                style={
                  inverted
                    ? { background: NAVY, borderColor: NAVY }
                    : { background: '#FFFFFF', borderColor: '#E7DFCE' }
                }
              >
                <p
                  className="mb-3 text-sm"
                  aria-label="5 out of 5 stars"
                  style={{ color: inverted ? YELLOW : GOLD, letterSpacing: '2px' }}
                >
                  ★★★★★
                </p>
                <blockquote
                  className="m-0 text-[15px] leading-relaxed"
                  style={{ color: inverted ? 'rgba(255,255,255,0.88)' : '#374151' }}
                >
                  &ldquo;
                  <HighlightedQuote
                    quote={r.quote}
                    highlight={r.highlight}
                    accent={inverted ? '#FFE97A' : GOLD}
                  />
                  &rdquo;
                </blockquote>
                <figcaption
                  className="mt-4 flex items-center gap-2.5 border-t pt-4"
                  style={{ borderColor: inverted ? 'rgba(255,255,255,0.15)' : '#F1ECDF' }}
                >
                  <ReviewerAvatar review={r} size={32} />
                  <span>
                    <span
                      className="block text-sm font-bold"
                      style={{ color: inverted ? '#FFFFFF' : NAVY }}
                    >
                      {r.author}
                    </span>
                    <span
                      className="block text-xs"
                      style={{ color: inverted ? 'rgba(255,255,255,0.55)' : '#6B7280' }}
                    >
                      Google · {r.context}
                    </span>
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          This wall shows the reviews we&rsquo;ve republished so far — the full
          set of {GOOGLE_REVIEW_COUNT_DISPLAY} lives on our{' '}
          <a
            href="https://www.google.com/search?q=Party+On+Delivery+Austin+reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
            style={{ color: NAVY }}
          >
            Google profile
          </a>
          .
        </p>
      </section>

      {/* ── Closer — back into the funnel, on brand navy. ── */}
      <section
        className="px-4 py-20 text-center sm:px-6"
        style={{
          background: `radial-gradient(ellipse 50% 60% at 50% 100%, rgba(242,211,79,0.12), transparent 70%), ${NAVY}`,
        }}
      >
        <p className="mb-2 text-sm font-bold tracking-[0.22em]" style={{ color: YELLOW }}>
          <span aria-hidden="true">★★★★★</span> {GOOGLE_RATING_DISPLAY} ·{' '}
          {GOOGLE_REVIEW_COUNT_DISPLAY} GOOGLE REVIEWS
        </p>
        <h2 className="font-heading mb-6 text-3xl font-bold text-white md:text-4xl">
          Your party could be the next review.
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Hex classes contain no commas, so Tailwind generates them fine
              (the comma-in-arbitrary-value trap is documented in the launch
              checklist). */}
          <TrackedLink
            href="/order"
            section="reviews_wall"
            buttonText="Start an order"
            className="inline-flex items-center justify-center rounded-lg bg-[#F2D34F] px-8 py-4 text-base font-bold tracking-[0.08em] text-[#0A1F33] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#FACC15]"
          >
            START AN ORDER →
          </TrackedLink>
        </div>
      </section>
    </main>
  );
}
