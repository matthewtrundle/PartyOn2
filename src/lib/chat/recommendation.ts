/**
 * Drink-order recommendation for the chat + unified quote endpoint.
 *
 * Thin wrapper around the existing algorithmic engine in
 * `src/lib/drinkPlannerLogic.ts`. The engine knows how to:
 *
 *   - Translate (party type, guests, duration) into a total number of
 *     drinks (boat/bach gets a flat 2 drinks/person/hour; everything
 *     else gets a heavier first hour: guests × (hours + 1))
 *   - Split that total across categories based on the event:
 *       Boat/Bach:   beer 33% / seltzers 33% / cocktail-kits 33%
 *       Wedding/etc: spirits 50% / beer 30% / wine 15% / seltzers 5%
 *   - Allocate each category's portion across a curated product mix
 *     (Miller Lite + Modelo + ABW variety for beer, etc.) with the
 *     right SERVINGS_PER_UNIT conversion to get whole-pack quantities
 *   - Add 1 bag of ice per 10 guests, always
 *
 * Our job here is to:
 *   1. Map the chat's `partyType` to the engine's `EventType`
 *   2. Pick a sensible default duration based on event type
 *   3. Pick sensible default drink categories based on the track
 *   4. Run the engine
 *   5. Resolve each `ProductRecommendation` to a live POD product via
 *      the same DB-title search the existing GET endpoint uses
 *   6. Return the result in the shape the chat UI already speaks
 *
 * If a recommendation can't be matched to a live product (search miss,
 * out-of-stock, etc.) it's silently dropped from the returned list and
 * the handle is reported in `missingHandles` for ops debugging.
 */
import { prisma } from '@/lib/database/client';
import {
  calculateQuizResults,
  SEARCH_OVERRIDES,
} from '@/lib/drinkPlannerLogic';
import type {
  QuizState,
  EventType,
  Duration,
  DrinkCategory,
} from '@/lib/drinkPlannerTypes';
import type { PartyType } from '@/lib/eventQuiz/routing';

// Chat party type → drink-planner EventType.
// Boat/bach types route through the BOAT_BACH track (flat 2 drinks/person/hour);
// everything else uses guests × (hours + 1).
const PARTY_TO_EVENT: Record<PartyType, EventType> = {
  bachelor: 'bachelor',
  bachelorette: 'bachelorette',
  wedding: 'wedding',
  corporate: 'corporate',
  boat: 'boat-day',
  house: 'house-party',
  hotel: 'house-party',
  'just-deliver': 'house-party',
};

// Defaults the chat doesn't ask about. Conservative — chat customers can
// tune any of these later inside the dashboard.
const DEFAULT_DURATION_BY_EVENT: Partial<Record<EventType, Duration>> = {
  'boat-day': '4h',
  bachelor: 'multi-day',
  bachelorette: 'multi-day',
  'weekend-trip': 'multi-day',
  wedding: '5h',
  corporate: '3h',
  'house-party': '4h',
  other: '4h',
};

// What categories to recommend when the customer didn't pick any (the
// chat doesn't ask). Boat/bach gets crushable cans + kits; everything
// else gets beer + wine + spirits (standard event mix).
const DEFAULT_CATEGORIES_BOAT_BACH: DrinkCategory[] = [
  'beer',
  'seltzers',
  'cocktail-kits',
];
const DEFAULT_CATEGORIES_EVENT: DrinkCategory[] = ['beer', 'wine', 'spirits'];

export type RecommendedItem = {
  handle: string;
  name: string;
  detail?: string;
  image?: string;
  price: number;
  qty: number;
  /** Drink-planner category tag — useful in the UI for grouping. */
  category: string;
};

export type Recommendation = {
  /** Event type used by the engine (after mapping). */
  occasion: string;
  /** Headline for the recommendation card. */
  packageName: string;
  packageBlurb: string;
  packageServes: string;
  packageImage: string;
  /** Total drinks the engine computed (sum across all categories). */
  totalDrinks: number;
  /** Estimated subtotal — sum of unit_price × qty over `items`. */
  estimatedTotal: number;
  items: RecommendedItem[];
  /** Recommendation names the engine produced but we couldn't resolve to a
   *  live product. Useful for ops debugging. */
  missingHandles: string[];
};

