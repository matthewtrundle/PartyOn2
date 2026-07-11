/**
 * Precedence-trap guard (finance data cleanup, B4 / risk #1): the per-month
 * "use QB vs bank-derived expenses" decision must hinge on QB having MATERIAL
 * data — NOT on `qbExpenses.length > 0`, or 2026's auto-posted Shopify-fee rows
 * falsely win and hide the real bank expenses.
 */

import { describe, it, expect } from 'vitest';
import { isQbMaterial, computeAccrualBlock } from '@/lib/finance/monthly-rollup';

describe('computeAccrualBlock', () => {
  it('sums cost of SOLD items and reports coverage over item revenue', () => {
    const r = computeAccrualBlock([
      { priceCents: 10_000, costCents: 6_000 }, // covered
      { priceCents: 5_000, costCents: 3_000 }, // covered
      { priceCents: 5_000, costCents: null }, // no cost — uncovered
    ]);
    expect(r).toEqual({
      cogsCents: 9_000,
      coveredRevenueCents: 15_000,
      coveragePct: 75, // 15k of 20k item revenue carries a cost
    });
    // Margin over the COVERED basket: (15k − 9k) / 15k = 40% — consumers must
    // divide by coveredRevenueCents, never full revenue.
    expect(((r!.coveredRevenueCents - r!.cogsCents) / r!.coveredRevenueCents) * 100).toBe(40);
  });

  it('returns null when no item carries a cost (nothing to estimate from)', () => {
    expect(computeAccrualBlock([{ priceCents: 10_000, costCents: null }])).toBeNull();
    expect(computeAccrualBlock([{ priceCents: 10_000, costCents: 0 }])).toBeNull();
    expect(computeAccrualBlock([])).toBeNull();
  });

  it('rounds coverage to one decimal', () => {
    const r = computeAccrualBlock([
      { priceCents: 3_333, costCents: 1_000 },
      { priceCents: 6_667, costCents: null },
    ]);
    expect(r!.coveragePct).toBe(33.3);
  });
});

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
