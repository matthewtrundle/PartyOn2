/**
 * Income reconciliation core (finance data cleanup, B3 / risk #3): deposits up
 * to known Stripe revenue must count as Stripe-explained even when NO StripePayout
 * rows exist (the Jan–May 2026 payout-sync gap), while deposits that exceed known
 * revenue surface as unexplained "other income".
 */

import { describe, it, expect } from 'vitest';
import { explainDeposits, classifyBankInflow } from '@/lib/finance/bank-income-recon';

describe('classifyBankInflow', () => {
  it('classifies Brian owner-capital transfers by real WF descriptors (financing, not income)', () => {
    // Real descriptors from the first production sync — Plaid mislabels these
    // INCOME_CONTRACTOR, so classification is by descriptor.
    expect(
      classifyBankInflow({ name: 'ZELLE FROM B HILL ENTERTAINMENT LLC ON 05/15', merchantName: null })
    ).toBe('owner_capital');
    expect(
      classifyBankInflow({ name: 'ONLINE TRANSFER FROM HILL B EVERYDAY CHECKIN', merchantName: null })
    ).toBe('owner_capital');
    expect(
      classifyBankInflow({ name: 'ONLINE TRANSFER FROM B HILL ENTERTAINMENT LL', merchantName: null })
    ).toBe('owner_capital');
    expect(
      classifyBankInflow({ name: 'ONLINE TRANSFER FROM HILL B REF #IB0Y2NKXHG', merchantName: null })
    ).toBe('owner_capital');
  });

  it('classifies PeopleFund advances as loan proceeds (financing, not income)', () => {
    // Real descriptors from the 2024 statement import (loan #0006957). ~$328K of
    // these in 2024 H1 alone — must never read as phantom sales.
    expect(
      classifyBankInflow({
        name: 'Peoplefund Advance 0006957 Full and Final Funding; Working Capital',
        merchantName: null,
      })
    ).toBe('loan_proceeds');
    expect(
      classifyBankInflow({
        name: 'Peoplefund Advances 0006957 Partial Funding; Inventory Category to Wc',
        merchantName: null,
      })
    ).toBe('loan_proceeds');
  });

  it('does NOT sweep a PeopleFund LOAN PAYMENT or a bare mention into loan proceeds', () => {
    // The outflow payment ("Pymt") is not an inflow class; and the rule requires
    // BOTH "peoplefund" AND "advance" so an unrelated mention can't false-match.
    expect(
      classifyBankInflow({ name: 'Peoplefund Pymt Web Pmts 032124 Party on Delivery', merchantName: null })
    ).toBe('sales_or_other');
    expect(classifyBankInflow({ name: 'CASH ADVANCE FROM A CUSTOMER', merchantName: null })).toBe(
      'sales_or_other'
    );
  });

  it('classifies a Shopify Capital advance as loan proceeds (financing, not income)', () => {
    // Live WF descriptor for the 2025-12-09 merchant cash advance ($25,000).
    // Shopify Capital is Shopify's lending arm — financing, never sales.
    expect(
      classifyBankInflow({
        name: 'SHOPIFY CAPITAL SHOPIFY 251208 45834452 Premier Conc',
        merchantName: null,
      })
    ).toBe('loan_proceeds');
  });

  it('does NOT sweep a Shopify sales payout into loan proceeds (anchor requires "capital")', () => {
    // Regular Shopify settlements never carry the word "capital"; a real sale
    // must stay IN the income check. The anchor pins the lending product only.
    expect(
      classifyBankInflow({ name: 'SHOPIFY PAYMENTS 251208 45834452 Premier Conc', merchantName: null })
    ).toBe('sales_or_other');
    // A real Shopify sales payout (the "SHOPIFY TRANSFER … BRIAN HILL" shape seen
    // on the live feed) must also stay in the check — no "capital" token.
    expect(
      classifyBankInflow({ name: 'SHOPIFY TRANSFER 251110 PARTY ON DELIVE BRIAN HILL', merchantName: null })
    ).toBe('sales_or_other');
  });

  it('classifies credits from COGS merchants as vendor refunds (not sales)', () => {
    expect(
      classifyBankInflow({ name: "Southern Glazer' FINTECHEFT 051826 XXXXX6635", merchantName: null })
    ).toBe('vendor_refund');
    expect(
      classifyBankInflow({ name: 'Capital Reyes Di FINTECHEFT 061626 XXXXX6635', merchantName: null })
    ).toBe('vendor_refund');
  });

  it('leaves Stripe payouts and ordinary deposits as sales_or_other', () => {
    expect(
      classifyBankInflow({ name: 'STRIPE TRANSFER ST-A9T6H2F5F3O9 PREMIER WORL', merchantName: null })
    ).toBe('sales_or_other');
    expect(
      classifyBankInflow({ name: 'MOBILE DEPOSIT : REF NUMBER :308100443081', merchantName: null })
    ).toBe('sales_or_other');
    // A customer named Hillberg must NOT be swept into owner capital (word
    // boundaries required around the B/HILL pairing).
    expect(classifyBankInflow({ name: 'ZELLE FROM HILLBERG SARAH', merchantName: null })).toBe(
      'sales_or_other'
    );
  });

  it('does NOT classify a real customer whose name contains "B Hill" as owner capital', () => {
    // The recon exists to catch unrecorded off-platform sales — a payment from
    // a real person with a colliding name must stay IN the income check. The
    // rules therefore require the LLC name or WF's online-transfer form, not a
    // bare name match. (Security review, bank-truth round 1.)
    expect(classifyBankInflow({ name: 'PAYMENT FROM SARAH B HILL', merchantName: null })).toBe(
      'sales_or_other'
    );
    expect(classifyBankInflow({ name: 'ZELLE FROM ROBERT B HILL JR', merchantName: null })).toBe(
      'sales_or_other'
    );
    expect(classifyBankInflow({ name: 'ZELLE FROM HILL BRANDON', merchantName: null })).toBe(
      'sales_or_other'
    );
  });

  it('requires the vendor processor stamp for a refund — a person named like a distributor stays in the check', () => {
    // Real distributor credits carry the FINTECH/FINTECHEFT processor stamp;
    // a Zelle from a coincidentally-named person does not.
    expect(classifyBankInflow({ name: 'ZELLE FROM JOHN SPECS', merchantName: null })).toBe(
      'sales_or_other'
    );
    expect(
      classifyBankInflow({ name: 'WIRE FROM BROWN DISTRIBUTING EVENTS CO', merchantName: null })
    ).toBe('sales_or_other');
  });
});

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
