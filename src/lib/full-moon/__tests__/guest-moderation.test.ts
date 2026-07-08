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

  it('catches profanity spelled out with single-letter spacing', () => {
    expect(isGuestNameAllowed('f u c k you')).toBe(false);
    expect(isGuestNameAllowed('a s s h o l e')).toBe(false);
  });

  it('does not false-positive on innocent substrings or legit names', () => {
    expect(isGuestNameAllowed('Cassandra Assante')).toBe(true); // contains "ass"
    expect(isGuestNameAllowed('Dick Johnson')).toBe(true); // "Dick" is a real name
    expect(isGuestNameAllowed('Scunthorpe')).toBe(true); // contains "cunt"
    expect(isGuestNameAllowed('Shitanshu Verma')).toBe(true); // contains "shit"
    expect(isGuestNameAllowed('Allan M')).toBe(true); // single trailing initial
  });

  it('honors the operator hide-list (case-insensitive, exact name)', () => {
    process.env.FULL_MOON_GUEST_HIDE = 'Banned Person, Someone Else';
    expect(isGuestNameAllowed('banned person')).toBe(false);
    expect(isGuestNameAllowed('BANNED PERSON')).toBe(false);
    expect(isGuestNameAllowed('Banned')).toBe(true); // partial name is not hidden
    expect(isGuestNameAllowed('Allan Marquez')).toBe(true);
  });
});
