/**
 * Curated cocktail-kit recipes for /cocktail-recipes.
 * @module data/cocktail-recipes
 *
 * Keyed by `Product.handle` — never by title. Titles change for merchandising
 * reasons; handles are stable and are what the deep link and the /products
 * URL use. A kit with no entry here simply does not appear on the page (the
 * page logs a dev-only warning), so adding a new cocktail kit to the catalog
 * means adding its recipe here too — in the file that matches its style:
 * ./signature-kits.ts, ./classic-kits.ts, or ./mocktails.ts.
 */

import { SIGNATURE_KIT_RECIPES } from './signature-kits';
import { CLASSIC_KIT_RECIPES } from './classic-kits';
import { MOCKTAIL_RECIPES } from './mocktails';
import type { KitRecipe } from './types';

export type { KitRecipe, RecipeKit } from './types';

/** Every alcoholic kit, signature line and named classics together. */
export const COCKTAIL_RECIPES: Record<string, KitRecipe> = {
  ...SIGNATURE_KIT_RECIPES,
  ...CLASSIC_KIT_RECIPES,
};

/** Every curated kit recipe, cocktails and mocktails together. */
export const KIT_RECIPES: Record<string, KitRecipe> = {
  ...COCKTAIL_RECIPES,
  ...MOCKTAIL_RECIPES,
};

/**
 * Look up a curated recipe by product handle.
 * @param handle - The `Product.handle` of a cocktail kit.
 * @returns The recipe, or undefined when the kit has no curated entry yet.
 */
export function getKitRecipe(handle: string): KitRecipe | undefined {
  return KIT_RECIPES[handle];
}

export { SIGNATURE_KIT_RECIPES, CLASSIC_KIT_RECIPES, MOCKTAIL_RECIPES };
