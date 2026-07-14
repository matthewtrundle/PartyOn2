/**
 * reconcile-fragment-leads.mjs
 *
 * BUG: the FormCaptureWatcher's 700ms typing debounce snapshotted
 * mid-typing email values, and upsertLead only exact-matches on email —
 * so one visitor typing "x@gmail.com" produced sibling PARTIAL Lead
 * rows for "x@gmail.co" and "x@gmail.com" (and, before the
 * email-completeness gate shipped, "x@gmail.c", "x@", …). The writer is
 * fixed (10s debounce + prefix-merge in upsertLead, PR pending); this
 * script repairs the historical rows.
 *
 * REPAIR SEMANTICS
 *   Fragment chains: for every PARTIAL lead F whose email is a strict
 *   prefix (≥6 chars) of another lead K's email, K (the longest email
 *   in the chain; ties broken by non-PARTIAL > most-filled > oldest)
 *   is the keeper. F's children (LeadEvent, VisitorSession,
 *   FollowUpJob) are reassigned to K, K's blank contact fields are
 *   filled from F, then F is deleted.
 *
 *   Exact duplicates: same normalized email on multiple rows — same
 *   keeper rules. Only PARTIAL rows are ever deleted.
 *
 * SAFETY INVARIANT
 *   - A row is deleted ONLY if (a) it is status=PARTIAL and (b) its
 *     keeper survives in the same transaction with the full email.
 *   - SUBMITTED / CONVERTED / ARCHIVED rows are never deleted; if two
 *     non-PARTIAL rows share an email the group is NEEDS-MANUAL.
 *   - Idempotent: after --apply, a re-run reports zero planned changes.
 *   - Sheet cleanup: rows in the "POD Leads" tab whose Lead URL points
 *     at a deleted lead id are removed (batch deleteDimension). The
 *     sheet is a mirror, never the source of truth.
 *
 * USAGE
 *   set -a && source .env.local && set +a   # or .env.local.tmp from vercel env pull
 *   node scripts/ops/reconcile-fragment-leads.mjs             # dry run
 *   node scripts/ops/reconcile-fragment-leads.mjs --apply     # after operator go
 *   node scripts/ops/reconcile-fragment-leads.mjs --json      # machine-readable dry run
 *   node scripts/ops/reconcile-fragment-leads.mjs --skip-sheet  # DB only
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const APPLY = process.argv.includes('--apply');
const JSON_OUT = process.argv.includes('--json');
const SKIP_SHEET = process.argv.includes('--skip-sheet');

const MIN_FRAGMENT_LEN = 6;
const TAB_NAME = 'POD Leads';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!process.env.DATABASE_URL) fail('DATABASE_URL missing — source your env file first.');
if (!SKIP_SHEET) {
  if (
    !process.env.POD_LEADS_SHEET_ID ||
    !process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL ||
    !process.env.PREMIER_SHEET_SERVICE_ACCOUNT_KEY
  ) {
    fail(
      'Sheet env vars missing (POD_LEADS_SHEET_ID / PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL / _KEY). ' +
        'Pass --skip-sheet to reconcile the DB only.',
    );
  }
}

const prisma = new PrismaClient();

/** Pick the keeper for a set of rows: non-PARTIAL first, then longest
 *  email, then most filled contact fields, then oldest. */
