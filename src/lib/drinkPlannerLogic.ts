import type {
  QuizState,
  QuizResults,
  ProductRecommendation,
  StepId,
  DrinkCategory,
  EventType,
  Duration,
  QuizAction,
} from './drinkPlannerTypes';
import { EVENT_TYPE_LABELS, VIBE_LABELS, DURATION_LABELS } from './drinkPlannerTypes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DURATION_HOURS: Record<Duration, number> = {
  '2h': 2,
  '3h': 3,
  '4h': 4,
  '5h': 5,
  '6h': 6,
  'multi-day': 16,
};

// Boat/Bach track: flat 2 drinks/person/hour
const BOAT_BACH_RATE = 2;

// "Everything Else" track event types
const BOAT_BACH_TYPES: EventType[] = ['boat-day', 'bachelor', 'bachelorette', 'weekend-trip'];

function isBoatBachTrack(eventType: EventType): boolean {
  return BOAT_BACH_TYPES.includes(eventType);
}

// Default category split for "Everything Else" track (without cocktail kits)
// These are the base weights -- when categories are deselected, we redistribute proportionally
const EVERYTHING_ELSE_BASE_SPLIT: Record<string, number> = {
  spirits: 0.50,
  beer: 0.30,
  seltzers: 0.05,
  wine: 0.15,
};

// When cocktail kits ARE selected on the Everything Else track, spirits share is reduced
const EVERYTHING_ELSE_KITS_SPLIT: Record<string, number> = {
  'cocktail-kits': 0.35,
  spirits: 0.15,
  beer: 0.30,
  seltzers: 0.05,
  wine: 0.15,
};

// Product search queries -- maps recommendation name to DB search term
// DB titles use bullet separator: "Miller Lite \u2022 24 Pack 12oz Can"
// Search terms must match text on ONE side of the bullet, not span across it.
// For multi-variant products, we also store the preferred variant title to disambiguate.
export const SEARCH_OVERRIDES: Record<string, { search: string; variantHint?: string }> = {
  // Beer
  'Miller Lite 24pk': { search: 'Miller Lite', variantHint: '24 Pack' },
  'Modelo Especial 24pk': { search: 'Modelo Especial', variantHint: '24 Pack' },
  'Austin Beerworks Variety 12pk': { search: 'Austin Beerworks Variety' },
  // Seltzers
  'High Noon Variety 12pk': { search: 'High Noon Variety Pack', variantHint: '12 Pack' },
  'White Claw Variety 24pk': { search: 'White Claw Variety', variantHint: '24 Pack' },
  'Surfside Starter Pack': { search: 'Surfside Starter' },
  // Wine
  'Dark Horse Pinot Grigio': { search: 'Dark Horse Pinot Grigio' },
  '14 Hands Cabernet Sauvignon': { search: '14 Hands Cabernet' },
  // Spirits
  'Espolon Tequila Blanco': { search: 'Espolon Tequila Blanco', variantHint: '750ml' },
  "Tito's Handmade Vodka 1L": { search: "Tito's Handmade Vodka", variantHint: '1L' },
  'Still Austin Bourbon': { search: 'Still Austin Straight Bourbon' },
  'Island Getaway White Rum': { search: 'Island Getaway White Rum' },
  'Dripping Springs Artisan Gin': { search: 'Dripping Springs Artisan Gin' },
  // Cocktail kits
  'Lady Bird Margarita': { search: 'Lady Bird Margarita' },
  'Barton Springs Mojito': { search: 'Barton Springs Mojito' },
  'Eastside Gin & Tonic': { search: 'Eastside Gin' },
  // Ice
  'Ice Bags': { search: 'Bag of Ice' },
};

// Estimated prices for cost summary (approximate)
const ESTIMATED_PRICES: Record<string, number> = {
  'Miller Lite 24pk': 29.99,
  'Modelo Especial 24pk': 34.99,
  'Austin Beerworks Variety 12pk': 12.99,
  'High Noon Variety 12pk': 24.99,
  'White Claw Variety 24pk': 29.99,
  'Surfside Starter Pack': 19.99,
  'Dark Horse Pinot Grigio': 12.99,
  '14 Hands Cabernet Sauvignon': 14.99,
  'Espolon Tequila Blanco': 29.99,
  "Tito's Handmade Vodka 1L": 34.99,
  'Still Austin Bourbon': 39.99,
  'Island Getaway White Rum': 24.99,
  'Dripping Springs Artisan Gin': 29.99,
  'Lady Bird Margarita': 59.99,
  'Barton Springs Mojito': 59.99,
  'Eastside Gin & Tonic': 59.99,
  'Ice Bags': 4.99,
};

