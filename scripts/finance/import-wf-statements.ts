/**
 * Import Wells Fargo statement/activity rows into the bank-truth P&L, extending
 * it back before Plaid's 730-day ceiling (Jan 2024 floor; 2023 is unreachable).
 *
 * WHAT IT DOES
 *   - Parses the WF "Download Account Activity" CSV and/or a PDF-derived CSV
 *     (from scripts/finance/extract-wf-pdf.py, same column shape) via the pure
 *     parser in src/lib/finance/wf-statement-parser.ts.
 *   - Writes the rows onto a DEDICATED provenance item —
 *     institutionName 'Wells Fargo (statements)', status 'statement_import' — so
 *     they are always distinguishable from the live Plaid item's rows AND the
 *     daily Plaid sync cron (which only touches status active/error) never tries
 *     to sync a fake token. The item is environment='production' because that is
 *     the flag the monthly rollup reads to count bank rows.
 *   - Runs every row through the SAME pipeline as the live sync:
 *     categorizeBankOutflow (with a descriptor-derived PFC hint the statement
 *     lacks) for outflows, classifyBankInflow at rollup time for inflows.
 *
 * NO DOUBLE-COUNTING (date-range ownership, not content dedup — PDF and CSV
 * render the same transaction with structurally different descriptors, so a
 * content key can't reliably collapse them):
 *   - Plaid owns everything on/after the "seam" = the live item's earliest txn
 *     date (~2024-07-15). Statement rows on/after the seam are skipped.
 *   - The PDF-derived CSV owns its full span (Jan–Jun 2024).
 *   - The activity CSV contributes ONLY dates AFTER the PDFs' last day (the
 *     pre-seam July gap Plaid misses); its June overlap with the PDFs is dropped.
 *
 * SAFETY: dry-run by default (prints the per-month summary for operator review);
 * --apply writes. Refuses to run unless a LIVE production Plaid item exists (the
 * prod-DB guard + the source of the seam). Idempotent: the transaction id is a
 * hash of a deterministic dedupe key, so re-running upserts in place.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/finance/import-wf-statements.ts \
 *       --pdf-csv ~/Downloads/wf-pdf-2024h1.csv \
 *       --activity-csv ~/Downloads/Checking.csv          # dry-run
 *   ... same command with --apply                          # write
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { prisma } from '../../src/lib/database/client';
import {
  parseWfActivityCsv,
  type WfStatementRow,
} from '../../src/lib/finance/wf-statement-parser';
import {
  categorizeBankOutflow,
  isBankExpenseCategory,
} from '../../src/lib/finance/plaid-category-map';
import { classifyBankInflow, type BankInflowClass } from '../../src/lib/finance/bank-income-recon';
import type { CategorySlug } from '../../src/lib/finance/qb-account-map';

/** The dedicated statement-import provenance item. Distinct institutionId from
 * the live WF item (ins_127991) so the relink cutover never treats it as a
 * duplicate; status keeps it out of the daily Plaid sync cron. */
const STMT_ITEM = {
  itemId: 'wf-statements-import',
  institutionId: 'wf-statements-import',
  institutionName: 'Wells Fargo (statements)',
  environment: 'production',
  status: 'statement_import',
  accessToken: 'STATEMENT_IMPORT_NO_TOKEN',
} as const;
const STMT_ACCOUNT_ID = 'wf-statements';

interface Args {
  pdfCsv: string | null;
  activityCsv: string | null;
  apply: boolean;
}

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (flag: string): string | null => {
    const i = a.indexOf(flag);
    return i >= 0 && a[i + 1] ? a[i + 1] : null;
  };
  const args = { pdfCsv: get('--pdf-csv'), activityCsv: get('--activity-csv'), apply: a.includes('--apply') };
  if (!args.pdfCsv && !args.activityCsv) {
    throw new Error('provide at least one of --pdf-csv <path> / --activity-csv <path>');
  }
  return args;
}

/** A parsed row plus its provenance + derived classification, ready to upsert. */
interface StagedRow {
  row: WfStatementRow;
  source: 'pdf' | 'activity';
  transactionId: string;
  bankDerivedCategory: CategorySlug | null;
  isBankDerivedExpense: boolean;
  inflowClass: BankInflowClass | null;
}

function stage(row: WfStatementRow, source: 'pdf' | 'activity'): StagedRow {
  const transactionId = `wfstmt:${createHash('sha1').update(row.dedupeKey).digest('hex').slice(0, 24)}`;
  if (row.isInflow) {
    return {
      row,
      source,
      transactionId,
      bankDerivedCategory: null,
      isBankDerivedExpense: false,
      inflowClass: classifyBankInflow({ name: row.descriptor, merchantName: null }),
    };
  }
  // Outflow: same categorizer the live sync uses, fed the statement's PFC hint.
  const slug = categorizeBankOutflow({
    name: row.descriptor,
    merchantName: null,
    personalFinanceCategoryPrimary: row.pfcPrimaryHint,
    personalFinanceCategoryDetailed: null,
  });
  return {
    row,
    source,
    transactionId,
    bankDerivedCategory: slug,
    isBankDerivedExpense: isBankExpenseCategory(slug),
    inflowClass: null,
  };
}

