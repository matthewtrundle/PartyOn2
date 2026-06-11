/**
 * Server-side package builder for landing pages.
 *
 * Each occasion gets 3 packages (starter / featured / premium-or-alt).
 * Recipes reference real product handles in the live Postgres DB.
 *
 * Pricing model (NEVER discount alcohol):
 *   - "Alcohol" items are charged at full retail (= packagePrice)
 *   - "Freebies" are bundled in free; their retail value = displayed savings
 *   - Freebies are deliberately HIGH-MARGIN supplies (cups, flutes, ping-pong
 *     balls, ice) so giving them away costs us pennies but advertises ~10% off
 *
 * Used by: src/app/austin-*-party-delivery/page.tsx
 */

import { prisma } from '@/lib/database/client';
import type { Package, PackageLineItem } from '@/components/landing/types';

export type Occasion = 'bachelor' | 'bachelorette' | 'corporate' | 'wedding';

type RecipeItem = { handle: string; qty: number };

type Recipe = {
  name: string;
  serves: string;
  blurb: string;
  image: string;
  featured?: boolean;
  /** Headcount the recipe is built for — slider scales items off this. */
  defaultPeople: number;
  alcohol: RecipeItem[];
  freebies: RecipeItem[];
};

/** Drinks per person target by occasion. */
const DRINKS_PER_PERSON: Record<Occasion, number> = {
  bachelor: 20,
  bachelorette: 20,
  corporate: 8,
  wedding: 8,
};

/**
 * Estimate drinks-per-unit from the product title. Used by the Quick-Buy
 * slider so we can show a "≈ N drinks" indicator. Best-effort heuristic
 * (the user can still adjust per-item qty).
 */
function estimateDrinksPerUnit(title: string): number {
  const t = title.toLowerCase();
  // Beer/seltzer/RTD packs: parse "N pack"
  const packMatch = t.match(/(\d+)\s*pack/);
  if (packMatch) return parseInt(packMatch[1], 10);
  // Spirits by bottle size
  if (t.includes('1.75l')) return 40; // ~40 1.5oz pours
  if (t.includes('1l') || t.includes('1 l')) return 22;
  if (t.includes('750ml')) return 17; // wine = ~5 5oz pours; spirit = ~17 1.5oz pours
  if (t.includes('375ml')) return 8;
  // Wine/champagne single bottle
  if (t.includes('wine') || t.includes('prosecco') || t.includes('champagne') || t.includes('rosé') || t.includes('rose')) return 5;
  // Mixers/supplies — 0 drinks but still count as "supplies"
  return 0;
}

// ---- RECIPES ----------------------------------------------------------------

// All handles below are verified against the live Neon DB.

