/**
 * Premiere Credit automation — pure parsing.
 *
 * No IO, no Prisma, no googleapis — every function here is deterministic and
 * unit-tested. Handles the quirks of the Premiere "POD Credits" sheet tab:
 * leading blank rows, header renames/reordering, `$0.00` filler rows, `₱`
 * locale symbols (values are USD), emails with stray spaces, and two date
 * formats (MM-DD-YYYY booking dates, "Month D, YYYY" cruise dates).
 */

import { createHash } from 'crypto';
import type { HeaderMap, ParsedCreditRow, RawCreditRow } from './types';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Uppercase + strip everything but A–Z0–9 for tolerant header matching. */
export function normalizeHeader(raw: string): string {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Header synonyms, matched against the normalized header text. */
const HEADER_SYNONYMS: Record<keyof HeaderMap, string[]> = {
  amount: ['PODCREDIT', 'CREDITAMOUNT', 'PODCREDITAMOUNT', 'CREDIT', 'AMOUNT'],
  code: ['PODCODE', 'CODE'],
  status: ['STATUS'],
  bookingDate: ['BOOKINGDATE'],
  client: ['CLIENTNAME', 'CLIENT', 'NAME'],
  phone: ['PHONENUMBER', 'PHONE', 'CELL'],
  email: ['EMAILADDRESS', 'EMAIL'],
  cruiseDate: ['ACTUALCRUISEDATE', 'CRUISEDATE'],
};

/**
 * Map a header row to column indexes. First exact-normalized match wins per
 * field; unmatched fields are null. Earlier synonyms take priority so that
 * e.g. "POD CREDIT" binds to `amount` before a bare "CREDIT" elsewhere.
 */
export function mapHeaders(headerRow: string[]): HeaderMap {
  const normalized = headerRow.map(normalizeHeader);
  const find = (field: keyof HeaderMap): number | null => {
    for (const syn of HEADER_SYNONYMS[field]) {
      const idx = normalized.indexOf(syn);
      if (idx !== -1) return idx;
    }
    return null;
  };
  return {
    amount: find('amount'),
    code: find('code'),
    status: find('status'),
    bookingDate: find('bookingDate'),
    client: find('client'),
    phone: find('phone'),
    email: find('email'),
    cruiseDate: find('cruiseDate'),
  };
}

/**
 * Locate the header row within raw sheet data (the tab has leading blank/merged
 * rows). The header is the first row that resolves BOTH an amount and a client
 * column. Returns the 0-based array index and its map, or null if none.
 */
export function locateHeader(
  sheetData: string[][],
): { headerIndex: number; header: HeaderMap } | null {
  for (let i = 0; i < sheetData.length; i++) {
    const header = mapHeaders(sheetData[i] || []);
    if (header.amount !== null && header.client !== null) {
      return { headerIndex: i, header };
    }
  }
  return null;
}

/**
 * Parse a currency cell to a USD number. Strips `$`, `₱` (sheet locale
 * artifact), commas and spaces; treats `(50)` as -50. Returns null for
 * unparseable/blank cells, 0 for an explicit zero.
 */
export function parseCurrencyUSD(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === '') return null;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$₱,\s]/g, '');
  if (s.startsWith('-')) {
    sign *= -1;
    s = s.slice(1);
  }
  if (s === '' || !/^\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? sign * n : null;
}

/** Zero-pad to 2 digits. */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Parse a numeric booking date (`MM-DD-YYYY` or `M/D/YYYY`) to ISO YYYY-MM-DD.
 * Returns null if it does not look like a numeric mm dd yyyy triple.
 */
export function parseBookingDateToISO(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (!isRealDate(year, month, day)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** True when year/month/day is a real calendar date (rejects e.g. 02-30). */
function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Parse a long-form cruise date ("May 23, 2026" / "April 2, 2026") to ISO
 * YYYY-MM-DD. Returns null if the month name is not recognized.
 */
export function parseCruiseDateToISO(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return parseBookingDateToISO(raw); // tolerate a numeric cruise date too
  const monthIdx = MONTHS.indexOf(m[1]);
  if (monthIdx === -1) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (!isRealDate(year, monthIdx + 1, day)) return null;
  return `${year}-${pad2(monthIdx + 1)}-${pad2(day)}`;
}

/** Lowercase, strip non-alphanumerics, collapse whitespace — for the key. */
export function normalizeName(raw: string | undefined | null): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract an uppercase last name (last whitespace token, letters only). Used
 * for the discount code string. "Sarah LeBlanc" → "LEBLANC".
 */
export function extractLastName(raw: string | undefined | null): string {
  const cleaned = (raw || '').trim().replace(/\s+/g, ' ');
  if (cleaned === '') return '';
  const tokens = cleaned.split(' ');
  const last = tokens[tokens.length - 1];
  return last.toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Stable idempotency key for a credit row: sha256 of normalized name + booking
 * date + amount. Row numbers are never part of it (rows get inserted/reordered
 * by humans). Amount is fixed to 2 decimals so 138.4 and 138.40 match.
 */
export function computeSourceKey(
  clientName: string,
  bookingDateISO: string | null,
  amount: number,
): string {
  const material = `premiere-credit|${normalizeName(clientName)}|${bookingDateISO ?? ''}|${amount.toFixed(2)}`;
  return createHash('sha256').update(material).digest('hex');
}

/** Trim a cell, returning null for blank. */
function cell(row: string[], idx: number | null): string | null {
  if (idx == null) return null;
  const v = (row[idx] ?? '').trim();
  return v === '' ? null : v;
}

/**
 * Turn raw sheet rows into parsed candidate rows, applying the skip filter:
 * blank client, amount ≤ 0 / unparseable, or an existing POD Code in the sheet
 * (already handled manually — this also grandfathers previously-issued codes).
 * Every skip is recorded as a warning.
 */
export function parseRows(
  header: HeaderMap,
  rawRows: RawCreditRow[],
): { rows: ParsedCreditRow[]; warnings: string[] } {
  const rows: ParsedCreditRow[] = [];
  const warnings: string[] = [];

  for (const { sheetRow, cells } of rawRows) {
    const clientName = cell(cells, header.client);
    const amountRaw = header.amount == null ? null : cells[header.amount];
    const amount = parseCurrencyUSD(amountRaw);
    const existingCode = cell(cells, header.code);

    if (existingCode) continue; // already issued — silent skip (grandfathered)
    if (!clientName) {
      if (amount && amount > 0) warnings.push(`row ${sheetRow}: amount but no client name — skipped`);
      continue;
    }
    if (amount == null || amount <= 0) continue; // filler / zero rows

    const bookingDateISO = parseBookingDateToISO(cell(cells, header.bookingDate) ?? undefined);
    const cruiseDateISO = parseCruiseDateToISO(cell(cells, header.cruiseDate) ?? undefined);
    const email = cell(cells, header.email);
    const phone = cell(cells, header.phone);

    const rawRow: Record<string, string> = {};
    (Object.keys(header) as Array<keyof HeaderMap>).forEach((k) => {
      const idx = header[k];
      if (idx != null && cells[idx] != null) rawRow[k] = String(cells[idx]).trim();
    });

    rows.push({
      sheetRow,
      clientName,
      email,
      phone,
      bookingDateISO,
      cruiseDateISO,
      amount,
      sourceKey: computeSourceKey(clientName, bookingDateISO, amount),
      rawRow,
    });
  }

  return { rows, warnings };
}