/** Load + parse the CSV(s), then apply date-range ownership + the seam cutoff. */
function loadStaged(args: Args, seamISO: string): { staged: StagedRow[]; skipped: number } {
  const pdfRows = args.pdfCsv ? parseWfActivityCsv(readFileSync(args.pdfCsv, 'utf8')) : { rows: [], skipped: [] };
  const actRows = args.activityCsv ? parseWfActivityCsv(readFileSync(args.activityCsv, 'utf8')) : { rows: [], skipped: [] };
  const skipped = pdfRows.skipped.length + actRows.skipped.length;

  // PDFs own their full span; the activity CSV contributes only dates AFTER the
  // PDFs' last day (so the PDF↔CSV June overlap is dropped). Everything on/after
  // the Plaid seam belongs to the live item and is excluded.
  const pdfMax = pdfRows.rows.reduce<string>((m, r) => (r.dateISO > m ? r.dateISO : m), '');
  const included: StagedRow[] = [];
  for (const r of pdfRows.rows) {
    if (r.dateISO < seamISO) included.push(stage(r, 'pdf'));
  }
  for (const r of actRows.rows) {
    if (r.dateISO < seamISO && (pdfMax === '' || r.dateISO > pdfMax)) included.push(stage(r, 'activity'));
  }

  // Idempotency + belt-and-suspenders dedupe (keep first per key). With date
  // ownership above, PDF and CSV never contribute the same date, so this only
  // collapses exact re-run duplicates.
  const byKey = new Map<string, StagedRow>();
  for (const s of included) if (!byKey.has(s.row.dedupeKey)) byKey.set(s.row.dedupeKey, s);
  return { staged: [...byKey.values()], skipped };
}

