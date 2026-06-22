/**
 * Precedence-trap guard (finance data cleanup, B4 / risk #1): the per-month
 * "use QB vs bank-derived expenses" decision must hinge on QB having MATERIAL
 * data — NOT on `qbExpenses.length > 0`, or 2026's auto-posted Shopify-fee rows
 * falsely win and hide the real bank expenses.
 */

import { describe, it, expect } from 'vitest';
import { isQbMaterial } from '@/lib/finance/monthly-rollup';

describe('isQbMaterial', () => {
  it('is FALSE when QB has only auto-posted payment_fees (2026 dormant month)', () => {
    const qb = [
      { amountCents: 90_000, categorySlug: 'payment_fees' }, // ~$900 Shopify fee
      { amountCents: 80_000, categorySlug: 'payment_fees' }, // ~$800 Shopify fee
    ];
    expect(isQbMaterial(qb)).toBe(false);
  });

  it('is TRUE when QB has real operating expenses above the floor', () => {
    const qb = [
      { amountCents: 250_000, categorySlug: 'rent' },
      { amountCents: 50_000, categorySlug: 'payment_fees' },
    ];
    expect(isQbMaterial(qb)).toBe(true);
  });

  it('is FALSE for an empty month', () => {
    expect(isQbMaterial([])).toBe(false);
  });

  it('is FALSE when non-fee expenses are below the $500 floor', () => {
    const qb = [
      { amountCents: 30_000, categorySlug: 'office' }, // $300 < $500 floor
      { amountCents: 200_000, categorySlug: 'payment_fees' },
    ];
    expect(isQbMaterial(qb)).toBe(false);
  });

  it('counts cogs toward materiality', () => {
    const qb = [{ amountCents: 600_000, categorySlug: 'cogs' }];
    expect(isQbMaterial(qb)).toBe(true);
  });
});
