/**
 * Pure parser for Wells Fargo "Download Account Activity" CSV rows — used to
 * extend the bank-truth P&L back before Plaid's 730-day ceiling (Jan 2024, the
 * earliest WF would release; 2023 is unreachable). See
 * scripts/finance/import-wf-statements.ts for the operator-gated importer and
 * scripts/finance/extract-wf-pdf.py for the PDF→CSV step that feeds this the
 * same column shape.
 *
 * The one thing that silently corrupts everything is the SIGN. Wells Fargo's
 * activity export uses the OPPOSITE convention from Plaid:
 *   - WF CSV:  debit/outflow = NEGATIVE, credit/inflow = POSITIVE
 *   - Plaid:   outflow = POSITIVE, inflow = NEGATIVE  (what the rest of the
 *              finance pipeline — plaid_transactions.amount — expects)
 * so every amount is flipped here: `plaidAmountCents = -wfAmountCents`.
 *
 * Statement rows carry NO Plaid Personal Finance Category, so
 * categorizeBankOutflow (plaid-category-map.ts) loses its PFC precedence steps
 * and an owner draw like "Online Transfer to B Hill Entertainment LLC" would
 * fall through to the /entertainment/ keyword and become a MEALS expense. To
 * avoid that WITHOUT touching the shared, security-reviewed category rules, this
 * parser supplies a `pfcPrimaryHint` for two unambiguous financing shapes only —
 * an owner DRAW out to one of the owners' known linked accounts, and a PeopleFund
 * loan payment — feeding them into the EXISTING PFC map (TRANSFER_OUT /
 * LOAN_PAYMENTS → non_operating). The transfer hint is ANCHORED to the specific
 * owner accounts (mirroring OWNER_CAPITAL_RULES), NOT a bare "Online Transfer
 * to …": a broad match would sweep a genuine bill paid via a linked recipient
 * into non_operating and silently drop it from the expense base. Everything else
 * gets no hint and runs the normal pipeline.
 *
 * Pure + dependency-free so it is unit-testable; the importer handles I/O,
 * hashing the `dedupeKey` into a transaction id, and the DB writes.
 */

/** Plaid PFC-primary hint the importer stamps so the shared category map can
 * resolve a statement outflow that has no real PFC. Only the two unambiguous
 * financing/transfer shapes are hinted; see file header. */
export type PfcPrimaryHint = 'TRANSFER_OUT' | 'LOAN_PAYMENTS';

export interface WfStatementRow {
  /** Post date, ISO 'YYYY-MM-DD' (WF activity dates are MM/DD/YYYY). */
  dateISO: string;
  /** Cleaned single-line description (whitespace collapsed, original casing). */
  descriptor: string;
  /** Check number when the row is a check, else null. */
  checkNumber: string | null;
  /**
   * Amount in Plaid convention (positive = outflow/debit, negative =
   * inflow/credit) — already sign-flipped from the WF export. Integer cents.
   */
  plaidAmountCents: number;
  /** true when this is a deposit/credit (Plaid-negative); for readability. */
  isInflow: boolean;
  /** PFC-primary hint for the shared category map (outflows only), else null. */
  pfcPrimaryHint: PfcPrimaryHint | null;
  /**
   * Deterministic idempotency + cross-source dedupe key:
   * `dateISO|signedCents|normalizedDescriptor|checkNumber`. Same real
   * transaction from a PDF statement and from the CSV normalizes to the same
   * key (WF descriptors carry unique auth/ref codes; checks add their number),
   * so re-runs and PDF↔CSV overlaps never double-count.
   */
  dedupeKey: string;
}

/**
 * WF "Online Transfer to …" an OWNER's linked account = an owner draw (money
 * OUT to the owners' personal / LLC accounts), the mirror of OWNER_CAPITAL_RULES.
 * ANCHORED to the specific owner accounts observed on the feed — Brian's B Hill
 * Entertainment LLC and "Hill B" checking, Allan's USAA / A. Henslee — so a
 * transfer paying a genuine VENDOR via a linked recipient is NOT swept into
 * non_operating and dropped from the expense base. If a new owner-account
 * descriptor appears it simply won't be hinted (runs the normal pipeline), which
 * is the safe direction; extend this list rather than loosening it.
 */
