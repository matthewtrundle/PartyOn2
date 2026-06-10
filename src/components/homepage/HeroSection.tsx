'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { trackCTAClick, trackHeroVariant } from '@/lib/analytics/ga4-events';
import { HeroVariantContent, heroControl } from '@/lib/experiments/hero-variants';
import AnimatedHeroText from '@/components/hero/AnimatedHeroText';
import HeroCollage from '@/components/homepage/HeroCollage';

interface HeroSectionProps {
  variant?: HeroVariantContent;
  experimentId?: string;
}

const heroFadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const trustChips = [
  { icon: 'check', label: 'Licensed & insured' },
  { icon: 'star', label: '5-star reviews' },
  { icon: 'check', label: 'On-time delivery' },
  { icon: 'check', label: 'Optional setup' },
  { icon: 'check', label: 'Split-pay group ordering' },
];

function CheckIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function StarIcon() {
  return (
    <span className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function HeroSection({ variant, experimentId }: HeroSectionProps) {
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const content = variant || heroControl;
  const variantId = content.id;

  useEffect(() => {
    if (experimentId && variantId && !hasTrackedImpression) {
      trackHeroVariant(experimentId, variantId, 'hero');
      fetch('/api/experiments/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'impression',
          experimentId,
          variantId,
        }),
      }).catch(console.error);
      setHasTrackedImpression(true);
    }
  }, [experimentId, variantId, hasTrackedImpression]);

  const handleCTAClick = (buttonText: string, buttonUrl: string) => {
    trackCTAClick(buttonText, buttonUrl, 'hero', experimentId, variantId);
    if (experimentId) {
      fetch('/api/experiments/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'click',
          experimentId,
          variantId,
          metadata: { buttonText },
        }),
      }).catch(console.error);
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-20 md:pt-24 lg:pt-24 pb-8 md:pb-12 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          {/* Left Column: Text Content */}
          <div className="order-1 text-center lg:text-left flex flex-col justify-center">
            <h1 className="sr-only">Alcohol Delivery in Austin — Beer, Wine, Liquor & Kegs</h1>
            {/* Animated Headline (visual; semantic <h1> above is the SEO target) */}
            <motion.div
              {...heroFadeUp}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="mb-3 md:mb-4 lg:mb-3"
            >
              <AnimatedHeroText
                drinks={["Beer", "Cocktails", "Seltzers", "Wine", "Champagne"]}
                destinations={["boat party", "wedding", "corporate event", "house party", "Airbnb", "Austin venue"]}
                drinkIntervalMs={3600}
                transitionMs={1200}
              />
            </motion.div>

            {/* Tagline */}
            <motion.p
              {...heroFadeUp}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="font-sans text-lg md:text-xl text-white/80 mb-4 md:mb-6 lg:mb-4 max-w-lg mx-auto lg:mx-0"
            >
              {content.tagline}
            </motion.p>

            {/* CTA */}
            <motion.div
              {...heroFadeUp}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex justify-center lg:justify-start mb-4 md:mb-6 lg:mb-4"
            >
              {content.ctaButtons.map((cta, index) => (
                <Link
                  key={`${cta.text}-${index}`}
                  href={cta.url}
                  onClick={() => handleCTAClick(cta.text, cta.url)}
                  className="px-12 sm:px-16 py-4 sm:py-5 rounded-lg transition-all duration-300 tracking-[0.1em] text-base sm:text-lg font-semibold text-center bg-brand-yellow text-gray-900 hover:bg-yellow-600"
                >
                  {cta.text}
                </Link>
              ))}
            </motion.div>

            {/* Trust Chips */}
            <motion.div
              {...heroFadeUp}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2"
            >
              {trustChips.map((chip) => (
                <span
                  key={chip.label}
                  className="bg-white/10 backdrop-blur text-white text-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                >
                  {chip.icon === 'star' ? <StarIcon /> : <CheckIcon />}
                  {chip.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Image Collage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="order-2"
          >
            <HeroCollage />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
