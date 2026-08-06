/**
 * Reviewer avatar shared by every social-proof surface (rating strips,
 * review marquee, pain-point mirror, /reviews wall). Renders the harvested
 * real photo when the review has one, otherwise initials on the review's
 * brand-adjacent color — never a gray silhouette, never a stock face.
 * Pure presentational component: safe in both server and client components.
 */

import Image from 'next/image';
import { reviewerInitials, type CustomerReview } from '@/lib/reviews/reviews';

type Props = {
  review: Pick<CustomerReview, 'author' | 'avatarBg' | 'photoSrc'>;
  /** Rendered box size in px (width = height). */
  size: number;
  /** Optional ring color — match the surface behind the avatar. */
  ringColor?: string;
  ringWidth?: number;
  className?: string;
};

export default function ReviewerAvatar({
  review,
  size,
  ringColor,
  ringWidth = 2,
  className = '',
}: Props) {
  const ring = ringColor ? { border: `${ringWidth}px solid ${ringColor}` } : undefined;

  if (review.photoSrc) {
    return (
      <Image
        src={review.photoSrc}
        alt={`${review.author} — Google reviewer`}
        width={size}
        height={size}
        className={`flex-shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size, ...ring }}
      />
    );
  }

  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-extrabold ${className}`}
      style={{
        width: size,
        height: size,
        background: review.avatarBg,
        color: '#0A1F33',
        fontSize: Math.max(9, Math.round(size * 0.36)),
        ...ring,
      }}
      aria-hidden="true"
    >
      {reviewerInitials(review.author)}
    </span>
  );
}
