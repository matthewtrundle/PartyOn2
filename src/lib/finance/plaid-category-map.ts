/**
 * Maps a Plaid bank OUTFLOW to a PartyOn dashboard category (the shared
 * `CategorySlug` taxonomy from qb-account-map.ts).
 *
 * Used by the monthly rollup's bank-derived expense path: when QuickBooks is
 * dormant for a month (e.g. all of 2026), the bank outflow IS the expense.
 *
 * Precedence (first match wins):
 *   1. Single-purpose distributor / supplier allowlist → `cogs` unconditionally.
 *      Plaid's category taxonomy has NO wholesale-alcohol signal, so without
 *      this, alcohol buys land in GENERAL_MERCHANDISE → wrong. This is the
 *      single biggest threat to a trustworthy 2026 gross-margin number — extend
 *      `COGS_MERCHANT_RULES` against real bank-statement names after the first
 *      production sync.
 *   2. Plaid Personal Finance Category — detailed (most specific), with a
 *      conditional `cogs` step (2a): mixed grocery merchants (`H-E-B`) map to
 *      `cogs` ONLY when the detailed PFC is a resale grocery subtype, so a fuel
 *      or cafe purchase at the same store keeps its real category.
 *   3. Plaid Personal Finance Category — primary (coarser).
 *   4. Merchant / name keywords (reuses qb-account-map's NAME_KEYWORD_RULES).
 *   5. Fallback → `other`.
 *
 * Transfers, credit-card payments, loan principal, and owner draws map to
 * `non_operating` so they are NEVER counted as expenses (bank data is noisy).
 *
 * Plaid PFC reference: https://plaid.com/docs/api/products/transactions/#personal-finance-category
 */

import { type CategorySlug, NAME_KEYWORD_RULES } from './qb-account-map';

/**
 * Wholesale-alcohol distributors + retail buys → `cogs`. Seeded with the
 * operator's distributor list (2026-06-19); refine against real Wells Fargo
 * statement descriptors after the first production sync.
 */
export const COGS_MERCHANT_RULES: readonly RegExp[] = [
  // RNDC / Republic National. Wells Fargo TRUNCATES the descriptor to
  // "Republic Nationa Fintech" (trailing 'l' cut), so match `nationa` not
  // `national` — `nationa` subsumes the full spelling too.
  /\brndc\b|republic\s*nationa/i,
  /southern\s*glazer'?s?/i,
  /total\s*wine/i,
  /spec'?s\b/i,
  // Capital Reyes (Reyes Beverage). WF descriptor: "Capital Reyes Di FINTECHEFT…".
  /capital\s*reyes|\breyes\b.*distribut/i,
  // Brown Distributing. WF descriptor: "Brown Distributi Fintech" (truncated).
  /brown\s*distribut/i,
  // Additional Austin-area beverage / mixer suppliers surfaced by the first WF
  // sync — all previously fell into meals/office. Beer, mixers, and liquor
  // bought for resale are cost-of-goods for an alcohol-delivery business. These
  // are single-purpose suppliers (100% of their spend is resale inventory), so
  // — like the distributors above — they map to cogs unconditionally.
  /austin\s*beerworks/i, // local brewery — wholesale beer
  /fresh\s*victor/i, // premium cocktail-mixer brand
  /twin\s*liquors?/i, // liquor retail bought for resale (cf. Total Wine / Spec's)
  /coast\s*to\s*coast\s*dis/i, // Coast to Coast Distributing (WF truncates to "…Dis"); require the "dis" anchor so an unrelated "Coast to Coast" business can't false-match
];

/**
 * MIXED-merchant grocers whose spend is COGS only for a grocery/food purchase.
 * Unlike the single-purpose suppliers in `COGS_MERCHANT_RULES`, these are
 * full-service stores (groceries + fuel + pharmacy + general merch), so mapping
 * every debit to cogs would sweep a fuel fill-up or pharmacy run into COGS and
 * overstate it. Instead these map to cogs ONLY when Plaid's category confirms a
 * grocery/food purchase (see `GROCERY_PFC_PRIMARY`); otherwise the normal PFC
 * precedence applies (e.g. a fuel purchase → `fuel`).
 *
 * H-E-B is the fresh-produce / mixer vendor for cocktail kits (resale) — every
 * H-E-B outflow in the first WF sync was PFC `FOOD_AND_DRINK_GROCERIES`.
 */
export const COGS_GROCERY_MERCHANT_RULES: readonly RegExp[] = [
  /\bh[-\s]?e[-\s]?b\b/i, // H-E-B — cocktail-kit produce/mixers (resale)
];

/**
 * Plaid PFC `detailed` values that confirm a resale grocery purchase, for the
 * mixed-merchant grocery rules above. Deliberately narrow: the coarse
 * `FOOD_AND_DRINK` PRIMARY also covers restaurant / fast-food / coffee (H-E-B
 * stores have in-house cafes — a staff lunch is a `meals` expense, not resale
 * inventory), and `GENERAL_MERCHANDISE` is non-food retail. Only the
 * `FOOD_AND_DRINK_GROCERIES` detailed subtype maps to cogs.
 */
const GROCERY_PFC_DETAILED: ReadonlySet<string> = new Set(['FOOD_AND_DRINK_GROCERIES']);

