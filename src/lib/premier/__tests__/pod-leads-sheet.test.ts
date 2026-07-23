import { describe, expect, it } from 'vitest';
import { sheetCell } from '../pod-leads-sheet';

describe('sheetCell — spreadsheet formula-injection guard', () => {
  it('quote-prefixes any value with a formula-trigger leading char', () => {
    expect(sheetCell('=HYPERLINK("http://evil.test","clickme")')).toBe(
      `'=HYPERLINK("http://evil.test","clickme")`,
    );
    expect(sheetCell('+1234')).toBe(`'+1234`);
    expect(sheetCell('-cmd')).toBe(`'-cmd`);
    expect(sheetCell('@import')).toBe(`'@import`);
    expect(sheetCell('\t=1+1')).toBe(`'\t=1+1`);
  });

  it('leaves ordinary values untouched', () => {
    expect(sheetCell('Sarah Miller')).toBe('Sarah Miller');
    expect(sheetCell('sarah@example.com')).toBe('sarah@example.com'); // @ not leading
    expect(sheetCell('512-555-1234')).toBe('512-555-1234'); // - not leading
    expect(sheetCell('12')).toBe('12');
    expect(sheetCell('')).toBe('');
  });
});