// Servings per unit for converting drink counts to product quantities
const SERVINGS_PER_UNIT: Record<string, number> = {
  // Beer
  'Miller Lite 24pk': 24,
  'Modelo Especial 24pk': 24,
  'Austin Beerworks Variety 12pk': 12,
  // Seltzers
  'High Noon Variety 12pk': 12,
  'White Claw Variety 24pk': 24,
  'Surfside Starter Pack': 12, // approximate
  // Wine (750ml = 5 glasses)
  'Dark Horse Pinot Grigio': 5,
  '14 Hands Cabernet Sauvignon': 5,
  // Spirits (750ml = 17, 1L = 22)
  'Espolon Tequila Blanco': 17,
  "Tito's Handmade Vodka 1L": 22,
  'Still Austin Bourbon': 17,
  'Island Getaway White Rum': 17,
  'Dripping Springs Artisan Gin': 17,
  // Cocktail kits
  'Lady Bird Margarita': 16,
  'Barton Springs Mojito': 16,
  'Eastside Gin & Tonic': 16,
};

// ---------------------------------------------------------------------------
// Engine spec — public, frozen snapshot of the rules above.
//
// Read by the admin "Recommendation Logic" panel in Brian's Stuff so the
// source of truth for "what the chatbot recommends" stays here in the
// engine — there is no separate hand-written doc that can drift. If a
// rule changes, change it in this file; the panel updates on next load.
// ---------------------------------------------------------------------------

export interface EngineSpec {
  durationHours: Record<Duration, number>;
  boatBachRate: number;
  boatBachTypes: EventType[];
  formulas: { boatBach: string; everythingElse: string; ice: string };
  splits: {
    boatBach: Record<string, number>;
    everythingElseNoKits: Record<string, number>;
    everythingElseWithKits: Record<string, number>;
  };
  servingsPerUnit: Record<string, number>;
  estimatedPrices: Record<string, number>;
  productMix: {
    beer: { product: string; share: number }[];
    seltzers: { product: string; share: number }[];
    wine: { product: string; share: number }[];
    spirits: { product: string; share: number }[];
    cocktailKits: { product: string }[];
  };
  searchOverrides: Record<string, { search: string; variantHint?: string }>;
}

export const ENGINE_SPEC: EngineSpec = {
  durationHours: DURATION_HOURS,
  boatBachRate: BOAT_BACH_RATE,
  boatBachTypes: BOAT_BACH_TYPES,
  formulas: {
    boatBach: 'totalDrinks = ceil(guests × hours × 2)',
    everythingElse: 'totalDrinks = ceil(guests × (hours + 1))   // heavier first hour',
    ice: 'iceBags = ceil(guests / 10)   // always, every order',
  },
  splits: {
    // Boat/Bach uses equal split across selected categories; this is
    // the base table (1/3 each when all five are selected).
    boatBach: {
      beer: 1 / 3,
      seltzers: 1 / 3,
      'cocktail-kits': 1 / 3,
      wine: 1 / 3,
      spirits: 1 / 3,
    },
    everythingElseNoKits: EVERYTHING_ELSE_BASE_SPLIT,
    everythingElseWithKits: EVERYTHING_ELSE_KITS_SPLIT,
  },
  servingsPerUnit: SERVINGS_PER_UNIT,
  estimatedPrices: ESTIMATED_PRICES,
  productMix: {
    beer: [
      { product: 'Miller Lite 24pk', share: 0.4 },
      { product: 'Modelo Especial 24pk', share: 0.4 },
      { product: 'Austin Beerworks Variety 12pk', share: 0.2 },
    ],
    seltzers: [
      { product: 'High Noon Variety 12pk', share: 0.4 },
      { product: 'White Claw Variety 24pk', share: 0.3 },
      { product: 'Surfside Starter Pack', share: 0.3 },
    ],
    wine: [
      { product: 'Dark Horse Pinot Grigio', share: 0.5 },
      { product: '14 Hands Cabernet Sauvignon', share: 0.5 },
    ],
    spirits: [
      { product: 'Espolon Tequila Blanco', share: 0.4 },
      { product: "Tito's Handmade Vodka 1L", share: 0.3 },
      { product: 'Still Austin Bourbon', share: 0.1 },
      { product: 'Island Getaway White Rum', share: 0.1 },
      { product: 'Dripping Springs Artisan Gin', share: 0.1 },
    ],
    cocktailKits: [
      { product: 'Lady Bird Margarita' },
      { product: 'Barton Springs Mojito' },
      { product: 'Eastside Gin & Tonic' },
    ],
  },
  searchOverrides: SEARCH_OVERRIDES,
};

