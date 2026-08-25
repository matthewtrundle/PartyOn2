/**
 * The postponed state must be a single switch that reaches BOTH the banner and
 * ticket sales. A banner without the API guard is cosmetic: a visitor who
 * deep-links past it could still reach Stripe.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PostponedBanner from '../PostponedBanner';
import { EVENT } from '../event';

describe('Full Moon postponed state', () => {
  it('event config is currently postponed with a note', () => {
    expect(EVENT.postponed).toBe(true);
    expect(EVENT.postponedNote.trim().length).toBeGreaterThan(20);
  });

  it('banner renders the date and the note when postponed', () => {
    const html = renderToStaticMarkup(<PostponedBanner />);
    expect(html).toContain('postponed');
    expect(html).toContain(EVENT.shortDate);
    expect(html).toContain('refunded in full');
  });

  it('banner is announced to assistive tech', () => {
    expect(renderToStaticMarkup(<PostponedBanner />)).toContain('role="status"');
  });

  it('ticket route refuses sales while postponed, before the env-flag check', async () => {
    const fs = await import('fs/promises');
    const src = await fs.readFile('src/app/api/v1/full-moon/ticket/route.ts', 'utf8');
    const postponedAt = src.indexOf('EVENT.postponed');
    const envFlagAt = src.indexOf("FULL_MOON_TICKETS_LIVE !== '1'");
    expect(postponedAt).toBeGreaterThan(-1);
    expect(postponedAt).toBeLessThan(envFlagAt);
  });

  it('every Full Moon page renders the banner', async () => {
    const fs = await import('fs/promises');
    for (const p of ['full-moon-aug28', 'full-moon-drinks', 'full-moon-thanks', 'full-moon-terms']) {
      const src = await fs.readFile(`src/app/${p}/page.tsx`, 'utf8');
      expect(src, `${p} missing banner`).toContain('<PostponedBanner />');
    }
  });
});
