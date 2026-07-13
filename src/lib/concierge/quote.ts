/**
 * Concierge Quote — shared types + placeholder pricing + quote builder.
 *
 * The quote lives on `Lead.metadata.quote` (JSON blob) so no schema
 * change is needed for MVP. The Lead ID doubles as the quote token in
 * the URL (UUIDs are opaque enough for pre-launch traffic; we can add
 * a signed token later if pricing goes public).
 *
 * All pricing here is PLACEHOLDER per founder spec — the point is to
 * validate the interactive flow (customer edits, deposit checkout,
 * post-payment confirmation) before we plug in real vendor rates.
 */

export type ActivityKey =
  | 'boat-rental'
  | 'drink-delivery'
  | 'golf-brewery-tour'
  | 'atv-tour'
  | 'gun-range'
  | 'transportation'
  | 'brunch-mimosa'
  | 'winery-tour'
  | 'spa-day';

export type ActivityCatalogEntry = {
  key: ActivityKey;
  label: string;
  /** One-line description shown on the quote page. */
  blurb: string;
  emoji: string;
  /** Placeholder rate. Real rate lives in a per-vendor config later. */
  pricePerPerson: number;
  /** Duration in hours — informational; drives the default time-slot
   *  suggestion but doesn't affect price today. */
  durationHours: number;
  /** Which variants offer this activity. */
  variants: Array<'bachelor' | 'bachelorette'>;
};

export const ACTIVITY_CATALOG: Record<ActivityKey, ActivityCatalogEntry> = {
  'boat-rental': {
    key: 'boat-rental',
    label: 'Private Party Boat',
    blurb: 'Captained cruise on Lake Travis with your group.',
    emoji: '🛥️',
    pricePerPerson: 165,
    durationHours: 4,
    variants: ['bachelor', 'bachelorette'],
  },
  'drink-delivery': {
    key: 'drink-delivery',
    label: 'Drink Delivery to the Dock',
    blurb:
      'Beer, liquor, seltzers + cocktail kits iced and staged before you board.',
    emoji: '🥃',
    pricePerPerson: 85,
    durationHours: 0,
    variants: ['bachelor', 'bachelorette'],
  },
  'golf-brewery-tour': {
    key: 'golf-brewery-tour',
    label: 'Golf & Brewery Tour',
    blurb: 'Tee times + East Austin brewery tasting flight, transportation included.',
    emoji: '⛳',
    pricePerPerson: 195,
    durationHours: 6,
    variants: ['bachelor'],
  },
  'atv-tour': {
    key: 'atv-tour',
    label: 'ATV / Off-Road Tour',
    blurb: 'Guided Hill Country ATV ride with all equipment.',
    emoji: '🚙',
    pricePerPerson: 175,
    durationHours: 3,
    variants: ['bachelor'],
  },
  'gun-range': {
    key: 'gun-range',
    label: 'Gun Range Experience',
    blurb: 'Private lane block, instructor-led. Pistol + rifle. All levels.',
    emoji: '🎯',
    pricePerPerson: 125,
    durationHours: 2,
    variants: ['bachelor'],
  },
  transportation: {
    key: 'transportation',
    label: 'Group Transportation',
    blurb: 'Party bus or sprinter van, airport → hotel → lake → home.',
    emoji: '🚐',
    pricePerPerson: 55,
    durationHours: 8,
    variants: ['bachelor', 'bachelorette'],
  },
  'brunch-mimosa': {
    key: 'brunch-mimosa',
    label: 'Brunch & Mimosa Bar',
    blurb: "Private chef brunch or reservations at Austin's best brunch spots.",
    emoji: '🥞',
    pricePerPerson: 75,
    durationHours: 3,
    variants: ['bachelorette'],
  },
  'winery-tour': {
    key: 'winery-tour',
    label: 'Hill Country Winery Tour',
    blurb: 'Curated tastings + vineyard photo stops. Rides included.',
    emoji: '🍷',
    pricePerPerson: 185,
    durationHours: 5,
    variants: ['bachelorette'],
  },
  'spa-day': {
    key: 'spa-day',
    label: 'Spa & Recovery Day',
    blurb: 'In-Airbnb massages, blowouts, mobile mani/pedi.',
    emoji: '💆‍♀️',
    pricePerPerson: 220,
    durationHours: 3,
    variants: ['bachelorette'],
  },
};