// ---------------------------------------------------------------------------
// Quiz stepper functions (unchanged -- used by standalone quiz page)
// ---------------------------------------------------------------------------

export function getSteps(state: QuizState): StepId[] {
  const steps: StepId[] = [
    'welcome',
    'event-type',
    'guest-count',
    'drinking-vibe',
    'duration',
    'drink-types',
  ];

  if (state.drinkCategories.includes('cocktail-kits')) {
    steps.push('cocktail-pick');
  }

  steps.push('extras', 'bartender', 'event-details', 'results');
  return steps;
}

export function getStepIndex(state: QuizState): number {
  const steps = getSteps(state);
  return steps.indexOf(state.currentStep);
}

export function getNextStep(state: QuizState): StepId | null {
  const steps = getSteps(state);
  const idx = steps.indexOf(state.currentStep);
  return idx < steps.length - 1 ? steps[idx + 1] : null;
}

export function getPrevStep(state: QuizState): StepId | null {
  const steps = getSteps(state);
  const idx = steps.indexOf(state.currentStep);
  return idx > 0 ? steps[idx - 1] : null;
}

export function getGuestValues(eventType: EventType | null): number[] {
  const values: number[] = [];
  for (let i = 5; i <= 20; i++) values.push(i);
  const max = (eventType === 'boat-day' || eventType === 'weekend-trip') ? 50 : 200;
  for (let i = 25; i <= Math.min(100, max); i += 5) values.push(i);
  if (max > 100) {
    for (let i = 110; i <= max; i += 10) values.push(i);
  }
  return values;
}

export function getGuestRange(eventType: EventType | null): { min: number; max: number } {
  if (eventType === 'boat-day' || eventType === 'weekend-trip') {
    return { min: 5, max: 50 };
  }
  return { min: 5, max: 200 };
}

export function getQuickPickValues(eventType: EventType | null): number[] {
  if (eventType === 'boat-day' || eventType === 'weekend-trip') {
    return [10, 20, 30, 50];
  }
  return [10, 20, 30, 50, 75, 100, 150, 200];
}

export function getGuestStep(value: number): number {
  return value >= 100 ? 10 : 5;
}

// ---------------------------------------------------------------------------
// Core recommendation algorithm
// ---------------------------------------------------------------------------

function calculateEstimatedCost(recommendations: ProductRecommendation[]): number {
  let total = 0;
  for (const rec of recommendations) {
    const price = ESTIMATED_PRICES[rec.name] || 0;
    total += price * rec.quantity;
  }
  return Math.round(total * 100) / 100;
}

function roundUp(n: number): number {
  return Math.max(1, Math.ceil(n));
}

function addProduct(
  recs: ProductRecommendation[],
  name: string,
  drinks: number,
  unit: string,
  category: DrinkCategory | 'ice',
) {
  const servings = SERVINGS_PER_UNIT[name] || 1;
  const qty = roundUp(drinks / servings);
  const override = SEARCH_OVERRIDES[name];
  recs.push({
    name,
    searchQuery: override ? override.search : name,
    quantity: qty,
    unit,
    category,
  });
}

function addBeerRecs(recs: ProductRecommendation[], beerDrinks: number) {
  // 40% Miller Lite 24pk, 40% Modelo 24pk, 20% Austin Beerworks 12pk
  addProduct(recs, 'Miller Lite 24pk', beerDrinks * 0.4, '24-pack', 'beer');
  addProduct(recs, 'Modelo Especial 24pk', beerDrinks * 0.4, '24-pack', 'beer');
  addProduct(recs, 'Austin Beerworks Variety 12pk', beerDrinks * 0.2, '12-pack', 'beer');
}