const HINT_OWNER_DRAW_OUT =
  /online\s+transfer\s+to\b.*(b\.?\s*hill\s+entertainment|\bhill\s+b\b|\busaa\b|\bhenslee\b)/i;
/** Any outflow to the CDFI lender = a loan payment (its name is unique). */
const HINT_PEOPLEFUND = /\bpeoplefund\b/i;

/** Lowercase + collapse all whitespace runs to one space + trim. */
export function normalizeDescriptor(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Parse one RFC-4180 CSV line into fields. Handles quoted fields (the WF export
 * quotes every field) with embedded commas and doubled-quote escapes (`""`).
 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

/** MM/DD/YYYY → YYYY-MM-DD. Returns null if not a valid date shape. */
export function toIsoDate(mdy: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(mdy.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Parse a WF signed amount string ("-3,750.00", "629.84", "$16,959.43") to
 * cents. Returns null when the token is not a money value. */
export function parseWfAmountCents(raw: string): number | null {
  const t = raw.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

function pfcHintFor(descriptor: string, isInflow: boolean): PfcPrimaryHint | null {
  // Hints only steer outflow categorization (categorizeBankOutflow); inflows are
  // classified by descriptor (classifyBankInflow) and ignore PFC.
  if (isInflow) return null;
  if (HINT_OWNER_DRAW_OUT.test(descriptor)) return 'TRANSFER_OUT';
  if (HINT_PEOPLEFUND.test(descriptor)) return 'LOAN_PAYMENTS';
  return null;
}

export interface ParseWfCsvResult {
  rows: WfStatementRow[];
  /** Non-fatal issues (skipped/malformed lines), for the importer to log. */
  skipped: Array<{ line: number; reason: string; raw: string }>;
}

const HEADER_TOKENS = new Set(['DATE', 'DESCRIPTION', 'AMOUNT']);

/**
 * Parse a full WF activity CSV (Checking.csv or a PDF-derived CSV in the same
 * DATE,DESCRIPTION,AMOUNT,CHECK #,STATUS shape). Blank lines and the header row
 * are skipped; malformed rows are collected in `skipped` rather than thrown, so
 * one bad line never aborts an import.
 */
export function parseWfActivityCsv(csvText: string): ParseWfCsvResult {
  const rows: WfStatementRow[] = [];
  const skipped: Array<{ line: number; reason: string; raw: string }> = [];
  const lines = csvText.split(/\r\n|\n|\r/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === '') continue;
    const fields = parseCsvLine(raw);
    // Expect: DATE, DESCRIPTION, AMOUNT, CHECK #, STATUS (STATUS optional).
    if (fields.length < 3) {
      skipped.push({ line: i + 1, reason: 'too few columns', raw });
      continue;
    }
    const [dateRaw, descRaw, amountRaw, checkRaw] = fields;
    // Skip the header row.
    if (HEADER_TOKENS.has(dateRaw.trim().toUpperCase())) continue;

    const dateISO = toIsoDate(dateRaw);
    if (!dateISO) {
      skipped.push({ line: i + 1, reason: `unparseable date "${dateRaw}"`, raw });
      continue;
    }
    const wfCents = parseWfAmountCents(amountRaw);
    if (wfCents === null) {
      skipped.push({ line: i + 1, reason: `unparseable amount "${amountRaw}"`, raw });
      continue;
    }
    if (wfCents === 0) {
      // A zero-amount activity row carries no ledger effect; skip (rare).
      skipped.push({ line: i + 1, reason: 'zero amount', raw });
      continue;
    }

    const descriptor = descRaw.replace(/\s+/g, ' ').trim();
    const checkNumber = checkRaw && checkRaw.trim() !== '' ? checkRaw.trim() : null;
    // Flip WF sign → Plaid convention (outflow positive, inflow negative).
    const plaidAmountCents = -wfCents;
    const isInflow = plaidAmountCents < 0;
    const pfcPrimaryHint = pfcHintFor(descriptor, isInflow);
    const dedupeKey = [
      dateISO,
      plaidAmountCents,
      normalizeDescriptor(descriptor),
      checkNumber ?? '',
    ].join('|');

    rows.push({
      dateISO,
      descriptor,
      checkNumber,
      plaidAmountCents,
      isInflow,
      pfcPrimaryHint,
      dedupeKey,
    });
  }

  return { rows, skipped };
}
