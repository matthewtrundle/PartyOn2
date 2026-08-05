/**
 * Recipes for the named-classic cocktail bundles — the drinks people already
 * know by name, built per glass or in a pitcher. Keyed by Product.handle.
 * @module data/cocktail-recipes/classic-kits
 *
 * These predate the Fresh Victor signature line and carry no BundleComponent
 * rows, so their contents come straight from the product description's
 * "Kit Includes" list.
 *
 * Same two rules as the signature kits: `ingredients` is only what ships, and
 * `instructions` name the spirit category rather than the brand.
 */

import type { KitRecipe } from './types';

/** Aperol Spritz, Hugo Spritz, Espresso Martini, Paloma and Vodka Lemonade. */
export const CLASSIC_KIT_RECIPES: Record<string, KitRecipe> = {
  'aperol-spritz-party-pitcher-kit-16-drinks': {
    displayName: 'Aperol Spritz',
    spirit: 'Aperol & prosecco',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Orange slices',
    ingredients: [
      'Aperol Aperitivo — 750ml bottle',
      'Amor Di Amanti Italian Prosecco — 2 x 750ml bottles',
      'Topo Chico Sparkling Water — 1.5L bottle',
    ],
    instructions: [
      'Fill a wine glass with ice — the spritz is built in the glass, not batched.',
      'Pour three parts prosecco, then two parts aperitivo. Roughly 3 oz prosecco to 2 oz aperitivo.',
      'Add a splash of sparkling water, stir once, and taste. More sparkling water if the drink is too strong.',
      'Serve immediately, while it is still cold and bubbly.',
    ],
    proTip: 'The classic 3-2-1 build: three parts prosecco, two parts aperitivo, one splash of soda. Keep the prosecco on ice — a warm spritz falls flat.',
  },

  'hugo-spritz-cocktail-bundle': {
    displayName: 'Hugo Spritz',
    spirit: 'St-Germain & prosecco',
    yieldLabel: 'Serves about 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Mint sprigs and lime wheels',
    ingredients: [
      'St-Germain Elderflower Liqueur — 375ml bottle',
      'Amor Di Amanti Italian Prosecco — 2 x 750ml bottles',
      'Topo Chico Sparkling Water — 17 oz bottle',
    ],
    instructions: [
      'Fill a wine glass with ice and add about 1 oz of the liqueur.',
      'Top with roughly 3 oz of chilled prosecco.',
      'Add a splash of sparkling water, stir once gently, and taste. More sparkling water if the drink is too strong.',
      'Serve right away.',
    ],
    proTip: 'Lighter and more floral than an Aperol Spritz. If you add a mint sprig, slap it between your palms first — that is where the aroma comes from.',
  },

  'espresso-martini': {
    displayName: 'Espresso Martini',
    spirit: 'Vodka & coffee liqueur',
    yieldLabel: 'Serves about 16',
    prepTimeLabel: '3 minutes per round',
    prepTimeISO: 'PT3M',
    garnish: 'Three espresso beans per glass',
    ingredients: [
      'Deep Eddy Vodka — 750ml bottle',
      'Caffe Del Fuego Coffee Liqueur — 750ml bottle',
      'High Brew Cold Brew Coffee — 2 x 8 oz cans',
      'Simple syrup',
    ],
    instructions: [
      'This one is shaken per round, not batched — the foam is the whole point.',
      'For two drinks: add 3 oz vodka, 2 oz coffee liqueur, 2 oz cold brew and a bar spoon of simple syrup to a shaker with ice.',
      'Shake hard for a full 15 seconds. That is what builds the crema on top.',
      'Strain into chilled coupe glasses and serve.',
    ],
    proTip: 'Shake harder and longer than feels necessary, and chill the glasses in the freezer ahead of time. Those two things are the difference between a good and a great espresso martini.',
  },

  'perfect-paloma-cocktail-kit': {
    displayName: 'Perfect Paloma',
    spirit: 'Tequila',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Lime slices, and Tajín for the rims',
    ingredients: [
      'Dulce Vida Blanco Tequila — 750ml bottle',
      'Liber & Co. Grapefruit Cordial — 9 oz bottle',
      'Topo Chico Sparkling Water — 1.5L bottle',
      '1-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of tequila (750ml) into the included dispenser.',
      'Add the full bottle of grapefruit cordial and stir.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'A Tajín rim is what makes a paloma taste like Mexico instead of like grapefruit soda. Worth picking up a bottle.',
  },

  'vodka-lemonade-cocktail-kit': {
    displayName: 'Vodka Lemonade',
    spirit: 'Vodka',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '3 minutes',
    prepTimeISO: 'PT3M',
    garnish: 'Lemon wheels',
    ingredients: [
      'Vodka — 1L bottle',
      'Lemonade — 89 oz bottle',
      '1-gallon drink dispenser with leakproof spout',
    ],
    instructions: [
      'Pour the full bottle of vodka (1L) into the included dispenser.',
      'Add the full bottle of lemonade, stir and taste. Add water or more lemonade if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'The simplest kit we sell and the hardest to get wrong. Fresh mint or sliced strawberries in the dispenser dress it up if you want.',
  },
};
