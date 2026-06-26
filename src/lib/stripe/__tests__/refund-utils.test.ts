/**
 * Refund cap regression tests.
 *
 * Core invariant: the refund cap is computed from Stripe's ACTUAL refunded
 * amount, not just the DB Refund table. This guards the partial-failure path —
 * Stripe refund succeeds, then the DB write dies (e.g. a Neon cold-start drop) —
 * where the DB shows 0 prior refunds but Stripe has already refunded. A retry
 * must NOT compute the full captured amount as refundable again.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRetrieve = vi.fn();
const mockList = vi.fn();

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    paymentIntents: { retrieve: (...args: unknown[]) => mockRetrieve(...args) },
    refunds: { list: (...args: unknown[]) => mockList(...args) },
  },
}));

/** Build the async-iterable that stripe.refunds.list() returns. */
function listOf(refunds: Array<{ amount: number; status: string }>): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const r of refunds) yield r;
    },
  };
}

import {
  getStripeRefundedAmount,
  getMaxRefundable,
} from '@/lib/stripe/refund-utils';

describe('getStripeRefundedAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sums succeeded and pending refunds, excludes failed and canceled', async () => {
    mockList.mockReturnValue(
      listOf([
        { amount: 5000, status: 'succeeded' },
        { amount: 2500, status: 'pending' },
        { amount: 9999, status: 'failed' },
        { amount: 8888, status: 'canceled' },
      ])
    );

    // 5000 + 2500 = 7500 cents = $75 (failed/canceled don't move money)
    await expect(getStripeRefundedAmount('pi_1')).resolves.toBe(75);
  });

  it('returns 0 when Stripe has no refunds', async () => {
    mockList.mockReturnValue(listOf([]));
    await expect(getStripeRefundedAmount('pi_1')).resolves.toBe(0);
  });
});

describe('getMaxRefundable — retry must not double-refund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('REGRESSION: Stripe already fully refunded but DB shows 0 → cap is 0', async () => {
    // The partial-failure state: Stripe refunded the full $150, the DB Refund
    // write failed, so the caller passes priorRefundsTotalDollars = 0.
    mockRetrieve.mockResolvedValue({ amount_received: 15000 });
    mockList.mockReturnValue(listOf([{ amount: 15000, status: 'succeeded' }]));

    // Caller's DB sum is 0 — must NOT widen the cap back to the full amount.
    await expect(getMaxRefundable('pi_1', 0)).resolves.toBe(0);
  });

  it('REGRESSION: Stripe partially refunded but DB shows 0 → cap excludes the Stripe refund', async () => {
    mockRetrieve.mockResolvedValue({ amount_received: 15000 });
    mockList.mockReturnValue(listOf([{ amount: 5000, status: 'succeeded' }]));

    // captured 150 − stripeRefunded 50 = 100 (not 150)
    await expect(getMaxRefundable('pi_1', 0)).resolves.toBe(100);
  });

  it('full cap available when neither Stripe nor DB show prior refunds', async () => {
    mockRetrieve.mockResolvedValue({ amount_received: 15000 });
    mockList.mockReturnValue(listOf([]));

    await expect(getMaxRefundable('pi_1', 0)).resolves.toBe(150);
  });

  it('uses the LARGER of DB sum and Stripe refunded (DB ahead of Stripe)', async () => {
    // Defensive: if the DB somehow records more than Stripe, never widen the cap.
    mockRetrieve.mockResolvedValue({ amount_received: 15000 });
    mockList.mockReturnValue(listOf([])); // Stripe shows nothing

    // DB says $50 already refunded → cap = 150 − 50 = 100
    await expect(getMaxRefundable('pi_1', 50)).resolves.toBe(100);
  });

  it('handles fractional dollars without floating-point drift', async () => {
    mockRetrieve.mockResolvedValue({ amount_received: 10000 }); // $100.00
    mockList.mockReturnValue(listOf([{ amount: 3333, status: 'succeeded' }])); // $33.33

    await expect(getMaxRefundable('pi_1', 0)).resolves.toBe(66.67);
  });
});
