/**
 * One cocktail kit in the /cocktail-recipes grid. Clicking opens the recipe.
 * @module components/cocktail-recipes/RecipeCard
 */

'use client';

import Image from 'next/image';
import type { ReactElement } from 'react';
import type { RecipeKit } from '@/data/cocktail-recipes/types';

interface RecipeCardProps {
  kit: RecipeKit;
  onSelect: (kit: RecipeKit) => void;
}

/** Card button — the whole tile is the click target. */
export default function RecipeCard({ kit, onSelect }: RecipeCardProps): ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(kit)}
      aria-label={`View the ${kit.displayName} recipe`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {kit.imageUrl ? (
          <Image
            src={kit.imageUrl}
            alt={kit.imageAlt ?? kit.displayName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 4h14l-7 8v7m-3 0h6" />
            </svg>
          </div>
        )}

        {kit.isMocktail && (
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-xs font-bold tracking-wide text-gray-900 shadow-sm">
            MOCKTAIL
          </span>
        )}

        {/* Yellow underline wipes in on hover — the brand's accent, used sparingly. */}
        <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-brand-yellow transition-transform duration-200 group-hover:scale-x-100" />
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="font-heading text-lg leading-tight tracking-[0.05em] text-gray-900">{kit.displayName}</h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold text-brand-blue">{kit.spirit}</span>
          <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
          <span>{kit.yieldLabel}</span>
        </p>
      </div>
    </button>
  );
}
