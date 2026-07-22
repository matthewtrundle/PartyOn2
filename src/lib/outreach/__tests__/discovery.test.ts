/**
 * discovery dedupe matrix: exact website_key, bare-host (Vacasa multi-city),
 * suppressed emails, signed affiliates, existing partner-prospect leads,
 * path-vs-origin key normalization, and the footprint warning.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyCandidate,
  footprintWarning,
  hostOfKey,
  type DedupeContext,
} from '../discovery';
import type { DiscoveryCandidate } from '../schemas';

function ctx(overrides: Partial<DedupeContext> = {}): DedupeContext {
  return {
    existingWebsiteKeys: new Set(['vacasa.com/property-management/tx/austin', 'lynnslodgingatx.com']),
    existingHosts: new Set(['vacasa.com', 'lynnslodgingatx.com']),
    affiliateEmails: new Set(['partner@signed.com']),
    partnerLeadEmails: new Set(['lead@known.com']),
    suppressedEmails: new Set(['dead@bounced.com']),
    ...overrides,
  };
}

function candidate(overrides: Partial<DiscoveryCandidate> = {}): DiscoveryCandidate {
  return {
    name: 'New Rentals Co',
    website: 'https://www.newrentals.com/',
    whyFit: 'manages 15 STRs in central Austin',
    ...overrides,
  };
}

describe('classifyCandidate', () => {
  it('accepts a genuinely new candidate', () => {
    expect(classifyCandidate(candidate(), ctx())).toEqual({
      ok: true,
      websiteKey: 'newrentals.com',
    });
  });

  it('skips exact website_key matches (path keys normalize like the store)', () => {
    const verdict = classifyCandidate(
      candidate({ website: 'https://www.Vacasa.com/property-management/tx/austin/' }),
      ctx()
    );
    expect(verdict).toMatchObject({ ok: false, reason: 'existing-website' });
  });

  it('skips same-host different-path (one outreach thread per company, ever)', () => {
    const verdict = classifyCandidate(
      candidate({ website: 'https://vacasa.com/property-management/tx/dallas' }),
      ctx()
    );
    expect(verdict).toMatchObject({ ok: false, reason: 'existing-host' });
  });

  it('skips suppressed, affiliate, and known-lead emails in precedence order', () => {
    expect(
      classifyCandidate(candidate({ email: 'dead@bounced.com' }), ctx())
    ).toMatchObject({ ok: false, reason: 'suppressed-email' });
    expect(
      classifyCandidate(candidate({ email: 'Partner@Signed.com' }), ctx())
    ).toMatchObject({ ok: false, reason: 'affiliate-exists' });
    expect(
      classifyCandidate(candidate({ email: 'lead@known.com' }), ctx())
    ).toMatchObject({ ok: false, reason: 'existing-partner-lead' });
  });

  it('candidates without email pass the email checks', () => {
    expect(classifyCandidate(candidate({ email: null }), ctx()).ok).toBe(true);
  });
});

describe('hostOfKey', () => {
  it('strips the path segment', () => {
    expect(hostOfKey('vacasa.com/property-management/tx/austin')).toBe('vacasa.com');
    expect(hostOfKey('plain.com')).toBe('plain.com');
  });
});

describe('footprintWarning', () => {
  it('warns on no-go areas, stays quiet otherwise', () => {
    expect(
      footprintWarning(candidate({ whyFit: 'large venue in Round Rock with BYOB policy' }))
    ).toContain('round rock');
    expect(footprintWarning(candidate())).toBeNull();
  });
});