const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Per-month review table + inflow classification + surfaced items. */
function printSummary(staged: StagedRow[]): void {
  const months = new Map<string, {
    deposits: number; withdrawals: number; count: number;
    ownerCapital: number; loanProceeds: number; vendorRefund: number; salesOther: number;
    cogs: number; opex: number; nonOp: number;
  }>();
  const m = (k: string) => {
    let v = months.get(k);
    if (!v) { v = { deposits: 0, withdrawals: 0, count: 0, ownerCapital: 0, loanProceeds: 0, vendorRefund: 0, salesOther: 0, cogs: 0, opex: 0, nonOp: 0 }; months.set(k, v); }
    return v;
  };
  for (const s of staged) {
    const b = m(s.row.dateISO.slice(0, 7));
    b.count++;
    const cents = Math.abs(s.row.plaidAmountCents);
    if (s.row.isInflow) {
      b.deposits += cents;
      if (s.inflowClass === 'owner_capital') b.ownerCapital += cents;
      else if (s.inflowClass === 'loan_proceeds') b.loanProceeds += cents;
      else if (s.inflowClass === 'vendor_refund') b.vendorRefund += cents;
      else b.salesOther += cents;
    } else {
      b.withdrawals += cents;
      if (s.bankDerivedCategory === 'cogs') b.cogs += cents;
      else if (s.bankDerivedCategory === 'non_operating') b.nonOp += cents;
      else b.opex += cents;
    }
  }
  console.log('\n=== Per-month summary (Plaid convention: deposits are inflows) ===');
  console.log('month     rows   deposits      withdrawals    net           | ownerCap    loanProc     COGS         OpEx');
  for (const key of [...months.keys()].sort()) {
    const v = months.get(key)!;
    const net = v.deposits - v.withdrawals;
    console.log(
      `${key}  ${String(v.count).padStart(4)}   ${fmt(v.deposits).padStart(12)}  ${fmt(v.withdrawals).padStart(12)}  ` +
      `${(net >= 0 ? '+' : '') + fmt(net)}`.padStart(13) +
      `  | ${fmt(v.ownerCapital).padStart(10)}  ${fmt(v.loanProceeds).padStart(11)}  ${fmt(v.cogs).padStart(11)}  ${fmt(v.opex).padStart(11)}`
    );
  }

  // Surface the largest sales_or_other inflows — the ones an operator should eyeball
  // (a non-sales deposit the anchored rules didn't recognize would show up here).
  const bigOther = staged
    .filter((s) => s.inflowClass === 'sales_or_other')
    .sort((a, b) => Math.abs(b.row.plaidAmountCents) - Math.abs(a.row.plaidAmountCents))
    .slice(0, 12);
  console.log('\n=== Largest sales/other inflows (verify none are misclassified financing) ===');
  for (const s of bigOther) {
    console.log(`  ${s.row.dateISO}  ${fmt(Math.abs(s.row.plaidAmountCents)).padStart(12)}  ${s.row.descriptor.slice(0, 60)}`);
  }
  const loanTotal = staged.filter((s) => s.inflowClass === 'loan_proceeds').reduce((t, s) => t + Math.abs(s.row.plaidAmountCents), 0);
  const ocTotal = staged.filter((s) => s.inflowClass === 'owner_capital').reduce((t, s) => t + Math.abs(s.row.plaidAmountCents), 0);
  console.log(`\nRecognized financing across all imported rows: owner capital ${fmt(ocTotal)}, loan proceeds ${fmt(loanTotal)}.`);

  // Audit trail for the synthetic PFC hints on OUTFLOWS (owner draws / loan
  // payments the statement's missing PFC would otherwise miscategorize). Itemized
  // — like the inflow audit trails — so a misclassified real expense forced to
  // non_operating is visible BEFORE --apply rather than hidden in an aggregate.
  const hinted = staged
    .filter((s) => !s.row.isInflow && s.row.pfcPrimaryHint)
    .sort((a, b) => b.row.plaidAmountCents - a.row.plaidAmountCents);
  const hintedTotal = hinted.reduce((t, s) => t + s.row.plaidAmountCents, 0);
  console.log(`\n=== Outflows given a synthetic non-operating hint (${hinted.length} rows, ${fmt(hintedTotal)}) — verify none are real expenses ===`);
  for (const s of hinted) {
    console.log(`  ${s.row.dateISO}  ${fmt(s.row.plaidAmountCents).padStart(12)}  [${s.row.pfcPrimaryHint}→${s.bankDerivedCategory}]  ${s.row.descriptor.slice(0, 48)}`);
  }

  // Content-identical rows kept as DISTINCT (same date+amount+descriptor, no
  // unique auth code — e.g. two ATM fees for two real withdrawals). These are
  // the ONLY rows a file-level duplicate could sneak in through, so list every
  // group for the operator to confirm each is genuinely N real transactions and
  // not a doubled statement, BEFORE --apply.
  const groups = new Map<string, StagedRow[]>();
  for (const s of staged) {
    const base = s.row.dedupeKey.split('|#')[0];
    (groups.get(base) ?? groups.set(base, []).get(base)!).push(s);
  }
  const dups = [...groups.values()].filter((g) => g.length > 1).sort((a, b) => a[0].row.dateISO.localeCompare(b[0].row.dateISO));
  console.log(`\n=== Content-identical rows kept as distinct (${dups.length} groups) — confirm each is N REAL transactions, not a doubled statement ===`);
  for (const g of dups) {
    console.log(`  x${g.length}  ${g[0].row.dateISO}  ${fmt(g[0].row.plaidAmountCents).padStart(12)}  ${g[0].row.descriptor.slice(0, 52)}`);
  }
}

/** Prove the seam cut is clean, WITHOUT a tautology. Two independent, meaningful
 * checks: (1) every staged row lands strictly before the seam — this exercises
 * the actual `date < seamISO` inclusion filter, so a regression (e.g. `<=`) would
 * surface here; (2) query live rows within the staged date range (date ≤ the
 * latest staged day) and look for a date+amount collision — normally zero because
 * the seam is the live item's earliest date, but a genuinely non-empty result
 * (a live row bleeding into the statement range) would be caught, unlike a query
 * for live rows `< seam` which is empty by construction. */
async function checkSeam(staged: StagedRow[], liveItemIds: string[], seamISO: string): Promise<void> {
  const maxStagedISO = staged.reduce<string>((m, s) => (s.row.dateISO > m ? s.row.dateISO : m), '');
  const pastSeam = staged.filter((s) => s.row.dateISO >= seamISO);
  const gapDays = maxStagedISO
    ? Math.round((new Date(`${seamISO}T00:00:00Z`).getTime() - new Date(`${maxStagedISO}T00:00:00Z`).getTime()) / 86_400_000)
    : NaN;

  // Live rows within the staged date range (≤ latest staged day). Should be
  // empty because the seam is the live min — but a MEANINGFUL empty (any overlap
  // would appear), unlike a "< seam" query.
  const overlapLive = maxStagedISO
    ? await prisma.plaidTransaction.findMany({
        where: { plaidItemId: { in: liveItemIds }, date: { lte: new Date(`${maxStagedISO}T00:00:00Z`) }, pending: false },
        select: { date: true, amount: true },
      })
    : [];
  const liveKeys = new Set(overlapLive.map((l) => `${l.date.toISOString().slice(0, 10)}|${Math.round(Number(l.amount) * 100)}`));
  const collisions = staged.filter((s) => liveKeys.has(`${s.row.dateISO}|${s.row.plaidAmountCents}`));

  const ok = pastSeam.length === 0 && overlapLive.length === 0 && collisions.length === 0;
  console.log(
    `\nSeam check (seam ${seamISO}, latest staged ${maxStagedISO || 'n/a'}, gap ${gapDays}d): ` +
    `staged rows on/after seam=${pastSeam.length} (want 0), live rows in staged range=${overlapLive.length} (want 0), ` +
    `date+amount collisions=${collisions.length} (want 0)  ${ok ? '✓ CLEAN' : '⚠️  REVIEW'}`
  );
  for (const c of [...pastSeam, ...collisions].slice(0, 10)) {
    console.log(`   ⚠️  ${c.row.dateISO} ${fmt(c.row.plaidAmountCents)} ${c.row.descriptor.slice(0, 50)}`);
  }
}

