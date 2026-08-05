/**
 * Sticky search bar for /cocktail-recipes.
 * @module components/cocktail-recipes/RecipeFilters
 *
 * Search is the only control on the page by design: a visitor arrives from the
 * QR code on a dispenser already knowing which kit they are holding, so the
 * fastest path is type-the-name, not browse-by-category.
 *
 * Presentational — every value is controlled by RecipeLookup.
 */

'use client';

import type { ReactElement, RefObject } from 'react';

interface RecipeFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  /** e.g. "Showing 6 of 27 kits" — rendered beside the box, or under it on mobile. */
  countLabel: string;
}

export default function RecipeFilters({ query, onQueryChange, searchRef, countLabel }: RecipeFiltersProps): ReactElement {
  // Sticky offset must track the nav's own bar (h-14 md:h-16), not the 96px
  // figure CLAUDE.md quotes for page-header padding. /design-example spells this
  // out: "Sticky elements: top-14 md:top-16 (NOT top-24)". Getting it wrong
  // leaves a 30-40px window that page content scrolls through.
  return (
    <div className="sticky top-14 md:top-16 z-40 border-b border-gray-200 bg-white py-3">
      <div className="container-custom">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search your kit — try “margarita” or “tequila”"
              aria-label="Search cocktail kit recipes"
              className="input-premium pl-10"
            />
          </div>
          <p className="hidden shrink-0 text-sm text-gray-500 sm:block" aria-live="polite">
            {countLabel}
          </p>
        </div>

        <p className="mt-2 text-sm text-gray-500 sm:hidden" aria-live="polite">
          {countLabel}
        </p>
      </div>
    </div>
  );
}
