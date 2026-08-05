/**
 * These tests exist because the GA4 Default Channel Group label strings are the
 * fragile part of the analytics-snapshot fix: the five session columns on
 * AnalyticsSnapshot were permanently 0 (the upsert never wrote them), and the
 * mapping that finally populates them keys off exact GA4 labels. If GA4 renames
 * a channel or adds one, the guarantee we care about is that sessions are never
 * DROPPED and never mis-filed — anything unrecognised must land in `residual`,
 * which stays visible in top_referrers. Every case below pins one of those
 * guarantees.
 */
import { describe, it, expect } from 'vitest';
import {
  mapChannelSessions,
  bucketForChannel,
  type ChannelSource,
} from '../channel-mapping';

describe('bucketForChannel — GA4 label routing', () => {
  it('routes each canonical label to its column', () => {
    expect(bucketForChannel('Organic Search')).toBe('organic');
    expect(bucketForChannel('Direct')).toBe('direct');
    expect(bucketForChannel('Referral')).toBe('referral');
    expect(bucketForChannel('Organic Social')).toBe('social');
    expect(bucketForChannel('Paid Social')).toBe('social');
    expect(bucketForChannel('Paid Search')).toBe('paid');
    expect(bucketForChannel('Paid Shopping')).toBe('paid');
    expect(bucketForChannel('Paid Video')).toBe('paid');
    expect(bucketForChannel('Paid Other')).toBe('paid');
    // Display is paid display-network advertising — same class as Cross-network,
    // so it belongs in paid, not residual.
    expect(bucketForChannel('Display')).toBe('paid');
    expect(bucketForChannel('Cross-network')).toBe('paid');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(bucketForChannel('organic search')).toBe('organic');
    expect(bucketForChannel('  PAID   SEARCH  ')).toBe('paid');
    expect(bucketForChannel('cross-network')).toBe('paid');
  });

  it('sends recognised-but-uncategorised and unknown labels to residual, never a wrong column', () => {
    // The traps: "Organic Shopping" must NOT be organic, "Paid Social" is
    // social not paid (covered above), and a label GA4 invents next quarter
    // must not vanish.
    expect(bucketForChannel('Organic Shopping')).toBe('residual');
    expect(bucketForChannel('Organic Video')).toBe('residual');
    expect(bucketForChannel('Unassigned')).toBe('residual');
    expect(bucketForChannel('Email')).toBe('residual');
    expect(bucketForChannel('AI Assistant')).toBe('residual');
    expect(bucketForChannel('Some Future Channel')).toBe('residual');
    expect(bucketForChannel('')).toBe('residual');
  });

  it('does not let Object.prototype names bypass the residual fallback', () => {
    // Regression guard for the PR #363 footgun: a plain-object lookup on
    // 'constructor'/'__proto__'/'hasOwnProperty' returns an inherited truthy
    // value, which would silently drop the session count instead of bucketing
    // it as residual. Object.hasOwn closes that.
    expect(bucketForChannel('constructor')).toBe('residual');
    expect(bucketForChannel('__proto__')).toBe('residual');
    expect(bucketForChannel('hasOwnProperty')).toBe('residual');
    expect(bucketForChannel('toString')).toBe('residual');
  });

  it('still counts (not drops) a session on an Object.prototype-named channel', () => {
    const b = mapChannelSessions([
      { source: 'constructor', sessions: 7 },
      { source: 'Direct', sessions: 3 },
    ]);
    expect(b.residual).toBe(7); // counted, not vanished
    expect(b.direct).toBe(3);
    const total = b.organic + b.direct + b.referral + b.social + b.paid + b.residual;
    expect(total).toBe(10);
  });
});

describe('mapChannelSessions — summation', () => {
  it('returns all zeros for empty / null / undefined input', () => {
    const zeros = { organic: 0, direct: 0, referral: 0, social: 0, paid: 0, residual: 0 };
    expect(mapChannelSessions([])).toEqual(zeros);
    expect(mapChannelSessions(null)).toEqual(zeros);
    expect(mapChannelSessions(undefined)).toEqual(zeros);
  });

  it('reproduces the verified 2026-08-04 production channel mix exactly', () => {
    // The live top-10 pull that day, verbatim. This is the regression anchor:
    // if the mapping drifts, this total stops reconciling.
    const prod: ChannelSource[] = [
      { source: 'Direct', sessions: 1846 },
      { source: 'Paid Search', sessions: 880 },
      { source: 'Organic Search', sessions: 602 },
      { source: 'Referral', sessions: 177 },
      { source: 'Organic Shopping', sessions: 156 },
      { source: 'Unassigned', sessions: 48 },
      { source: 'Organic Social', sessions: 29 },
      { source: 'Cross-network', sessions: 19 },
      { source: 'Email', sessions: 18 },
      { source: 'AI Assistant', sessions: 11 },
    ];
    const b = mapChannelSessions(prod);
    expect(b.direct).toBe(1846);
    expect(b.paid).toBe(880 + 19); // Paid Search + Cross-network
    expect(b.organic).toBe(602);
    expect(b.referral).toBe(177);
    expect(b.social).toBe(29); // Organic Social
    expect(b.residual).toBe(156 + 48 + 18 + 11); // Shopping + Unassigned + Email + AI

    // Nothing is dropped: every session lands in exactly one bucket.
    const mapped = b.organic + b.direct + b.referral + b.social + b.paid + b.residual;
    const total = prod.reduce((s, r) => s + r.sessions, 0);
    expect(mapped).toBe(total);
    expect(mapped).toBe(3786);
  });

  it('folds duplicate labels and mixed casing into the same bucket', () => {
    const b = mapChannelSessions([
      { source: 'Paid Search', sessions: 100 },
      { source: 'paid search', sessions: 50 },
      { source: 'Cross-network', sessions: 25 },
    ]);
    expect(b.paid).toBe(175);
  });

  it('treats non-finite / negative session counts as zero', () => {
    const b = mapChannelSessions([
      { source: 'Direct', sessions: Number.NaN },
      { source: 'Organic Search', sessions: -5 },
      { source: 'Referral', sessions: 10 },
    ]);
    expect(b.direct).toBe(0);
    expect(b.organic).toBe(0);
    expect(b.referral).toBe(10);
  });
});
