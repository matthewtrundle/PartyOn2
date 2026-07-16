/**
 * Hero copy resolver for LandingPageTemplate — folds FOUR copy sources into
 * the strings the hero actually renders, with a fixed precedence:
 *
 *   quiz (?welcome=1)  >  Brian's registry variant  >  System B DB variant  >  config default
 *
 * Rules that protect existing behavior:
 * - The eyebrow is the page's semantic <h1> (keyword-rich SEO) — System B
 *   content NEVER overrides it. Quiz/Brian keep their existing behavior.
 * - A System B `headline` without a `headlineAccent` renders as ONE line
 *   (accent = ''), so a single-line variant doesn't inherit the config's gold
 *   second line and read as a two-line mashup.
 * - Bullets vs subhead: today bullets always win when configured; only a
 *   System B `subhead` override suppresses them (that's the point of testing
 *   a subhead). Quiz/Brian subheads keep the current bullets-win behavior.
 */

import type { ReactNode } from 'react';
import type { BachelorHeroPayload, CtaCopyPayload } from '@/lib/experiments/registry';
import type { HeroContent } from '@/hooks/useHeroExperiment';

export interface HeroCopyInput {
  cameFromQuiz: boolean;
  /** Brian's hero-headline payload — present only when his test is RUNNING. */
  brianHero?: BachelorHeroPayload;
  /** Brian's primary-CTA payload — present only when his test is RUNNING. */
  brianCta?: CtaCopyPayload;
  /** System B variant content (null = control / no active experiment). */
  dbContent: HeroContent | null;
  config: {
    heroEyebrow: string;
    heroHeadline: string;
    heroHeadlineAccent: string;
    heroSubhead: ReactNode | string;
    heroBullets?: string[];
    ctaText: string;
  };
}

export interface ResolvedHeroCopy {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  subhead: ReactNode | string;
  showBullets: boolean;
  primaryCtaText: string;
}

export function resolveHeroCopy(input: HeroCopyInput): ResolvedHeroCopy {
  const { cameFromQuiz, brianHero, brianCta, dbContent, config } = input;

  const hasBullets = (config.heroBullets?.length ?? 0) > 0;

  if (cameFromQuiz) {
    // ?welcome=1 — the /event-quiz redirect frames the page as step 2.
    // Exact strings preserved from the pre-resolver template.
    return {
      eyebrow: 'WELCOME — STEP 1 OF 2',
      headline: "Step one: Let's get started with",
      headlineAccent: 'your drinks.',
      subhead:
        "Then we'll plan the rest of your weekend. Pick a package below or build your own — your contact info is already on file so checkout takes 30 seconds.",
      showBullets: hasBullets,
      primaryCtaText: brianCta?.primary ?? dbContent?.ctaText ?? config.ctaText,
    };
  }

  if (brianHero) {
    // Brian's registry test owns the hero wholesale — System B never mixes in
    // (the template skips System B assignment entirely while his test runs).
    return {
      eyebrow: brianHero.eyebrow,
      headline: brianHero.headline,
      headlineAccent: brianHero.headlineAccent,
      subhead: brianHero.subhead,
      showBullets: hasBullets,
      primaryCtaText: brianCta?.primary ?? config.ctaText,
    };
  }

  const dbSubheadOverride = dbContent?.subhead != null;
  const dbOneLineHeadline =
    dbContent?.headline != null && dbContent.headlineAccent == null;

  return {
    eyebrow: config.heroEyebrow, // System B never touches the H1
    headline: dbContent?.headline ?? config.heroHeadline,
    headlineAccent: dbOneLineHeadline
      ? ''
      : (dbContent?.headlineAccent ?? config.heroHeadlineAccent),
    subhead: dbContent?.subhead ?? config.heroSubhead,
    showBullets: hasBullets && !dbSubheadOverride,
    primaryCtaText: brianCta?.primary ?? dbContent?.ctaText ?? config.ctaText,
  };
}