/**
 * Plaid PFC `detailed` → CategorySlug. Only the business-relevant
 * disambiguations live here (rent vs utilities, card payment → non_operating,
 * gas → fuel, etc.); everything else falls through to the primary map.
 */
const PFC_DETAILED_MAP: Readonly<Record<string, CategorySlug>> = {
  // Rent vs utilities — the primary RENT_AND_UTILITIES can't tell them apart.
  RENT_AND_UTILITIES_RENT: 'rent',
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: 'utilities',
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: 'utilities',
  RENT_AND_UTILITIES_TELEPHONE: 'utilities',
  RENT_AND_UTILITIES_WATER: 'utilities',
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE: 'utilities',
  RENT_AND_UTILITIES_OTHER_UTILITIES: 'utilities',
  // Financing / movements — never an operating expense.
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: 'non_operating',
  LOAN_PAYMENTS_CAR_PAYMENT: 'non_operating',
  LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT: 'non_operating',
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: 'non_operating',
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: 'non_operating',
  LOAN_PAYMENTS_OTHER_PAYMENT: 'non_operating',
  // Services that map to specific PartyOn buckets.
  GENERAL_SERVICES_INSURANCE: 'insurance',
  GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING: 'professional',
  GENERAL_SERVICES_CONSULTING_AND_LEGAL: 'professional',
  GENERAL_SERVICES_ADVERTISING_AND_MARKETING: 'advertising',
  GENERAL_SERVICES_SHIPPING_AND_FREIGHT: 'shipping',
  GENERAL_SERVICES_POSTAGE_AND_SHIPPING: 'shipping',
  GENERAL_SERVICES_AUTOMOTIVE: 'vehicle',
  // Transportation — fuel vs the vehicle itself.
  TRANSPORTATION_GAS: 'fuel',
  TRANSPORTATION_PARKING: 'vehicle',
  TRANSPORTATION_TOLLS: 'vehicle',
  // Merchandise that's clearly office supplies.
  GENERAL_MERCHANDISE_OFFICE_SUPPLIES: 'office',
  GENERAL_MERCHANDISE_ELECTRONICS: 'office',
};

/** Plaid PFC `primary` → CategorySlug. Coarse fallback after the detailed map. */
const PFC_PRIMARY_MAP: Readonly<Record<string, CategorySlug>> = {
  INCOME: 'non_operating', // an inflow mislabeled on an outflow — not an expense
  TRANSFER_IN: 'non_operating',
  TRANSFER_OUT: 'non_operating',
  LOAN_PAYMENTS: 'non_operating',
  BANK_FEES: 'bank_fees',
  ENTERTAINMENT: 'meals',
  FOOD_AND_DRINK: 'meals',
  GENERAL_MERCHANDISE: 'office',
  HOME_IMPROVEMENT: 'repairs',
  GENERAL_SERVICES: 'professional',
  GOVERNMENT_AND_NON_PROFIT: 'taxes_fees',
  TRANSPORTATION: 'fuel',
  TRAVEL: 'travel',
  RENT_AND_UTILITIES: 'utilities',
};

export interface BankOutflowLike {
  name: string;
  merchantName?: string | null;
  personalFinanceCategoryPrimary?: string | null;
  personalFinanceCategoryDetailed?: string | null;
}

/** Resolve a Plaid outflow to a PartyOn CategorySlug. See file header for precedence. */
export function categorizeBankOutflow(txn: BankOutflowLike): CategorySlug {
  const text = `${txn.merchantName ?? ''} ${txn.name ?? ''}`.trim();

  // 1. Single-purpose distributor / supplier allowlist → cogs unconditionally
  // (100% of their spend is resale inventory; Plaid has no wholesale signal).
  for (const re of COGS_MERCHANT_RULES) {
    if (re.test(text)) return 'cogs';
  }
  // 2. Plaid PFC detailed.
  const detailed = txn.personalFinanceCategoryDetailed;
  // 2a. Mixed grocery merchants (e.g. H-E-B) → cogs ONLY when Plaid's DETAILED
  // category confirms a resale grocery purchase — so a fuel fill-up, pharmacy
  // run, or in-store cafe lunch keeps its real category instead of COGS.
  if (detailed && GROCERY_PFC_DETAILED.has(detailed)) {
    for (const re of COGS_GROCERY_MERCHANT_RULES) {
      if (re.test(text)) return 'cogs';
    }
  }
  if (detailed && PFC_DETAILED_MAP[detailed]) return PFC_DETAILED_MAP[detailed];
  // 3. Plaid PFC primary.
  const primary = txn.personalFinanceCategoryPrimary;
  if (primary && PFC_PRIMARY_MAP[primary]) return PFC_PRIMARY_MAP[primary];
  // 4. Merchant / name keywords (shared with QB account-name categorization).
  for (const rule of NAME_KEYWORD_RULES) {
    if (rule.pattern.test(text)) return rule.slug;
  }
  // 5. Fallback.
  return 'other';
}

/**
 * Whether a categorized bank outflow counts as a real business cost (COGS or an
 * operating expense) vs a transfer / financing / owner draw. `non_operating` is
 * the only category excluded — everything else (including the conservative
 * `other` bucket) counts, so we never understate expenses.
 */
export function isBankExpenseCategory(slug: CategorySlug): boolean {
  return slug !== 'non_operating';
}
