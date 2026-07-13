/**
 * Append POD leads to the "POD Leads" tab of the PPC Booking App Time
 * Slots Google Sheet.
 *
 * Sheet: https://docs.google.com/spreadsheets/d/13VHEq3Aqv46oSt0tGiF5ZBOxs1WxBU0SqEIwG6QUsxI/edit?gid=114122017
 * Tab: "POD Leads" (gid=114122017)
 *
 * EVERY lead-submit surface on the site mirrors here (concierge
 * questionnaire, PartyChat bubble, quote/start, event quiz, QuickBuy,
 * contact form, newsletter). The Postgres Lead row is always the
 * source of truth; the sheet is an ops-facing event log — one row per
 * submission, so a customer who submits twice appears twice.
 *
 * Column order (founder spec): basic info first — contact, dates,
 * party type, headcount — then interests/activities to the right.
 *
 * Auth reuses the existing Premier Sheets service account
 * (PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL / _KEY); the sheet is shared
 * with that account as Editor. Sheet ID lives in POD_LEADS_SHEET_ID.
 *
 * IMPORTANT — CALLERS MUST AWAIT. Vercel freezes the serverless
 * function as soon as the HTTP response is returned; a fire-and-forget
 * promise gets killed mid-flight and the row silently never lands
 * (this exact bug ate the founder's first bachelorette test lead).
 * Await this call (it never throws — worst case it logs and returns
 * false) or wrap it in next/server's `after()`.
 */

import { google } from 'googleapis';

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TAB_NAME = 'POD Leads';

/** Canonical header row — keep in sync with rowFromLead() below. */
export const POD_LEADS_HEADER_ROW = [
  'Submitted (CT)',
  'Source',
  'First',
  'Last',
  'Email',
  'Phone',
  'Arrival',
  'Departure',
  'Party Type',
  'Headcount',
  'Budget / Person',
  'Interests / Activities',
  'Notes',
  'Lead URL',
] as const;

/**
 * Generic lead-mirror shape. Only `submittedAt` and `source` are
 * required — every flow fills in what it knows and leaves the rest as
 * empty strings so the sheet columns stay aligned.
 */
export interface PodLeadSheetRow {
  /** "YYYY-MM-DD HH:mm CT" — use formatCentralTimestamp(). */
  submittedAt: string;
  /** Which surface fired — e.g. 'premier-concierge-bachelorette',
   *  'party-chat', 'quote-start', 'event-quiz', 'quickbuy',
   *  'contact-form', 'newsletter'. */
  source: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** Event/arrival date, YYYY-MM-DD when known. */
  arrivalDate?: string;
  departureDate?: string;
  partyType?: string;
  headcount?: string | number;
  budgetPerPerson?: string;
  /** Comma-joined interests/activities/needs. */
  activities?: string;
  notes?: string;
  /** Deep link back to the Lead row in Brian's Stuff. */
  leadUrl?: string;
}

function rowFromLead(row: PodLeadSheetRow): string[] {
  return [
    row.submittedAt,
    row.source,
    row.firstName ?? '',
    row.lastName ?? '',
    row.email ?? '',
    row.phone ?? '',
    row.arrivalDate ?? '',
    row.departureDate ?? '',
    row.partyType ?? '',
    row.headcount != null ? String(row.headcount) : '',
    row.budgetPerPerson ?? '',
    row.activities ?? '',
    row.notes ?? '',
    row.leadUrl ?? '',
  ];
}

function getSheetsClient() {
  const email = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.POD_LEADS_SHEET_ID;
  if (!email || !privateKey || !sheetId) return null;

  const auth = new google.auth.JWT({
    email,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: SHEETS_SCOPES,
  });
  return { sheets: google.sheets({ version: 'v4', auth }), sheetId };
}

/**
 * Append one row to the POD Leads tab. Returns true on success, false
 * on any failure (missing env vars, API error, etc.). Never throws.
 * AWAIT THIS — see module docblock.
 */
export async function appendLeadToPodLeadsSheet(
  row: PodLeadSheetRow,
): Promise<boolean> {
  const client = getSheetsClient();
  if (!client) {
    console.warn(
      '[pod-leads-sheet] Missing env vars — skipping sheet append. ' +
        'Required: PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL, PREMIER_SHEET_SERVICE_ACCOUNT_KEY, POD_LEADS_SHEET_ID',
    );
    return false;
  }

  try {
    await client.sheets.spreadsheets.values.append({
      spreadsheetId: client.sheetId,
      range: `'${TAB_NAME}'!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowFromLead(row)] },
    });
    return true;
  } catch (err) {
    console.error('[pod-leads-sheet] Append failed:', err);
    return false;
  }
}

/**
 * Overwrite row 1 with the canonical header. Used by the smoke-test
 * script after a column reorder; safe to run any time.
 */
export async function writePodLeadsHeaderRow(): Promise<boolean> {
  const client = getSheetsClient();
  if (!client) return false;
  try {
    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.sheetId,
      range: `'${TAB_NAME}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[...POD_LEADS_HEADER_ROW]] },
    });
    return true;
  } catch (err) {
    console.error('[pod-leads-sheet] Header write failed:', err);
    return false;
  }
}

/** Format a Date as "YYYY-MM-DD HH:mm CT" for the sheet. */
export function formatCentralTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} CT`;
}

/**
 * One-call convenience for non-concierge flows: builds the row from
 * whatever fields the caller has and appends it. Never throws.
 */
export async function mirrorLeadToSheet(
  input: Omit<PodLeadSheetRow, 'submittedAt'> & { submittedAt?: string },
): Promise<boolean> {
  return appendLeadToPodLeadsSheet({
    ...input,
    submittedAt: input.submittedAt ?? formatCentralTimestamp(new Date()),
  });
}
