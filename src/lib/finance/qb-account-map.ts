/**
 * Maps QuickBooks AccountSubType strings to PartyOn dashboard categories.
 *
 * QuickBooks ships ~75 Expense sub-types (RentOrLeaseOfBuildings, AdvertisingPromotional,
 * UtilitiesGas, etc.). For the Finance Director dashboard we want a smaller,
 * operator-friendly bucket list. Operator can edit this file as the chart of
 * accounts evolves — kept in TypeScript (per ADR 0002 / brief §6) rather than
 * persisted in the DB.
 *
 * If a QB account doesn't match any pattern, the slug falls back to "other".
 */

export type CategorySlug =
  | 'cogs'
  | 'rent'
  | 'utilities'
  | 'software'
  | 'fuel'
  | 'vehicle'
  | 'payroll'
  | 'contractor'
  | 'advertising'
  | 'insurance'
  | 'travel'
  | 'meals'
  | 'office'
  | 'professional'
  | 'taxes_fees'
  | 'bank_fees'
  | 'payment_fees'
  | 'repairs'
  | 'shipping'
  | 'non_operating'
  | 'other';

/**
 * Categories that are NOT operating expenses and must be excluded when
 * computing OpEx / net income:
 *   - `cogs` — cost of goods (the alcohol); matched against revenue as a
 *     gross-margin input, not an operating cost.
 *   - `non_operating` — loans, owner draws/contributions, inter-company
 *     transfers, capital movements. Money that left the account but isn't
 *     a business expense.
 * Phase 5C's monthly rollup uses this to keep OpEx honest.
 */
export const NON_OPEX_CATEGORIES: ReadonlySet<CategorySlug> = new Set([
  'cogs',
  'non_operating',
]);

/** True if a category counts toward operating expense (OpEx). */
export function isOperatingExpense(slug: CategorySlug): boolean {
  return !NON_OPEX_CATEGORIES.has(slug);
}

const SUB_TYPE_MAP: Record<string, CategorySlug> = {
  SuppliesMaterialsCogs: 'cogs',
  CostOfGoodsSold: 'cogs',
  PurchasesOfStocksForSale: 'cogs',
  Inventory: 'cogs', // alcohol bought for resale is booked to the Inventory acct

  RepairsAndMaintenance: 'repairs',
  RepairAndMaintenanceExpense: 'repairs',

  // Loans / financing / equity movements — not operating expenses.
  NotesPayable: 'non_operating',
  OtherLongTermLiabilities: 'non_operating',
  ShareholderNotesPayable: 'non_operating',
  OwnersEquity: 'non_operating',
  PartnerDistributions: 'non_operating',
  PartnerContributions: 'non_operating',

  RentOrLeaseOfBuildings: 'rent',
  RentOrLeaseOfFacilities: 'rent',

  Utilities: 'utilities',
  UtilitiesGas: 'utilities',
  UtilitiesElectricity: 'utilities',
  UtilitiesWater: 'utilities',
  UtilitiesTelephoneAndInternet: 'utilities',

  SoftwareAndOnlineServices: 'software',
  DuesAndSubscriptions: 'software',

  AutoFuel: 'fuel',
  Gasoline: 'fuel',
  Fuel: 'fuel',

  Auto: 'vehicle',
  Automobile: 'vehicle',
  VehicleExpenses: 'vehicle',
  VehicleLoanInterest: 'vehicle',
  VehicleRepairs: 'vehicle',

  Payroll: 'payroll',
  PayrollExpenses: 'payroll',
  EmployeeWagesAndSalaries: 'payroll',
  PayrollTaxPayable: 'payroll',

  PaymentsToContractors: 'contractor',
  ContractLabor: 'contractor',
  CommissionsAndFees: 'contractor',

  AdvertisingPromotional: 'advertising',
  Advertising: 'advertising',
  Marketing: 'advertising',

  Insurance: 'insurance',
  HealthInsurance: 'insurance',
  LiabilityInsurance: 'insurance',
  VehicleInsurance: 'insurance',

  Travel: 'travel',
  TravelMeals: 'meals',
  Meals: 'meals',
  MealsAndEntertainment: 'meals',

  OfficeGeneralAdministrativeExpenses: 'office',
  OfficeExpenses: 'office',
  OfficeSupplies: 'office',
  SuppliesAndMaterials: 'office',

  ProfessionalFees: 'professional',
  LegalAndProfessionalFees: 'professional',
  AccountingFees: 'professional',
  LegalFees: 'professional',

  Taxes: 'taxes_fees',
  TaxesPaid: 'taxes_fees',
  StateAndLocalIncomeTaxes: 'taxes_fees',
  PropertyTax: 'taxes_fees',
  PermitsAndLicenses: 'taxes_fees',
  Fines: 'taxes_fees',

  BankCharges: 'bank_fees',
  BankFees: 'bank_fees',
  CreditCardFees: 'bank_fees',
  FinanceCosts: 'bank_fees',

  Shipping: 'shipping',
  ShippingAndPostage: 'shipping',
  PostageAndDelivery: 'shipping',
};