export async function recommendForChat(opts: {
  partyType: PartyType;
  headcount: number;
  /** Optional — caller can override duration; defaults from event type. */
  duration?: Duration;
  /** Optional — caller can override categories; defaults from track. */
  categories?: DrinkCategory[];
}): Promise<Recommendation | null> {
  const eventType = PARTY_TO_EVENT[opts.partyType];
  if (!eventType) return null;

  const duration = opts.duration ?? DEFAULT_DURATION_BY_EVENT[eventType] ?? '4h';
  const boatBach = ['boat-day', 'bachelor', 'bachelorette', 'weekend-trip'].includes(
    eventType,
  );
  const categories =
    opts.categories ?? (boatBach ? DEFAULT_CATEGORIES_BOAT_BACH : DEFAULT_CATEGORIES_EVENT);

  // Build the QuizState the engine expects. Most fields are inert for
  // the recommendation calculation — only eventType, guestCount,
  // duration, and drinkCategories actually feed the math.
  const quizState: QuizState = {
    currentStep: 'results',
    eventType,
    guestCount: opts.headcount,
    drinkingVibe: 'social',
    duration,
    drinkCategories: categories,
    selectedCocktails: [],
    extras: [],
    bartender: null,
    eventTiming: null,
    deliveryArea: 'austin',
    skipped: false,
    completed: true,
    packageTier: 'standard',
  };

  const results = calculateQuizResults(quizState);

  // Resolve each `ProductRecommendation` to a live POD product. Mirrors
  // the existing /api/v2/group-orders/[code]/recommendations endpoint.
  const items: RecommendedItem[] = [];
  const missingHandles: string[] = [];
  for (const rec of results.recommendations) {
    const override = SEARCH_OVERRIDES[rec.name];
    const searchTerm = override?.search ?? rec.searchQuery ?? rec.name;
    const variantHint = override?.variantHint;

    const matches = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        title: { contains: searchTerm, mode: 'insensitive' },
      },
      include: {
        images: { take: 1, orderBy: { position: 'asc' } },
        variants: {
          where: { availableForSale: true },
          orderBy: { price: 'asc' },
          take: 1,
        },
      },
      take: 10,
    });

    if (matches.length === 0) {
      missingHandles.push(rec.name);
      continue;
    }

    // Prefer the match whose title contains the variantHint (e.g. "24 Pack").
    let product = matches[0];
    if (variantHint) {
      const hintMatch = matches.find((p) =>
        p.title.toLowerCase().includes(variantHint.toLowerCase()),
      );
      if (hintMatch) product = hintMatch;
    }
    const variant = product.variants[0];
    if (!variant) {
      missingHandles.push(rec.name);
      continue;
    }

    items.push({
      handle: product.handle,
      name: product.title,
      image: product.images[0]?.url,
      price: Number(variant.price),
      qty: rec.quantity,
      category: rec.category,
    });
  }

  const estimatedTotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  // Headline copy for the chat panel — keep it specific so the user
  // sees we actually did the math.
  const trackBlurb = boatBach
    ? 'Crushable cans + kits sized for the lake.'
    : 'Stocked for the bar: spirits, beer, and wine.';
  const packageName = boatBach
    ? `${opts.headcount}-person ${eventType.replace('-', ' ')}`
    : `${opts.headcount} guests · ${duration}`;

  return {
    occasion: eventType,
    packageName,
    packageBlurb: trackBlurb,
    packageServes: `${opts.headcount} people · ~${results.totalDrinks} drinks`,
    packageImage: '/images/services/bach-parties/late-night-party-supplies.webp',
    totalDrinks: results.totalDrinks,
    estimatedTotal,
    items,
    missingHandles,
  };
}
