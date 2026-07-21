import { describe, it, expect } from 'vitest';
import {
  renderFinanceMonthlyCloseEmail,
  renderFinanceMonthlyCloseText,
} from '../finance-monthly-close';
import {
  shapeMonthlyClosePayload,
  type RollupRow,
} from '@/lib/finance/monthly-close-payload';

/** April-like rollup: bank-sourced, reliable, net +$11,065. */
function reliableRollup(over: Partial<RollupRow> = {}): RollupRow {
  return {
    year: 2026,
    month: 4,
    revenueCents: 3_034_900,
    revenueFromShopifyCents: 0,
    revenueFromOrdersCents: 3_034_900,
    orderCount: 89,
    cogsCents: 1_687_200,
    grossProfitCents: 1_347_600,
    opexCents: 241_100,
    netIncomeCents: 1_106_500, // $11,065 — distinctive
    expenseCategories: [
      { category: 'cogs', label: 'Cost of Goods', cents: 1_687_200, topVendor: 'Southern Glazer', topVendorCents: 900_000 },
      { category: 'advertising', label: 'Advertising', cents: 180_000, topVendor: 'Google Ads', topVendorCents: 180_000 },
      { category: 'fuel', label: 'Fuel', cents: 61_100, topVendor: 'Shell', topVendorCents: 61_100 },
    ],
    dataHealth: {
      expenseSource: 'bank',
      netIncomeReliable: true,
      incomeReconciled: true,
      otherIncomeCents: 0,
      flags: [],
    },
    ...over,
  };
}

/**
 * June-like rollup: bank-sourced but FLAGGED (deposit anomaly). Numbers are
 * INTERNALLY CONSISTENT (net = grossProfit − opex, as real rollup rows always
 * are) so the honesty-gate test proves the withheld net can't be reconstructed
 * from the displayed figures — not merely that a substring is absent.
 *   gross profit 60_800 − opex 369_900 = net -309_100 ($3,091 loss)
 */
function flaggedRollup(over: Partial<RollupRow> = {}): RollupRow {
  return {
    year: 2026,
    month: 6,
    revenueCents: 1_813_600,
    revenueFromShopifyCents: 0,
    revenueFromOrdersCents: 1_813_600,
    orderCount: 100,
    cogsCents: 1_752_800,
    grossProfitCents: 60_800,
    opexCents: 369_900,
    netIncomeCents: -309_100, // = 60_800 − 369_900
    expenseCategories: [
      { category: 'cogs', label: 'Cost of Goods', cents: 1_752_800, topVendor: 'Southern Glazer', topVendorCents: 900_000 },
      { category: 'professional', label: 'Professional fees', cents: 249_000, topVendor: 'Google Ads', topVendorCents: 249_000 },
      { category: 'office', label: 'Office', cents: 120_900, topVendor: 'Barrett Distributing', topVendorCents: 120_900 },
    ],
    dataHealth: {
      expenseSource: 'bank',
      netIncomeReliable: false,
      incomeReconciled: false,
      otherIncomeCents: 1_531_500,
      flags: ['$15315 of bank deposits exceed known Stripe revenue — possible other income'],
    },
    ...over,
  };
}

/**
 * QB-sourced month flagged by the discrepancy check (flag #5). Reconstruction
 * chain the security review found: flag reveals COGS+OpEx total → OpEx = total −
 * COGS(shown) → net = grossProfit(shown) − OpEx. The flag must therefore carry
 * NO dollar total, and the email must withhold OpEx. Distinct figures so each
 * absence assertion is meaningful.
 *   revenue 9000 · cogs 4000 · gross profit 5000 · opex 3200 · net 1800
 *   total expense (cogs+opex) = 7200
 */
function qbDiscrepancyRollup(over: Partial<RollupRow> = {}): RollupRow {
  return {
    year: 2024,
    month: 8,
    revenueCents: 900_000,
    revenueFromShopifyCents: 900_000,
    revenueFromOrdersCents: 0,
    orderCount: 40,
    cogsCents: 400_000,
    grossProfitCents: 500_000,
    opexCents: 320_000,
    netIncomeCents: 180_000, // = 500_000 − 320_000
    expenseCategories: [
      { category: 'cogs', label: 'Cost of Goods', cents: 400_000, topVendor: 'RNDC', topVendorCents: 400_000 },
      { category: 'rent', label: 'Rent', cents: 320_000, topVendor: 'Landlord LLC', topVendorCents: 320_000 },
    ],
    dataHealth: {
      expenseSource: 'qb',
      netIncomeReliable: false,
      incomeReconciled: null,
      otherIncomeCents: null,
      // Qualitative flag (post-fix): a RATIO, never the raw QB expense total.
      flags: ['bank outflows exceed QB-booked expenses by ~80% — QB books may be incomplete this month'],
    },
    ...over,
  };
}

