/**
 * Pure scheduling math: jitter bounds on computeSendAt and the DST-safe
 * 9am–7pm America/Chicago send window.
 */

import { describe, it, expect, vi } from 'vitest';

// Importing enqueue/engine pulls in the prisma singleton — stub it out so
// this pure-math test never touches a database connection.
vi.mock('@/lib/database/client', () => ({ prisma: {} }));

import { computeSendAt } from '../enqueue';
import { isWithinSendWindow } from '../engine';

describe('computeSendAt', () => {
  const base = new Date('2026-07-06T12:00:00Z');

  it('adds the delay exactly when jitter is injected as 0', () => {
    const result = computeSendAt(base, 24, 0);
    expect(result.getTime()).toBe(base.getTime() + 24 * 3_600_000);
  });

  it('applies no jitter to immediate (0h) steps — acks go out on the next tick', () => {
    const result = computeSendAt(base, 0, 45 * 60 * 1000);
    expect(result.getTime()).toBe(base.getTime());
  });

  it('keeps random jitter within [0, 45min] across many samples', () => {
    for (let i = 0; i < 200; i++) {
      const result = computeSendAt(base, 24);
      const offset = result.getTime() - base.getTime() - 24 * 3_600_000;
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(45 * 60 * 1000);
    }
  });

  it('clamps out-of-range injected jitter', () => {
    const over = computeSendAt(base, 1, 10 * 3_600_000);
    expect(over.getTime()).toBe(base.getTime() + 3_600_000 + 45 * 60 * 1000);
    const negative = computeSendAt(base, 1, -5_000);
    expect(negative.getTime()).toBe(base.getTime() + 3_600_000);
  });
});

describe('isWithinSendWindow (America/Chicago, DST-safe)', () => {
  // Winter: CST = UTC-6
  it('9:00am CST is in the window', () => {
    expect(isWithinSendWindow(new Date('2026-01-15T15:00:00Z'))).toBe(true);
  });
  it('8:59am CST is outside', () => {
    expect(isWithinSendWindow(new Date('2026-01-15T14:59:00Z'))).toBe(false);
  });
  it('6:59pm CST is in, 7:00pm CST is out', () => {
    expect(isWithinSendWindow(new Date('2026-01-16T00:59:00Z'))).toBe(true);
    expect(isWithinSendWindow(new Date('2026-01-16T01:00:00Z'))).toBe(false);
  });

  // Summer: CDT = UTC-5 — same wall-clock window, different UTC offsets
  it('9:00am CDT is in the window', () => {
    expect(isWithinSendWindow(new Date('2026-07-15T14:00:00Z'))).toBe(true);
  });
  it('8:59am CDT is outside', () => {
    expect(isWithinSendWindow(new Date('2026-07-15T13:59:00Z'))).toBe(false);
  });
  it('6:59pm CDT is in, 7:00pm CDT is out', () => {
    expect(isWithinSendWindow(new Date('2026-07-15T23:59:00Z'))).toBe(true);
    expect(isWithinSendWindow(new Date('2026-07-16T00:00:00Z'))).toBe(false);
  });

  it('midnight local is outside (h23 hour cycle, no "24" edge case)', () => {
    expect(isWithinSendWindow(new Date('2026-07-15T05:00:00Z'))).toBe(false);
  });
});
