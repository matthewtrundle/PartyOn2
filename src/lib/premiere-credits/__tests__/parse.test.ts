import { describe, expect, it } from 'vitest';
import {
  locateHeader,
  mapHeaders,
  normalizeHeader,
  normalizeName,
  extractLastName,
  parseBookingDateToISO,
  parseCruiseDateToISO,
  parseCurrencyUSD,
  parseRows,
} from '../parse';
import type { HeaderMap, RawCreditRow } from '../types';

// The real POD Credits tab header (order matters for index assertions).
const HEADER = [
  'POD Credit', 'POD Code', 'Status', 'Booking Date', 'Client Name',
  'Phone Number', 'Email Address', 'Actual Cruise Date', 'Actual Time Slot',
  'Experience', 'Boat', 'Girls', 'Guys', 'ADD-ON/S',
];

describe('parseCurrencyUSD', () => {
  it('parses common cell formats to USD numbers', () => {
    expect(parseCurrencyUSD('$125.26')).toBe(125.26);
    expect(parseCurrencyUSD('₱250.00')).toBe(250);
    expect(parseCurrencyUSD('$1,234.56')).toBe(1234.56);
    expect(parseCurrencyUSD('250')).toBe(250);
    expect(parseCurrencyUSD('₱ 300')).toBe(300);
    expect(parseCurrencyUSD('$0.00')).toBe(0);
    expect(parseCurrencyUSD('(50)')).toBe(-50);
  });

  it('returns null for blank / unparseable', () => {
    expect(parseCurrencyUSD('')).toBeNull();
    expect(parseCurrencyUSD('   ')).toBeNull();
    expect(parseCurrencyUSD('abc')).toBeNull();
    expect(parseCurrencyUSD(null)).toBeNull();
    expect(parseCurrencyUSD(undefined)).toBeNull();
  });
});

describe('normalizeHeader / mapHeaders', () => {
  it('normalizes to alnum-only uppercase', () => {
    expect(normalizeHeader('POD Credit')).toBe('PODCREDIT');
    expect(normalizeHeader('Email Address')).toBe('EMAILADDRESS');
    expect(normalizeHeader('ADD-ON/S')).toBe('ADDONS');
  });

  it('maps the real header row to the right indexes', () => {
    const h = mapHeaders(HEADER);
    expect(h.amount).toBe(0);
    expect(h.code).toBe(1);
    expect(h.status).toBe(2);
    expect(h.bookingDate).toBe(3);
    expect(h.client).toBe(4);
    expect(h.phone).toBe(5);
    expect(h.email).toBe(6);
    expect(h.cruiseDate).toBe(7);
  });

  it('tolerates renamed / reordered / missing columns', () => {
    const h = mapHeaders(['Client Name', 'POD Credit Amount', 'Cruise Date']);
    expect(h.client).toBe(0);
    expect(h.amount).toBe(1);
    expect(h.cruiseDate).toBe(2);
    expect(h.email).toBeNull();
  });
});

describe('locateHeader', () => {
  it('skips leading blank/merged rows and finds the header', () => {
    const grid = [[], ['', '', ''], HEADER, ['$50', '', '', '', 'Jane Doe']];
    const located = locateHeader(grid);
    expect(located).not.toBeNull();
    expect(located?.headerIndex).toBe(2);
    expect(located?.header.client).toBe(4);
  });

  it('returns null when there is no amount+client header', () => {
    expect(locateHeader([['Foo', 'Bar'], ['a', 'b']])).toBeNull();
  });
});

describe('date parsing', () => {
  it('parses MM-DD-YYYY and M/D/YYYY booking dates', () => {
    expect(parseBookingDateToISO('10-21-2025')).toBe('2025-10-21');
    expect(parseBookingDateToISO('3/6/2026')).toBe('2026-03-06');
    expect(parseBookingDateToISO('')).toBeNull();
    expect(parseBookingDateToISO('May 1, 2026')).toBeNull();
    expect(parseBookingDateToISO('13-40-2026')).toBeNull();
  });

  it('rejects impossible calendar dates', () => {
    expect(parseBookingDateToISO('02-30-2026')).toBeNull();
    expect(parseBookingDateToISO('04-31-2026')).toBeNull();
    expect(parseBookingDateToISO('02-29-2026')).toBeNull(); // 2026 not a leap year
    expect(parseBookingDateToISO('02-29-2028')).toBe('2028-02-29'); // leap year OK
    expect(parseCruiseDateToISO('February 30, 2026')).toBeNull();
  });

  it('parses long-form cruise dates', () => {
    expect(parseCruiseDateToISO('May 23, 2026')).toBe('2026-05-23');
    expect(parseCruiseDateToISO('April 2, 2026')).toBe('2026-04-02');
    expect(parseCruiseDateToISO('Foo 1, 2026')).toBeNull();
    // tolerates a numeric cruise date too
    expect(parseCruiseDateToISO('06-19-2026')).toBe('2026-06-19');
  });
});

describe('name helpers', () => {
  it('extracts an uppercase last name', () => {
    expect(extractLastName('Sarah LeBlanc')).toBe('LEBLANC');
    expect(extractLastName('Connor Hartman')).toBe('HARTMAN');
    expect(extractLastName('Madonna')).toBe('MADONNA');
    expect(extractLastName('  ')).toBe('');
  });

  it('normalizes names for the key', () => {
    expect(normalizeName('  Sarah   LeBlanc ')).toBe('sarah leblanc');
    expect(normalizeName("O'Brien")).toBe('obrien');
  });
});

describe('parseRows', () => {
  const header: HeaderMap = mapHeaders(HEADER);
  const row = (cells: Partial<Record<number, string>>): RawCreditRow => {
    const arr = new Array(HEADER.length).fill('');
    Object.entries(cells).forEach(([i, v]) => (arr[Number(i)] = v));
    return { sheetRow: 5, cells: arr };
  };

  it('keeps a good row and derives fields', () => {
    const { rows } = parseRows(header, [
      row({ 0: '$336.21', 3: '12-24-2025', 4: 'Sarah LeBlanc', 5: '2817148839', 6: 'sarah@example.com', 7: 'July 19, 2026' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(336.21);
    expect(rows[0].clientName).toBe('Sarah LeBlanc');
    expect(rows[0].email).toBe('sarah@example.com');
    expect(rows[0].bookingDateISO).toBe('2025-12-24');
    expect(rows[0].cruiseDateISO).toBe('2026-07-19');
    expect(rows[0].sourceKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it('skips existing-code, $0.00, and blank-client rows', () => {
    const { rows } = parseRows(header, [
      row({ 0: '$125.26', 1: 'CARNEY12526', 4: 'Nicole Carney' }), // already coded
      row({ 0: '$0.00' }),                                          // filler
      row({ 0: '$100.00', 4: '' }),                                 // no client
    ]);
    expect(rows).toHaveLength(0);
  });

  it('parses a no-email row (contact resolved later by the planner)', () => {
    const { rows } = parseRows(header, [row({ 0: '$50', 4: 'No Email' })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBeNull();
  });
});
