/**
 * scripts/test-pod-leads-sheet.ts
 *
 * Smoke test + header sync for the "POD Leads" tab:
 *
 *   1. Overwrites row 1 with the canonical header (safe, idempotent —
 *      run after any column reorder).
 *   2. Appends one test lead so the founder can visually confirm the
 *      write path is live.
 *
 * Run:   npx vercel env pull .env.local.tmp --environment=production
 *        (set POD_LEADS_SHEET_ID manually if Vercel redacts it)
 *        npx tsx scripts/test-pod-leads-sheet.ts
 */

// Load .env.local.tmp so the script can run outside Vercel with the
// same env vars the API uses in prod.
import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local.tmp' });

import {
  appendLeadToPodLeadsSheet,
  writePodLeadsHeaderRow,
  formatCentralTimestamp,
  POD_LEADS_HEADER_ROW,
} from '../src/lib/premier/pod-leads-sheet';

async function main(): Promise<void> {
  const email = process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.POD_LEADS_SHEET_ID;
  if (!email || !process.env.PREMIER_SHEET_SERVICE_ACCOUNT_KEY || !sheetId) {
    console.error('Missing env vars. Need:');
    console.error('  POD_LEADS_SHEET_ID');
    console.error('  PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL');
    console.error('  PREMIER_SHEET_SERVICE_ACCOUNT_KEY');
    process.exit(1);
  }

  console.log(`[test] Sheet ID: ${sheetId}`);
  console.log(`[test] Service account: ${email}`);
  console.log(`[test] Header columns: ${POD_LEADS_HEADER_ROW.join(' | ')}`);
  console.log('');

  console.log('[test] Writing canonical header row (idempotent)…');
  const headerOk = await writePodLeadsHeaderRow();
  if (!headerOk) {
    console.error(
      '[test] ✗ Header write failed. If this is a permissions error, share the sheet with the service account above as Editor.',
    );
    process.exit(1);
  }
  console.log('[test] ✓ Headers written.');

  console.log('[test] Appending a test lead row…');
  const ok = await appendLeadToPodLeadsSheet({
    submittedAt: formatCentralTimestamp(new Date()),
    source: 'SHEET SMOKE TEST — delete me',
    firstName: 'Test',
    lastName: 'Lead',
    email: 'test-lead@partyondelivery.com',
    phone: '(737) 555-0100',
    arrivalDate: '2026-08-15',
    departureDate: '2026-08-17',
    partyType: 'bachelor',
    headcount: '12',
    budgetPerPerson: '$600/pp',
    activities: 'boat-rental, drink-delivery, gun-range',
    notes: 'Smoke test row written by scripts/test-pod-leads-sheet.ts.',
    leadUrl: 'https://partyondelivery.com/admin/brians-stuff?tab=leads',
  });

  if (ok) {
    console.log('[test] ✓ Test lead appended. Refresh the sheet to see it.');
    console.log(
      `[test]   https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=114122017`,
    );
  } else {
    console.error('[test] ✗ Append returned false. See earlier logs.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
