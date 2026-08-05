/**
 * Spirit groupings for /cocktail-recipes search.
 * @module data/cocktail-recipes/groups
 *
 * The page has no category filter — search is the only control — but the group
 * feeds the search text as a synonym, which is what makes "whiskey" turn up the
 * bourbon kit and "bubbles" turn up the spritzes.
 *
 * Derived from each recipe's `spirit` label rather than stored per kit, so a
 * kit only ever declares its spirit once. `spiritGroupFor` returns 'Other' for
 * anything unrecognised, and a unit test asserts no recipe lands there — a new
 * spirit wording fails the suite instead of being silently misfiled.
 */

import type { KitRecipe } from './types';

/** Every group a kit can fall into. */
export const SPIRIT_GROUPS = ['Tequila', 'Vodka', 'Gin', 'Rum', 'Whiskey', 'Bubbles', 'Non-alcoholic'] as const;

export type SpiritGroup = (typeof SPIRIT_GROUPS)[number] | 'Other';

/**
 * Bucket a recipe so its group can be matched by search.
 * @param recipe - The curated kit recipe.
 * @returns The group this kit belongs under.
 */
export function spiritGroupFor(recipe: KitRecipe): SpiritGroup {
  if (recipe.isMocktail) return 'Non-alcoholic';

  const spirit = recipe.spirit.toLowerCase();
  if (spirit.includes('tequila')) return 'Tequila';
  if (spirit.includes('gin')) return 'Gin';
  if (spirit.includes('rum')) return 'Rum';
  if (spirit.includes('whiskey') || spirit.includes('bourbon')) return 'Whiskey';
  if (spirit.includes('prosecco')) return 'Bubbles';
  if (spirit.includes('vodka')) return 'Vodka';
  return 'Other';
}