/** Early-2026-like rollup: no expense source yet. */
function noExpenseRollup(over: Partial<RollupRow> = {}): RollupRow {
  return {
    year: 2026,
    month: 2,
    revenueCents: 790_800,
    revenueFromShopifyCents: 100_000,
    revenueFromOrdersCents: 690_800,
    orderCount: 25,
    cogsCents: null,
    grossProfitCents: null,
    opexCents: null,
    netIncomeCents: null,
    expenseCategories: [],
    dataHealth: {
      // Matches real early-2026 rows: a production bank item EXISTS (so
      // incomeReconciled is false, not null) but has no data for this month yet.
      // The template must still NOT claim a deposit anomaly.
      expenseSource: 'none',
      netIncomeReliable: false,
      incomeReconciled: false,
      otherIncomeCents: null,
      flags: ['no expense source this month — QB not material and no production bank data'],
    },
    ...over,
  };
}

const GEN = new Date('2026-05-01T14:00:00.000Z');

describe('shapeMonthlyClosePayload', () => {
  it('computes margin, MoM, cash-basis, and excludes COGS from OpEx rows', () => {
    const p = shapeMonthlyClosePayload({
      rollup: reliableRollup(),
      prior: reliableRollup({ month: 3, revenueCents: 2_519_000, netIncomeCents: 500_000 }),
      generatedAt: GEN,
      baseUrl: 'https://example.com',
    });
    expect(p.monthLabel).toBe('April 2026');
    expect(p.period).toBe('2026-04');
    expect(p.cashBasis).toBe(true); // bank-sourced
    expect(p.grossMarginPct).toBeCloseTo(44.4, 1);
    expect(p.revenueMoMPct).toBeCloseTo(20.5, 1); // 3,034,900 vs 2,519,000
    // OpEx rows exclude the cogs category and are sorted desc.
    expect(p.opexRows.map((r) => r.label)).toEqual(['Advertising', 'Fuel']);
    expect(p.opexRows.some((r) => r.label === 'Cost of Goods')).toBe(false);
    expect(p.cogsTopVendor).toBe('Southern Glazer');
    expect(p.dashboardUrl).toBe('https://example.com/admin/finance');
  });

  it('carries netIncomeReliable=true only for a clean month', () => {
    expect(shapeMonthlyClosePayload({ rollup: reliableRollup(), prior: null, generatedAt: GEN }).netIncomeReliable).toBe(true);
    expect(shapeMonthlyClosePayload({ rollup: flaggedRollup(), prior: null, generatedAt: GEN }).netIncomeReliable).toBe(false);
    expect(shapeMonthlyClosePayload({ rollup: noExpenseRollup(), prior: null, generatedAt: GEN }).netIncomeReliable).toBe(false);
  });

  it('handles expenseSource=none gracefully (null money, no crash)', () => {
    const p = shapeMonthlyClosePayload({ rollup: noExpenseRollup(), prior: null, generatedAt: GEN });
    expect(p.expenseSource).toBe('none');
    expect(p.cogsCents).toBeNull();
    expect(p.grossMarginPct).toBeNull();
    expect(p.opexRows).toEqual([]);
  });
});

