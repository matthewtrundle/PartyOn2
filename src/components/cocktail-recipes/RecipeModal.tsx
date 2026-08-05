/**
 * Recipe popup for a single cocktail kit on /cocktail-recipes.
 * @module components/cocktail-recipes/RecipeModal
 *
 * Centered card on desktop, bottom sheet on phones — a recipe gets read
 * one-handed in a kitchen, so the steps and the buy button both stay in reach.
 * Mounted only while a kit is selected, so the scroll lock and focus handling
 * live with the mount/unmount rather than an isOpen prop.
 */

'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { ReactElement } from 'react';
import TrackedLink from '@/components/analytics/TrackedLink';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import type { RecipeKit } from '@/data/cocktail-recipes/types';

interface RecipeModalProps {
  kit: RecipeKit;
  onClose: () => void;
}

/** Section heading with a rule running out to the edge. */
function SectionHeading({ children }: { children: string }): ReactElement {
  return (
    <div className="mt-6 flex items-center gap-3">
      <h3 className="font-heading text-base tracking-[0.15em] text-gray-900">{children.toUpperCase()}</h3>
      <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
    </div>
  );
}

export default function RecipeModal({ kit, onClose }: RecipeModalProps): ReactElement {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useBodyScrollLock(true);

  // Move focus into the popup on open, hand it back to the card on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previouslyFocused.current?.focus?.();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-modal-title"
        className="pod-sheet-enter relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl sm:animate-scale-in"
      >
        {/* Drag affordance — reads as a sheet on phones, hidden on desktop. */}
        <span className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-white/70 sm:hidden" aria-hidden="true" />

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close recipe"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {kit.imageUrl && (
          <div className="relative h-32 shrink-0 bg-gray-50 sm:h-44">
            <Image
              src={kit.imageUrl}
              alt={kit.imageAlt ?? kit.displayName}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
            />
          </div>
        )}

        <div className="overflow-y-auto overscroll-contain p-5 sm:p-6">
          <h2 id="recipe-modal-title" className="font-heading text-2xl tracking-[0.06em] text-gray-900 sm:text-3xl">
            {kit.displayName}
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {[kit.yieldLabel, `${kit.prepTimeLabel} to make`, kit.spirit].map((chip) => (
              <span key={chip} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
                {chip}
              </span>
            ))}
          </div>

          {/* Steps lead. Most visitors arrive from the QR code on the dispenser
              with the kit already open in front of them — they want the build,
              not an inventory. Contents sit collapsed at the bottom. */}
          <SectionHeading>How to mix it</SectionHeading>
          <ol className="mt-2 space-y-3.5">
            {kit.instructions.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed text-gray-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-sm font-bold text-gray-900">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {kit.garnish && (
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              <span className="font-semibold text-gray-700">Garnish idea:</span> {kit.garnish}. Not included in the kit.
            </p>
          )}

          {kit.proTip && (
            <p className="mt-5 rounded-r-lg border-l-4 border-brand-yellow bg-yellow-50 p-3 text-sm leading-relaxed text-gray-900">
              <span className="font-bold">Pro tip: </span>
              {kit.proTip}
            </p>
          )}

          <details className="group mt-6 overflow-hidden rounded-xl border border-gray-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
              <span>
                What&apos;s in the box{' '}
                <span className="font-normal text-gray-500">({kit.ingredients.length} items)</span>
              </span>
              <svg
                className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <ul className="divide-y divide-gray-200 border-t border-gray-200">
              {kit.ingredients.map((ingredient) => (
                <li key={ingredient} className="flex gap-2.5 bg-white px-4 py-2.5 text-sm leading-relaxed text-gray-700 odd:bg-gray-50">
                  <svg className="mt-1 h-4 w-4 shrink-0 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4 pb-6 sm:pb-4">
          {kit.price && (
            <p className="mb-2 text-center text-sm text-gray-500">
              ${kit.price} · {kit.yieldLabel} · delivered cold in Austin
            </p>
          )}
          <TrackedLink
            href={`/products/${kit.handle}`}
            section="recipe_modal"
            buttonText={`Get this kit delivered — ${kit.displayName}`}
            className="btn-cart w-full justify-center"
          >
            Get this kit delivered
          </TrackedLink>
        </div>
      </div>
    </div>
  );
}
