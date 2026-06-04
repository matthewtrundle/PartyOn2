/**
 * Wedding Drink Calculator — public-facing tool for /wedding-drink-calculator.
 *
 * Reuses the same wedding-track formula and distribution ratios as
 * src/lib/drinkPlannerLogic.ts (`guests × (hours + 1)`, beer 30% / wine 15% /
 * spirits 50% / seltzers 5% with cocktail-kit override) but accepts raw
 * `guests` and `hours` numbers (5-300 guests, 2-12 hours) without going
 * through the multi-step QuizState. The two implementations must stay in
 * sync — if you change the formula here, update drinkPlannerLogic too.
 *
 * Output is intentionally counts-only (no pricing claims) per the
 * wedding-cluster build's hard-stop rules.
 */

import type { DrinkCategory } from './drinkPlannerTypes';

export interface WeddingPlanInput {
  /** Guest count, 5-300 */
  guests: number;
  /** Reception length in hours, 2-12 */
  hours: number;
  /** Drink categories the couple wants on the bar */
  categories: DrinkCategory[];
}

export interface WeddingPlanItem {
  /** Product nickname shown in the result panel */
  name: string;
  /** What to order — case, bottle, kit, etc. */
  unit: string;
  /** How many of `unit` to order */
  quantity: number;
  /** For grouping in the UI */
  category: DrinkCategory | 'ice';
}

export interface WeddingPlan {
  /** Total drinks at full crowd, full duration */
  totalDrinks: number;
  /** Per-category breakdown (counts) */
  breakdown: Record<string, number>;
  /** Concrete shopping list */
  items: WeddingPlanItem[];
  /** Input echo for the result panel */
  summary: {
    guests: number;
    hours: number;
    categories: DrinkCategory[];
  };
}

// Servings per unit — matches drinkPlannerLogic.ts SERVINGS_PER_UNIT.
const SERVINGS: Record<string, number> = {
  'Miller Lite (24-pack)': 24,
  'Modelo Especial (24-pack)': 24,
  'Austin Beerworks Variety (12-pack)': 12,
  'High Noon Variety (12-pack)': 12,
  'White Claw Variety (24-pack)': 24,
  'Dark Horse Pinot Grigio (750ml)': 5,
  '14 Hands Cabernet Sauvignon (750ml)': 5,
  'Espolon Tequila Blanco (750ml)': 17,
  "Tito's Handmade Vodka (1L)": 22,
  'Still Austin Bourbon (750ml)': 17,
  'Lady Bird Margarita Kit': 16,
  'Barton Springs Mojito Kit': 16,
  'Eastside Gin & Tonic Kit': 16,
};

// Distribution weights — matches drinkPlannerLogic EVERYTHING_ELSE_*_SPLIT.
const BASE_SPLIT: Record<string, number> = {
  spirits: 0.5,
  beer: 0.3,
  seltzers: 0.05,
  wine: 0.15,
};

const KITS_SPLIT: Record<string, number> = {
  'cocktail-kits': 0.35,
  spirits: 0.15,
  beer: 0.3,
  seltzers: 0.05,
  wine: 0.15,
};

const ROUND_UP = (n: number) => Math.max(0, Math.ceil(n));

/** Constrain inputs to the accepted ranges. */
function clampInputs(input: WeddingPlanInput): WeddingPlanInput {
  const guests = Math.min(300, Math.max(5, Math.round(input.guests)));
  const hours = Math.min(12, Math.max(2, Math.round(input.hours)));
  const categories = input.categories.length > 0
    ? input.categories
    : (['beer', 'wine', 'spirits'] as DrinkCategory[]);
  return { guests, hours, categories };
}

/**
 * Redistribute base-split weights across only the selected categories so the
 * shares sum to 1.0. Identical to drinkPlannerLogic getSelectedShares.
 */
function getShares(
  baseSplit: Record<string, number>,
  selected: DrinkCategory[],
): Record<string, number> {
  let total = 0;
  for (const cat of selected) if (baseSplit[cat] !== undefined) total += baseSplit[cat];
  if (total === 0) {
    const even = 1 / selected.length;
    return Object.fromEntries(selected.map((c) => [c, even]));
  }
  return Object.fromEntries(selected.map((c) => [c, (baseSplit[c] ?? 0) / total]));
}