describe('renderFinanceMonthlyCloseEmail', () => {
  it('renders an HTML doc with the month in the title', () => {
    const html = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({ rollup: reliableRollup(), prior: null, generatedAt: GEN })
    );
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Finance Monthly Close — April 2026');
  });

  it('shows the net income number ONLY when reliable', () => {
    const html = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({ rollup: reliableRollup(), prior: null, generatedAt: GEN })
    );
    expect(html).toContain('$11,065'); // net income rendered
    expect(html).toContain('44.4%'); // gross margin
    expect(html).toContain('cash-basis');
  });

  it('WITHHOLDS net income AND operating expenses when unreliable, so net is not reconstructable', () => {
    const html = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({ rollup: flaggedRollup(), prior: null, generatedAt: GEN })
    );
    expect(html).toContain('Pending'); // net income line
    expect(html).toContain('Withheld'); // operating expenses withheld
    expect(html).toContain('bank deposits exceed known Stripe revenue'); // the flag
    // Gross margin story is still shown (gross profit $608 is Revenue − COGS anyway).
    expect(html).toContain('$608');
    // The withheld net income figure must NOT appear...
    expect(html).not.toContain('3,091');
    // ...and OpEx — the ONLY input needed to derive net from the shown gross
    // profit — must be withheld too (figure + its category vendors absent).
    expect(html).not.toContain('$3,699');
    expect(html).not.toContain('Barrett Distributing');
  });

  it('renders the accrual product-margin line over the COVERED basket only', () => {
    // covered revenue $150 − accrual cogs $90 → 40% margin (NOT 9k into full revenue)
    const html = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({
        rollup: reliableRollup({
          dataHealth: {
            expenseSource: 'bank',
            netIncomeReliable: true,
            incomeReconciled: true,
            otherIncomeCents: 0,
            accrual: { cogsCents: 9_000, coveredRevenueCents: 15_000, coveragePct: 75 },
            flags: [],
          },
        }),
        prior: null,
        generatedAt: GEN,
      })
    );
    expect(html).toContain('Product margin (accrual est.)');
    expect(html).toContain('40.0%');
    expect(html).toContain('75% of item revenue');
    // …and absent when there is no accrual block.
    const none = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({ rollup: reliableRollup(), prior: null, generatedAt: GEN })
    );
    expect(none).not.toContain('accrual est.');
  });

  it('itemizes owner-capital transfers in the reconciliation section (audit trail)', () => {
    const html = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({
        rollup: reliableRollup({
          dataHealth: {
            expenseSource: 'bank',
            netIncomeReliable: true,
            incomeReconciled: true,
            otherIncomeCents: 0,
            ownerCapitalCents: 1_000_000,
            ownerCapitalTxns: [
              { name: 'ZELLE FROM B HILL ENTERTAINMENT LLC ON 05/15', cents: 500_000 },
              { name: 'ONLINE TRANSFER FROM HILL B EVERYDAY CHECKIN', cents: 500_000 },
            ],
            flags: [],
          },
        }),
        prior: null,
        generatedAt: GEN,
      })
    );
    expect(html).toContain('Owner capital');
    expect(html).toContain('$10,000');
    // Per-transfer audit trail visible, so a misclassified deposit is spot-checkable.
    expect(html).toContain('ZELLE FROM B HILL ENTERTAINMENT LLC ON 05/15');
    expect(html).toContain('financing');
  });

  it('itemizes loan proceeds (PeopleFund advances) and HTML-escapes the descriptor', () => {
    const html = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({
        rollup: reliableRollup({
          dataHealth: {
            expenseSource: 'bank',
            netIncomeReliable: true,
            incomeReconciled: true,
            otherIncomeCents: 0,
            loanProceedsCents: 20_166_000,
            loanProceedsTxns: [{ name: 'Peoplefund Advance 0006957 <Funding> & Working Capital', cents: 20_166_000 }],
            flags: [],
          },
        }),
        prior: null,
        generatedAt: GEN,
      })
    );
    expect(html).toContain('Loan proceeds');
    expect(html).toContain('$201,660');
    expect(html).toContain('PeopleFund');
    // Bank descriptor rendered into HTML must be escaped (no raw < > &).
    expect(html).toContain('&lt;Funding&gt; &amp; Working Capital');
    expect(html).not.toContain('<Funding>');
  });

  it('does not leak net income via a QB-discrepancy flag (reconstruction chain closed)', () => {
    const html = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({ rollup: qbDiscrepancyRollup(), prior: null, generatedAt: GEN })
    );
    expect(html).toContain('$4,000'); // COGS shown
    expect(html).toContain('$5,000'); // gross profit shown
    expect(html).toContain('Withheld'); // OpEx withheld
    // None of the reconstruction inputs may appear anywhere in the render:
    expect(html).not.toContain('$3,200'); // OpEx
    expect(html).not.toContain('$7,200'); // COGS+OpEx total (what the old flag leaked)
    expect(html).not.toContain('$1,800'); // net income
  });

  it('handles a month with no expense source', () => {
    const html = renderFinanceMonthlyCloseEmail(
      shapeMonthlyClosePayload({ rollup: noExpenseRollup(), prior: null, generatedAt: GEN })
    );
    expect(html).toContain('none yet');
    expect(html).toContain('Pending');
    // No bank data for the month → must NOT claim a deposit anomaly.
    expect(html).not.toContain('exceed');
  });
});

describe('renderFinanceMonthlyCloseText', () => {
  it('renders net income for a reliable month and withholds it otherwise', () => {
    const good = renderFinanceMonthlyCloseText(
      shapeMonthlyClosePayload({ rollup: reliableRollup(), prior: null, generatedAt: GEN })
    );
    expect(good).toContain('NET INCOME: $11,065');

    const bad = renderFinanceMonthlyCloseText(
      shapeMonthlyClosePayload({ rollup: flaggedRollup(), prior: null, generatedAt: GEN })
    );
    expect(bad).toContain('NET INCOME: Pending');
    expect(bad).not.toContain('3,091'); // net figure withheld
    expect(bad).not.toContain('$3,699'); // opex withheld → net not reconstructable
  });
});
