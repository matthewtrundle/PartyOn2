/**
 * Append a POD lead to the "POD Leads" tab of the PPC Booking App Time
 * Slots Google Sheet.
 *
 * Sheet: https://docs.google.com/spreadsheets/d/13VHEq3Aqv46oSt0tGiF5ZBOxs1WxBU0SqEIwG6QUsxI/edit?gid=114122017
 * Tab: "POD Leads" (gid=114122017)
 *
 * Auth reuses the existing Premier Sheets service account
 * (PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL / _KEY) — that account just
 * needs to be shared with the target sheet as Editor. Sheet ID is in a
 * new env var so it can be swapped without touching code.
 *
 * Writes are best-effort: if credentials are missing, the sheet is
 * unreachable, or the API errors, we log and return false — we never
 * throw and never block the caller's request. The Postgres Lead row is
 * always the source of truth; the sheet is a convenience mirror for
 * ops.
 */

import { google } from 'googleapis';

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TAB_NAME = 'POD Leads';

/** Every field we append. Kept flat so the row is trivially readable in-sheet. */
export interface PodLeadSheetRow {
  /** ISO timestamp in America/Chicago, e.g. "2026-07-10 15:03 CT". */
  submittedAt: string;
  /** Marketing surface — e.g. "premier-concierge-bachelor". */
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  headcount: string;
  arrivalDate: string;
  departureDate: string;
  partyType: string;
  budgetPerPerson: string;
  activities: string;
  notes: string;
  /** Deep link back to the Lead row in Brian's Stuff. */
  leadUrl: string;
}

/**
 * Append one row to the POD Leads tab. Returns true on success, false
 * on any failure (missing env vars, API error, etc.). Never throws.
 */
export async function appendLeadToPodLeadsSheet(
  row: PodLeadSheetRow,
): Promise<boolean> {
  const email = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.POD_LEADS_SHEET_ID;

  if (!email || !privateKey || !sheetId) {
    console.warn(
      '[pod-leads-sheet] Missing env vars — skipping sheet append. ' +
        'Required: PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL, PREMIER_SHEET_SERVICE_ACCOUNT_KEY, POD_LEADS_SHEET_ID',
    );
    return false;
  }

  try {
    // Handle escaped newlines in the private key (common env-var pattern).
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email,
      key: formattedKey,
      scopes: SHEETS_SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Append at the end of the tab. USER_ENTERED interpretation lets
    // date strings render as dates in-sheet when they parse.
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `'${TAB_NAME}'!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [
            row.submittedAt,
            row.source,
            row.firstName,
            row.lastName,
            row.email,
            row.phone,
            row.headcount,
            row.arrivalDate,
            row.departureDate,
            row.partyType,
            row.budgetPerPerson,
            row.activities,
            row.notes,
            row.leadUrl,
          ],
        ],
      },
    });
    return true;
  } catch (err) {
    console.error('[pod-leads-sheet] Append failed:', err);
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
