/**
 * Recipes for the signature Austin kits — the house line batched on Fresh
 * Victor mixers and delivered with a dispenser. Keyed by Product.handle.
 * @module data/cocktail-recipes/signature-kits
 *
 * Authored from each product's own description (brands, flavor, ratio hints)
 * and cross-checked against its BundleComponent bill of materials for exact
 * bottle counts. Named-classic bundles live in ./classic-kits.ts, and the
 * alcohol-free kits in ./mocktails.ts.
 *
 * Two rules hold across every entry:
 *   - `ingredients` lists ONLY what ships in the box. No ice, no garnishes.
 *   - `instructions` name the spirit CATEGORY ("the full bottle of tequila")
 *     and everything else by role ("the mixer") — never a brand. Swapping which
 *     bottle of tequila a kit ships means editing `ingredients` alone.
 */

import type { KitRecipe } from './types';

/** The Fresh Victor–based signature kits, batched in the included dispenser. */
export const SIGNATURE_KIT_RECIPES: Record<string, KitRecipe> = {
  'lady-bird-margarita-serves-16': {
    displayName: 'Lady Bird Margarita',
    spirit: 'Tequila',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Lime wheels, and coarse salt for the rims',
    ingredients: [
      'Lunazul Blanco Tequila — 750ml bottle',
      'Fresh Victor Mexican Lime & Agave — 3 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of tequila (750ml) into the included dispenser.',
      'Add all three bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip:
      'Mix the tequila and the mixer a few hours ahead and keep it cold. Add the sparkling water and ice only when people show up and the last pour tastes like the first.',
  },

  'keep-austin-spicy-marg-serves-16': {
    displayName: 'Keep Austin Spicy Marg',
    spirit: 'Tequila',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Lime wheels and jalapeño slices',
    ingredients: [
      'Dulce Vida Pineapple Jalapeño Tequila — 750ml bottle',
      'Fresh Victor Mexican Lime & Agave — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of tequila (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip:
      'The heat builds as it sits. If your group runs mild, pour in half the tequila first, taste it, then add the rest.',
  },

  'cucumber-crush-margarita-serves-16': {
    displayName: 'Cucumber Crush Margarita',
    spirit: 'Tequila',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Cucumber ribbons and lime wheels',
    ingredients: [
      'Lunazul Blanco Tequila — 750ml bottle',
      'Fresh Victor Cucumber & Lime — 3 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of tequila (750ml) into the included dispenser.',
      'Add all three bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'Thin cucumber slices dropped into the dispenser look great and keep building flavor all afternoon.',
  },

  'lake-travis-ranch-water-serves-16': {
    displayName: 'Lake Travis Ranch Water',
    spirit: 'Tequila',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Lime wedges',
    ingredients: [
      'Lunazul Blanco Tequila — 750ml bottle',
      'Fresh Victor Mexican Lime & Agave — 16 oz bottle',
      'H-E-B Club Soda — 2 x 2L bottles',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of tequila (750ml) into the included dispenser.',
      'Add the bottle of mixer and stir.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong — this one is meant to drink light.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip:
      'The lightest kit we make, which is exactly why it works for an all-day lake or pool crowd. Keep the second soda bottle back to refresh the batch later.',
  },

  'barton-springs-mojito-serves-16': {
    displayName: 'Barton Springs Mojito',
    spirit: 'Rum',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Mint sprigs and lime wheels',
    ingredients: [
      'Island Getaway White Rum — 750ml bottle',
      'Fresh Victor Three Citrus & Mint Leaf — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of rum (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip:
      'No muddling required — the mint is already in the mixer. If you do add a mint sprig, slap it between your palms first to wake up the oils.',
  },

  'lake-day-daiquiri-serves-16': {
    displayName: 'Lake Day Daiquiri',
    spirit: 'Rum',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Fresh strawberries or lemon wheels',
    ingredients: [
      'Island Getaway White Rum — 750ml bottle',
      'Fresh Victor Strawberry & Lemon — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of rum (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'Want the frozen version? Skip the dispenser and blend one part of the batch with two cups of ice at a time.',
  },

  'mint-julep-smash-serves-16': {
    displayName: 'Mint Julep Smash',
    spirit: 'Bourbon',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Mint sprigs',
    ingredients: [
      'Treaty Oak Day Drinker Bourbon — 750ml bottle',
      'Fresh Victor Three Citrus & Mint Leaf — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of bourbon (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip:
      'The most spirit-forward kit on the list, so taste before you stop adding water. Crushed ice is worth the trouble — it chills fast and softens the bourbon as it melts.',
  },

  '6th-street-gold-rush-serves-16': {
    displayName: '6th Street Gold Rush',
    spirit: 'Whiskey',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Lemon wheels',
    ingredients: [
      'Austin 85 Light Whiskey — 750ml bottle',
      'Fresh Victor Mexican Lime & Agave — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of whiskey (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip:
      'Serve it short over a big cube for a classic Gold Rush, or long in a tall glass with extra water for something easier to drink in the heat.',
  },

  'eastside-gin-and-tonic-serves-16': {
    displayName: 'Eastside Gin & Tonic',
    spirit: 'Gin',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Cucumber ribbons and lime wheels',
    ingredients: [
      'Dripping Springs Artisan Gin — 750ml bottle',
      'Fresh Victor Cucumber & Lime — 2 x 16 oz bottles',
      'H-E-B Tonic Water — 1L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of gin (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add the full liter of tonic water, stir and taste. Top with more tonic or sparkling water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'A wedding-cocktail-hour favorite. It looks the part in a coupe or a big balloon glass.',
  },

  'citrus-gin-cooler-serves-16': {
    displayName: 'Citrus Gin Cooler',
    spirit: 'Gin',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Mint sprigs and orange or lemon wheels',
    ingredients: [
      'Dripping Springs Artisan Gin — 750ml bottle',
      'Fresh Victor Three Citrus & Mint Leaf — 2 x 16 oz bottles',
      'H-E-B Tonic Water — 1L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of gin (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add the full liter of tonic water, stir and taste. Top with more tonic or sparkling water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'Botanical gin plus citrus and mint is about as light as a gin drink gets — good for a group that says it does not like gin.',
  },

  'strawberry-gin-smash-serves-16': {
    displayName: 'Strawberry Gin Smash',
    spirit: 'Gin',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Fresh strawberries and lemon wheels',
    ingredients: [
      'Dripping Springs Artisan Gin — 750ml bottle',
      'Fresh Victor Strawberry & Lemon — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of gin (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'Halve a pint of strawberries into the dispenser. They soak up the gin and become the best part of the batch by the second round.',
  },

  'cool-cucumber-splash-serves-16': {
    displayName: 'Cool Cucumber Splash',
    spirit: 'Vodka',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Cucumber slices and lime wedges',
    ingredients: [
      'Deep Eddy Vodka — 750ml bottle',
      'Fresh Victor Cucumber & Lime — 2 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of vodka (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'The lowest-calorie kit we make — essentially a vodka soda with real cucumber and lime instead of syrup.',
  },

  'pink-party-lemonade-serves-16': {
    displayName: 'Pink Party Lemonade',
    spirit: 'Vodka',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Fresh strawberries and lemon wheels',
    ingredients: [
      'Deep Eddy Vodka — 750ml bottle',
      'Fresh Victor Strawberry & Lemon — 3 x 16 oz bottles',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of vodka (750ml) into the included dispenser.',
      'Add all three bottles of mixer and stir well.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'Our most-ordered boat drink. Frozen whole strawberries work better than ice cubes — nothing waters down.',
  },

  'soco-carajillo-latte': {
    displayName: 'SoCo Carajillo Latte',
    spirit: 'Vodka & Licor 43',
    yieldLabel: 'Serves 11',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'A dusting of cinnamon, or three espresso beans',
    ingredients: [
      'High Brew Cold Brew Coffee, Black Slightly Sweet — 48 oz',
      'Califia Farms Barista Oat Milk — 32 oz',
      'Licor 43 — 375ml bottle',
      "Tito's Handmade Vodka — 200ml bottle",
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the vodka and the liqueur into the included dispenser.',
      'Add the cold brew and the oat milk, and stir until fully blended — it should look like an iced latte.',
      'Keep the dispenser cold. Do not put ice in the batch itself; the milk waters down fast.',
      'Pour over a glass of fresh ice to serve.',
    ],
    proTip:
      'Chill it in the fridge or sit the dispenser in a tub of ice rather than icing the batch. About 7% ABV, so it drinks easier than it sounds.',
  },

  'strawberry-lemonade-vodka-kit-serves-16': {
    displayName: "Rocket's Red Glare Strawberry Lemonade",
    spirit: 'Vodka',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Sliced strawberries and lemon wheels',
    ingredients: [
      'Deep Eddy Lemon Vodka — 750ml bottle',
      'Fresh Victor Strawberry & Lemon — 2 x 16 oz bottles',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of lemon vodka (750ml) into the included dispenser.',
      'Add both bottles of mixer and stir well.',
      'Fill with ice, stir gently, and taste — the melt rounds it out as it sits.',
      'Serve over fresh ice.',
    ],
    proTip:
      'There is no sparkling water in this kit, so it pours rich and bright. A splash of soda or lemonade per glass stretches it further if the drink is too strong.',
  },

  'coconut-colada-kit-serves-16': {
    displayName: 'Star-Spangled Coconut Punch',
    spirit: 'Rum',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Pineapple wedges and toasted coconut',
    ingredients: [
      'Largo Bay Coquito Coconut Cream Liqueur — 750ml bottle',
      'Bacardi Superior White Rum — 750ml bottle',
      'Fresh Victor Pineapple & Ginger — 16 oz bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottles of rum and coconut cream liqueur (750ml each) into the included dispenser.',
      'Add the bottle of mixer and stir until fully blended and creamy. Chill for 30 minutes if you have the time.',
      'Fill with ice, stir gently, and taste. Add a splash of water if the drink is too strong.',
      'Serve over fresh ice.',
    ],
    proTip: 'Coconut cream separates as it sits. Give the dispenser a stir between rounds and every pour looks like the first one.',
  },

  'blue-margarita-kit-serves-16': {
    displayName: 'True Blue Margarita',
    spirit: 'Tequila',
    yieldLabel: 'Serves 16',
    prepTimeLabel: '5 minutes',
    prepTimeISO: 'PT5M',
    garnish: 'Lime wheels, and coarse salt for the rims',
    ingredients: [
      'Lunazul Blanco Tequila — 750ml bottle',
      'Fresh Victor Mexican Lime & Agave — 2 x 16 oz bottles',
      'Leroux Blue Curaçao — 750ml bottle, about half used',
      'H-E-B Club Soda — 2L bottle',
      '1.2-gallon drink dispenser',
    ],
    instructions: [
      'Pour the full bottle of tequila (750ml) into the included dispenser.',
      'Add both bottles of mixer, then about half the bottle of blue curaçao, stirring as you go until the color is where you want it.',
      'Add one liter of sparkling water, stir and taste. Add more water if the drink is too strong.',
      'Fill with ice, stir gently, and serve.',
    ],
    proTip: 'The recipe only needs about half the curaçao bottle — the rest is yours to keep. Add it slowly: the blue deepens fast.',
  },
};
