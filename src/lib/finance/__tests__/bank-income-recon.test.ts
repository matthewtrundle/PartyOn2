/**
 * Income reconciliation core (finance data cleanup, B3 / risk #3): deposits up
 * to known Stripe revenue must count as Stripe-explained even when NO StripePayout
 * rows exist (the Jan–May 2026 payout-sync gap), while deposits that exceed known
 * revenue surface as unexplained "other income".
 */

import { describe, it, expect } from 'vitest';
import { explainDeposits } from '@/lib/finance/bank-income-recon';

describe('explainDeposits', () => {
  it('explains deposits via the revenue proxy when NO payouts matched (payout gap)', () => {
    // $10k deposits, 0 explicitly matched, but $10k known Stripe revenue.
    const r = explainDeposits({
      totalDepositsCents: 1_000_000,
      matchedToStripeCents: 0,
      stripeRevenueProxyCents: 1_000_000,
    });
    expect(r.stripeExplainedCents).toBe(1_000_000);
    expect(r.otherIncomeCents).toBe(0);
    expect(r.reconciled).toBe(true);
  });

  it('flags deposits that exceed known Stripe revenue as other income', () => {
    // $10k deposits but only $6k known revenue → $4k unexplained (> 15% tolerance).
    const r = explainDeposits({
      totalDepositsCents: 1_000_000,
      matchedToStripeCents: 0,
      stripeRevenueProxyCents: 600_000,
    });
    expect(r.otherIncomeCents).toBe(400_000);
    expect(r.reconciled).toBe(false);
  });

  it('uses explicit payout matches when present', () => {
    const r = explainDeposits({
      totalDepositsCents: 1_000_000,
      matchedToStripeCents: 1_000_000,
      stripeRevenueProxyCents: 0,
    });
    expect(r.stripeExplainedCents).toBe(1_000_000);
    expect(r.reconciled).toBe(true);
  });

  it('tolerates small unexplained amounts within 15%', () => {
    // $10k deposits, $9k explained → $1k (10%) unexplained ≤ 15% → still reconciled.
    const r = explainDeposits({
      totalDepositsCents: 1_000_000,
      matchedToStripeCents: 0,
      stripeRevenueProxyCents: 900_000,
    });
    expect(r.otherIncomeCents).toBe(100_000);
    expect(r.reconciled).toBe(true);
  });

  it('is not reconciled when there are no deposits', () => {
    const r = explainDeposits({
      totalDepositsCents: 0,
      matchedToStripeCents: 0,
      stripeRevenueProxyCents: 0,
    });
    expect(r.reconciled).toBe(false);
  });
});
