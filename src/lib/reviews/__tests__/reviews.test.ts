import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CUSTOMER_REVIEWS,
  reviewsForOccasion,
  reviewById,
  reviewerInitials,
} from '../reviews';

/**
 * The house rule for testimonials is VERBATIM ONLY (a fabricated-persona
 * cleanup already happened once — see configs/corporate.ts history). These
 * assertions make the rule mechanical: an excerpt that drifts from its full
 * quote, or a highlight that isn't really in the excerpt, fails CI instead
 * of silently paraphrasing a real customer.
 */
describe('customer review pool integrity', () => {
  it('has unique ids', () => {
    const ids = CUSTOMER_REVIEWS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CUSTOMER_REVIEWS.map((r) => [r.id, r] as const))(
    '%s: excerpt is verbatim from the full quote',
    (_id, review) => {
      // "…" marks an omission; every run between marks must appear verbatim.
      const runs = review.excerpt
        .split('…')
        .map((s) => s.trim())
        .filter(Boolean);
      expect(runs.length).toBeGreaterThan(0);
      for (const run of runs) {
        expect(review.quote).toContain(run);
      }
    },
  );

  it.each(CUSTOMER_REVIEWS.map((r) => [r.id, r] as const))(
    '%s: highlight (when set) is inside the excerpt',
    (_id, review) => {
      if (review.highlight) {
        expect(review.excerpt).toContain(review.highlight);
      }
    },
  );

  it('every review has at least one segment and an avatar color', () => {
    for (const r of CUSTOMER_REVIEWS) {
      expect(r.segments.length).toBeGreaterThan(0);
      expect(r.avatarBg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('every photoSrc points at a real file under public/ (see HARVEST.md)', () => {
    // A set photoSrc with a missing file would ship a broken avatar on every
    // landing page at once — fail here instead.
    for (const r of CUSTOMER_REVIEWS) {
      if (!r.photoSrc) continue;
      expect(r.photoSrc).toMatch(/^\/images\/reviewers\/[\w-]+\.(webp|jpg|jpeg|png)$/);
      expect(
        existsSync(join(process.cwd(), 'public', r.photoSrc)),
        `${r.id}: ${r.photoSrc} missing from public/`,
      ).toBe(true);
    }
  });
});

describe('reviewsForOccasion', () => {
  it('returns the whole pool, best-matched segment first', () => {
    const forWedding = reviewsForOccasion('wedding');
    expect(forWedding).toHaveLength(CUSTOMER_REVIEWS.length);
    expect(forWedding[0].segments).toContain('wedding');
  });

  it('falls back to the boat ordering for unknown occasions', () => {
    expect(reviewsForOccasion('mystery')).toHaveLength(CUSTOMER_REVIEWS.length);
  });
});

describe('helpers', () => {
  it('reviewById resolves the featured-quote references', () => {
    expect(reviewById('nikita-patel')?.author).toBe('Nikita Patel');
    expect(reviewById('nope')).toBeUndefined();
  });

  it('reviewerInitials builds two-letter initials', () => {
    expect(reviewerInitials('Rivajoy Giannitsis')).toBe('RG');
    expect(reviewerInitials('Mary H.')).toBe('MH');
  });
});
