import { describe, it, expect } from 'vitest';

import { isCompleteEmail, normalizeEmail } from '../email-validation';

describe('normalizeEmail', () => {
  it('accepts a complete address and trims + lowercases it', () => {
    expect(normalizeEmail('  A@B.CO ')).toBe('a@b.co');
    expect(normalizeEmail('anzola.hathorne@gmail.com')).toBe(
      'anzola.hathorne@gmail.com',
    );
    expect(normalizeEmail('Name+tag@Sub.Example.com')).toBe(
      'name+tag@sub.example.com',
    );
  });

  it('rejects mid-typing keystroke fragments', () => {
    for (const fragment of [
      'an@',
      'anz@',
      'anzo@',
      '@gmail.com',
      'a@gmail',
      'a@b',
      'a@b.',
      'a@b.c', // single-char TLD — still typing
      'plainaddress',
    ]) {
      expect(normalizeEmail(fragment)).toBeNull();
    }
  });

  it('rejects addresses containing internal whitespace', () => {
    expect(normalizeEmail('a b@c.com')).toBeNull();
    expect(normalizeEmail('a@b c.com')).toBeNull();
  });

  it('returns null for empty / missing input', () => {
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('   ')).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe('isCompleteEmail', () => {
  it('is true only for complete addresses', () => {
    expect(isCompleteEmail('a@b.co')).toBe(true);
    expect(isCompleteEmail('anzola.hathorne@gmail.com')).toBe(true);
  });

  it('is false for fragments and empties', () => {
    expect(isCompleteEmail('an@')).toBe(false);
    expect(isCompleteEmail('@gmail.com')).toBe(false);
    expect(isCompleteEmail('a@b.c')).toBe(false);
    expect(isCompleteEmail(null)).toBe(false);
    expect(isCompleteEmail(undefined)).toBe(false);
  });
});
