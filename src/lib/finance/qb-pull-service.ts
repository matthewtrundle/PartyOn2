/**
 * Phase 2A — QuickBooks OpEx pull service.
 *
 * Reads from QB:
 *   - Chart of Accounts (Account where AccountType IN expense-ish types)
 *   - Purchase + Bill + JournalEntry transactions in the trailing window
 *
 * Writes to PartyOn:
 *   - QbAccount (upsert by qbAccountId)
 *   - QbExpense (upsert by qbTransactionId), with PartyOn category derived
 *     via qb-account-map.ts at write time so /admin/finance can render
 *     OpEx-by-category without recomputing.
 *
 * Used by /api/cron/finance-qb-pull (weekly).
 */

import { prisma } from '@/lib/database/client';
import { qboQuery } from './qb-client';
import {
  categorizeQbAccount,
  type CategorySlug,
} from './qb-account-map';

// ---------------------------------------------------------------------------
// QB API shapes — only the fields we touch
// ---------------------------------------------------------------------------

interface QbAccountApi {
  Id: string;
  Name: string;
  FullyQualifiedName?: string;
  AccountType?: string;
  AccountSubType?: string;
  CurrencyRef?: { value?: string };
  Active?: boolean;
}

interface QbLineApi {
  Amount?: number;
  DetailType?: string;
  AccountBasedExpenseLineDetail?: {
    AccountRef?: { value?: string; name?: string };
  };
  Description?: string;
}

interface QbVendorRef {
  value?: string;
  name?: string;
}

interface QbPurchaseApi {
  Id: string;
  TxnDate?: string; // YYYY-MM-DD
  TotalAmt?: number;
  CurrencyRef?: { value?: string };
  EntityRef?: QbVendorRef; // vendor on Purchase
  Line?: QbLineApi[];
  PrivateNote?: string;
  AccountRef?: { value?: string };
}

interface QbBillApi {
  Id: string;
  TxnDate?: string;
  TotalAmt?: number;
  CurrencyRef?: { value?: string };
  VendorRef?: QbVendorRef;
  Line?: QbLineApi[];
  PrivateNote?: string;
}

// ---------------------------------------------------------------------------
// Chart of accounts pull
// ---------------------------------------------------------------------------

const PAGE_SIZE = 500;

