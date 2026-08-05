/**
 * Types for the curated cocktail-kit recipes shown at /cocktail-recipes.
 * @module data/cocktail-recipes/types
 */

/**
 * One curated kit recipe, keyed by `Product.handle` in KIT_RECIPES.
 *
 * Content is authored from the product description first (the brands and
 * flavor copy customers already see) and cross-checked against the kit's
 * BundleComponent bill of materials for exact bottle counts.
 */
export interface KitRecipe {
  /** Clean display name — no "Kit • Serves 16" suffixes. Unique across all entries. */
  displayName: string;
  /** Base-spirit label shown on the card and matched by search ("Tequila", "Non-alcoholic"). */
  spirit: string;
  /** Per-kit yield. Not always 16 — SoCo Carajillo serves 11, Arnold Palmer ~25. */
  yieldLabel: string;
  /** Human prep time shown in the modal, e.g. "5 minutes". */
  prepTimeLabel: string;
  /** ISO-8601 duration for Recipe JSON-LD, e.g. "PT5M". */
  prepTimeISO: string;
  /**
   * Exactly what ships in the box, with quantities — nothing else. Ice,
   * garnishes and anything else the customer supplies must NOT appear here;
   * the list is read as "what you paid for". Garnish ideas go in `garnish`.
   */
  ingredients: string[];
  /**
   * Optional garnish suggestion, rendered above the steps and always labelled
   * as not included. Never list something the kit actually ships here.
   */
  garnish?: string;
  /**
   * Numbered batch steps. At least two.
   *
   * Steps name the spirit by CATEGORY ("the full bottle of gin") and anything
   * else by role ("the mixer") — never by brand. Swapping which bottle of gin a
   * kit ships means editing `ingredients`, not rewriting the recipe.
   */
  instructions: string[];
  /** Optional one-line host tip shown under the steps. */
  proTip?: string;
  /** Drives the MOCKTAIL badge and the non-alcoholic search keywords. */
  isMocktail?: boolean;
}

/**
 * A recipe merged with its live product row, ready to render.
 * Built server-side in the /cocktail-recipes page and passed to the client.
 */
export interface RecipeKit extends KitRecipe {
  /** Product.handle — also the `?kit=` deep-link value and the /products/ URL. */
  handle: string;
  /** Filter-chip bucket, derived server-side via `spiritGroupFor`. */
  group: string;
  /** First product image, or null when the product has none. */
  imageUrl: string | null;
  /** Image alt text from the DB, or null to fall back to the display name. */
  imageAlt: string | null;
  /** Formatted price string, e.g. "85.00". Null when no variant/base price exists. */
  price: string | null;
}
