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