function addSeltzerRecs(recs: ProductRecommendation[], seltzerDrinks: number) {
  // 40% High Noon 12pk, 30% White Claw 24pk, 30% Surfside
  addProduct(recs, 'High Noon Variety 12pk', seltzerDrinks * 0.4, '12-pack', 'seltzers');
  addProduct(recs, 'White Claw Variety 24pk', seltzerDrinks * 0.3, '24-pack', 'seltzers');
  addProduct(recs, 'Surfside Starter Pack', seltzerDrinks * 0.3, 'pack', 'seltzers');
}

function addWineRecs(recs: ProductRecommendation[], wineDrinks: number) {
  // 50/50 Dark Horse Pinot Grigio and 14 Hands Cabernet
  addProduct(recs, 'Dark Horse Pinot Grigio', wineDrinks * 0.5, 'bottle', 'wine');
  addProduct(recs, '14 Hands Cabernet Sauvignon', wineDrinks * 0.5, 'bottle', 'wine');
}

function addSpiritRecs(recs: ProductRecommendation[], spiritDrinks: number) {
  // 40% Espolon, 30% Tito's, 10% Still Austin, 10% Rum, 10% Gin
  addProduct(recs, 'Espolon Tequila Blanco', spiritDrinks * 0.4, 'bottle', 'spirits');
  addProduct(recs, "Tito's Handmade Vodka 1L", spiritDrinks * 0.3, 'bottle', 'spirits');
  addProduct(recs, 'Still Austin Bourbon', spiritDrinks * 0.1, 'bottle', 'spirits');
  addProduct(recs, 'Island Getaway White Rum', spiritDrinks * 0.1, 'bottle', 'spirits');
  addProduct(recs, 'Dripping Springs Artisan Gin', spiritDrinks * 0.1, 'bottle', 'spirits');
}

function addCocktailKitRecs(recs: ProductRecommendation[], kitDrinks: number) {
  // 3 kits, split evenly, minimum 1 of each
  const kitsPerType = Math.max(1, roundUp(kitDrinks / 16 / 3));
  const kitNames = ['Lady Bird Margarita', 'Barton Springs Mojito', 'Eastside Gin & Tonic'] as const;
  for (const name of kitNames) {
    const override = SEARCH_OVERRIDES[name];
    recs.push({
      name,
      searchQuery: override ? override.search : name,
      quantity: kitsPerType,
      unit: 'kit',
      category: 'cocktail-kits',
    });
  }
}

/**
 * Redistribute category shares proportionally when some categories are not selected.
 * Returns a map of selected category -> share of total drinks.
 */
function getSelectedShares(
  baseSplit: Record<string, number>,
  selectedCategories: DrinkCategory[],
): Record<string, number> {
  // Sum up the weights of selected categories
  let selectedTotal = 0;
  for (const cat of selectedCategories) {
    if (baseSplit[cat] !== undefined) {
      selectedTotal += baseSplit[cat];
    }
  }

  // If nothing matched the base split, distribute evenly
  if (selectedTotal === 0) {
    const even = 1 / selectedCategories.length;
    const result: Record<string, number> = {};
    for (const cat of selectedCategories) {
      result[cat] = even;
    }
    return result;
  }

  // Redistribute proportionally so shares sum to 1.0
  const result: Record<string, number> = {};
  for (const cat of selectedCategories) {
    if (baseSplit[cat] !== undefined) {
      result[cat] = baseSplit[cat] / selectedTotal;
    }
  }
  return result;
}

