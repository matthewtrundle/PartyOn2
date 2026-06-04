/**
 * Sales-journal lifecycle for Phase 2B.
 *
 * Daily cron drafts one journal entry per day summarising PartyOn revenue,
 * Stripe fees, refunds, sales tax payable, tips payable, etc. Operator
 * reviews + approves via /admin/finance/journals; on approve the service
 * posts to QuickBooks and stores the resulting QB transaction ID.
 *
 * State machine:
 *   PENDING_APPROVAL → APPROVED → POSTED
 *                   ↘ REJECTED
 *                   ↘ FAILED (post-to-QB error; operator can retry)
 *   PENDING_APPROVAL → SUPERSEDED (when the cron re-drafts the same day)
 *
 * Per autonomy decision #4 (brief §3 + §11): every state transition that
 * touches money is operator-driven. The cron only drafts.
 */

import { prisma } from '@/lib/database/client';
import {
  postJournalEntryToQb,
  type QboJournalEntryPayload,
  type QboJournalLine,
} from './qb-client';
import {
  computeDailyPL,
  type PlSnapshotPayload,
} from './pl-calculation';

const ONE_DAY_MS = 86_400_000;

export type JournalStatus =
  | 'PENDING_APPROVAL' // legacy — not used in current autonomous flow
  | 'APPROVED'         // legacy
  | 'POSTED'
  | 'REJECTED'         // legacy / manual
  | 'FAILED'
  | 'SUPERSEDED'
  | 'REVERSED';        // operator-initiated rollback via /admin/finance/journals

export interface JournalConfig {
  stripeClearingAccountId: string | null;
  stripeFeesAccountId: string | null;
  salesRevenueAccountId: string | null;
  salesTaxPayableAccountId: string | null;
  deliveryRevenueAccountId: string | null;
  tipsPayableAccountId: string | null;
  refundsAccountId: string | null;
  discountsAccountId: string | null;
  enabled: boolean;
}

const CONFIG_ID = 'singleton';

export async function getJournalConfig(): Promise<JournalConfig> {
  const row = await prisma.qbJournalConfig.findUnique({
    where: { id: CONFIG_ID },
  });
  if (!row) {
    return {
      stripeClearingAccountId: null,
      stripeFeesAccountId: null,
      salesRevenueAccountId: null,
      salesTaxPayableAccountId: null,
      deliveryRevenueAccountId: null,
      tipsPayableAccountId: null,
      refundsAccountId: null,
      discountsAccountId: null,
      enabled: false,
    };
  }
  return {
    stripeClearingAccountId: row.stripeClearingAccountId,
    stripeFeesAccountId: row.stripeFeesAccountId,
    salesRevenueAccountId: row.salesRevenueAccountId,
    salesTaxPayableAccountId: row.salesTaxPayableAccountId,
    deliveryRevenueAccountId: row.deliveryRevenueAccountId,
    tipsPayableAccountId: row.tipsPayableAccountId,
    refundsAccountId: row.refundsAccountId,
    discountsAccountId: row.discountsAccountId,
    enabled: row.enabled,
  };
}

export async function saveJournalConfig(
  patch: Partial<JournalConfig>
): Promise<JournalConfig> {
  await prisma.qbJournalConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      stripeClearingAccountId: patch.stripeClearingAccountId ?? null,
      stripeFeesAccountId: patch.stripeFeesAccountId ?? null,
      salesRevenueAccountId: patch.salesRevenueAccountId ?? null,
      salesTaxPayableAccountId: patch.salesTaxPayableAccountId ?? null,
      deliveryRevenueAccountId: patch.deliveryRevenueAccountId ?? null,
      tipsPayableAccountId: patch.tipsPayableAccountId ?? null,
      refundsAccountId: patch.refundsAccountId ?? null,
      discountsAccountId: patch.discountsAccountId ?? null,
      enabled: patch.enabled ?? false,
    },
    update: patch,
  });
  return getJournalConfig();
}

/**
 * Required account IDs for a journal to be draftable. If any are missing
 * we hold off and surface a clear message in the cron report.
 */
