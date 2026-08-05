/**
 * The July 4th seasonal kit trio, by product handle.
 * @module lib/products/july4-kits
 *
 * Single source of truth for which kits are the holiday trio. Two pages care:
 * /cocktail-kits renders them as their own ordered section, and
 * /cocktail-recipes hides them from the year-round recipe lookup. Keeping the
 * list here stops the two from drifting apart.
 *
 * Order is deliberate — Red, then Blue, then Coconut.
 */
export const JULY4_KIT_HANDLES = [
  'strawberry-lemonade-vodka-kit-serves-16',
  'blue-margarita-kit-serves-16',
  'coconut-colada-kit-serves-16',
] as const;

/** Set form, for membership checks. */
export const JULY4_KIT_HANDLE_SET: ReadonlySet<string> = new Set(JULY4_KIT_HANDLES);
