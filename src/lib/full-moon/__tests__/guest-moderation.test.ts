import { afterEach, describe, expect, it } from 'vitest';
import { isGuestNameAllowed } from '../guest-moderation';

describe('isGuestNameAllowed', () => {
  const original = process.env.FULL_MOON_GUEST_HIDE;
  afterEach(() => {
    if (original === undefined) delete process.env.FULL_MOON_GUEST_HIDE;
    else process.env.FULL_MOON_GUEST_HIDE = original;
  });

  it('allows ordinary names', () => {
    expect(isGuestNameAllowed('Allan Marquez')).toBe(true);
    expect(isGuestNameAllowed('María José')).toBe(true);
    expect(isGuestNameAllowed('Jo')).toBe(true);
  });

  it('rejects empty / whitespace names', () => {
    expect(isGuestNameAllowed('')).toBe(false);
    expect(isGuestNameAllowed('   ')).toBe(false);
    expect(isGuestNameAllowed(null)).toBe(false);
    expect(isGuestNameAllowed(undefined)).toBe(false);
  });

  it('rejects profane tokens regardless of case/spacing', () => {
    expect(isGuestNameAllowed('Fuck Face')).toBe(false);
    expect(isGuestNameAllowed('john ASSHOLE')).toBe(false);
    expect(isGuestNameAllowed('Bitch McGee')).toBe(false);
  });

  it('catches hard slurs even run together', () => {
    expect(isGuestNameAllowed('xxniggerxx')).toBe(false);
    expect(isGuestNameAllowed('Faggot99')).toBe(false);
  });

  it('does not false-positive on innocent substrings', () => {
    expect(isGuestNameAllowed('Cassandra Assante')).toBe(true); // contains "ass"
    expect(isGuestNameAllowed('Dickinson')).toBe(true); // surname, not the token "dick"
    expect(isGuestNameAllowed('Scunthorpe')).toBe(true);
  });

  it('honors the operator hide-list (case-insensitive, exact name)', () => {
    process.env.FULL_MOON_GUEST_HIDE = 'Banned Person, Someone Else';
    expect(isGuestNameAllowed('banned person')).toBe(false);
    expect(isGuestNameAllowed('BANNED PERSON')).toBe(false);
    expect(isGuestNameAllowed('Banned')).toBe(true); // partial name is not hidden
    expect(isGuestNameAllowed('Allan Marquez')).toBe(true);
  });
});
