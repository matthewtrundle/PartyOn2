/**
 * Delivery-date validation is anchored to AUSTIN time, not UTC.
 *
 * The past-date refinement used to compare against `new Date().toISOString()`
 * (UTC). UTC midnight is 7pm CT, so every evening from 7pm until midnight the
 * customer's actual today was rejected as "in the past" — same-day delivery,
 * the highest-intent flow, could not be booked.
 *
 * The clock is FROZEN inside that window on purpose. An earlier version of
 * this file used the real clock and passed even with the bug reinstated:
 * whether it exercised the bug at all depended on the hour the suite ran, and
 * a Sunday early-return masked the rest. A test that only sometimes tests
 * something is worse than no test.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UpdateTabSchema } from '../validation';

// 2026-08-06T02:00:00Z = 9:00pm CT on Wed 2026-08-05.
// UTC has already rolled to the 6th while Austin is still on the 5th — the
// exact window where the old UTC comparison rejected "today". Wednesday, so
// the separate no-Sunday refinement never interferes.
const FROZEN_NOW = new Date('2026-08-06T02:00:00Z');
const TODAY_IN_AUSTIN = '2026-08-05';
const TOMORROW_IN_AUSTIN = '2026-08-06';
const YESTERDAY_IN_AUSTIN = '2026-08-04';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('deliveryDateSchema past-date refinement (Austin time)', () => {
  it("accepts TODAY in Austin during the evening window, when UTC has already rolled over", () => {
    // This is the assertion that fails if the refinement compares against UTC.
    expect(UpdateTabSchema.safeParse({ deliveryDate: TODAY_IN_AUSTIN }).success).toBe(true);
  });

  it('accepts tomorrow', () => {
    expect(UpdateTabSchema.safeParse({ deliveryDate: TOMORROW_IN_AUSTIN }).success).toBe(true);
  });

  it('still rejects yesterday in Austin', () => {
    const result = UpdateTabSchema.safeParse({ deliveryDate: YESTERDAY_IN_AUSTIN });
    expect(result.success).toBe(false);
  });

  it('still rejects a long-past date', () => {
    expect(UpdateTabSchema.safeParse({ deliveryDate: '2020-01-15' }).success).toBe(false);
  });

  it('the frozen instant really is inside the UTC/Austin split (guards the fixture)', () => {
    // If this ever fails, the constants above drifted and the tests above stop
    // proving anything.
    const utcDay = FROZEN_NOW.toISOString().slice(0, 10);
    const austinDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(FROZEN_NOW);

    expect(austinDay).toBe(TODAY_IN_AUSTIN);
    expect(utcDay).not.toBe(austinDay);
  });
});
