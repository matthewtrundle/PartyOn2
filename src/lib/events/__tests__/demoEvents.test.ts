/**
 * getDemoEvent is the allowlist that decides whether a caller-supplied slug
 * names a real event. Two unauthenticated paths depend on it returning null
 * for anything unknown: the abandon-nudge writer (which refuses to schedule
 * mail for an unknown event) and the cron (which refuses to send for one).
 *
 * A bare `DEMO_EVENTS[slug]` inherits from Object.prototype, so keys like
 * 'constructor' resolve to a truthy value and sail through every
 * `if (!event)` guard — then every field read off it is undefined.
 */

import { describe, it, expect } from 'vitest';
import { getDemoEvent, DEMO_EVENTS } from '../demoEvents';

describe('getDemoEvent', () => {
  it('resolves a real slug', () => {
    const event = getDemoEvent('brian-41st-birthday');
    expect(event).not.toBeNull();
    expect(event?.title).toBe("Brian's 41st Birthday Bash");
  });

  it('returns null for an unknown slug', () => {
    expect(getDemoEvent('not-a-real-party')).toBeNull();
  });

  it('returns null for inherited Object.prototype keys', () => {
    for (const key of [
      'constructor',
      'toString',
      'valueOf',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      '__proto__',
      '__defineGetter__',
    ]) {
      expect(getDemoEvent(key), `prototype key leaked through: ${key}`).toBeNull();
    }
  });

  it('returns null for empty and whitespace slugs', () => {
    expect(getDemoEvent('')).toBeNull();
    expect(getDemoEvent('   ')).toBeNull();
  });

  it('is case-sensitive — no near-miss slug resolves', () => {
    expect(getDemoEvent('BRIAN-41ST-BIRTHDAY')).toBeNull();
    expect(getDemoEvent('brian-41st-birthday ')).toBeNull();
  });

  it('every registered event carries the fields the email template reads', () => {
    // The cron feeds title/startsAt/timezone/venue/address straight into the
    // outbound email, so a half-filled registry entry would ship "undefined".
    for (const [slug, event] of Object.entries(DEMO_EVENTS)) {
      expect(event.title, `${slug}.title`).toBeTruthy();
      expect(event.startsAt, `${slug}.startsAt`).toBeTruthy();
      expect(event.timezone, `${slug}.timezone`).toBeTruthy();
      expect(event.venue, `${slug}.venue`).toBeTruthy();
      expect(event.address, `${slug}.address`).toBeTruthy();
      expect(Number.isNaN(new Date(event.startsAt).getTime()), `${slug}.startsAt parses`).toBe(false);
    }
  });
});
