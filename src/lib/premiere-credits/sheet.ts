/**
 * Premiere Credit automation — Google Sheet reader (READ-ONLY).
 *
 * Reads the Premiere "POD Credits" tab with the `spreadsheets.readonly` scope
 * — this module has no write capability by design. Premiere maintains the POD
 * Code / Status columns themselves; the automation delivers codes to customers
 * and notifies the partner by email instead of writing back to the sheet.
 *
 * Reuses the existing Premier service-account credentials (shared with the
 * masterlist as a Viewer). See src/lib/premier/sheet-parser.ts for the sibling
 * boat-schedule reader that established this pattern.
 */

import { google } from 'googleapis';
import { locateHeader, parseRows } from './parse';
import type { RawCreditRow, SheetReadResult } from './types';

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

/** True when the sheet env vars are all present. */
export function isPremiereCreditsSheetConfigured(): boolean {
  return Boolean(
    process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL &&
      process.env.PREMIER_SHEET_SERVICE_ACCOUNT_KEY &&
      process.env.PREMIERE_CREDITS_SHEET_ID,
  );
}

/** Raw 2D cell grid for the configured POD Credits tab. */
async function readRawSheet(): Promise<string[][]> {
  const email = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.PREMIERE_CREDITS_SHEET_ID;
  const tab = process.env.PREMIERE_CREDITS_SHEET_TAB || 'POD Credits';

  if (!email || !privateKey || !sheetId) {
    throw new Error(
      'Missing Premiere credits sheet env vars. Required: PREMIERE_CREDITS_SHEET_ID, ' +
        'PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL, PREMIER_SHEET_SERVICE_ACCOUNT_KEY',
    );
  }

  // Env-stored PEM keys carry escaped newlines — unescape (per sheet-parser.ts).
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({ email, key: formattedKey, scopes: SHEETS_SCOPES });
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tab}'`,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  return (response.data.values || []) as string[][];
}

/**
 * Read + parse the POD Credits tab into candidate credit rows. Throws only on
 * a hard failure (auth/config error, or a sheet with no locatable header row);
 * per-row issues become warnings, never throws.
 */
export async function readCreditSheet(): Promise<SheetReadResult> {
  const grid = await readRawSheet();
  const located = locateHeader(grid);
  if (!located) {
    throw new Error(
      'POD Credits sheet: could not locate a header row (need an amount + a client column)',
    );
  }

  const { headerIndex, header } = located;
  // Sheet rows are 1-based; data starts on the row after the header.
  const rawRows: RawCreditRow[] = [];
  for (let i = headerIndex + 1; i < grid.length; i++) {
    rawRows.push({ sheetRow: i + 1, cells: grid[i] || [] });
  }

  const { rows, warnings } = parseRows(header, rawRows);
  return { header, rows, warnings };
}
