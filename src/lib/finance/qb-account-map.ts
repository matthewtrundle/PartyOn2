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
  | 'shipping'
  | 'other';

const SUB_TYPE_MAP: Record<string, CategorySlug> = {
  SuppliesMaterialsCogs: 'cogs',
  CostOfGoodsSold: 'cogs',
  PurchasesOfStocksForSale: 'cogs',

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
  shipping: 'Shipping',
  other: 'Other',
};