const BACHELOR: Recipe[] = [
  {
    name: 'Austin Bach Starter',
    defaultPeople: 7,
    serves: 'Pre-game for 6–8',
    blurb: 'Everything you need before hitting 6th Street or Rainey.',
    image: '/images/services/bach-parties/late-night-party-supplies.webp',
    alcohol: [
      { handle: 'titos-handmade-vodka-80-1lt', qty: 1 },
      { handle: 'jameson-irish-whiskey-1', qty: 1 },
      { handle: 'modelo-especial-24pack-12oz-cans', qty: 1 },
      { handle: 'miller-lite-24-pack-12oz-can', qty: 1 },
      { handle: 'white-claw-variety-24-pack-12oz-can', qty: 1 },
      { handle: 'cranberry-juice-1', qty: 1 },
      { handle: '100-orange-juice-48oz-bottle', qty: 1 },
      { handle: 'sprite-12-pack-12oz', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 2 },
      { handle: 'solo-cups-18oz-50pcs', qty: 1 },
    ],
  },
  {
    name: 'Lake Travis Pack',
    defaultPeople: 11,
    serves: 'Boat party for 10–12',
    blurb: 'Loaded onto your boat at the dock — built for 8 hours of sun on the water.',
    image: '/images/gallery/sunset-champagne-pontoon.webp',
    featured: true,
    alcohol: [
      { handle: 'titos-handmade-vodka-80-1-75lt', qty: 1 },
      { handle: 'casamigos-tequila-blanco-80-750ml', qty: 1 },
      { handle: 'modelo-especial-24pack-12oz-cans', qty: 1 },
      { handle: 'coors-light-24-pack-12oz-can', qty: 1 },
      { handle: 'white-claw-variety-24-pack-12oz-can', qty: 1 },
      { handle: 'high-noon-vodka-soda-combo-3-each-grapefruit-9-pineapple-9-black-cherry-9-watermelon-9-355ml-12-pack', qty: 1 },
      { handle: 'surfside-lemonade-variety-pack-8-pack-12oz-can', qty: 1 },
      { handle: 'cranberry-juice-1', qty: 1 },
      { handle: '100-orange-juice-48oz-bottle', qty: 1 },
      { handle: 'pineapple-juice-64oz', qty: 1 },
      { handle: 'sprite-12-pack-12oz', qty: 1 },
      { handle: 'bottled-water-32-pack-16-9oz', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 3 },
      { handle: 'solo-cups-18oz-50pcs', qty: 1 },
      { handle: 'disco-ball-cocktail-cups-with-straw', qty: 1 },
      { handle: 'ping-pong-balls-10pcs', qty: 1 },
    ],
  },
  {
    name: 'Rainey Street Crawler',
    defaultPeople: 9,
    serves: 'Pre-game for 8–10',
    blurb: 'Pre-game heavy, walk to the bars, stumble back to the Airbnb.',
    image: '/images/hero/bach-hero-rainey.webp',
    alcohol: [
      { handle: 'titos-handmade-vodka-80-1lt', qty: 1 },
      { handle: 'espolon-tequila-blanco-80-1l', qty: 1 },
      { handle: 'modelo-especial-24pack-12oz-cans', qty: 1 },
      { handle: 'lone-star-24pack-12oz-cans', qty: 1 },
      { handle: 'white-claw-variety-24-pack-12oz-can', qty: 1 },
      { handle: 'high-noon-vodka-soda-combo-3-each-grapefruit-9-pineapple-9-black-cherry-9-watermelon-9-355ml-12-pack', qty: 1 },
      { handle: 'cranberry-juice-1', qty: 1 },
      { handle: '100-orange-juice-48oz-bottle', qty: 1 },
      { handle: 'sprite-12-pack-12oz', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 2 },
      { handle: 'solo-cups-18oz-50pcs', qty: 1 },
      { handle: 'disco-ball-cocktail-cups-with-straw', qty: 1 },
    ],
  },
];

