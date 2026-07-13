/**
 * scripts/test-pod-leads-sheet.ts
 *
 * One-off smoke test for the "POD Leads" tab of the PPC Booking App
 * Time Slots Google Sheet:
 *
 *   1. Read what's on row 1 to see if the header row already exists.
 *   2. If row 1 is empty (or doesn't match our schema), write the
 *      canonical 14-column header row.
 *   3. Append one test lead as row N so the founder can visually
 *      confirm the write path is live.
 *
 * Run:   npx tsx scripts/test-pod-leads-sheet.ts
 *
 * Requires the same 3 env vars the runtime API uses:
 *   POD_LEADS_SHEET_ID
 *   PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL
 *   PREMIER_SHEET_SERVICE_ACCOUNT_KEY
 */

// Load .env.local.tmp so the script can run outside Vercel with the
// same env vars the API uses in prod.
import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local.tmp' });

import { google } from 'googleapis';
import {
  appendLeadToPodLeadsSheet,
  formatCentralTimestamp,
} from '../src/lib/premier/pod-leads-sheet';

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TAB_NAME = 'POD Leads';

const HEADER_ROW = [
  'Submitted (CT)',
  'Source',
  'First',
  'Last',
  'Email',
  'Phone',
  'Headcount',
  'Arrival',
  'Departure',
  'Party Type',
  'Budget / Person',
  'Activities',
  'Notes',
  'Lead URL',
];

async function main(): Promise<void> {
  const email = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.POD_LEADS_SHEET_ID;

  if (!email || !privateKey || !sheetId) {
    console.error('Missing env vars. Need:');
    console.error('  POD_LEADS_SHEET_ID');
    console.error('  PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL');
    console.error('  PREMIER_SHEET_SERVICE_ACCOUNT_KEY');
    process.exit(1);
  }

  console.log(`[test] Sheet ID: ${sheetId}`);
  console.log(`[test] Service account: ${email}`);
  console.log(`[test] Target tab: ${TAB_NAME}`);
  console.log('');

  // ─── Auth ─────────────────────────────────────────────────────
  const auth = new google.auth.JWT({
    email,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: SHEETS_SCOPES,
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // ─── Step 1: Read row 1 ──────────────────────────────────────
  console.log('[test] Reading current row 1 to check for headers…');
  let row1: string[] = [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${TAB_NAME}'!A1:N1`,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    row1 = (res.data.values?.[0] as string[]) ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[test] ✗ Could not read row 1:', msg);
    if (msg.includes('does not have permission') || msg.includes('caller does not have')) {
      console.error(
        '\nFIX: share the sheet with the service account email as Editor:\n' +
          `      ${email}\n`,
      );
    }
    process.exit(1);
  }
  console.log(`[test] Row 1 currently has ${row1.length} cells.`);

  // ─── Step 2: Write headers if missing ────────────────────────
  const looksLikeOurHeaders =
    row1.length >= 4 &&
    row1[0]?.toLowerCase().includes('submitted') &&
    row1.includes('Email');

  if (!looksLikeOurHeaders) {
    console.log('[test] No header row (or non-matching). Writing canonical headers…');
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${TAB_NAME}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [HEADER_ROW] },
      });
      console.log('[test] ✓ Headers written.');
    } catch (err) {
      console.error('[test] ✗ Header write failed:', err);
      process.exit(1);
    }
  } else {
    console.log('[test] ✓ Header row already present — leaving it alone.');
  }

  // ─── Step 3: Append a test lead ──────────────────────────────
  console.log('[test] Appending a test lead row…');
  const ok = await appendLeadToPodLeadsSheet({
    submittedAt: formatCentralTimestamp(new Date()),
    source: 'premier-concierge-bachelor · SHEET SMOKE TEST',
    firstName: 'Test',
    lastName: 'Concierge',
    email: 'test-concierge@partyondelivery.com',
    phone: '(737) 555-0100',
    headcount: '12',
    arrivalDate: '2026-08-15',
    departureDate: '2026-08-17',
    partyType: 'bachelor',
    budgetPerPerson: '$600/pp',
    activities: 'boat-rental, drink-delivery, golf-brewery-tour, gun-range',
    notes: 'Delete me — this is a smoke test row written by scripts/test-pod-leads-sheet.ts.',
    leadUrl: 'https://partyondelivery.com/admin/brians-stuff?tab=leads',
  });

  if (ok) {
    console.log('[test] ✓ Test lead appended. Refresh the sheet to see it.');
    console.log(
      `[test]   https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=114122017`,
    );
  } else {
    console.error('[test] ✗ appendLeadToPodLeadsSheet returned false. See earlier logs.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