export function calculateQuizResults(state: QuizState): QuizResults {
  const eventType = state.eventType || 'other';
  const duration = state.duration || '4h';
  const guests = state.guestCount || 20;
  const hours = DURATION_HOURS[duration];

  const boatBach = isBoatBachTrack(eventType);

  // Calculate total drinks
  let totalDrinks: number;
  if (boatBach) {
    // Boat/Bach: flat rate
    totalDrinks = Math.ceil(guests * hours * BOAT_BACH_RATE);
  } else {
    // Everything Else: guests x (hours + 1) -- heavier first hour
    totalDrinks = Math.ceil(guests * (hours + 1));
  }

  const recommendations: ProductRecommendation[] = [];
  const selectedCategories = state.drinkCategories.length > 0
    ? state.drinkCategories
    : (boatBach ? ['beer', 'seltzers', 'cocktail-kits'] : ['beer', 'wine', 'spirits']) as DrinkCategory[];

  if (boatBach) {
    // -----------------------------------------------------------------------
    // TRACK 1: Boat Party / Bach Weekend
    // Even split among selected categories, redistributed proportionally
    // -----------------------------------------------------------------------
    const boatBaseSplit: Record<string, number> = {
      beer: 1 / 3,
      seltzers: 1 / 3,
      'cocktail-kits': 1 / 3,
      // If they select wine or spirits on boat/bach, give them equal share too
      wine: 1 / 3,
      spirits: 1 / 3,
    };

    const shares = getSelectedShares(boatBaseSplit, selectedCategories);

    for (const [cat, share] of Object.entries(shares)) {
      const drinks = totalDrinks * share;
      switch (cat) {
        case 'beer': addBeerRecs(recommendations, drinks); break;
        case 'seltzers': addSeltzerRecs(recommendations, drinks); break;
        case 'cocktail-kits': addCocktailKitRecs(recommendations, drinks); break;
        case 'wine': addWineRecs(recommendations, drinks); break;
        case 'spirits': addSpiritRecs(recommendations, drinks); break;
      }
    }
  } else {
    // -----------------------------------------------------------------------
    // TRACK 2: Everything Else (Wedding, Corporate, House Party, etc.)
    // -----------------------------------------------------------------------
    const hasKits = selectedCategories.includes('cocktail-kits');
    const baseSplit = hasKits ? EVERYTHING_ELSE_KITS_SPLIT : EVERYTHING_ELSE_BASE_SPLIT;

    // Build the effective category list:
    // - Always include seltzers at 5% (High Noon) even if not explicitly selected
    const effectiveCategories = [...selectedCategories];
    if (!effectiveCategories.includes('seltzers')) {
      effectiveCategories.push('seltzers');
    }

    // Single category cap: if only 1 category was explicitly selected (before auto-seltzer),
    // cap that category at 70% and show complementary picks for the other 30%
    const singleCategory = selectedCategories.length === 1;

    if (singleCategory) {
      const mainCat = selectedCategories[0];
      const mainDrinks = totalDrinks * 0.70;
      const complementaryDrinks = totalDrinks * 0.30;

      // Add main category
      switch (mainCat) {
        case 'beer': addBeerRecs(recommendations, mainDrinks); break;
        case 'seltzers': addSeltzerRecs(recommendations, mainDrinks); break;
        case 'wine': addWineRecs(recommendations, mainDrinks); break;
        case 'spirits': addSpiritRecs(recommendations, mainDrinks); break;
        case 'cocktail-kits': addCocktailKitRecs(recommendations, mainDrinks); break;
      }

      // Add complementary picks from the best complementary categories
      // (spirits if they picked beer, beer if they picked spirits, etc.)
      const complementaryPicks: DrinkCategory[] = [];
      if (mainCat !== 'beer') complementaryPicks.push('beer');
      if (mainCat !== 'spirits' && mainCat !== 'cocktail-kits') complementaryPicks.push('spirits');
      if (mainCat !== 'wine') complementaryPicks.push('wine');

      // Split complementary drinks evenly among complementary categories
      const compShare = complementaryDrinks / complementaryPicks.length;
      for (const cat of complementaryPicks) {
        switch (cat) {
          case 'beer': addBeerRecs(recommendations, compShare); break;
          case 'spirits': addSpiritRecs(recommendations, compShare); break;
          case 'wine': addWineRecs(recommendations, compShare); break;
          case 'seltzers': addSeltzerRecs(recommendations, compShare); break;
          case 'cocktail-kits': addCocktailKitRecs(recommendations, compShare); break;
        }
      }
    } else {
      // Multiple categories selected -- use proportional redistribution
      const shares = getSelectedShares(baseSplit, effectiveCategories);

      for (const [cat, share] of Object.entries(shares)) {
        const drinks = totalDrinks * share;
        switch (cat) {
          case 'beer': addBeerRecs(recommendations, drinks); break;
          case 'seltzers': addSeltzerRecs(recommendations, drinks); break;
          case 'wine': addWineRecs(recommendations, drinks); break;
          case 'spirits': addSpiritRecs(recommendations, drinks); break;
          case 'cocktail-kits': addCocktailKitRecs(recommendations, drinks); break;
        }
      }
    }
  }

  // Ice: 1 bag per 10 guests, always
  const iceBags = roundUp(guests / 10);
  recommendations.push({
    name: 'Ice Bags',
    searchQuery: 'ice bag',
    quantity: iceBags,
    unit: 'bag',
    category: 'ice',
  });

  const filtered = recommendations.filter(r => r.quantity > 0);

  return {
    recommendations: filtered,
    totalDrinks,
    estimatedCost: calculateEstimatedCost(filtered),
    summary: {
      eventType: EVENT_TYPE_LABELS[eventType],
      guestCount: guests,
      duration: DURATION_LABELS[duration],
      vibe: VIBE_LABELS[state.drinkingVibe || 'social'].label,
    },
  };
}