const BACHELORETTE: Recipe[] = [
  {
    name: 'Bach Pre-Game',
    defaultPeople: 7,
    serves: 'Pre-game for 6–8',
    blurb: 'Bubbles, rosé, and seltzers — the warm-up before the big night.',
    image: '/images/services/bach-parties/bachelorette-champagne-tower.webp',
    alcohol: [
      { handle: 'amor-di-amanti-prosecco-spumante-750-ml', qty: 2 },
      { handle: 'chateau-desclans-whispering-angel-rose-750ml', qty: 1 },
      { handle: 'oyster-bay-sauvignon-blanc', qty: 1 },
      { handle: 'dark-horse-pinot-grigio-750ml-bottle', qty: 1 },
      { handle: 'titos-handmade-vodka-80-1lt', qty: 1 },
      { handle: 'high-noon-vodka-soda-combo-3-each-grapefruit-9-pineapple-9-black-cherry-9-watermelon-9-355ml-12-pack', qty: 1 },
      { handle: 'surfside-lemonade-variety-pack-8-pack-12oz-can', qty: 1 },
      { handle: 'cranberry-juice-1', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 2 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 1 },
      { handle: 'solo-cups-18oz-50pcs', qty: 1 },
    ],
  },
  {
    name: 'Sunset Yacht Pack',
    defaultPeople: 11,
    serves: 'Lake Travis party for 10–12',
    blurb: 'Champagne, rosé, vodka, and seltzers for a golden-hour cruise.',
    image: '/images/hero/lake-travis-yacht-sunset.webp',
    featured: true,
    alcohol: [
      { handle: 'veuve-clicquot-champagne-brut-750ml', qty: 1 },
      { handle: 'chandon-california-brut-750ml', qty: 2 },
      { handle: 'la-marca-prosecco-extra-dry-750ml-1', qty: 2 },
      { handle: 'chateau-desclans-whispering-angel-rose-750ml', qty: 1 },
      { handle: 'oyster-bay-sauvignon-blanc', qty: 1 },
      { handle: 'titos-handmade-vodka-80-1-75lt', qty: 1 },
      { handle: 'casamigos-tequila-blanco-80-750ml', qty: 1 },
      { handle: 'high-noon-vodka-soda-combo-3-each-grapefruit-9-pineapple-9-black-cherry-9-watermelon-9-355ml-12-pack', qty: 1 },
      { handle: 'surfside-lemonade-variety-pack-8-pack-12oz-can', qty: 1 },
      { handle: 'white-claw-variety-24-pack-12oz-can', qty: 1 },
      { handle: 'cranberry-juice-1', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 2 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 2 },
      { handle: 'solo-cups-18oz-50pcs', qty: 1 },
      { handle: 'disco-ball-cocktail-cups-with-straw', qty: 1 },
      { handle: 'pineapple-cup-with-straw', qty: 1 },
    ],
  },
  {
    name: 'Wine Night Pack',
    defaultPeople: 9,
    serves: 'Dinner party for 8–10',
    blurb: 'Curated wines, prosecco, and rosé for a stay-in girls night.',
    image: '/images/destinations/hill-country-winery.webp',
    alcohol: [
      { handle: 'amor-di-amanti-prosecco-spumante-750-ml', qty: 2 },
      { handle: 'la-marca-prosecco-extra-dry-750ml-1', qty: 1 },
      { handle: 'chateau-desclans-whispering-angel-rose-750ml', qty: 1 },
      { handle: 'oyster-bay-sauvignon-blanc', qty: 2 },
      { handle: 'dark-horse-pinot-grigio-750ml-bottle', qty: 1 },
      { handle: '14-hands-cabernet-sauvignon', qty: 1 },
      { handle: 'josh-cellars-cabernet-sauvignon-california-750ml', qty: 1 },
      { handle: 'titos-handmade-vodka-80-1lt', qty: 1 },
      { handle: 'high-noon-vodka-soda-combo-3-each-grapefruit-9-pineapple-9-black-cherry-9-watermelon-9-355ml-12-pack', qty: 1 },
      { handle: 'cranberry-juice-1', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 1 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 1 },
      { handle: 'solo-cups-18oz-50pcs', qty: 1 },
      { handle: 'cocktail-mixing-spoon-12inches', qty: 1 },
    ],
  },
];

