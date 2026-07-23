/**
 * Lead → Affiliate resolution: alias mapping (premier-concierge → PREMIER),
 * slug passthrough, and best-effort failure swallowing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAffiliateBySlug = vi.fn();
vi.mock('@/lib/affiliates/affiliate-service', () => ({
  getAffiliateBySlug: (...args: unknown[]) => getAffiliateBySlug(...args),
}));

import { resolveAffiliateId } from '../affiliate-resolve';

beforeEach(() => {
  vi.clearAllMocks();
  getAffiliateBySlug.mockResolvedValue({ id: 'aff-1' });
});

describe('resolveAffiliateId', () => {
  it('resolves a partner slug to the affiliate id', async () => {
    await expect(resolveAffiliateId('premier-party-cruises')).resolves.toBe('aff-1');
    expect(getAffiliateBySlug).toHaveBeenCalledWith('premier-party-cruises');
  });

  it('maps premier-concierge through the alias to PREMIER', async () => {
    await resolveAffiliateId('premier-concierge');
    expect(getAffiliateBySlug).toHaveBeenCalledWith('PREMIER');
  });

  it('returns null for blank input, unknown slugs, and lookup failures', async () => {
    await expect(resolveAffiliateId(null)).resolves.toBeNull();
    await expect(resolveAffiliateId('  ')).resolves.toBeNull();
    getAffiliateBySlug.mockResolvedValue(null);
    await expect(resolveAffiliateId('nobody')).resolves.toBeNull();
    getAffiliateBySlug.mockRejectedValue(new Error('db down'));
    await expect(resolveAffiliateId('premier-party-cruises')).resolves.toBeNull();
  });
});
