/**
 * Bank-outflow categorization (finance data cleanup, B2). The distributor
 * allowlist → cogs is the highest-risk rule (Plaid has no wholesale-alcohol
 * signal), and transfers/card-payments must never count as expenses.
 */

import { describe, it, expect } from 'vitest';
import {
  categorizeBankOutflow,
  isBankExpenseCategory,
} from '@/lib/finance/plaid-category-map';

describe('categorizeBankOutflow', () => {
  it('maps distributor merchants to cogs (allowlist wins over Plaid PFC)', () => {
    expect(
      categorizeBankOutflow({
        name: 'RNDC AUSTIN TX',
        merchantName: 'RNDC',
        personalFinanceCategoryPrimary: 'GENERAL_MERCHANDISE', // would be 'office' without the allowlist
        personalFinanceCategoryDetailed: null,
      })
    ).toBe('cogs');
    expect(
      categorizeBankOutflow({ name: "SOUTHERN GLAZER'S WINE & SPIRITS", merchantName: null })
    ).toBe('cogs');
    expect(
      categorizeBankOutflow({ name: 'TOTAL WINE #123', merchantName: 'Total Wine & More' })
    ).toBe('cogs');
    expect(categorizeBankOutflow({ name: "SPEC'S #45 AUSTIN", merchantName: null })).toBe('cogs');
  });

  it('maps TRUNCATED Wells Fargo distributor descriptors to cogs (real bank names)', () => {
    // Wells Fargo truncates each descriptor; without the widened rules these
    // land in meals/office and understate COGS ~$7-12K/month.
    // RNDC → "Republic Nationa Fintech" (trailing 'l' cut). Plaid tags it
    // FOOD_AND_DRINK → 'meals' without the allowlist.
    expect(
      categorizeBankOutflow({
        name: 'Republic Nationa Fintech',
        merchantName: null,
        personalFinanceCategoryPrimary: 'FOOD_AND_DRINK',
        personalFinanceCategoryDetailed: null,
      })
    ).toBe('cogs');
    // Capital Reyes (Reyes Beverage) → "Capital Reyes Di FINTECHEFT…" → 'meals' without the rule.
    expect(
      categorizeBankOutflow({
        name: 'Capital Reyes Di FINTECHEFT 250601',
        merchantName: null,
        personalFinanceCategoryPrimary: 'FOOD_AND_DRINK',
        personalFinanceCategoryDetailed: null,
      })
    ).toBe('cogs');
    // Brown Distributing → "Brown Distributi Fintech" → 'office' (GENERAL_MERCHANDISE) without the rule.
    expect(
      categorizeBankOutflow({
        name: 'Brown Distributi Fintech',
        merchantName: null,
        personalFinanceCategoryPrimary: 'GENERAL_MERCHANDISE',
        personalFinanceCategoryDetailed: null,
      })
    ).toBe('cogs');
  });

  it('maps the single-purpose beverage / mixer suppliers to cogs unconditionally', () => {
    // Beer distributor, mixer brand, liquor retail-for-resale, and the beverage
    // distributor — 100% resale inventory → COGS regardless of Plaid category.
    expect(
      categorizeBankOutflow({
        name: 'Austin Beerworks Fintech',
        merchantName: 'Austin Beerworks',
        personalFinanceCategoryPrimary: 'FOOD_AND_DRINK',
        personalFinanceCategoryDetailed: null,
      })
    ).toBe('cogs');
    expect(categorizeBankOutflow({ name: 'Fresh Victor Shop.', merchantName: 'Fresh Victor' })).toBe(
      'cogs'
    );
    expect(categorizeBankOutflow({ name: 'Twin Liquors #12 AUSTIN', merchantName: 'Twin Liquors' })).toBe(
      'cogs'
    );
    // Coast to Coast Distributing — WF truncates to "…Dis"; the "dis" anchor is required.
    expect(categorizeBankOutflow({ name: 'Coast To Coast Dis', merchantName: null })).toBe('cogs');
    // …but a generic "Coast to Coast" (e.g. a moving company) must NOT match.
    expect(categorizeBankOutflow({ name: 'Coast To Coast Movers', merchantName: null })).not.toBe(
      'cogs'
    );
  });

  it('maps H-E-B to cogs ONLY for grocery purchases, never fuel (mixed merchant)', () => {
    // Every real H-E-B outflow in the first WF sync was FOOD_AND_DRINK_GROCERIES —
    // cocktail-kit produce/mixers bought for resale → COGS.
    expect(
      categorizeBankOutflow({
        name: 'H-E-B #572 AUSTIN TX',
        merchantName: 'H-E-B',
        personalFinanceCategoryPrimary: 'FOOD_AND_DRINK',
        personalFinanceCategoryDetailed: 'FOOD_AND_DRINK_GROCERIES',
      })
    ).toBe('cogs');
    // But an H-E-B FUEL fill-up must keep its real category, NOT be swept into COGS.
    expect(
      categorizeBankOutflow({
        name: 'H-E-B FUEL #14',
        merchantName: 'H-E-B',
        personalFinanceCategoryPrimary: 'TRANSPORTATION',
        personalFinanceCategoryDetailed: 'TRANSPORTATION_GAS',
      })
    ).toBe('fuel');
    // …and an in-store cafe/BBQ-counter lunch (FOOD_AND_DRINK but NOT groceries)
    // is a `meals` expense, not resale inventory — the coarse primary must not
    // sweep it into COGS.
    expect(
      categorizeBankOutflow({
        name: 'H-E-B TRUE TEXAS BBQ',
        merchantName: 'H-E-B',
        personalFinanceCategoryPrimary: 'FOOD_AND_DRINK',
        personalFinanceCategoryDetailed: 'FOOD_AND_DRINK_RESTAURANT',
      })
    ).toBe('meals');
  });

  it('maps transfers / card payments / loans to non_operating (never an expense)', () => {
    expect(
      categorizeBankOutflow({
        name: 'Online Transfer',
        merchantName: null,
        personalFinanceCategoryPrimary: 'TRANSFER_OUT',
        personalFinanceCategoryDetailed: 'TRANSFER_OUT_ACCOUNT_TRANSFER',
      })
    ).toBe('non_operating');
    expect(
      categorizeBankOutflow({
        name: 'CREDIT CARD PAYMENT',
        merchantName: null,
        personalFinanceCategoryPrimary: 'LOAN_PAYMENTS',
        personalFinanceCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
      })
    ).toBe('non_operating');
  });

  it('uses Plaid PFC detailed to split rent vs utilities', () => {
    expect(
      categorizeBankOutflow({
        name: 'PROPERTY MGMT',
        merchantName: null,
        personalFinanceCategoryPrimary: 'RENT_AND_UTILITIES',
        personalFinanceCategoryDetailed: 'RENT_AND_UTILITIES_RENT',
      })
    ).toBe('rent');
    expect(
      categorizeBankOutflow({
        name: 'CITY OF AUSTIN UTILITIES',
        merchantName: null,
        personalFinanceCategoryPrimary: 'RENT_AND_UTILITIES',
        personalFinanceCategoryDetailed: 'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY',
      })
    ).toBe('utilities');
  });

  it('falls back PFC primary → name keywords → other', () => {
    // PFC primary fallback (no detailed match)
    expect(
      categorizeBankOutflow({
        name: 'SHELL OIL',
        merchantName: null,
        personalFinanceCategoryPrimary: 'TRANSPORTATION',
        personalFinanceCategoryDetailed: null,
      })
    ).toBe('fuel');
    // name-keyword fallback (no PFC at all)
    expect(categorizeBankOutflow({ name: 'STATE FARM INSURANCE', merchantName: null })).toBe(
      'insurance'
    );
    // total fallback
    expect(categorizeBankOutflow({ name: 'MYSTERY VENDOR LLC', merchantName: null })).toBe('other');
  });
});

describe('isBankExpenseCategory', () => {
  it('counts cogs + operating categories, excludes only non_operating', () => {
    expect(isBankExpenseCategory('cogs')).toBe(true);
    expect(isBankExpenseCategory('rent')).toBe(true);
    expect(isBankExpenseCategory('other')).toBe(true); // conservative: unknown costs still count
    expect(isBankExpenseCategory('non_operating')).toBe(false);
  });
});