function pickKeeper(rows) {
  const filled = (l) =>
    [l.firstName, l.lastName, l.phone].filter(Boolean).length;
  return [...rows].sort((a, b) => {
    const ap = a.status === 'PARTIAL' ? 1 : 0;
    const bp = b.status === 'PARTIAL' ? 1 : 0;
    if (ap !== bp) return ap - bp; // non-PARTIAL first
    if (a.email.length !== b.email.length) return b.email.length - a.email.length;
    if (filled(a) !== filled(b)) return filled(b) - filled(a);
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

async function plan() {
  const leads = await prisma.lead.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      email: true,
      status: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });

  // Union-find style grouping: two leads share a group if one email is a
  // prefix (≥MIN_FRAGMENT_LEN) of the other, or they're identical.
  const groups = new Map(); // keeper-email -> Set(leadIds)
  const related = (a, b) =>
    a.email === b.email ||
    (a.email.length >= MIN_FRAGMENT_LEN && b.email.startsWith(a.email)) ||
    (b.email.length >= MIN_FRAGMENT_LEN && a.email.startsWith(b.email));

  const assigned = new Map(); // leadId -> groupKey
  for (const a of leads) {
    for (const b of leads) {
      if (a.id >= b.id || !related(a, b)) continue;
      const ka = assigned.get(a.id);
      const kb = assigned.get(b.id);
      const key = ka ?? kb ?? a.id;
      if (!groups.has(key)) groups.set(key, new Set());
      const g = groups.get(key);
      // Merge any pre-existing groups of a/b into `key`'s group.
      for (const prev of [ka, kb]) {
        if (prev && prev !== key && groups.has(prev)) {
          for (const id of groups.get(prev)) {
            g.add(id);
            assigned.set(id, key);
          }
          groups.delete(prev);
        }
      }
      g.add(a.id).add(b.id);
      assigned.set(a.id, key);
      assigned.set(b.id, key);
    }
  }

  const byId = new Map(leads.map((l) => [l.id, l]));
  const actions = [];
  const needsManual = [];

  for (const idSet of groups.values()) {
    const rows = [...idSet].map((id) => byId.get(id));
    const keeper = pickKeeper(rows);
    const toDelete = rows.filter((r) => r.id !== keeper.id);
    const nonPartialDeletes = toDelete.filter((r) => r.status !== 'PARTIAL');
    if (nonPartialDeletes.length > 0) {
      needsManual.push({
        keeper: keeper.email,
        blocked: nonPartialDeletes.map((r) => `${r.email} (${r.status})`),
      });
      continue;
    }
    if (toDelete.length > 0) {
      actions.push({ keeper, deletes: toDelete });
    }
  }
  return { actions, needsManual };
}

async function applyActions(actions) {
  let deleted = 0;
  const deletedIds = [];
  for (const { keeper, deletes } of actions) {
    // Per-group transaction with row locks; re-validate inside.
    await prisma.$transaction(async (tx) => {
      const ids = [keeper.id, ...deletes.map((d) => d.id)];
      await tx.$queryRawUnsafe(
        `SELECT id FROM leads WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
        ids,
      );
      const fresh = await tx.lead.findMany({ where: { id: { in: ids } } });
      const freshKeeper = fresh.find((l) => l.id === keeper.id);
      if (!freshKeeper) return; // keeper vanished — skip group
      for (const d of deletes) {
        const freshDel = fresh.find((l) => l.id === d.id);
        // Re-validate the invariant against live rows.
        if (!freshDel || freshDel.status !== 'PARTIAL') continue;
        if (
          freshDel.email !== freshKeeper.email &&
          !freshKeeper.email.startsWith(freshDel.email)
        )
          continue;

        // Blank-fill keeper contact fields from the fragment.
        await tx.lead.update({
          where: { id: freshKeeper.id },
          data: {
            firstName: freshKeeper.firstName ?? freshDel.firstName,
            lastName: freshKeeper.lastName ?? freshDel.lastName,
            phone: freshKeeper.phone ?? freshDel.phone,
          },
        });
        // Reassign children.
        await tx.leadEvent.updateMany({
          where: { leadId: freshDel.id },
          data: { leadId: freshKeeper.id },
        });
        await tx.visitorSession.updateMany({
          where: { leadId: freshDel.id },
          data: { leadId: freshKeeper.id },
        });
        await tx.followUpJob.updateMany({
          where: { leadId: freshDel.id },
          data: { leadId: freshKeeper.id },
        });
        await tx.lead.delete({ where: { id: freshDel.id } });
        deleted++;
        deletedIds.push(freshDel.id);
      }
    });
  }
  return { deleted, deletedIds };
}

// ─── Sheet cleanup ─────────────────────────────────────────────────

function sheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL,
    key: process.env.PREMIER_SHEET_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

/** Find 0-based row indices (incl. header offset) whose Lead URL column
 *  references one of the given lead ids. */
async function findSheetRows(leadIds) {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.POD_LEADS_SHEET_ID,
    range: `'${TAB_NAME}'!N:N`,
  });
  const rows = res.data.values ?? [];
  const idSet = new Set(leadIds);
  const hits = [];
  rows.forEach((row, i) => {
    const url = row[0] ?? '';
    const m = url.match(/[?&]lead=([0-9a-f-]{36})/i);
    if (m && idSet.has(m[1])) hits.push(i); // 0-based incl. header row 0
  });
  return hits;
}

async function deleteSheetRows(rowIndices) {
  if (rowIndices.length === 0) return 0;
  const sheets = sheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.POD_LEADS_SHEET_ID,
  });
  const tab = meta.data.sheets.find((s) => s.properties.title === TAB_NAME);
  if (!tab) fail(`Tab "${TAB_NAME}" not found`);
  const sheetId = tab.properties.sheetId;
  // Delete bottom-up so indices stay valid.
  const requests = [...rowIndices]
    .sort((a, b) => b - a)
    .map((i) => ({
      deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: i, endIndex: i + 1 },
      },
    }));
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.POD_LEADS_SHEET_ID,
    requestBody: { requests },
  });
  return rowIndices.length;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const { actions, needsManual } = await plan();
  const deleteCount = actions.reduce((n, a) => n + a.deletes.length, 0);
  const plannedIds = actions.flatMap((a) => a.deletes.map((d) => d.id));

  let sheetRowCount = 0;
  if (!SKIP_SHEET && plannedIds.length > 0) {
    sheetRowCount = (await findSheetRows(plannedIds)).length;
  }

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          mode: APPLY ? 'apply' : 'dry-run',
          groups: actions.length,
          deletes: deleteCount,
          sheetRows: sheetRowCount,
          needsManual,
          detail: actions.map((a) => ({
            keeper: a.keeper.email,
            keeperStatus: a.keeper.status,
            deletes: a.deletes.map((d) => `${d.email} (${d.status})`),
          })),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`[reconcile] Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    console.log(`[reconcile] Groups with deletable fragments/dupes: ${actions.length}`);
    console.log(`[reconcile] PARTIAL rows to delete: ${deleteCount}`);
    console.log(`[reconcile] Sheet rows referencing those leads: ${sheetRowCount}${SKIP_SHEET ? ' (skipped)' : ''}`);
    console.log(`[reconcile] NEEDS-MANUAL groups (non-PARTIAL dupes, untouched): ${needsManual.length}`);
    for (const nm of needsManual) {
      console.log(`    keeper=${nm.keeper} blocked=${nm.blocked.join(', ')}`);
    }
    console.log('\n[reconcile] Plan:');
    for (const a of actions) {
      console.log(
        `    KEEP ${a.keeper.email} (${a.keeper.status})  ⟵ delete ${a.deletes
          .map((d) => d.email)
          .join(', ')}`,
      );
    }
  }

  if (!APPLY) {
    console.log('\n[reconcile] DRY RUN — nothing changed. Re-run with --apply after operator approval.');
    await prisma.$disconnect();
    return;
  }

  const { deleted, deletedIds } = await applyActions(actions);
  console.log(`\n[reconcile] ✓ Deleted ${deleted} PARTIAL fragment/duplicate leads.`);

  if (!SKIP_SHEET && deletedIds.length > 0) {
    const rows = await findSheetRows(deletedIds);
    const removed = await deleteSheetRows(rows);
    console.log(`[reconcile] ✓ Removed ${removed} rows from the "${TAB_NAME}" sheet tab.`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
