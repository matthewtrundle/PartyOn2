import { describe, it, expect } from 'vitest';
import {
  deriveFullMoonState,
  deadlineWindow,
  deadlineTimestamp,
  fullMoonPostponedKey,
} from '../event-state';
import { EVENT } from '@/components/full-moon/event';

describe('fullMoonPostponedKey', () => {
  it('scopes the postponed flag to a single event date', () => {
    expect(fullMoonPostponedKey('2026-08-28')).toBe('full_moon_postponed_2026-08-28');
  });

  it('gives different dates different keys, so a rescheduled event does not inherit the old postponed state', () => {
    // The Aug 1 cruise was postponed by the deadline cron on 2026-07-25. With a
    // single global key, the Aug 28 page would have launched showing POSTPONED.
    expect(fullMoonPostponedKey('2026-08-01')).not.toBe(fullMoonPostponedKey('2026-08-28'));
  });

  it('defaults to the current event date', () => {
    expect(fullMoonPostponedKey()).toBe(`full_moon_postponed_${EVENT.isoDate}`);
  });
});

describe('deriveFullMoonState', () => {
  const MIN = 32;

  it('is "working" below the minimum when not postponed', () => {
    expect(deriveFullMoonState(0, MIN, false)).toBe('working');
    expect(deriveFullMoonState(31, MIN, false)).toBe('working');
  });

  it('is "met" at or above the minimum when not postponed', () => {
    expect(deriveFullMoonState(32, MIN, false)).toBe('met');
    expect(deriveFullMoonState(50, MIN, false)).toBe('met');
  });

  it('postponed wins regardless of the sold count', () => {
    expect(deriveFullMoonState(0, MIN, true)).toBe('cancelled');
    expect(deriveFullMoonState(31, MIN, true)).toBe('cancelled');
    expect(deriveFullMoonState(45, MIN, true)).toBe('cancelled');
  });
});

describe('deadlineWindow (event 2026-08-01, deadline 7 days)', () => {
  const ISO = '2026-08-01';
  const DAYS = 7;

  it('deadline is 2026-07-25 00:00 UTC', () => {
    expect(deadlineTimestamp(ISO, DAYS)).toBe(Date.parse('2026-07-25T00:00:00Z'));
  });

  it('is "not-yet" before the deadline', () => {
    expect(deadlineWindow(Date.parse('2026-07-24T23:59:00Z'), ISO, DAYS)).toBe('not-yet');
  });

  it('is "in-window" from the deadline through the event day', () => {
    expect(deadlineWindow(Date.parse('2026-07-25T00:00:01Z'), ISO, DAYS)).toBe('in-window');
    expect(deadlineWindow(Date.parse('2026-07-28T12:00:00Z'), ISO, DAYS)).toBe('in-window');
    expect(deadlineWindow(Date.parse('2026-08-01T20:00:00Z'), ISO, DAYS)).toBe('in-window');
  });

  it('is "past-event" after the event day', () => {
    expect(deadlineWindow(Date.parse('2026-08-02T00:00:01Z'), ISO, DAYS)).toBe('past-event');
  });
});