function addItems(
  items: WeddingPlanItem[],
  category: DrinkCategory,
  drinks: number,
): void {
  switch (category) {
    case 'beer':
      items.push(
        { name: 'Miller Lite (24-pack)', unit: '24-pack', quantity: ROUND_UP((drinks * 0.4) / SERVINGS['Miller Lite (24-pack)']), category: 'beer' },
        { name: 'Modelo Especial (24-pack)', unit: '24-pack', quantity: ROUND_UP((drinks * 0.4) / SERVINGS['Modelo Especial (24-pack)']), category: 'beer' },
        { name: 'Austin Beerworks Variety (12-pack)', unit: '12-pack', quantity: ROUND_UP((drinks * 0.2) / SERVINGS['Austin Beerworks Variety (12-pack)']), category: 'beer' },
      );
      return;
    case 'seltzers':
      items.push(
        { name: 'High Noon Variety (12-pack)', unit: '12-pack', quantity: ROUND_UP((drinks * 0.6) / SERVINGS['High Noon Variety (12-pack)']), category: 'seltzers' },
        { name: 'White Claw Variety (24-pack)', unit: '24-pack', quantity: ROUND_UP((drinks * 0.4) / SERVINGS['White Claw Variety (24-pack)']), category: 'seltzers' },
      );
      return;
    case 'wine':
      items.push(
        { name: 'Dark Horse Pinot Grigio (750ml)', unit: 'bottle', quantity: ROUND_UP((drinks * 0.5) / SERVINGS['Dark Horse Pinot Grigio (750ml)']), category: 'wine' },
        { name: '14 Hands Cabernet Sauvignon (750ml)', unit: 'bottle', quantity: ROUND_UP((drinks * 0.5) / SERVINGS['14 Hands Cabernet Sauvignon (750ml)']), category: 'wine' },
      );
      return;
    case 'spirits':
      items.push(
        { name: 'Espolon Tequila Blanco (750ml)', unit: 'bottle', quantity: ROUND_UP((drinks * 0.4) / SERVINGS['Espolon Tequila Blanco (750ml)']), category: 'spirits' },
        { name: "Tito's Handmade Vodka (1L)", unit: 'bottle', quantity: ROUND_UP((drinks * 0.4) / SERVINGS["Tito's Handmade Vodka (1L)"]), category: 'spirits' },
        { name: 'Still Austin Bourbon (750ml)', unit: 'bottle', quantity: ROUND_UP((drinks * 0.2) / SERVINGS['Still Austin Bourbon (750ml)']), category: 'spirits' },
      );
      return;
    case 'cocktail-kits':
      items.push(
        { name: 'Lady Bird Margarita Kit', unit: 'kit', quantity: Math.max(1, ROUND_UP(drinks / 16 / 3)), category: 'cocktail-kits' },
        { name: 'Barton Springs Mojito Kit', unit: 'kit', quantity: Math.max(1, ROUND_UP(drinks / 16 / 3)), category: 'cocktail-kits' },
        { name: 'Eastside Gin & Tonic Kit', unit: 'kit', quantity: Math.max(1, ROUND_UP(drinks / 16 / 3)), category: 'cocktail-kits' },
      );
      return;
    case 'champagne':
      items.push(
        { name: 'Champagne / Prosecco (750ml)', unit: 'bottle', quantity: ROUND_UP(drinks / 5), category: 'champagne' },
      );
      return;
  }
}

/**
 * Calculate the wedding bar plan from raw inputs. Pure function — no I/O.
 */
export function calculateWeddingPlan(rawInput: WeddingPlanInput): WeddingPlan {
  const input = clampInputs(rawInput);
  const totalDrinks = Math.ceil(input.guests * (input.hours + 1));

  const hasKits = input.categories.includes('cocktail-kits');
  const baseSplit = hasKits ? KITS_SPLIT : BASE_SPLIT;

  // Always include a small seltzer share even if not explicitly selected, to
  // match drinkPlannerLogic behaviour. Wedding guests skew toward variety.
  const effective: DrinkCategory[] = [...input.categories];
  if (!effective.includes('seltzers')) effective.push('seltzers');

  const shares = getShares(baseSplit, effective);
  const breakdown: Record<string, number> = {};
  const items: WeddingPlanItem[] = [];

  for (const category of effective) {
    const share = shares[category] ?? 0;
    const drinks = totalDrinks * share;
    breakdown[category] = Math.ceil(drinks);
    addItems(items, category, drinks);
  }

  // Ice — 1 bag per 10 guests. Always include.
  items.push({
    name: 'Ice Bags',
    unit: 'bag',
    quantity: Math.max(1, Math.ceil(input.guests / 10)),
    category: 'ice',
  });

  return {
    totalDrinks,
    breakdown,
    items: items.filter((i) => i.quantity > 0),
    summary: {
      guests: input.guests,
      hours: input.hours,
      categories: input.categories,
    },
  };
}
