/**
 * Next-best-action matrix: channel bias (REPLY > CALL > TEXT > EMAIL), the
 * hot+phone+near-event call trigger, and the closed/snoozed suppressions.
 */

import { describe, it, expect } from 'vitest';
import { nextActionFor, type NextActionInput } from '../next-action';

const base: NextActionInput = {
  needsResponse: false,
  hasPhone: true,
  hasEmail: true,
  temperature: 'warm',
  eventDate: null,
  stage: 'NEW',
  snoozedUntil: null,
  now: new Date('2026-07-23T12:00:00Z'),
};
const at = (over: Partial<NextActionInput>) => nextActionFor({ ...base, ...over });
const inDays = (n: number) => new Date(base.now.getTime() + n * 86_400_000).toISOString().slice(0, 10);

describe('nextActionFor', () => {
  it('returns null for closed, off-board, or future-snoozed cards', () => {
    expect(at({ stage: 'WON' })).toBeNull();
    expect(at({ stage: 'LOST' })).toBeNull();
    expect(at({ stage: null })).toBeNull();
    expect(at({ snoozedUntil: inDays(3) })).toBeNull();
  });

  it('an unanswered signal is REPLY, outranking temperature', () => {
    expect(at({ needsResponse: true, temperature: 'hot' })).toEqual({
      kind: 'REPLY',
      reason: 'Unanswered — reply now',
    });
  });

  it('hot + phone + event within 14 days → CALL with the countdown', () => {
    expect(at({ temperature: 'hot', hasPhone: true, eventDate: inDays(9) })).toEqual({
      kind: 'CALL',
      reason: 'Hot · event in 9d',
    });
  });

  it('hot + phone but far/absent event → CALL; hot without phone → EMAIL', () => {
    expect(at({ temperature: 'hot', hasPhone: true, eventDate: inDays(40) })?.kind).toBe('CALL');
    expect(at({ temperature: 'hot', hasPhone: true, eventDate: null })).toEqual({
      kind: 'CALL',
      reason: 'Hot lead — call',
    });
    expect(at({ temperature: 'hot', hasPhone: false })).toEqual({
      kind: 'EMAIL',
      reason: 'Hot — email now',
    });
  });

  it('warm prefers TEXT when a phone exists, else EMAIL', () => {
    expect(at({ temperature: 'warm', hasPhone: true })).toEqual({
      kind: 'TEXT',
      reason: 'Warm — text intro',
    });
    expect(at({ temperature: 'warm', hasPhone: false })).toEqual({
      kind: 'EMAIL',
      reason: 'Warm — email intro',
    });
  });

  it('cold/unscored nurture: EMAIL when emailable, TEXT when phone-only, null when neither', () => {
    expect(at({ temperature: 'cold', hasEmail: true })?.kind).toBe('EMAIL');
    expect(at({ temperature: null, hasEmail: true })?.reason).toBe('Nurture');
    expect(at({ temperature: 'cold', hasEmail: false, hasPhone: true })).toEqual({
      kind: 'TEXT',
      reason: 'Nurture — text',
    });
    expect(at({ temperature: 'cold', hasEmail: false, hasPhone: false })).toBeNull();
  });
});