export const DEPOSIT_PERCENT = 0.25;

export type QuoteItem = {
  activityKey: ActivityKey;
  /** True → included in the total. False → line stays visible but is
   *  greyed out and excluded. */
  enabled: boolean;
  headcount: number;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // "1:00 PM"
  notes: string;
};

export type QuoteStatus = 'draft' | 'accepted' | 'deposit-paid';

export type Quote = {
  variant: 'bachelor' | 'bachelorette';
  createdAt: string;
  updatedAt: string;
  /** Defaults the customer entered on the intake form; per-item
   *  headcount can override on the quote page. */
  headcount: number;
  arrivalDate: string;
  departureDate: string;
  items: QuoteItem[];
  status: QuoteStatus;
  /** Set when the customer starts a Stripe deposit checkout. */
  stripeCheckoutSessionId?: string;
  /** Set when Stripe confirms the deposit was paid. */
  depositPaidAt?: string;
};

export type QuoteTotals = {
  lineTotals: Record<ActivityKey, number>;
  subtotal: number;
  depositAmount: number;
  remaining: number;
};

/**
 * Build the initial quote from questionnaire answers. Auto-enables the
 * activities the customer picked; leaves everything else present but
 * disabled so they can toggle it on later.
 */
export function buildInitialQuote(opts: {
  variant: 'bachelor' | 'bachelorette';
  headcount: number;
  arrivalDate: string;
  departureDate: string;
  requestedActivities: string[];
}): Quote {
  const now = new Date().toISOString();
  const requested = new Set(opts.requestedActivities);

  const items: QuoteItem[] = Object.values(ACTIVITY_CATALOG)
    .filter((a) => a.variants.includes(opts.variant))
    .map((a) => ({
      activityKey: a.key,
      enabled: requested.has(a.key),
      headcount: opts.headcount,
      scheduledDate: opts.arrivalDate,
      scheduledTime: defaultTimeFor(a.key),
      notes: '',
    }));

  return {
    variant: opts.variant,
    createdAt: now,
    updatedAt: now,
    headcount: opts.headcount,
    arrivalDate: opts.arrivalDate,
    departureDate: opts.departureDate,
    items,
    status: 'draft',
  };
}

function defaultTimeFor(key: ActivityKey): string {
  switch (key) {
    case 'boat-rental':
      return '1:00 PM';
    case 'drink-delivery':
      return '12:00 PM';
    case 'golf-brewery-tour':
      return '10:00 AM';
    case 'atv-tour':
      return '2:00 PM';
    case 'gun-range':
      return '4:00 PM';
    case 'transportation':
      return '11:00 AM';
    case 'brunch-mimosa':
      return '11:00 AM';
    case 'winery-tour':
      return '1:00 PM';
    case 'spa-day':
      return '10:00 AM';
  }
}

/**
 * Compute subtotal + deposit + per-line totals from a Quote. Pure
 * function; no side effects.
 */
export function computeQuoteTotals(quote: Quote): QuoteTotals {
  const lineTotals: Record<ActivityKey, number> = {} as Record<ActivityKey, number>;
  let subtotal = 0;
  for (const item of quote.items) {
    const entry = ACTIVITY_CATALOG[item.activityKey];
    if (!entry) continue;
    const lineTotal = item.enabled
      ? entry.pricePerPerson * Math.max(0, item.headcount)
      : 0;
    lineTotals[item.activityKey] = lineTotal;
    subtotal += lineTotal;
  }
  const depositAmount = Math.round(subtotal * DEPOSIT_PERCENT);
  return {
    lineTotals,
    subtotal,
    depositAmount,
    remaining: subtotal - depositAmount,
  };
}
