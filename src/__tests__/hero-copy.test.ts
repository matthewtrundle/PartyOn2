/**
 * resolveHeroCopy precedence matrix — quiz > Brian's registry > System B (DB)
 * > config default, with the SEO/H1 and bullets rules pinned.
 */

import { describe, it, expect } from 'vitest';
import { resolveHeroCopy } from '@/components/landing/heroCopy';

const CONFIG = {
  heroEyebrow: 'AUSTIN BACHELOR PARTY ALCOHOL DELIVERY',
  heroHeadline: 'Stocked & Ice-Cold',
  heroHeadlineAccent: 'Before The Groom Lands.',
  heroSubhead: 'Default subhead.',
  heroBullets: ['bullet one', 'bullet two'],
  ctaText: 'BUILD YOUR BACH PACKAGE →',
};

const BRIAN_HERO = {
  eyebrow: 'BRIAN EYEBROW',
  headline: 'Brian Headline',
  headlineAccent: 'Brian Accent',
  subhead: 'Brian subhead',
};

describe('resolveHeroCopy', () => {
  it('config defaults when nothing overrides', () => {
    const r = resolveHeroCopy({ cameFromQuiz: false, dbContent: null, config: CONFIG });
    expect(r).toEqual({
      eyebrow: CONFIG.heroEyebrow,
      headline: CONFIG.heroHeadline,
      headlineAccent: CONFIG.heroHeadlineAccent,
      subhead: CONFIG.heroSubhead,
      showBullets: true,
      primaryCtaText: CONFIG.ctaText,
    });
  });

  it('quiz beats everything (except CTA text)', () => {
    const r = resolveHeroCopy({
      cameFromQuiz: true,
      brianHero: BRIAN_HERO,
      dbContent: { headline: 'DB Headline', ctaText: 'DB CTA' },
      config: CONFIG,
    });
    expect(r.eyebrow).toBe('WELCOME — STEP 1 OF 2');
    expect(r.headline).toBe("Step one: Let's get started with");
    expect(r.headlineAccent).toBe('your drinks.');
    expect(r.showBullets).toBe(true); // bullets still win (existing behavior)
    // CTA chain in the quiz branch mirrors the pre-resolver template:
    // Brian's CTA test > System B > config. (In practice the template skips
    // System B assignment on quiz arrivals, so dbContent is null there — the
    // dbContent link matters only for the pure-function contract.)
    expect(r.primaryCtaText).toBe('DB CTA');
  });

  it('quiz branch: Brian CTA test still wins the button text', () => {
    const r = resolveHeroCopy({
      cameFromQuiz: true,
      brianCta: { primary: 'BRIAN CTA' },
      dbContent: { ctaText: 'DB CTA' },
      config: CONFIG,
    });
    expect(r.primaryCtaText).toBe('BRIAN CTA');
  });

  it('quiz branch: config CTA when no test overrides it', () => {
    const r = resolveHeroCopy({
      cameFromQuiz: true,
      dbContent: null,
      config: CONFIG,
    });
    expect(r.primaryCtaText).toBe(CONFIG.ctaText);
  });

  it("Brian's running test beats System B on every hero field", () => {
    const r = resolveHeroCopy({
      cameFromQuiz: false,
      brianHero: BRIAN_HERO,
      dbContent: { headline: 'DB Headline', subhead: 'DB subhead', ctaText: 'DB CTA' },
      config: CONFIG,
    });
    expect(r.eyebrow).toBe('BRIAN EYEBROW');
    expect(r.headline).toBe('Brian Headline');
    expect(r.headlineAccent).toBe('Brian Accent');
    expect(r.subhead).toBe('Brian subhead');
    // System B never mixes into a Brian-owned hero, not even the CTA.
    expect(r.primaryCtaText).toBe(CONFIG.ctaText);
    expect(r.showBullets).toBe(true);
  });

  it("Brian's CTA test overrides the primary CTA text", () => {
    const r = resolveHeroCopy({
      cameFromQuiz: false,
      brianCta: { primary: 'BRIAN CTA' },
      dbContent: { ctaText: 'DB CTA' },
      config: CONFIG,
    });
    expect(r.primaryCtaText).toBe('BRIAN CTA');
  });

  it('System B never overrides the eyebrow (semantic H1 / SEO)', () => {
    const r = resolveHeroCopy({
      cameFromQuiz: false,
      dbContent: { eyebrow: 'SHOULD BE IGNORED', headline: 'DB Headline' },
      config: CONFIG,
    });
    expect(r.eyebrow).toBe(CONFIG.heroEyebrow);
    expect(r.headline).toBe('DB Headline');
  });

  it('System B headline WITHOUT accent renders one line (accent empty)', () => {
    const r = resolveHeroCopy({
      cameFromQuiz: false,
      dbContent: { headline: 'One Line Challenger' },
      config: CONFIG,
    });
    expect(r.headline).toBe('One Line Challenger');
    expect(r.headlineAccent).toBe('');
  });

  it('System B headline WITH accent renders both lines', () => {
    const r = resolveHeroCopy({
      cameFromQuiz: false,
      dbContent: { headline: 'Line One —', headlineAccent: 'Line Two.' },
      config: CONFIG,
    });
    expect(r.headline).toBe('Line One —');
    expect(r.headlineAccent).toBe('Line Two.');
  });

  it('per-field independence: DB accent alone keeps the config headline', () => {
    const r = resolveHeroCopy({
      cameFromQuiz: false,
      dbContent: { headlineAccent: 'New Accent Only.' },
      config: CONFIG,
    });
    expect(r.headline).toBe(CONFIG.heroHeadline);
    expect(r.headlineAccent).toBe('New Accent Only.');
  });

  it('System B subhead suppresses bullets; no override keeps them', () => {
    const withSub = resolveHeroCopy({
      cameFromQuiz: false,
      dbContent: { subhead: 'DB subhead override' },
      config: CONFIG,
    });
    expect(withSub.showBullets).toBe(false);
    expect(withSub.subhead).toBe('DB subhead override');

    const noBullets = resolveHeroCopy({
      cameFromQuiz: false,
      dbContent: null,
      config: { ...CONFIG, heroBullets: [] },
    });
    expect(noBullets.showBullets).toBe(false);
    expect(noBullets.subhead).toBe(CONFIG.heroSubhead);
  });

  it('CTA chain: DB ctaText wins over config when Brian absent', () => {
    const r = resolveHeroCopy({
      cameFromQuiz: false,
      dbContent: { ctaText: 'DB CTA' },
      config: CONFIG,
    });
    expect(r.primaryCtaText).toBe('DB CTA');
  });
});