// ---------------------------------------------------------------------------
// Cocktail options (used by standalone quiz cocktail-pick step)
// ---------------------------------------------------------------------------

export const COCKTAIL_OPTIONS = [
  { id: 'lady-bird-margarita', name: 'Lady Bird Margarita', description: 'Tequila, lime, agave' },
  { id: 'barton-springs-mojito', name: 'Barton Springs Mojito', description: 'Rum, mint, lime, soda' },
  { id: 'eastside-gin-tonic', name: 'Eastside Gin & Tonic', description: 'Gin, tonic, cucumber, lime' },
];

// ---------------------------------------------------------------------------
// Quiz state management (unchanged -- used by standalone quiz page)
// ---------------------------------------------------------------------------

export const initialQuizState: QuizState = {
  currentStep: 'welcome',
  eventType: null,
  guestCount: 20,
  drinkingVibe: null,
  duration: null,
  drinkCategories: [],
  selectedCocktails: [],
  extras: [],
  bartender: null,
  eventTiming: null,
  deliveryArea: null,
  skipped: false,
  completed: false,
  packageTier: 'standard',
};

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_EVENT_TYPE': {
      const newState = { ...state, eventType: action.payload };
      if (action.payload === 'boat-day' && !state.extras.includes('no-glass')) {
        newState.extras = [...state.extras, 'no-glass'];
      }
      const range = getGuestRange(action.payload);
      if (newState.guestCount < range.min) newState.guestCount = range.min;
      if (newState.guestCount > range.max) newState.guestCount = range.max;
      return newState;
    }
    case 'SET_GUEST_COUNT':
      return { ...state, guestCount: action.payload };
    case 'SET_DRINKING_VIBE':
      return { ...state, drinkingVibe: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_DRINK_CATEGORIES':
      return { ...state, drinkCategories: action.payload };
    case 'TOGGLE_DRINK_CATEGORY': {
      const categories = state.drinkCategories.includes(action.payload)
        ? state.drinkCategories.filter(c => c !== action.payload)
        : [...state.drinkCategories, action.payload];
      return { ...state, drinkCategories: categories };
    }
    case 'SET_SELECTED_COCKTAILS':
      return { ...state, selectedCocktails: action.payload };
    case 'SET_EXTRAS':
      return { ...state, extras: action.payload };
    case 'TOGGLE_EXTRA': {
      const extras = state.extras.includes(action.payload)
        ? state.extras.filter(e => e !== action.payload)
        : [...state.extras, action.payload];
      return { ...state, extras: extras };
    }
    case 'SET_BARTENDER':
      return { ...state, bartender: action.payload };
    case 'SET_EVENT_TIMING':
      return { ...state, eventTiming: action.payload };
    case 'SET_DELIVERY_AREA':
      return { ...state, deliveryArea: action.payload };
    case 'SET_PACKAGE_TIER':
      return { ...state, packageTier: action.payload };
    case 'NEXT_STEP': {
      const next = getNextStep(state);
      return next ? { ...state, currentStep: next } : state;
    }
    case 'PREV_STEP': {
      const prev = getPrevStep(state);
      return prev ? { ...state, currentStep: prev } : state;
    }
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.payload };
    case 'SKIP_QUIZ':
      return { ...state, skipped: true };
    case 'RESET':
      return { ...initialQuizState };
    default:
      return state;
  }
}
