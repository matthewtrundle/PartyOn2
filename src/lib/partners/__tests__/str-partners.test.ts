import { describe, it, expect } from 'vitest';
import {
  getStrPartnerBySlug,
  getStrPartnerByCode,
  listStrPartners,
} from '../str-partners';

describe('str-partners config', () => {
  it('resolves Five Star by slug', () => {
    const p = getStrPartnerBySlug('five-star');
    expect(p).not.toBeNull();
    expect(p?.slug).toBe('five-star');
    expect(p?.code).toBe('FIVESTAR');
    expect(p?.deliveryContextType).toBe('HOUSE');
    expect(p?.allowCustomAddress).toBe(true);
  });

  it('returns null for unknown / empty slugs', () => {
    expect(getStrPartnerBySlug('does-not-exist')).toBeNull();
    expect(getStrPartnerBySlug(null)).toBeNull();
    expect(getStrPartnerBySlug(undefined)).toBeNull();
    expect(getStrPartnerBySlug('')).toBeNull();
  });

  it('resolves by code, normalizing case and dashes', () => {
    expect(getStrPartnerByCode('FIVESTAR')?.slug).toBe('five-star');
    expect(getStrPartnerByCode('fivestar')?.slug).toBe('five-star');
    // The middleware sets the ref cookie from the slug (uppercased) → "FIVE-STAR".
    expect(getStrPartnerByCode('FIVE-STAR')?.slug).toBe('five-star');
    expect(getStrPartnerByCode('nope')).toBeNull();
    expect(getStrPartnerByCode(null)).toBeNull();
  });

  it('lists all configured partners', () => {
    const all = listStrPartners();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((p) => p.slug === 'five-star')).toBe(true);
  });
});