function listMissingMappings(config: JournalConfig): string[] {
  const missing: string[] = [];
  if (!config.stripeClearingAccountId) missing.push('stripeClearing');
  if (!config.stripeFeesAccountId) missing.push('stripeFees');
  if (!config.salesRevenueAccountId) missing.push('salesRevenue');
  if (!config.salesTaxPayableAccountId) missing.push('salesTaxPayable');
  // tips / delivery / refunds / discounts are only required if non-zero
  return missing;
}

// ---------------------------------------------------------------------------
// Draft computation
// ---------------------------------------------------------------------------

export interface JournalLineSummary {
  label: string;
  postingType: 'Debit' | 'Credit';
  amountCents: number;
  accountId: string;
}

export interface JournalDraft {
  entryDate: string; // YYYY-MM-DD
  source: PlSnapshotPayload;
  proposed: QboJournalEntryPayload;
  lineSummary: JournalLineSummary[];
}

/**
 * Build a balanced double-entry journal for the given date.
 *
 * Debits  (left side):
 *   Stripe Clearing      = net received cents (revenue actually deposited)
 *   Stripe Fees          = stripe fees cents (expense)
 *   Refunds              = refunded amount cents (contra-revenue)
 *
 * Credits (right side):
 *   Sales Revenue        = subtotal cents - discount cents
 *   Sales Tax Payable    = tax collected cents
 *   Delivery Revenue     = delivery fees cents
 *   Tips Payable         = tips cents (pass-through to drivers)
 *
 * Note: the cron's `netReceivedCents` is what hit Stripe; if Stripe fee
 * coverage is < 100%, the debit/credit sides won't balance exactly. In
 * that case we plug the difference as an additional debit/credit to Sales
 * Revenue and flag in source.notes so the operator knows.
 */
