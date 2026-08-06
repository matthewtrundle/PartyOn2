/**
 * /reviews — the "Wall of Love": every harvested Google review, full text,
 * verbatim, in a dense masonry wall. This page is the click-through
 * destination for every "4.9 · 100+ Google reviews" strip on the landing
 * pages, so the claim is always one click from proof.
 *
 * Density is the message — varied card heights read as authentic (uniform
 * cards look staged), and the volume registers before a single word is
 * read. Masonry is pure CSS columns; no JS.
 *
 * Launch checklist (landing-page-launch skill):
 *  - Nav: renders <Navigation/> (content page, organic + shared links).
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
import {
  CUSTOMER_REVIEWS,
  GOOGLE_RATING_DISPLAY,
  GOOGLE_REVIEW_COUNT_DISPLAY,
  reviewerInitials,
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

export default function ReviewsPage() {
  return (
    <main className="min-h-screen" style={{ background: CREAM }}>
      <Navigation />

      {/* Header — the aggregate claim, big. */}
      <section className="px-4 pb-10 pt-14 text-center sm:px-6" style={{ background: NAVY }}>
        <p
          className="mb-3 text-sm font-bold tracking-[0.15em]"
          style={{ color: YELLOW }}
        >
          <span aria-hidden="true">★★★★★</span> REAL GOOGLE REVIEWS
        </p>
        <h1 className="font-heading mx-auto mb-3 max-w-3xl text-4xl font-bold text-white md:text-6xl">
          {GOOGLE_REVIEW_COUNT_DISPLAY} Austin parties can&rsquo;t be wrong
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-white/75">
          {GOOGLE_RATING_DISPLAY} out of 5 on Google. Boat days, bachelorette
          weekends, weddings, corporate events — every review below is verbatim,
          straight from our Google profile.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {PLAN_LINKS.map((l) => (
            <TrackedLink
              key={l.href}
              href={l.href}
              section="reviews_wall"
              buttonText={l.label}
              className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Plan a {l.label.toLowerCase()} →
            </TrackedLink>
          ))}
        </div>
      </section>

      {/* The wall — CSS-columns masonry, full verbatim quotes. */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="md:columns-2 lg:columns-3 [column-gap:1.25rem]">
          {CUSTOMER_REVIEWS.map((r) => (
            <figure
              key={r.id}
              className="mb-5 break-inside-avoid rounded-xl border bg-white p-6 shadow-sm"
              style={{ borderColor: '#E7DFCE' }}
            >
              <p
                className="mb-3 text-sm"
                aria-label="5 out of 5 stars"
                style={{ color: GOLD, letterSpacing: '2px' }}
              >
                ★★★★★
              </p>
              <blockquote className="m-0 text-[15px] leading-relaxed text-gray-700">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-2.5 border-t pt-4" style={{ borderColor: '#F1ECDF' }}>
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
                  style={{ background: r.avatarBg, color: NAVY }}
                  aria-hidden="true"
                >
                  {reviewerInitials(r.author)}
                </span>
                <span>
                  <span className="block text-sm font-bold" style={{ color: NAVY }}>
                    {r.author}
                  </span>
                  <span className="block text-xs text-gray-500">
                    Google · {r.context}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
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

      {/* Closer — back into the funnel. */}
      <section className="px-4 pb-20 text-center sm:px-6">
        <h2 className="font-heading mb-4 text-3xl font-bold md:text-4xl" style={{ color: NAVY }}>
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
            className="inline-flex items-center justify-center rounded-lg bg-[#F2D34F] px-8 py-4 text-base font-bold tracking-[0.08em] text-[#0A1F33] shadow-lg transition-colors hover:bg-[#FACC15]"
          >
            START AN ORDER →
          </TrackedLink>
        </div>
      </section>
    </main>
  );
}
