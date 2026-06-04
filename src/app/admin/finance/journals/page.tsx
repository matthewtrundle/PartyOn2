'use client';

import { useEffect, useState, ReactElement } from 'react';
import Link from 'next/link';

type JournalStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'POSTED'
  | 'REJECTED'
  | 'FAILED'
  | 'SUPERSEDED'
  | 'REVERSED';

interface JournalLine {
  label: string;
  postingType: 'Debit' | 'Credit';
  amountCents: number;
  accountId: string;
}

interface ActionLogEntry {
  at: string;
  actor: string;
  from: string;
  to: string;
  note?: string;
}

interface SavedJournalEntry {
  id: string;
  entryDate: string;
  status: JournalStatus;
  qbTransactionId: string | null;
  source: {
    paidOrderCount: number;
    grossRevenueCents: number;
    refundedAmountCents: number;
    stripeFeesCents: number;
    netReceivedCents: number;
  };
  lineSummary: JournalLine[];
  postedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  failureReason: string | null;
  actionLog: ActionLogEntry[];
  createdAt: string;
  updatedAt: string;
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusBadge(status: JournalStatus): string {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-800';
    case 'POSTED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-gray-200 text-gray-700';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'SUPERSEDED':
      return 'bg-gray-100 text-gray-500';
    case 'REVERSED':
      return 'bg-orange-100 text-orange-800';
  }
}

const STATUS_FILTERS: Array<JournalStatus | 'ALL'> = [
  'POSTED',
  'FAILED',
  'REVERSED',
  'ALL',
];

export default function JournalsPage(): ReactElement {
  const [journals, setJournals] = useState<SavedJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JournalStatus | 'ALL'>('POSTED');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/finance/journals?status=${statusFilter}`);
      const body = (await res.json()) as ApiResponse<SavedJournalEntry[]>;
      if (body.success) {
        setJournals(body.data);
        setError(null);
      } else {
        setError(body.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load journals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  /** Manual retry for a FAILED entry. Calls the same approve endpoint
   * (which re-posts the proposed payload). */
  async function retry(id: string): Promise<void> {
    if (!confirm('Retry posting this entry to QuickBooks?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/finance/journals/${id}/approve`, {
        method: 'POST',
      });
      const body = (await res.json()) as ApiResponse<SavedJournalEntry>;
      if (!body.success) setError(body.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    } finally {
      setBusyId(null);
    }
  }

  async function reverse(id: string): Promise<void> {
    const reason = prompt(
      'Reverse this posted entry? A balanced mirror JournalEntry will be posted to QB.\n\nReason:'
    );
    if (!reason || !reason.trim()) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/finance/journals/${id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const body = (await res.json()) as ApiResponse<SavedJournalEntry>;
      if (!body.success) setError(body.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reverse failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Sales journals → QuickBooks</h1>
          <p className="text-gray-600 text-sm">
            Phase 2B of the Finance Director. <strong>Autonomous</strong> — the
            daily cron drafts + posts to QB at 08:00 UTC. Operator only sees
            this page if something needs attention or to reverse an entry.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/finance/journals/settings"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Account mapping
          </Link>
          <Link
            href="/admin/finance"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-md border ${
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md text-sm border bg-red-50 border-red-200 text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 text-sm">Loading…</p>
      ) : journals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
          No journals in this status. The cron drafts daily at 08:00 UTC.
        </div>
      ) : (
        <div className="space-y-3">
          {journals.map((j) => (
            <JournalCard
              key={j.id}
              j={j}
              busy={busyId === j.id}
              onRetry={() => retry(j.id)}
              onReverse={() => reverse(j.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JournalCard({
  j,
  busy,
  onRetry,
  onReverse,
}: {
  j: SavedJournalEntry;
  busy: boolean;
  onRetry: () => void;
  onReverse: () => void;
}): ReactElement {
  const debits = j.lineSummary.filter((l) => l.postingType === 'Debit');
  const credits = j.lineSummary.filter((l) => l.postingType === 'Credit');
  const debitTotal = debits.reduce((s, l) => s + l.amountCents, 0);
  const creditTotal = credits.reduce((s, l) => s + l.amountCents, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-semibold text-gray-900">{j.entryDate}</span>
          <span
            className={`ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(j.status)}`}
          >
            {j.status.replace('_', ' ')}
          </span>
          {j.qbTransactionId && (
            <span className="ml-2 text-gray-500 text-xs">
              QB tx <code>{j.qbTransactionId}</code>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {j.status === 'FAILED' && (
            <button
              type="button"
              onClick={onRetry}
              disabled={busy}
              className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? 'Posting…' : 'Retry post to QB'}
            </button>
          )}
          {j.status === 'POSTED' && (
            <button
              type="button"
              onClick={onReverse}
              disabled={busy}
              className="px-3 py-1.5 bg-white border border-orange-400 text-orange-700 text-xs rounded hover:bg-orange-50 disabled:opacity-50"
              title="Posts a balanced mirror entry to QB"
            >
              {busy ? 'Reversing…' : 'Reverse'}
            </button>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {j.source.paidOrderCount} paid orders · gross{' '}
        {formatCents(j.source.grossRevenueCents)} · net{' '}
        {formatCents(j.source.netReceivedCents)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <div className="font-semibold text-gray-700 mb-1">Debits</div>
          <ul className="space-y-0.5">
            {debits.map((l, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-gray-700">{l.label}</span>
                <span className="tabular-nums">{formatCents(l.amountCents)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between mt-1 pt-1 border-t border-gray-100 font-semibold">
            <span>Total debit</span>
            <span className="tabular-nums">{formatCents(debitTotal)}</span>
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-700 mb-1">Credits</div>
          <ul className="space-y-0.5">
            {credits.map((l, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-gray-700">{l.label}</span>
                <span className="tabular-nums">{formatCents(l.amountCents)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between mt-1 pt-1 border-t border-gray-100 font-semibold">
            <span>Total credit</span>
            <span className="tabular-nums">{formatCents(creditTotal)}</span>
          </div>
        </div>
      </div>

      {j.failureReason && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          QB post failed: {j.failureReason}
        </div>
      )}
      {j.rejectedReason && (
        <div className="mt-3 p-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-700">
          Rejected: {j.rejectedReason}
        </div>
      )}
      {j.actionLog.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            Audit log ({j.actionLog.length})
          </summary>
          <ul className="mt-1 space-y-0.5 text-gray-600">
            {j.actionLog.map((l, i) => (
              <li key={i}>
                <span className="font-mono">{new Date(l.at).toLocaleString()}</span> ·{' '}
                {l.actor}: {l.from} → {l.to}
                {l.note ? ` · ${l.note}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