export async function syncQbAccounts(): Promise<{
  upserted: number;
  perTypeErrors: string[];
}> {
  let upserted = 0;
  const perTypeErrors: string[] = [];

  // Pull EVERY account regardless of type. Phase 2A (OpEx) only consumes
  // expense-type rows, but Phase 2B's journal mapping needs Income, Asset,
  // and Liability accounts too — so we pull the full chart. This also
  // dodges the per-type filter brittleness where some sandbox configs
  // reject specific AccountType values (OtherExpense, CostOfGoodsSold)
  // with a 400.
  let position = 1;
  try {
    while (true) {
      const q = `SELECT * FROM Account STARTPOSITION ${position} MAXRESULTS ${PAGE_SIZE}`;
      const resp = await qboQuery(q);
      const accounts = (resp?.Account ?? []) as QbAccountApi[];
      if (accounts.length === 0) break;
      for (const a of accounts) {
        await upsertQbAccountRow(a);
        upserted++;
      }
      if (accounts.length < PAGE_SIZE) break;
      position += accounts.length;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[syncQbAccounts] account pull failed:', message);
    perTypeErrors.push(`all: ${message.slice(0, 200)}`);
  }

  return { upserted, perTypeErrors };
}

async function upsertQbAccountRow(a: QbAccountApi): Promise<void> {
  await prisma.qbAccount.upsert({
    where: { qbAccountId: a.Id },
    create: {
      qbAccountId: a.Id,
      name: a.Name,
      fullyQualifiedName: a.FullyQualifiedName ?? null,
      accountType: a.AccountType ?? null,
      accountSubType: a.AccountSubType ?? null,
      currency: a.CurrencyRef?.value ?? 'USD',
      active: a.Active ?? true,
      lastSyncedAt: new Date(),
    },
    update: {
      name: a.Name,
      fullyQualifiedName: a.FullyQualifiedName ?? null,
      accountType: a.AccountType ?? null,
      accountSubType: a.AccountSubType ?? null,
      active: a.Active ?? true,
      lastSyncedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Expense transactions pull
// ---------------------------------------------------------------------------

function cents(amount: number | undefined): number {
  if (amount === undefined || !Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function pickAccountId(lines: QbLineApi[] | undefined): string | null {
  if (!lines) return null;
  for (const l of lines) {
    const id = l.AccountBasedExpenseLineDetail?.AccountRef?.value;
    if (id) return id;
  }
  return null;
}

/**
 * Resolve a QB AccountRef.value to (a) a PartyOn category slug and (b) the
 * accountId we should actually persist on QbExpense.qbAccountId. If the
 * referenced account isn't in our qb_accounts cache, the cached accountId
 * is returned as null so the FK constraint isn't violated. We log a warning
 * so the next sync run includes a "fallback fetch this single account" pass.
 */
async function resolveAccountForExpense(
  accountId: string | null
): Promise<{ category: CategorySlug; cachedAccountId: string | null }> {
  if (!accountId) return { category: 'other', cachedAccountId: null };
  const account = await prisma.qbAccount.findUnique({
    where: { qbAccountId: accountId },
    select: { name: true, fullyQualifiedName: true, accountSubType: true },
  });
  if (!account) {
    console.warn(
      '[pullQbExpenses] referenced QB account not in cache:',
      accountId
    );
    return { category: 'other', cachedAccountId: null };
  }
  return {
    category: categorizeQbAccount({
      accountSubType: account.accountSubType,
      name: account.name,
      fullyQualifiedName: account.fullyQualifiedName,
    }),
    cachedAccountId: accountId,
  };
}

export interface PullExpensesResult {
  purchases: number;
  bills: number;
}

/**
 * Pull Purchase + Bill transactions whose TxnDate >= sinceIso. Idempotent
 * (upserts by qbTransactionId). Categorisation pulls from the
 * QbAccount cache, so callers should `syncQbAccounts()` first.
 */
export async function pullQbExpenses(
  sinceIso: string // YYYY-MM-DD
): Promise<PullExpensesResult> {
  let purchases = 0;
  let bills = 0;

  // Purchase
  let position = 1;
  while (true) {
    const q = `SELECT * FROM Purchase WHERE TxnDate >= '${sinceIso}' STARTPOSITION ${position} MAXRESULTS ${PAGE_SIZE}`;
    const resp = await qboQuery(q);
    const rows = (resp?.Purchase ?? []) as QbPurchaseApi[];
    if (rows.length === 0) break;
    for (const p of rows) {
      const refAccountId =
        pickAccountId(p.Line) || p.AccountRef?.value || null;
      const { category, cachedAccountId } = await resolveAccountForExpense(
        refAccountId
      );
      await prisma.qbExpense.upsert({
        where: { qbTransactionId: `Purchase:${p.Id}` },
        create: {
          qbTransactionId: `Purchase:${p.Id}`,
          txnType: 'Purchase',
          txnDate: new Date(`${p.TxnDate ?? sinceIso}T00:00:00Z`),
          amountCents: cents(p.TotalAmt),
          currency: p.CurrencyRef?.value ?? 'USD',
          vendorName: p.EntityRef?.name ?? null,
          qbAccountId: cachedAccountId,
          categorySlug: category,
          memo: p.PrivateNote ?? null,
          rawPayload: p as unknown as object,
        },
        update: {
          txnDate: new Date(`${p.TxnDate ?? sinceIso}T00:00:00Z`),
          amountCents: cents(p.TotalAmt),
          vendorName: p.EntityRef?.name ?? null,
          qbAccountId: cachedAccountId,
          categorySlug: category,
          memo: p.PrivateNote ?? null,
          rawPayload: p as unknown as object,
        },
      });
      purchases++;
    }
    if (rows.length < PAGE_SIZE) break;
    position += rows.length;
  }

  // Bill
  position = 1;
  while (true) {
    const q = `SELECT * FROM Bill WHERE TxnDate >= '${sinceIso}' STARTPOSITION ${position} MAXRESULTS ${PAGE_SIZE}`;
    const resp = await qboQuery(q);
    const rows = (resp?.Bill ?? []) as QbBillApi[];
    if (rows.length === 0) break;
    for (const b of rows) {
      const refAccountId = pickAccountId(b.Line);
      const { category, cachedAccountId } = await resolveAccountForExpense(
        refAccountId
      );
      await prisma.qbExpense.upsert({
        where: { qbTransactionId: `Bill:${b.Id}` },
        create: {
          qbTransactionId: `Bill:${b.Id}`,
          txnType: 'Bill',
          txnDate: new Date(`${b.TxnDate ?? sinceIso}T00:00:00Z`),
          amountCents: cents(b.TotalAmt),
          currency: b.CurrencyRef?.value ?? 'USD',
          vendorName: b.VendorRef?.name ?? null,
          qbAccountId: cachedAccountId,
          categorySlug: category,
          memo: b.PrivateNote ?? null,
          rawPayload: b as unknown as object,
        },
        update: {
          txnDate: new Date(`${b.TxnDate ?? sinceIso}T00:00:00Z`),
          amountCents: cents(b.TotalAmt),
          vendorName: b.VendorRef?.name ?? null,
          qbAccountId: cachedAccountId,
          categorySlug: category,
          memo: b.PrivateNote ?? null,
          rawPayload: b as unknown as object,
        },
      });
      bills++;
    }
    if (rows.length < PAGE_SIZE) break;
    position += rows.length;
  }

  return { purchases, bills };
}

// ---------------------------------------------------------------------------
// OpEx aggregation for /admin/finance + Phase 1C P&L
// ---------------------------------------------------------------------------

export interface OpExBucket {
  category: CategorySlug;
  label: string;
  totalCents: number;
  txnCount: number;
}

export interface OpExSummary {
  fromIso: string;
  toIso: string;
  totalCents: number;
  txnCount: number;
  byCategory: OpExBucket[];
}

import { CATEGORY_LABELS } from './qb-account-map';

export async function opExSummary(
  fromIso: string, // YYYY-MM-DD
  toIso: string // YYYY-MM-DD, exclusive
): Promise<OpExSummary> {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  const grouped = await prisma.qbExpense.groupBy({
    by: ['categorySlug'],
    where: { txnDate: { gte: from, lt: to } },
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  const byCategory: OpExBucket[] = grouped.map((g) => {
    const cat = (g.categorySlug ?? 'other') as CategorySlug;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      totalCents: g._sum.amountCents ?? 0,
      txnCount: g._count._all,
    };
  });
  byCategory.sort((a, b) => b.totalCents - a.totalCents);
  const totalCents = byCategory.reduce((s, b) => s + b.totalCents, 0);
  const txnCount = byCategory.reduce((s, b) => s + b.txnCount, 0);
  return { fromIso, toIso, totalCents, txnCount, byCategory };
}
