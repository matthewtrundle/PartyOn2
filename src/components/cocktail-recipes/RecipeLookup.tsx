/**
 * Search + alphabetical grid + recipe popup for /cocktail-recipes.
 * @module components/cocktail-recipes/RecipeLookup
 *
 * Owns the only state on the page: the search query and which kit is open.
 * Kits arrive pre-merged and pre-sorted from the server.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import RecipeCard from './RecipeCard';
import RecipeModal from './RecipeModal';
import RecipeFilters from './RecipeFilters';
import { trackCTAClick } from '@/lib/analytics/ga4-events';
import { trackPodEvent } from '@/lib/analytics/client-tracker';
import type { RecipeKit } from '@/data/cocktail-recipes/types';

interface RecipeLookupProps {
  /** Every kit with a curated recipe, already sorted best-sellers-first. */
  kits: RecipeKit[];
}

/** Wait this long after the last keystroke before logging a search. */
const SEARCH_TRACK_DELAY_MS = 800;

/**
 * Build the string a kit is matched against, so "tequila" finds the margaritas.
 * `group` is in here purely as a synonym source — it is what makes "whiskey"
 * turn up the bourbon kit, even though no kit is labelled that way.
 */
function searchTextFor(kit: RecipeKit): string {
  return [
    kit.displayName,
    kit.spirit,
    kit.group,
    kit.ingredients.join(' '),
    kit.isMocktail ? 'mocktail non-alcoholic alcohol free' : '',
  ]
    .join(' ')
    .toLowerCase();
}

export default function RecipeLookup({ kits }: RecipeLookupProps): ReactElement {
  const [query, setQuery] = useState('');
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastTrackedQuery = useRef('');

  const haystacks = useMemo(() => new Map(kits.map((kit) => [kit.handle, searchTextFor(kit)])), [kits]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return kits;
    return kits.filter((kit) => haystacks.get(kit.handle)?.includes(needle));
  }, [kits, haystacks, query]);

  const selectedKit = selectedHandle ? kits.find((kit) => kit.handle === selectedHandle) ?? null : null;
  const countLabel = query.trim() ? `Showing ${results.length} of ${kits.length} kits` : `${kits.length} kits`;

  /**
   * Keep ?kit= in sync so a recipe can be shared or bookmarked. replaceState
   * rather than router.replace: no server round-trip and no history entry per
   * open/close (browser Back leaves the page instead of unwinding popups).
   */
  const syncUrl = useCallback((handle: string | null) => {
    const url = new URL(window.location.href);
    if (handle) url.searchParams.set('kit', handle);
    else url.searchParams.delete('kit');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, []);

  /**
   * Open the deep-linked kit once on mount. Deliberately not a CTA click.
   *
   * Read straight from window.location rather than useSearchParams(): that
   * hook forces this Suspense boundary to re-render on the client, which
   * throws away the server-rendered grid and leaves a hidden duplicate of
   * every card in the DOM.
   */
  useEffect(() => {
    const handle = new URLSearchParams(window.location.search).get('kit');
    if (handle && kits.some((kit) => kit.handle === handle)) setSelectedHandle(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "/" jumps to the search box, the way every other lookup tool behaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Log what people search for, once they stop typing.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed === lastTrackedQuery.current) return;
    const timer = setTimeout(() => {
      lastTrackedQuery.current = trimmed;
      trackPodEvent('recipe_search', { query: trimmed, result_count: results.length });
    }, SEARCH_TRACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, results.length]);

  const openKit = useCallback(
    (kit: RecipeKit) => {
      setSelectedHandle(kit.handle);
      syncUrl(kit.handle);
      trackCTAClick(kit.displayName, `/cocktail-recipes?kit=${kit.handle}`, 'recipe_card');
    },
    [syncUrl]
  );

  const closeKit = useCallback(() => {
    setSelectedHandle(null);
    syncUrl(null);
  }, [syncUrl]);

  return (
    <>
      <RecipeFilters query={query} onQueryChange={setQuery} searchRef={searchRef} countLabel={countLabel} />

      <div className="container-custom py-8">
        {results.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {results.map((kit) => (
              <RecipeCard key={kit.handle} kit={kit} onSelect={openKit} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 4h14l-7 8v7m-3 0h6" />
            </svg>
            <p className="mt-4 text-base text-gray-700">No kits match “{query.trim()}”.</p>
            <button type="button" onClick={() => setQuery('')} className="btn-ghost mt-2">
              Clear search
            </button>
          </div>
        )}
      </div>

      {selectedKit && <RecipeModal kit={selectedKit} onClose={closeKit} />}
    </>
  );
}