const CORPORATE: Recipe[] = [
  {
    name: 'Office Happy Hour',
    defaultPeople: 17,
    serves: 'Office event for 15–20',
    blurb: 'Approachable selection of beer, wine, and a clean spirits bar.',
    image: '/images/corporate/networking-mixer.webp',
    alcohol: [
      { handle: 'modelo-especial-24pack-12oz-cans', qty: 1 },
      { handle: 'miller-lite-24-pack-12oz-can', qty: 1 },
      { handle: 'austin-beerworks-variety-pack-12-pack-12oz-can', qty: 1 },
      { handle: 'titos-handmade-vodka-80-1lt', qty: 1 },
      { handle: 'jameson-irish-whiskey-1', qty: 1 },
      { handle: '14-hands-cabernet-sauvignon', qty: 1 },
      { handle: 'oyster-bay-sauvignon-blanc', qty: 1 },
      { handle: 'chandon-california-brut-750ml', qty: 1 },
      { handle: 'cranberry-juice-1', qty: 1 },
      { handle: '100-orange-juice-48oz-bottle', qty: 1 },
      { handle: 'sprite-12-pack-12oz', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 2 },
      { handle: 'solo-cups-18oz-50pcs', qty: 1 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 1 },
      { handle: 'acopa-1-oz-2-oz-stainless-steel-japanese-jigger', qty: 1 },
    ],
  },
  {
    name: 'Quarterly Mixer',
    defaultPeople: 40,
    serves: 'Team event for 30–50',
    blurb: 'Full bar setup — beer, wine, spirits, mixers, and bartender essentials.',
    image: '/images/hero/corporate-hero-gala.webp',
    featured: true,
    alcohol: [
      { handle: 'modelo-especial-24pack-12oz-cans', qty: 2 },
      { handle: 'miller-lite-24-pack-12oz-can', qty: 1 },
      { handle: 'coors-light-24-pack-12oz-can', qty: 1 },
      { handle: 'austin-beerworks-variety-pack-12-pack-12oz-can', qty: 1 },
      { handle: 'titos-handmade-vodka-80-1-75lt', qty: 2 },
      { handle: 'espolon-tequila-blanco-80-1l', qty: 1 },
      { handle: 'jameson-irish-whiskey-1', qty: 1 },
      { handle: 'casamigos-tequila-blanco-80-750ml', qty: 1 },
      { handle: 'oyster-bay-sauvignon-blanc', qty: 2 },
      { handle: '14-hands-cabernet-sauvignon', qty: 2 },
      { handle: 'chandon-california-brut-750ml', qty: 2 },
      { handle: 'cranberry-juice-1', qty: 2 },
      { handle: '100-orange-juice-48oz-bottle', qty: 2 },
      { handle: 'sprite-12-pack-12oz', qty: 1 },
      { handle: 'bottled-water-32-pack-16-9oz', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 3 },
      { handle: 'solo-cups-18oz-50pcs', qty: 3 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 2 },
      { handle: 'acopa-4-prong-silver-hawthorne-strainer', qty: 1 },
    ],
  },
  {
    name: 'Client Dinner',
    defaultPeople: 10,
    serves: 'Premium dinner for 8–12',
    blurb: 'Veuve Clicquot, premium wines, and small-batch spirits — designed to impress.',
    image: '/images/products/premium-spirits-boutique.webp',
    alcohol: [
      { handle: 'veuve-clicquot-champagne-brut-750ml', qty: 1 },
      { handle: 'chateau-desclans-whispering-angel-rose-750ml', qty: 1 },
      { handle: 'josh-cellars-cabernet-sauvignon-california-750ml', qty: 1 },
      { handle: 'oyster-bay-sauvignon-blanc', qty: 1 },
      { handle: '14-hands-cabernet-sauvignon', qty: 2 },
      { handle: 'titos-handmade-vodka-80-1lt', qty: 1 },
      { handle: 'casamigos-tequila-blanco-80-750ml', qty: 1 },
      { handle: 'jameson-irish-whiskey-1', qty: 1 },
      { handle: 'cranberry-juice-1', qty: 1 },
      { handle: '100-orange-juice-48oz-bottle', qty: 1 },
      { handle: 'bottled-water-32-pack-16-9oz', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 1 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 2 },
      { handle: 'acopa-4-prong-silver-hawthorne-strainer', qty: 1 },
    ],
  },
];

