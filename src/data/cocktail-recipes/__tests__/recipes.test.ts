import { describe, it, expect } from 'vitest';
import { COCKTAIL_RECIPES, MOCKTAIL_RECIPES, KIT_RECIPES, getKitRecipe } from '../index';
import { spiritGroupFor, SPIRIT_GROUPS } from '../groups';
import { JULY4_KIT_HANDLES } from '@/lib/products/july4-kits';

/**
 * The recipe file is customer-facing content shipped as code, and it is the
 * only source for what /cocktail-recipes renders. These assertions catch the
 * mistakes that are invisible in a diff: a key that is not a real product
 * handle, an entry with no steps, or two kits that would collide in the
 * alphabetical list.
 *
 * Deliberately NO assertion on the number of entries — catalog membership is
 * checked against the live DB at render time (a kit with no recipe logs a dev
 * warning), so a hardcoded count here would only rot.
 */
describe('cocktail kit recipes', () => {
  const entries = Object.entries(KIT_RECIPES);

  it('has entries', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)('%s is keyed by a valid product handle', (handle) => {
    expect(handle).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it.each(entries)('%s has complete display fields', (_handle, recipe) => {
    expect(recipe.displayName.trim()).not.toBe('');
    expect(recipe.spirit.trim()).not.toBe('');
    expect(recipe.yieldLabel.trim()).not.toBe('');
    expect(recipe.prepTimeLabel.trim()).not.toBe('');
    expect(recipe.prepTimeISO).toMatch(/^PT\d+M$/);
  });

  it.each(entries)('%s has a usable recipe', (_handle, recipe) => {
    expect(recipe.ingredients.length).toBeGreaterThanOrEqual(1);
    expect(recipe.instructions.length).toBeGreaterThanOrEqual(2);
    for (const line of [...recipe.ingredients, ...recipe.instructions]) {
      expect(line.trim()).not.toBe('');
    }
  });

  it.each(entries)('%s lists only what ships in the box', (_handle, recipe) => {
    // The kit contents list is read as "what I paid for". Ice, garnishes and
    // anything else the customer supplies belong in `garnish` or nowhere —
    // never here. Regression guard for the 2026-08-04 content pass.
    const supplies = /\bice\b|you supply|mint sprig|lime wheel|lemon wheel|orange slice|garnish|tajín|tajin|coarse salt/i;
    for (const line of recipe.ingredients) {
      expect(line, `"${line}" is not part of the kit`).not.toMatch(supplies);
    }
  });

  it.each(entries)('%s names the spirit category, not the generic word', (_handle, recipe) => {
    // Someone scanning the QR code on the dispenser needs "pour the full bottle
    // of tequila", not "pour the full bottle of spirit". Category words are
    // stable across a brand swap, so this costs nothing.
    for (const step of recipe.instructions) {
      expect(step, `step is still generic: "${step}"`).not.toMatch(/\bspirits?\b/i);
    }
  });

  it.each(entries)('%s keeps brand names out of the steps', (_handle, recipe) => {
    // Steps name categories ("tequila") and roles ("the mixer") so swapping a
    // bottle only means editing `ingredients`. Brands that ARE the drink
    // (blue curaçao) are fine.
    const brands = /Lunazul|Dulce Vida|Treaty Oak|Austin 85|Dripping Springs|Deep Eddy|Island Getaway|Bacardi|Largo Bay|Tito's|Fresh Victor|H-E-B|Topo Chico|Licor 43|St-Germain|Aperol|Leroux/i;
    for (const step of recipe.instructions) {
      expect(step, `step names a brand: "${step}"`).not.toMatch(brands);
    }
  });

  it.each(entries)('%s falls under a real spirit group', (_handle, recipe) => {
    // 'Other' is the unmapped bucket. The group is a search synonym, so a
    // recipe landing there quietly stops matching "whiskey" / "bubbles" —
    // a new spirit wording fails here instead of degrading search.
    const group = spiritGroupFor(recipe);
    expect(SPIRIT_GROUPS).toContain(group);
  });

  it('has no duplicate display names', () => {
    // Duplicates would produce two identical-looking cards in the A–Z grid.
    const names = entries.map(([, recipe]) => recipe.displayName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('flags every mocktail and no cocktail', () => {
    for (const recipe of Object.values(MOCKTAIL_RECIPES)) {
      expect(recipe.isMocktail).toBe(true);
    }
    for (const recipe of Object.values(COCKTAIL_RECIPES)) {
      expect(recipe.isMocktail).toBeUndefined();
    }
  });

  it('keeps the hidden July 4th recipes on file', () => {
    // /cocktail-recipes hides the seasonal trio, it does not delete them —
    // putting them back next summer should be a one-line change, not a rewrite.
    for (const handle of JULY4_KIT_HANDLES) {
      expect(KIT_RECIPES[handle], `${handle} recipe was deleted, not just hidden`).toBeDefined();
    }
  });

  it('looks recipes up by handle', () => {
    expect(getKitRecipe('lady-bird-margarita-serves-16')?.displayName).toBe('Lady Bird Margarita');
    expect(getKitRecipe('not-a-real-kit')).toBeUndefined();
  });
});
