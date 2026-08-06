/**
 * The "Review Storm" — two counter-rotating rows of review tiles drifting
 * across a navy section. Replaces the static 3-card social-proof grid that
 * sat ~70% down the page where paid traffic never scrolled.
 *
 * Why a marquee and not a carousel: auto-advancing carousels test WORSE than
 * static (NN/g; ~1% slide-2 clickthrough) because required reading vanishes
 * before it's read. A marquee dodges that — no tile is required reading, the
 * endless stream itself is the message ("more reviews than I can count").
 * Anything a visitor must actually read (the PainPointMirror quote) stays
 * static. Hover pauses the wall; prefers-reduced-motion freezes it into
 * ordinary swipeable rows (CSS in globals.css, .pod-marquee).
 *
 * Every tile bolds the reviewer's pain phrase — lugging, running around
 * town, on time — so even at drift speed the eye catches the exact worry
 * the visitor arrived with.
 */

import Link from 'next/link';
import type { ThemeColors } from '../types';
import {
  GOOGLE_RATING_DISPLAY,
  GOOGLE_REVIEW_COUNT_DISPLAY,
  type CustomerReview,
} from '@/lib/reviews/reviews';
import ReviewerAvatar from './ReviewerAvatar';

type Props = {
  headline: string;
  reviews: CustomerReview[];
  theme: ThemeColors;
};

/** Excerpt with the pain-point phrase wrapped in <strong>. */
function HighlightedExcerpt({ review }: { review: CustomerReview }) {
  const { excerpt, highlight } = review;
  if (!highlight || !excerpt.includes(highlight)) return <>{excerpt}</>;
  const at = excerpt.indexOf(highlight);
  return (
    <>
      {excerpt.slice(0, at)}
      <strong className="font-bold" style={{ color: '#FFE97A' }}>
        {highlight}
      </strong>
      {excerpt.slice(at + highlight.length)}
    </>
  );
}

function ReviewTile({ review, theme }: { review: CustomerReview; theme: ThemeColors }) {
  return (
    <div
      className="w-[300px] sm:w-[330px] flex-shrink-0 rounded-xl p-5"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <ReviewerAvatar review={review} size={32} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{review.author}</div>
          <div className="text-[11px] text-white/55">via Google · {review.context}</div>
        </div>
        <span
          className="ml-auto flex-shrink-0 text-xs"
          style={{ color: theme.primary, letterSpacing: '2px' }}
          aria-label="5 out of 5 stars"
        >
          ★★★★★
        </span>
      </div>
      <p className="m-0 text-sm leading-relaxed text-white/85">
        &ldquo;<HighlightedExcerpt review={review} />&rdquo;
      </p>
    </div>
  );
}

function MarqueeRow({
  reviews,
  theme,
  reverse,
  durationSeconds,
}: {
  reviews: CustomerReview[];
  theme: ThemeColors;
  reverse?: boolean;
  durationSeconds: number;
}) {
  const tiles = reviews.map((r) => <ReviewTile key={r.id} review={r} theme={theme} />);
  return (
    <div className="pod-marquee">
      <div
        className={`pod-marquee-track${reverse ? ' pod-marquee-track--reverse' : ''}`}
        style={{ '--pod-marquee-dur': `${durationSeconds}s` } as React.CSSProperties}
      >
        {tiles}
        {/* Second copy makes the -50% translate loop seamless; hidden from
            screen readers so each review is announced once. */}
        <div className="contents" aria-hidden="true">
          {reviews.map((r) => (
            <ReviewTile key={`${r.id}-dup`} review={r} theme={theme} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReviewMarquee({ headline, reviews, theme }: Props) {
  // Split the relevance-ordered pool across two rows by parity so the
  // best-matched reviews spread over both rows instead of clustering in one.
  const rowA = reviews.filter((_, i) => i % 2 === 0);
  const rowB = reviews.filter((_, i) => i % 2 === 1);

  return (
    <section className="overflow-hidden py-20 text-white" style={{ background: theme.navy }}>
      <div className="mb-12 px-4 text-center sm:px-6">
        {/* Eyebrow derives from the shared aggregate constants — the one
            source of truth — so a page can never claim a different rating
            than the strip under its own hero CTA. */}
        <p
          className="mb-3 text-sm font-bold tracking-[0.15em]"
          style={{ color: theme.primary }}
        >
          <span aria-hidden="true">★★★★★</span> {GOOGLE_RATING_DISPLAY} ON GOOGLE ·{' '}
          {GOOGLE_REVIEW_COUNT_DISPLAY} REVIEWS
        </p>
        <h2 className="font-heading mb-0 text-4xl font-bold md:text-5xl">{headline}</h2>
      </div>

      <MarqueeRow reviews={rowA} theme={theme} durationSeconds={58} />
      <div className="h-4" />
      <MarqueeRow reviews={rowB} theme={theme} reverse durationSeconds={74} />

      <p className="mt-10 text-center text-sm text-white/60">
        Every review verbatim, straight from our Google profile —{' '}
        <Link
          href="/reviews"
          className="font-semibold text-white/85 underline underline-offset-4 hover:text-white"
        >
          read all {GOOGLE_REVIEW_COUNT_DISPLAY} →
        </Link>
      </p>
    </section>
  );
}
