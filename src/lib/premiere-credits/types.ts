/**
 * Premiere Credit automation — shared types.
 *
 * The pipeline: read the Premiere "POD Credits" sheet tab → parse rows → plan
 * an action per row → mint a single-use FIXED_AMOUNT Discount → deliver the
 * code by email + SMS. Redemption is derived live from the linked Discount,
 * never stored on the grant. See src/lib/premiere-credits/.
 */

/**
 * Grant lifecycle. Stored as a plain string column (not a Postgres enum) so
 * lifecycle tweaks never need a migration.
 *
 * - NEEDS_CONTACT — no usable email on the row; NO discount is minted.
 * - READY — discount minted, amount within auto-send threshold, awaiting send.
 * - HELD_FOR_APPROVAL — discount minted, amount over threshold; needs approval.
 * - SENDING — transient claim while a send is in flight (concurrency guard).
 * - SENT — customer email send succeeded.
 * - SEND_FAILED — customer email send failed; `error` is populated.
 * - CANCELED — voided by an operator; the linked discount is deactivated.
 */
export type GrantStatus =
  | 'PENDING'
  | 'NEEDS_CONTACT'
  | 'READY'
  | 'HELD_FOR_APPROVAL'
  | 'SENDING'
  | 'SENT'
  | 'SEND_FAILED'
  | 'CANCELED';

/** Why a grant is held / needs attention (free-form, for the admin UI). */
export type HoldReason = 'over-threshold' | 'sanity-cap' | 'possible-duplicate';

/**
 * Column index map resolved from the sheet's header row. Any column the parser
 * could not locate is `null`. `amount` and `client` are the only required
 * columns — a missing one is a hard, surfaced error.
 */
export interface HeaderMap {
  amount: number | null;
  code: number | null;
  status: number | null;
  bookingDate: number | null;
  client: number | null;
  phone: number | null;
  email: number | null;
  cruiseDate: number | null;
}

/** A raw sheet row paired with its 1-based sheet row number. */
export interface RawCreditRow {
  /** 1-based row number in the sheet (header row is row 1). */
  sheetRow: number;
  cells: string[];
}

/**
 * A parsed, validated candidate row ready for planning. Produced only for rows
 * that pass the skip filter (positive amount, non-blank client, no existing
 * POD Code in the sheet).
 */
export interface ParsedCreditRow {
  sheetRow: number;
  clientName: string;
  email: string | null;
  phone: string | null;
  /** ISO YYYY-MM-DD, or null if unparseable. */
  bookingDateISO: string | null;
  cruiseDateISO: string | null;
  amount: number;
  /** sha256 idempotency key derived from name + booking date + amount. */
  sourceKey: string;
  /** The raw cells, captured for audit on the grant row. */
  rawRow: Record<string, string>;
}

/** Result of reading + parsing the sheet. */
export interface SheetReadResult {
  header: HeaderMap;
  rows: ParsedCreditRow[];
  /** Non-fatal issues (skipped rows, unparseable cells) for logging. */
  warnings: string[];
}

/**
 * The action the planner decides for a single parsed row. Rows that should be
 * ignored entirely are filtered out earlier (parseRows), so the planner only
 * ever decides between minting and needing contact info.
 */
export type RowAction =
  | { kind: 'mint'; hold: false }
  | { kind: 'mint'; hold: true; holdReason: HoldReason }
  | { kind: 'needs-contact' };

/** Aggregate outcome of one cron tick. */
export interface TickResult {
  ok: boolean;
  paused?: boolean;
  scanned: number;
  minted: number;
  held: number;
  needsContact: number;
  sent: number;
  sendFailed: number;
  /** Per-row failures that did not stop the tick. */
  rowErrors: Array<{ sheetRow: number; error: string }>;
}