// Free-text fallback — when a QB account has no recognised sub-type we
// look for keywords in the account name.
const NAME_KEYWORD_RULES: Array<{ pattern: RegExp; slug: CategorySlug }> = [
  // High-priority disambiguators FIRST — these must win over generic rules.
  // Non-operating: loans, owner draws/contributions, inter-company transfers.
  // Never count these as expenses.
  {
    pattern:
      /\bloans?\b|notes?\s*payable|due\s*(to|from)|related\s*part|owner'?s?\s*(draw|contribution|distribution)|capital\s*contribution|inter.?company|shareholder|member\s*draw|\bcontributions?\b/i,
    slug: 'non_operating',
  },
  // Inventory = COGS (alcohol bought for resale).
  { pattern: /\binventory\b|stock\s*for\s*resale|goods?\s*for\s*resale/i, slug: 'cogs' },
  // Platform / payment-processor selling fees (Shopify, Stripe, etc.).
  {
    pattern: /shopify|selling\s*fee|processing\s*fee|merchant\s*fee|payment\s*processing|\bstripe\b/i,
    slug: 'payment_fees',
  },

  { pattern: /rent|lease/i, slug: 'rent' },
  { pattern: /utility|electric|gas\b|water/i, slug: 'utilities' },
  { pattern: /internet|telephone|phone/i, slug: 'utilities' },
  { pattern: /software|saas|subscription/i, slug: 'software' },
  { pattern: /fuel|gasoline/i, slug: 'fuel' },
  { pattern: /vehicle|auto/i, slug: 'vehicle' },
  { pattern: /payroll|salary|wage/i, slug: 'payroll' },
  { pattern: /contractor|1099/i, slug: 'contractor' },
  { pattern: /ads?\b|advertis|marketing|google\s*ads?|meta\s*ads?/i, slug: 'advertising' },
  { pattern: /insurance/i, slug: 'insurance' },
  { pattern: /travel|airline|hotel|lodging/i, slug: 'travel' },
  { pattern: /meals?|entertainment|restaurant/i, slug: 'meals' },
  { pattern: /office\s*supplies|stationery/i, slug: 'office' },
  { pattern: /legal|professional|accounting|attorney/i, slug: 'professional' },
  { pattern: /tax|permit|license/i, slug: 'taxes_fees' },
  { pattern: /bank\s*fee|finance\s*charge|cc\s*fee|credit\s*card\s*fee/i, slug: 'bank_fees' },
  { pattern: /ship|postage|delivery\s*fee/i, slug: 'shipping' },
  { pattern: /repair|maintenance/i, slug: 'repairs' },
  { pattern: /supplies|materials|general\s*business/i, slug: 'office' },
  { pattern: /\bcogs\b|cost\s*of\s*goods/i, slug: 'cogs' },
];

export interface QbAccountLike {
  accountSubType?: string | null;
  name?: string | null;
  fullyQualifiedName?: string | null;
}

/**
 * Resolve a QB account to a PartyOn dashboard category. Caller passes an
 * object with `accountSubType` and `name`/`fullyQualifiedName`; we try the
 * exact-match map first, then keyword regexes, then fall back to 'other'.
 */
export function categorizeQbAccount(account: QbAccountLike): CategorySlug {
  if (account.accountSubType && SUB_TYPE_MAP[account.accountSubType]) {
    return SUB_TYPE_MAP[account.accountSubType];
  }
  const text = `${account.fullyQualifiedName ?? ''} ${account.name ?? ''}`;
  for (const rule of NAME_KEYWORD_RULES) {
    if (rule.pattern.test(text)) return rule.slug;
  }
  return 'other';
}

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  cogs: 'COGS',
  rent: 'Rent',
  utilities: 'Utilities',
  software: 'Software',
  fuel: 'Fuel',
  vehicle: 'Vehicle',
  payroll: 'Payroll',
  contractor: 'Contractors',
  advertising: 'Advertising',
  insurance: 'Insurance',
  travel: 'Travel',
  meals: 'Meals',
  office: 'Office',
  professional: 'Professional fees',
  taxes_fees: 'Taxes & fees',
  bank_fees: 'Bank fees',
  payment_fees: 'Payment & platform fees',
  repairs: 'Repairs & maintenance',
  shipping: 'Shipping',
  non_operating: 'Non-operating (loans, transfers)',
  other: 'Other',
};
