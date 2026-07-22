import { describe, expect, it } from 'vitest';
import {
  generateCodeBase,
  isPossibleDuplicate,
  isValidEmail,
  planRowAction,
} from '../planner';
import type { ParsedCreditRow } from '../types';

function makeRow(overrides: Partial<ParsedCreditRow>): ParsedCreditRow {
  return {
    sheetRow: 5,
    clientName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '5125551234',
    bookingDateISO: '2026-01-01',
    cruiseDateISO: '2026-02-01',
    amount: 50,
    sourceKey: 'key-1',
    rawRow: {},
    ...overrides,
  };
}

describe('isValidEmail', () => {
  it('accepts valid, rejects invalid/blank', () => {
    expect(isValidEmail('jane@example.com')).toBe(true);
    expect(isValidEmail('  jane@example.com ')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});

describe('planRowAction', () => {
  it('needs contact when there is no valid email', () => {
    expect(planRowAction(makeRow({ email: null })).kind).toBe('needs-contact');
    expect(planRowAction(makeRow({ email: 'garbage' })).kind).toBe('needs-contact');
  });

  it('mints without hold at or below the $300 threshold', () => {
    expect(planRowAction(makeRow({ amount: 50 }))).toEqual({ kind: 'mint', hold: false });
    expect(planRowAction(makeRow({ amount: 300 }))).toEqual({ kind: 'mint', hold: false });
  });

  it('holds strictly above $300 (over-threshold)', () => {
    expect(planRowAction(makeRow({ amount: 300.01 }))).toEqual({
      kind: 'mint', hold: true, holdReason: 'over-threshold',
    });
    expect(planRowAction(makeRow({ amount: 336.21 })).kind).toBe('mint');
  });

  it('holds with sanity-cap reason above $1000', () => {
    expect(planRowAction(makeRow({ amount: 1000.01 }))).toEqual({
      kind: 'mint', hold: true, holdReason: 'sanity-cap',
    });
  });
});

describe('generateCodeBase', () => {
  it('matches the existing LASTNAME + amount-digits convention', () => {
    expect(generateCodeBase('Sarah LeBlanc', 336.21)).toBe('LEBLANC33621');
    expect(generateCodeBase('Olivia Haraden', 125.26)).toBe('HARADEN12526');
    expect(generateCodeBase('Daniel Benson', 138.44)).toBe('BENSON13844');
  });

  it('falls back gracefully for single-word / empty names', () => {
    expect(generateCodeBase('Madonna', 100)).toBe('MADONNA10000');
    expect(generateCodeBase('123', 50)).toBe('PODCREDIT5000');
  });
});

describe('isPossibleDuplicate', () => {
  const row = makeRow({ sourceKey: 'key-A' });

  it('is true when a sibling has a different source key', () => {
    expect(isPossibleDuplicate(row, [{ sourceKey: 'key-B' }])).toBe(true);
  });

  it('is false with no siblings or only same-key siblings', () => {
    expect(isPossibleDuplicate(row, [])).toBe(false);
    expect(isPossibleDuplicate(row, [{ sourceKey: 'key-A' }])).toBe(false);
  });
});
