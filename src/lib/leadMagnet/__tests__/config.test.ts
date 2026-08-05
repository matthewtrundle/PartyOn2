/**
 * The two new lead magnets exist to put an ask on pages that produced ZERO
 * leads (the birthday blog post and /products). Their whole value depends on
 * matching exactly the right paths and NOT bleeding onto pages they'd annoy —
 * `pathMatches` is exact-or-glob (a bare '/products' is NOT matched by
 * '/products/*'), which is easy to get subtly wrong. These tests pin the match
 * set and the first-match ordering the controller relies on.
 */
import { describe, it, expect } from 'vitest';
import { LEAD_MAGNETS, pathMatches, findMagnet, type LeadMagnet } from '../config';

/** The first enabled magnet that applies to a path — mirrors the controller. */
function magnetForPath(path: string): LeadMagnet | null {
  for (const m of LEAD_MAGNETS) {
    if (!m.enabled) continue;
    if (m.excludePages && pathMatches(path, m.excludePages)) continue;
    if (!pathMatches(path, m.pages)) continue;
    return m;
  }
  return null;
}

describe('lead-magnet config — new free-delivery asks', () => {
  it('both new magnets carry a reward code and point at /order', () => {
    for (const id of ['bday-free-delivery-2026', 'products-free-delivery-2026']) {
      const m = findMagnet(id);
      expect(m, id).toBeDefined();
      expect(m!.rewardCode, id).toBeTruthy();
      expect(m!.rewardUrl, id).toBe('/order');
      expect(m!.enabled, id).toBe(true);
    }
    expect(findMagnet('bday-free-delivery-2026')!.rewardCode).toBe('BDAYPARTY');
    expect(findMagnet('products-free-delivery-2026')!.rewardCode).toBe('STOCKED');
  });

  it('the birthday magnet fires on the exact target post only', () => {
    const m = magnetForPath('/blog/15-unique-birthday-party-ideas-in-austin-for-adults');
    expect(m?.id).toBe('bday-free-delivery-2026');
    // Not on other blog posts — scope is the one measured dead page.
    expect(magnetForPath('/blog/some-other-post')).toBeNull();
    expect(magnetForPath('/blog')).toBeNull();
  });

  it('the products magnet fires on both /products and product handle pages', () => {
    expect(magnetForPath('/products')?.id).toBe('products-free-delivery-2026');
    expect(magnetForPath('/products/tito-s-handmade-vodka')?.id).toBe(
      'products-free-delivery-2026',
    );
  });

  it('neither new magnet leaks onto partner pages or the homepage', () => {
    // /partners/* stays clean (the Premier page proxies a live iframe).
    expect(magnetForPath('/partners/premier')?.id).not.toBe('bday-free-delivery-2026');
    expect(magnetForPath('/partners/premier')?.id).not.toBe('products-free-delivery-2026');
    // Homepage still resolves to the flyer magnet, not a free-delivery one.
    expect(magnetForPath('/')?.id).toBe('pod-services-flyer-2026');
  });

  it('lists the specific new magnets before the catch-all flyer (first-match wins)', () => {
    const ids = LEAD_MAGNETS.map((m) => m.id);
    const flyerIdx = ids.indexOf('pod-services-flyer-2026');
    expect(ids.indexOf('bday-free-delivery-2026')).toBeLessThan(flyerIdx);
    expect(ids.indexOf('products-free-delivery-2026')).toBeLessThan(flyerIdx);
  });
});
