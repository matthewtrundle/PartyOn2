'use client';

/**
 * The "Pain-Point Mirror" — one oversized, message-matched review placed
 * directly above the final CTA, with the visitor's exact pre-purchase
 * anxiety highlighted in the brand color. The opposite of the marquee:
 * precision instead of volume, and static on purpose (anything a visitor
 * must actually read never moves).
 *
 * Why: conversion copy works when prospects hear themselves on the page —
 * Joanna Wiebe's canonical test ran a verbatim customer line as the
 * headline and drove ~400% more clicks. Each landing config picks the
 * review whose worry matches its audience via `featuredReview`.
 */

import { trackCTAClick } from '@/lib/analytics/ga4-events';
import {
  GOOGLE_RATING_DISPLAY,
  GOOGLE_REVIEW_COUNT_DISPLAY,
  reviewerInitials,
  type CustomerReview,
} from '@/lib/reviews/reviews';
import type { ThemeColors } from '../types';

type Props = {
  review: CustomerReview;
  theme: ThemeColors;
  ctaText: string;
  onCta: () => void;
  /** Optional risk-reversal line under the button ("Unopened cases refunded…"). */
  reassurance?: string;
};

export default function PainPointMirror({
  review,
  theme,
  ctaText,
  onCta,
  reassurance,
}: Props) {
  const { excerpt, highlight } = review;
  const at = highlight ? excerpt.indexOf(highlight) : -1;

  return (
    <section className="py-16 md:py-20" style={{ background: theme.cream }}>
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:px-6 md:grid-cols-[1.6fr_1fr]">
        <figure className="m-0">
          <blockquote
            className="font-heading m-0 text-2xl font-bold leading-snug md:text-3xl"
            style={{ color: theme.navy }}
          >
            &ldquo;
            {highlight && at >= 0 ? (
              <>
                {excerpt.slice(0, at)}
                <strong
                  className="rounded-sm px-1 font-bold"
                  style={{ background: theme.primary, color: theme.primaryText }}
                >
                  {highlight}
                </strong>
                {excerpt.slice(at + highlight.length)}
              </>
            ) : (
              excerpt
            )}
            &rdquo;
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            <span
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-base font-extrabold"
              style={{
                background: review.avatarBg,
                color: '#0A1F33',
                border: `2.5px solid ${theme.primary}`,
              }}
              aria-hidden="true"
            >
              {reviewerInitials(review.author)}
            </span>
            <span>
              <span className="block text-sm font-extrabold" style={{ color: theme.navy }}>
                {review.author}
              </span>
              <span className="block text-xs text-gray-500">
                ★★★★★ via Google · {review.context}
              </span>
            </span>
          </figcaption>
        </figure>

        <div className="text-center">
          <p
            className="mb-1 text-base"
            aria-hidden="true"
            style={{ color: theme.blue, letterSpacing: '3px' }}
          >
            ★★★★★
          </p>
          <p className="mb-4 text-sm font-bold" style={{ color: theme.navy }}>
            {GOOGLE_RATING_DISPLAY} · {GOOGLE_REVIEW_COUNT_DISPLAY} Google reviews
          </p>
          <button
            type="button"
            onClick={() => {
              trackCTAClick(ctaText, '#builder', 'pain_point_mirror');
              onCta();
            }}
            className="inline-flex items-center justify-center rounded-lg px-8 py-4 text-base font-bold tracking-[0.08em] shadow-lg transition-colors"
            style={{ background: theme.primary, color: theme.primaryText }}
          >
            {ctaText}
          </button>
          {reassurance && (
            <p className="mt-3 text-xs text-gray-500">{reassurance}</p>
          )}
        </div>
      </div>
    </section>
  );
}
