import type { Package, ThemeColors } from '@/components/landing/types';

/**
 * Static reception-bar recipes for /wedding-drink-calculator. All three
 * tiers are sized for the same 100-guest reception — they differ on
 * quality and inclusions, not on headcount. Letting visitors compare
 * apples-to-apples on price is the Wes "three packages, middle featured"
 * pattern executed properly.
 *
 * Item lists are deliberately quality/style descriptors only — no bottle
 * counts, no case counts, no non-consumables (cups, glassware, bar tools).
 * Operator's call: keeps the focus on the alcohol and avoids advertising
 * inclusions we may not always carry.
 *
 * Prices are operator-set marketing bundles; actual checkout happens via
 * the quote form (admin builds the final invoice line items).
 */
export const RECEPTION_PACKAGES: Package[] = [
  {
    name: 'Beer & Wine',
    serves: '100 guests',
    price: '$1,199',
    save: 'Best price',
    blurb: 'A clean, classic bar for couples keeping it simple — no spirits, no surprises.',
    items: [
      'House red + white wine',
      'Beer + seltzer variety',
      'Add Prosecco for the toast (+$199)',
    ],
    image: '/images/services/weddings/boho-hill-country-2.webp',
    featured: false,
  },
  {
    name: 'Standard Bar',
    serves: '100 guests',
    price: '$1,799',
    save: 'Most booked',
    blurb: 'Full open bar — beer, wine, spirits, signature cocktail, champagne for toasts. The default for most Austin weddings.',
    items: [
      'Curated red + white wine',
      'Champagne toast for the room',
      'Beer + seltzer variety',
      'Premium spirits — vodka, tequila, whiskey, gin',
      'One signature cocktail kit (your pick)',
    ],
    image: '/images/services/weddings/outdoor-bar-setup-travis.webp',
    featured: true,
  },
  {
    name: 'Top Shelf + Toast',
    serves: '100 guests',
    price: '$2,199',
    save: 'Premium tier',
    blurb: 'Top-shelf spirits, sommelier-curated wines, and Veuve for the toast — the upgrade most planners recommend for ranches and Hill Country venues.',
    items: [
      'Sommelier-curated red + white wine',
      'Veuve Clicquot for the toast',
      'Beer + seltzer variety',
      'Top-shelf spirits — Casamigos, Grey Goose, Woodford Reserve',
      'Two signature cocktail kits',
    ],
    image: '/images/services/weddings/signature-cocktails-closeup.webp',
    featured: false,
  },
];

/**
 * Wedding-themed palette for the section components on the calculator page.
 * Champagne gold over deep espresso — matches `weddingConfig.theme` so the
 * extracted Wes section components blend with the rest of the site.
 */
export const WEDDING_THEME: ThemeColors = {
  primary: '#C8A96A',
  primaryHover: '#B59456',
  primaryText: '#2A2218',
  navy: '#2A2218',
  cream: '#FBF6EC',
  blue: '#7E5A40',
};