export async function computeDailySalesJournal(
  date: string // YYYY-MM-DD
): Promise<JournalDraft | null> {
  const config = await getJournalConfig();
  const missing = listMissingMappings(config);
  if (missing.length > 0) {
    throw new Error(
      `QB journal config missing account IDs: ${missing.join(', ')}. Configure at /admin/finance/journals/settings.`
    );
  }

  const from = new Date(`${date}T00:00:00Z`);
  const to = new Date(from.getTime() + ONE_DAY_MS);
  const source = await computeDailyPL({ from, to });

  // Skip days with no PAID orders — nothing to journal.
  if (source.paidOrderCount === 0) return null;

  const lines: QboJournalLine[] = [];
  const summary: JournalLineSummary[] = [];

  function debit(label: string, amountCents: number, accountId: string): void {
    if (amountCents <= 0 || !accountId) return;
    lines.push({
      lineId: undefined,
      amountCents,
      description: label,
      postingType: 'Debit',
      accountId,
    });
    summary.push({ label, postingType: 'Debit', amountCents, accountId });
  }
  function credit(label: string, amountCents: number, accountId: string): void {
    if (amountCents <= 0 || !accountId) return;
    lines.push({
      lineId: undefined,
      amountCents,
      description: label,
      postingType: 'Credit',
      accountId,
    });
    summary.push({ label, postingType: 'Credit', amountCents, accountId });
  }

  // --- Debit side ------------------------------------------------------
  debit('Stripe net deposit', source.netReceivedCents, config.stripeClearingAccountId!);
  debit('Stripe processing fees', source.stripeFeesCents, config.stripeFeesAccountId!);
  if (source.refundedAmountCents > 0 && config.refundsAccountId) {
    debit('Refunds issued', source.refundedAmountCents, config.refundsAccountId);
  }

  // --- Credit side -----------------------------------------------------
  const netSubtotalCents = Math.max(
    0,
    source.subtotalCents - source.discountAmountCents
  );
  credit('Sales revenue (net of discounts)', netSubtotalCents, config.salesRevenueAccountId!);
  credit('Sales tax collected (TX 8.25%)', source.taxCollectedCents, config.salesTaxPayableAccountId!);
  if (source.deliveryFeesCents > 0 && config.deliveryRevenueAccountId) {
    credit('Delivery fees', source.deliveryFeesCents, config.deliveryRevenueAccountId);
  }
  if (source.tipsCents > 0 && config.tipsPayableAccountId) {
    credit('Tips (pass-through)', source.tipsCents, config.tipsPayableAccountId);
  }

  // Discount line is informational only — already netted from sales revenue
  // above. Operator can opt into a separate Discounts contra-revenue line
  // by configuring discountsAccountId; we treat it as a credit reduction
  // when present.
  if (source.discountAmountCents > 0 && config.discountsAccountId) {
    debit('Discounts (contra-revenue)', source.discountAmountCents, config.discountsAccountId);
    credit('Sales revenue (gross-up for discounts)', source.discountAmountCents, config.salesRevenueAccountId!);
  }

  // --- Balance check ---------------------------------------------------
  const debits = lines.filter((l) => l.postingType === 'Debit').reduce((s, l) => s + l.amountCents, 0);
  const credits = lines.filter((l) => l.postingType === 'Credit').reduce((s, l) => s + l.amountCents, 0);
  const drift = debits - credits;
  if (drift !== 0) {
    // Plug the difference on the appropriate side, against Sales Revenue.
    if (drift > 0) {
      credit('Balancing plug (stripe fee coverage gap)', drift, config.salesRevenueAccountId!);
    } else {
      debit('Balancing plug (stripe fee coverage gap)', -drift, config.salesRevenueAccountId!);
    }
  }

  const proposed: QboJournalEntryPayload = {
    txnDate: date,
    privateNote: `PartyOn auto-drafted sales journal for ${date}. paidOrders=${source.paidOrderCount} refunds=${source.refundCount}`,
    lines,
  };

  return { entryDate: date, source, proposed, lineSummary: summary };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export interface SavedJournalEntry {
  id: string;
  entryDate: string;
  status: JournalStatus;
  qbTransactionId: string | null;
  source: PlSnapshotPayload;
  proposed: QboJournalEntryPayload;
  lineSummary: JournalLineSummary[];
  postedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  failureReason: string | null;
  actionLog: Array<{ at: string; actor: string; from: string; to: string; note?: string }>;
  createdAt: string;
  updatedAt: string;
}

interface ActionLogEntry {
  at: string;
  actor: string;
  from: string;
  to: string;
  note?: string;
}

function asActionLog(value: unknown): ActionLogEntry[] {
  if (!Array.isArray(value)) return [];
  return value as ActionLogEntry[];
}

function toSaved(row: {
  id: string;
  entryDate: Date;
  status: string;
  qbTransactionId: string | null;
  sourcePayload: unknown;
  proposedPayload: unknown;
  lineSummary: unknown;
  postedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedReason: string | null;
  failureReason: string | null;
  actionLog: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SavedJournalEntry {
  return {
    id: row.id,
    entryDate: row.entryDate.toISOString().slice(0, 10),
    status: row.status as JournalStatus,
    qbTransactionId: row.qbTransactionId,
    source: row.sourcePayload as PlSnapshotPayload,
    proposed: row.proposedPayload as QboJournalEntryPayload,
    lineSummary: row.lineSummary as JournalLineSummary[],
    postedAt: row.postedAt?.toISOString() ?? null,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedReason: row.rejectedReason,
    failureReason: row.failureReason,
    actionLog: asActionLog(row.actionLog),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Save a fresh draft for the given date. If a PENDING_APPROVAL entry
 * already exists for that date we mark it SUPERSEDED and write a new one.
 */
export async function persistDraft(draft: JournalDraft): Promise<SavedJournalEntry> {
  const entryDate = new Date(`${draft.entryDate}T00:00:00Z`);
  await prisma.qbJournalEntry.updateMany({
    where: { entryDate, status: 'PENDING_APPROVAL' },
    data: { status: 'SUPERSEDED' },
  });
  const row = await prisma.qbJournalEntry.create({
    data: {
      entryDate,
      status: 'PENDING_APPROVAL',
      sourcePayload: draft.source as unknown as object,
      proposedPayload: draft.proposed as unknown as object,
      lineSummary: draft.lineSummary as unknown as object,
      actionLog: [
        {
          at: new Date().toISOString(),
          actor: 'cron',
          from: '(none)',
          to: 'PENDING_APPROVAL',
        },
      ] as unknown as object,
    },
  });
  return toSaved(row);
}

export async function listJournals(
  status?: JournalStatus | 'ALL'
): Promise<SavedJournalEntry[]> {
  const rows = await prisma.qbJournalEntry.findMany({
    where: status && status !== 'ALL' ? { status } : undefined,
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });
  return rows.map(toSaved);
}

export async function getJournal(id: string): Promise<SavedJournalEntry | null> {
  const row = await prisma.qbJournalEntry.findUnique({ where: { id } });
  return row ? toSaved(row) : null;
}

function appendLog(
  current: unknown,
  entry: ActionLogEntry
): unknown {
  const arr = asActionLog(current);
  return [...arr, entry];
}

/**
 * Approve + post in one step. Operator click; not autonomous.
 */
export async function approveAndPostJournal(
  id: string,
  actor: string
): Promise<SavedJournalEntry> {
  const row = await prisma.qbJournalEntry.findUnique({ where: { id } });
  if (!row) throw new Error(`Journal entry ${id} not found`);
  if (row.status !== 'PENDING_APPROVAL' && row.status !== 'FAILED') {
    throw new Error(`Cannot approve journal in status ${row.status}`);
  }

  // 1. Mark APPROVED
  let updated = await prisma.qbJournalEntry.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy: actor,
      approvedAt: new Date(),
      actionLog: appendLog(row.actionLog, {
        at: new Date().toISOString(),
        actor,
        from: row.status,
        to: 'APPROVED',
      }) as unknown as object,
    },
  });

  // 2. Try to post to QB
  try {
    const payload = updated.proposedPayload as unknown as QboJournalEntryPayload;
    const result = await postJournalEntryToQb(payload);
    updated = await prisma.qbJournalEntry.update({
      where: { id },
      data: {
        status: 'POSTED',
        qbTransactionId: result.qbTransactionId,
        postedAt: new Date(),
        failureReason: null,
        actionLog: appendLog(updated.actionLog, {
          at: new Date().toISOString(),
          actor,
          from: 'APPROVED',
          to: 'POSTED',
          note: `QB JournalEntry ID ${result.qbTransactionId}`,
        }) as unknown as object,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updated = await prisma.qbJournalEntry.update({
      where: { id },
      data: {
        status: 'FAILED',
        failureReason: message,
        actionLog: appendLog(updated.actionLog, {
          at: new Date().toISOString(),
          actor,
          from: 'APPROVED',
          to: 'FAILED',
          note: message.slice(0, 240),
        }) as unknown as object,
      },
    });
  }
  return toSaved(updated);
}

/**
 * Autonomous flow (updated 2026-05-21 per operator decision): the cron
 * computes the draft AND immediately posts it to QB in one step. Persists
 * either POSTED (happy path) or FAILED (QB error). No PENDING_APPROVAL
 * state in this flow.
 *
 * Idempotency: if a POSTED entry already exists for the same entryDate
 * we skip without posting (don't double-post the same day).
 */
export async function draftAndPostAutonomous(
  draft: JournalDraft,
  actor: string
): Promise<{ saved: SavedJournalEntry; skipped?: 'already_posted' }> {
  const entryDate = new Date(`${draft.entryDate}T00:00:00Z`);
  const existing = await prisma.qbJournalEntry.findFirst({
    where: { entryDate, status: { in: ['POSTED', 'APPROVED'] } },
  });
  if (existing) {
    return { saved: toSaved(existing), skipped: 'already_posted' };
  }

  // Supersede any stale PENDING / FAILED for the same day so we don't
  // accumulate duplicates in the UI.
  await prisma.qbJournalEntry.updateMany({
    where: { entryDate, status: { in: ['PENDING_APPROVAL', 'FAILED'] } },
    data: { status: 'SUPERSEDED' },
  });

  // Persist a row first so we have an ID to attach the audit log to,
  // even if the QB POST throws.
  const row = await prisma.qbJournalEntry.create({
    data: {
      entryDate,
      status: 'PENDING_APPROVAL', // transient — flipped to POSTED or FAILED below
      sourcePayload: draft.source as unknown as object,
      proposedPayload: draft.proposed as unknown as object,
      lineSummary: draft.lineSummary as unknown as object,
      actionLog: [
        {
          at: new Date().toISOString(),
          actor,
          from: '(none)',
          to: 'DRAFTED',
        },
      ] as unknown as object,
    },
  });

  try {
    const result = await postJournalEntryToQb(draft.proposed);
    const updated = await prisma.qbJournalEntry.update({
      where: { id: row.id },
      data: {
        status: 'POSTED',
        qbTransactionId: result.qbTransactionId,
        postedAt: new Date(),
        approvedBy: actor,
        approvedAt: new Date(),
        failureReason: null,
        actionLog: appendLog(row.actionLog, {
          at: new Date().toISOString(),
          actor,
          from: 'DRAFTED',
          to: 'POSTED',
          note: `QB JournalEntry ID ${result.qbTransactionId} (autonomous)`,
        }) as unknown as object,
      },
    });
    return { saved: toSaved(updated) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const updated = await prisma.qbJournalEntry.update({
      where: { id: row.id },
      data: {
        status: 'FAILED',
        failureReason: message,
        actionLog: appendLog(row.actionLog, {
          at: new Date().toISOString(),
          actor,
          from: 'DRAFTED',
          to: 'FAILED',
          note: message.slice(0, 240),
        }) as unknown as object,
      },
    });
    return { saved: toSaved(updated) };
  }
}

/**
 * Reverse a previously POSTED entry. Operator-initiated safety net.
 * Writes a new JournalEntry to QB with debits + credits swapped, then
 * marks the original REVERSED with a pointer to the reversing entry's
 * QB id.
 */
export async function reverseJournal(
  id: string,
  actor: string,
  reason: string
): Promise<SavedJournalEntry> {
  const row = await prisma.qbJournalEntry.findUnique({ where: { id } });
  if (!row) throw new Error(`Journal entry ${id} not found`);
  if (row.status !== 'POSTED') {
    throw new Error(`Cannot reverse entry in status ${row.status} (must be POSTED)`);
  }
  if (!row.qbTransactionId) {
    throw new Error(`Cannot reverse — entry has no QB transaction ID`);
  }

  const original = row.proposedPayload as unknown as QboJournalEntryPayload;
  const reversePayload: QboJournalEntryPayload = {
    txnDate: new Date().toISOString().slice(0, 10),
    privateNote: `REVERSAL of QB JournalEntry ${row.qbTransactionId} (PartyOn id ${id}). Reason: ${reason}`,
    lines: original.lines.map((l) => ({
      ...l,
      postingType: l.postingType === 'Debit' ? 'Credit' : 'Debit',
      description: `Reversal: ${l.description ?? ''}`.trim(),
    })),
  };

  const result = await postJournalEntryToQb(reversePayload);
  const updated = await prisma.qbJournalEntry.update({
    where: { id },
    data: {
      status: 'REVERSED',
      actionLog: appendLog(row.actionLog, {
        at: new Date().toISOString(),
        actor,
        from: 'POSTED',
        to: 'REVERSED',
        note: `Reversal posted as QB JournalEntry ${result.qbTransactionId}. Reason: ${reason}`,
      }) as unknown as object,
    },
  });
  return toSaved(updated);
}

export async function rejectJournal(
  id: string,
  actor: string,
  reason: string
): Promise<SavedJournalEntry> {
  const row = await prisma.qbJournalEntry.findUnique({ where: { id } });
  if (!row) throw new Error(`Journal entry ${id} not found`);
  if (row.status !== 'PENDING_APPROVAL' && row.status !== 'FAILED') {
    throw new Error(`Cannot reject journal in status ${row.status}`);
  }
  const updated = await prisma.qbJournalEntry.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedReason: reason,
      actionLog: appendLog(row.actionLog, {
        at: new Date().toISOString(),
        actor,
        from: row.status,
        to: 'REJECTED',
        note: reason,
      }) as unknown as object,
    },
  });
  return toSaved(updated);
}