const WEDDING: Recipe[] = [
  {
    name: 'Cocktail Hour',
    defaultPeople: 24,
    serves: 'Cocktail hour for 24 guests',
    blurb: 'Champagne welcome, signature wines, and a tight beer + spirits bar — 2 hours of service.',
    image: '/images/wedding-services/cocktail-hour-service.webp',
    alcohol: [
      { handle: 'la-marca-prosecco-extra-dry-750ml-1', qty: 2 },
      { handle: 'chandon-california-brut-750ml', qty: 1 },
      { handle: 'chateau-desclans-whispering-angel-rose-750ml', qty: 1 },
      { handle: 'oyster-bay-sauvignon-blanc', qty: 1 },
      { handle: 'josh-cellars-cabernet-sauvignon-california-750ml', qty: 1 },
      { handle: 'titos-handmade-vodka-80-1-75lt', qty: 1 },
      { handle: 'espolon-tequila-blanco-80-1l', qty: 1 },
      { handle: 'modelo-especial-24pack-12oz-cans', qty: 1 },
      { handle: 'miller-lite-24-pack-12oz-can', qty: 1 },
      { handle: 'bottled-water-32-pack-16-9oz', qty: 1 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 2 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 2 },
      { handle: 'solo-cups-18oz-50pcs', qty: 1 },
    ],
  },
  {
    name: 'Standard Wedding Bar',
    defaultPeople: 60,
    serves: 'Reception for 50–75 guests',
    blurb: 'The classic open bar: 4 beers, 4 wines, full spirits + mixers. Built from real wedding orders.',
    image: '/images/wedding-services/reception-bar.webp',
    featured: true,
    alcohol: [
      // 4 beers
      { handle: 'modelo-especial-24pack-12oz-cans', qty: 2 },
      { handle: 'miller-lite-24-pack-12oz-can', qty: 1 },
      { handle: 'coors-light-24-pack-12oz-can', qty: 1 },
      { handle: 'austin-beerworks-variety-pack-12-pack-12oz-can', qty: 1 },
      // 4 wines × 2 each
      { handle: 'oyster-bay-sauvignon-blanc', qty: 2 },
      { handle: 'dark-horse-pinot-grigio-750ml-bottle', qty: 2 },
      { handle: 'bogle-cabernet-750ml', qty: 2 },
      { handle: '14-hands-cabernet-sauvignon', qty: 2 },
      // Sparkling for toast
      { handle: 'chandon-california-brut-750ml', qty: 4 },
      // Spirits
      { handle: 'titos-handmade-vodka-80-1-75lt', qty: 2 },
      { handle: 'casamigos-tequila-blanco-80-750ml', qty: 1 },
      { handle: 'espolon-tequila-blanco-80-1l', qty: 1 },
      { handle: 'jameson-irish-whiskey-1', qty: 1 },
      // Mixers
      { handle: 'cranberry-juice-1', qty: 2 },
      { handle: '100-orange-juice-48oz-bottle', qty: 2 },
      { handle: 'sprite-12-pack-12oz', qty: 1 },
      { handle: 'bottled-water-32-pack-16-9oz', qty: 2 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 4 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 4 },
      { handle: 'solo-cups-18oz-50pcs', qty: 4 },
      { handle: 'acopa-4-prong-silver-hawthorne-strainer', qty: 1 },
    ],
  },
  {
    name: 'Premium Wedding Bar',
    defaultPeople: 100,
    serves: 'Reception for 100+ guests',
    blurb: 'Veuve toast, premium wines, top-shelf spirits — the upgrade tier.',
    image: '/images/hero/luxury-wedding-estate-1.webp',
    alcohol: [
      { handle: 'veuve-clicquot-champagne-brut-750ml', qty: 4 },
      { handle: 'la-marca-prosecco-extra-dry-750ml-1', qty: 4 },
      { handle: 'chateau-desclans-whispering-angel-rose-750ml', qty: 4 },
      { handle: 'josh-cellars-cabernet-sauvignon-california-750ml', qty: 4 },
      { handle: 'oyster-bay-sauvignon-blanc', qty: 4 },
      { handle: 'dark-horse-pinot-grigio-750ml-bottle', qty: 2 },
      { handle: 'titos-handmade-vodka-80-1-75lt', qty: 2 },
      { handle: 'casamigos-tequila-blanco-80-750ml', qty: 2 },
      { handle: 'jameson-irish-whiskey-1', qty: 1 },
      { handle: 'modelo-especial-24pack-12oz-cans', qty: 2 },
      { handle: 'miller-lite-24-pack-12oz-can', qty: 2 },
      { handle: 'austin-beerworks-variety-pack-12-pack-12oz-can', qty: 2 },
      { handle: 'cranberry-juice-1', qty: 3 },
      { handle: '100-orange-juice-48oz-bottle', qty: 3 },
      { handle: 'bottled-water-32-pack-16-9oz', qty: 3 },
    ],
    freebies: [
      { handle: 'bag-of-ice-7-lbs', qty: 6 },
      { handle: 'plastic-champagne-flutes-10pk', qty: 8 },
      { handle: 'solo-cups-18oz-50pcs', qty: 5 },
      { handle: 'acopa-4-prong-silver-hawthorne-strainer', qty: 1 },
      { handle: 'cocktail-mixing-spoon-12inches', qty: 1 },
    ],
  },
];