async function applyRows(staged: StagedRow[]): Promise<void> {
  const item = await prisma.plaidItem.upsert({
    where: { itemId: STMT_ITEM.itemId },
    create: { ...STMT_ITEM },
    update: { institutionName: STMT_ITEM.institutionName, status: STMT_ITEM.status, environment: STMT_ITEM.environment },
  });
  let n = 0;
  for (const s of staged) {
    const dollars = (s.row.plaidAmountCents / 100).toFixed(2);
    const date = new Date(`${s.row.dateISO}T00:00:00Z`);
    const data = {
      plaidItemId: item.id,
      accountId: STMT_ACCOUNT_ID,
      date,
      amount: dollars,
      name: s.row.descriptor,
      merchantName: null,
      pending: false,
      paymentChannel: null,
      category: [] as string[],
      personalFinanceCategoryPrimary: s.row.pfcPrimaryHint,
      personalFinanceCategoryDetailed: null,
      bankDerivedCategory: s.bankDerivedCategory,
      isBankDerivedExpense: s.isBankDerivedExpense,
    };
    await prisma.plaidTransaction.upsert({
      where: { transactionId: s.transactionId },
      create: { transactionId: s.transactionId, ...data },
      update: data,
    });
    n++;
    if (n % 200 === 0) console.log(`  ...upserted ${n}/${staged.length}`);
  }
  console.log(`Applied: item ${item.id} (${STMT_ITEM.institutionName}), ${n} transactions upserted.`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Prod-DB guard + seam source: there must be a LIVE production Plaid item.
  // NOTE: this is a heuristic — it asserts a production PlaidItem row exists, not
  // that DATABASE_URL points at the real prod DB (matches the convention used by
  // the other finance scripts). It is also currently the only live bank; if a
  // SECOND production bank is ever connected the seam below should be scoped to
  // the WF institutionId, else an earlier-history second item would shift it.
  const liveItems = await prisma.plaidItem.findMany({
    where: { environment: 'production', itemId: { not: STMT_ITEM.itemId } },
    select: { id: true, institutionId: true, institutionName: true },
  });
  if (liveItems.length === 0) {
    throw new Error('refusing: no live production Plaid item found — this is not the production DB, or Plaid is not connected.');
  }
  const seamRow = await prisma.plaidTransaction.findFirst({
    where: { plaidItemId: { in: liveItems.map((i) => i.id) }, pending: false },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  if (!seamRow) throw new Error('refusing: live Plaid item has no transactions — cannot determine the seam.');
  const seamISO = seamRow.date.toISOString().slice(0, 10);

  console.log(`Live Plaid item(s): ${liveItems.map((i) => `${i.institutionName ?? '?'} [${i.institutionId ?? '?'}]`).join(', ')}`);
  console.log(`Plaid seam (earliest live txn): ${seamISO} — importing statement rows strictly BEFORE this.`);

  const { staged, skipped } = loadStaged(args, seamISO);
  if (skipped) console.log(`Parser skipped ${skipped} malformed/zero rows (see parser output for reasons).`);
  console.log(`Staged ${staged.length} statement rows to import (after date-range ownership + seam cutoff).`);

  printSummary(staged);
  await checkSeam(staged, liveItems.map((i) => i.id), seamISO);

  if (!args.apply) {
    console.log('\nDRY-RUN — no rows written. Re-run with --apply to persist, then rebuild rollups:');
    console.log('  npx tsx scripts/finance/backfill-monthly-rollups.ts');
    return;
  }
  console.log('\n--apply — writing to the PRODUCTION database...');
  await applyRows(staged);
  console.log('Done. Rebuild rollups next: npx tsx scripts/finance/backfill-monthly-rollups.ts');
}

main()
  .catch((err) => {
    console.error('[import-wf-statements] FATAL:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
