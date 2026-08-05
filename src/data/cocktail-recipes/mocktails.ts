/**
 * Curated recipes for the non-alcoholic kits, keyed by Product.handle.
 * @module data/cocktail-recipes/mocktails
 *
 * Same authoring rules as the alcoholic kits — description first, bottle
 * counts confirmed against the bill of materials, `ingredients` limited to
 * what actually ships, and `instructions` written by role rather than brand.
 * Every entry sets `isMocktail: true`, which drives the badge and the
 * "non-alcoholic" search keywords on /cocktail-recipes.
 */

import type { KitRecipe } from './types';

/** Every alcohol-free kit in the `cocktail-kits` category. */
export const MOCKTAIL_RECIPES: Record<string, KitRecipe> = {
  'zilker-lime-fizz-mocktail-serves-16': {
    displayName: 'Zilker Lime Fizz',
    spirit: 'Non-alcoholic',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '3 minutes',
    prepTimeISO: 'PT3M',
    isMocktail: true,
    garnish: 'Lime wheels, and coarse salt for the rims',
    ingredients: [
      'Fresh Victor Mexican Lime & Agave — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2 x 2L bottles',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour both bottles of mixer into the included dispenser.',
      'Add one liter of sparkling water, stir and taste. Add more water if you want it lighter.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'Salt the rim and nobody can tell it is the alcohol-free option, which is usually the whole point.',
  },

  'cucumber-lime-spritz-mocktail-serves-16': {
    displayName: 'Cucumber Lime Spritz',
    spirit: 'Non-alcoholic',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '3 minutes',
    prepTimeISO: 'PT3M',
    isMocktail: true,
    garnish: 'Cucumber slices and lime wedges',
    ingredients: [
      'Fresh Victor Cucumber & Lime — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2 x 2L bottles',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour both bottles of mixer into the included dispenser.',
      'Add one liter of sparkling water, stir and taste. Add more water if you want it lighter.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'Thin cucumber ribbons floating in the dispenser make it the best-looking drink on the table, alcohol or not.',
  },

  'mint-to-be-mocktail-serves-16': {
    displayName: 'Mint to Be',
    spirit: 'Non-alcoholic',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '3 minutes',
    prepTimeISO: 'PT3M',
    isMocktail: true,
    garnish: 'Mint sprigs and lime wheels',
    ingredients: [
      'Fresh Victor Three Citrus & Mint Leaf — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2 x 2L bottles',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour both bottles of mixer into the included dispenser.',
      'Add one liter of sparkling water, stir and taste. Add more water if you want it lighter.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'Pair it with the Barton Springs Mojito at the same party. Same glass, same garnish, and nobody has to announce which one they are drinking.',
  },

  'strawberry-sunset-mocktail-serves-16': {
    displayName: 'Strawberry Sunset',
    spirit: 'Non-alcoholic',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '3 minutes',
    prepTimeISO: 'PT3M',
    isMocktail: true,
    garnish: 'Fresh strawberries and lemon wheels',
    ingredients: [
      'Fresh Victor Strawberry & Lemon — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2 x 2L bottles',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour both bottles of mixer into the included dispenser.',
      'Add one liter of sparkling water, stir and taste. Add more water if you want it lighter.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'The kid-friendly pick at a family party, and the one guests reach for when they are pacing themselves.',
  },

  'arnold-palmer-non-alcoholic-gallon-dispenser-kit-25-drinks-per-dispenser': {
    displayName: 'Arnold Palmer',
    spirit: 'Non-alcoholic',
    yieldLabel: 'Makes about 25 drinks',
    prepTimeLabel: '3 minutes',
    prepTimeISO: 'PT3M',
    isMocktail: true,
    garnish: 'Lemon wheels',
    ingredients: [
      'Unsweet Tea — 64 oz bottle',
      'Lemonade — 64 oz bottle',
      '1.2-gallon drink dispenser with leakproof spout',
    ],
    instructions: [
      'Pour the full bottle of unsweet tea and the full bottle of lemonade into the included dispenser.',
      'Stir and taste. More tea for a drier drink, more lemonade for a sweeter one.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'No alcohol in the kit, so it works for any crowd — a bottle of vodka or bourbon on the side turns it into a spiked Arnold Palmer for the adults.',
  },
};
