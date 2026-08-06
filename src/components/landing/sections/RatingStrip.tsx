'use client';

/**
 * Compact social-proof anchor rendered directly under a CTA: an overlapping
 * facepile of reviewer initials + "★★★★★ 4.9 · 100+ Google reviews" + a
 * link to the /reviews wall. The point is proximity to the moment of
 * decision — visitors hesitate in the instant before clicking a CTA, and a
 * count-bearing rating answers "is this legit?" right there (a rating with
 * a count reads as real; a flat 5.0 alone reads as fake — Baymard).
 *
 * Initials avatars on purpose: no real reviewer photos exist in the repo,
 * and stock/AI faces test worse than no face (see lib/reviews/reviews.ts).
 */

import Link from 'next/link';
import { trackCTAClick, type CtaSection } from '@/lib/analytics/ga4-events';
import {
  CUSTOMER_REVIEWS,
  GOOGLE_RATING_DISPLAY,
  GOOGLE_REVIEW_COUNT_DISPLAY,
  reviewerInitials,
} from '@/lib/reviews/reviews';

type Props = {
  /** Where the strip lives, for CTA-click attribution (e.g. 'reviews_strip'). */
  section: CtaSection;
  /** Star color — pass the page theme's primary (yellow/gold on navy). */
  starColor: string;
  /**
   * Dark strips sit on navy hero panels (white text); light strips sit on
   * cream/white sections (navy text).
   */
  variant?: 'onDark' | 'onLight';
  /** Border ring around the facepile — match the surface behind the strip. */
  facepileRingColor?: string;
  className?: string;
};

// First four reviewers make the facepile — stable, so the strip doesn't
// reshuffle between renders/pages.
const FACEPILE = CUSTOMER_REVIEWS.slice(0, 4);

export default function RatingStrip({
  section,
  starColor,
  variant = 'onDark',
  facepileRingColor,
  className = '',
}: Props) {
  const onDark = variant === 'onDark';
  const textColor = onDark ? 'rgba(255,255,255,0.92)' : '#0A1F33';
  const linkColor = onDark ? 'rgba(255,255,255,0.65)' : '#5B6975';
  const ring = facepileRingColor ?? (onDark ? '#0A1F33' : '#FFFFFF');

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}
      style={{ color: textColor }}
    >
      <div className="flex" aria-hidden="true">
        {FACEPILE.map((r, i) => (
          <span
            key={r.id}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-extrabold"
            style={{
              background: r.avatarBg,
              color: '#0A1F33',
              border: `2px solid ${ring}`,
              marginLeft: i === 0 ? 0 : -8,
            }}
          >
            {reviewerInitials(r.author)}
          </span>
        ))}
      </div>
      <span className="text-sm font-semibold whitespace-nowrap">
        <span aria-hidden="true" style={{ color: starColor, letterSpacing: '2px' }}>
          ★★★★★
        </span>{' '}
        {GOOGLE_RATING_DISPLAY} · {GOOGLE_REVIEW_COUNT_DISPLAY} Google reviews
      </span>
      <Link
        href="/reviews"
        onClick={() => trackCTAClick('Read our reviews', '/reviews', section)}
        className="text-sm underline underline-offset-4 hover:opacity-80"
        style={{ color: linkColor }}
      >
        Read them →
      </Link>
    </div>
  );
}