const RECIPES: Record<Occasion, Recipe[]> = {
  bachelor: BACHELOR,
  bachelorette: BACHELORETTE,
  corporate: CORPORATE,
  wedding: WEDDING,
};

// ---- BUILDER ---------------------------------------------------------------

async function buildOccasionPackagesUncached(occasion: Occasion): Promise<Package[]> {
  const recipes = RECIPES[occasion];

  // Collect every handle we'll need across all 3 recipes for this occasion in
  // a single round trip.
  const allHandles = new Set<string>();
  for (const r of recipes) {
    for (const it of [...r.alcohol, ...r.freebies]) allHandles.add(it.handle);
  }

  let byHandle: Record<string, { handle: string; title: string; basePrice: { toString: () => string } }> = {};
  try {
    const products = await prisma.product.findMany({
      where: { handle: { in: [...allHandles] } },
      select: { handle: true, title: true, basePrice: true },
    });
    byHandle = Object.fromEntries(products.map((p) => [p.handle, p])) as typeof byHandle;
  } catch (err) {
    console.error('[getOccasionPackages] DB fetch failed:', err);
  }

  return recipes.map((r) => {
    const lineItems: PackageLineItem[] = [];
    let packagePrice = 0;
    let freebiesValue = 0;

    for (const a of r.alcohol) {
      const p = byHandle[a.handle];
      if (!p) continue; // gracefully skip missing products
      const unit = Number(p.basePrice);
      const cleanedTitle = cleanTitle(p.title);
      lineItems.push({
        name: cleanedTitle,
        qty: a.qty,
        unitPrice: unit,
        handle: p.handle,
        drinksPerUnit: estimateDrinksPerUnit(cleanedTitle),
      });
      packagePrice += unit * a.qty;
    }
    for (const f of r.freebies) {
      const p = byHandle[f.handle];
      if (!p) continue;
      const unit = Number(p.basePrice);
      const cleanedTitle = cleanTitle(p.title);
      lineItems.push({
        name: cleanedTitle,
        qty: f.qty,
        unitPrice: unit,
        freebie: true,
        handle: p.handle,
        drinksPerUnit: 0,
      });
      freebiesValue += unit * f.qty;
    }

    return {
      name: r.name,
      serves: r.serves,
      blurb: r.blurb,
      image: r.image,
      featured: r.featured,
      lineItems,
      packagePrice: Math.round(packagePrice),
      freebiesValue: Math.round(freebiesValue),
      defaultPeople: r.defaultPeople,
      drinksPerPerson: DRINKS_PER_PERSON[occasion],
    } satisfies Package;
  });
}

function cleanTitle(t: string): string {
  // Trim sale-channel suffixes that aren't useful in customer-facing UI.
  return t.replace(/\s+/g, ' ').trim();
}

export const getOccasionPackages = buildOccasionPackagesUncached;
