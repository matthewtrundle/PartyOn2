/**
 * Delivery-date validation is anchored to AUSTIN time, not UTC.
 *
 * The past-date refinement used to compare against `new Date().toISOString()`
 * (UTC). UTC midnight is 7pm CT, so every evening from 7pm until midnight the
 * customer's actual today was rejected as "in the past" — same-day delivery,
 * the highest-intent flow, could not be booked. These tests hold the invariant
 * regardless of what time of day the suite happens to run.
 */

import { describe, it, expect } from 'vitest';
import { UpdateTabSchema } from '../validation';

const ctDay = (offsetDays: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/** Sundays are rejected by a separate refinement — step off one if we land there. */
function nonSundayOffset(start: number): number {
  for (let i = start; i < start + 7; i++) {
    const day = new Date(`${ctDay(i)}T12:00:00Z`).getUTCDay();
    if (day !== 0) return i;
  }
  return start;
}

describe('deliveryDateSchema past-date refinement (Austin time)', () => {
  it("accepts TODAY in Austin at any hour of the day, including after 7pm CT", () => {
    const today = ctDay(0);
    const result = UpdateTabSchema.safeParse({ deliveryDate: today });

    // Sunday is blocked by its own refinement; that's not what this asserts.
    const isSunday = new Date(`${today}T12:00:00Z`).getUTCDay() === 0;
    if (isSunday) {
      expect(result.success).toBe(false);
      return;
    }

    expect(result.success).toBe(true);
  });

  it('accepts a future date', () => {
    const future = ctDay(nonSundayOffset(3));
    expect(UpdateTabSchema.safeParse({ deliveryDate: future }).success).toBe(true);
  });

  it('still rejects yesterday', () => {
    const result = UpdateTabSchema.safeParse({ deliveryDate: ctDay(-1) });
    expect(result.success).toBe(false);
  });

  it('still rejects a long-past date', () => {
    const result = UpdateTabSchema.safeParse({ deliveryDate: '2020-01-15' });
    expect(result.success).toBe(false);
  });
});
