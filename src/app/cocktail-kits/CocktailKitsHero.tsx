'use client';

import { ReactElement } from 'react';
import TrackedLink from '@/components/analytics/TrackedLink';
import { useHeroExperiment } from '@/hooks/useHeroExperiment';
import { trackExperimentClick } from '@/hooks/useExperimentVariant';
import { trackCTAClick } from '@/lib/analytics/ga4-events';

/**
 * Client hero text column for /cocktail-kits (the page itself is a Server
 * Component). Renders the assigned A/B variant's copy when a hero test is
 * active, falling back to the default copy otherwise.
 */
export default function CocktailKitsHero(): ReactElement {
  const hero = useHeroExperiment('/cocktail-kits');
  const ctaLabel = hero.content?.ctaText ?? 'SHOP COCKTAIL KITS';

  return (
    <div className="text-center lg:text-left">
      {hero.content?.eyebrow && (
        <p className="text-sm font-semibold tracking-[0.2em] text-yellow-600 mb-3 uppercase">
          {hero.content.eyebrow}
        </p>
      )}
      <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-gray-900 mb-6">
        {hero.content?.headline ?? 'Premium Cocktail Kits, Delivered to Your Door'}
      </h1>
      <p className="text-xl sm:text-2xl text-gray-700 mb-6 tracking-wide">
        {hero.content?.subhead ?? 'Everything you need to make bar-quality cocktails at home. Just add ice.'}
      </p>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Skip the store runs and recipe hunting. Each kit comes with premium spirits, fresh mixers, and
        garnishes — perfectly portioned to make 16-24 cocktails for your next party.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
        <a
          href="#featured-products"
          onClick={() => {
            trackCTAClick(ctaLabel, '#featured-products', 'hero', hero.experimentId ?? undefined, hero.variantId ?? undefined);
            if (hero.experimentId && hero.variantId) trackExperimentClick(hero.experimentId, hero.variantId, ctaLabel);
          }}
          className="inline-block bg-yellow-500 hover:bg-brand-yellow text-gray-900 px-8 py-4 text-lg font-medium tracking-widest transition-colors duration-200"
        >
          {ctaLabel}
        </a>
        <TrackedLink
          href="#how-it-works"
          section="hero"
          buttonText="HOW IT WORKS"
          className="inline-block border-2 border-gray-900 text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg font-medium tracking-widest transition-colors duration-200"
        >
          HOW IT WORKS
        </TrackedLink>
      </div>
    </div>
  );
}
