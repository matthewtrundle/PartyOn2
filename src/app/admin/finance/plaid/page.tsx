'use client';

import { useEffect, useState, ReactElement } from 'react';
import Link from 'next/link';

interface PlaidReconciliationRow {
  id: string;
  date: string;
  amountCents: number;
  direction: 'inflow' | 'outflow';
  name: string;
  merchantName: string | null;
  reconciled: boolean;
  matchedStripePayoutId: string | null;
  matchedQbExpenseId: string | null;
  qbCategoryAssigned: string | null;
  pfcPrimary: string | null;
  pfcDetailed: string | null;
}

interface PlaidReconciliationSummary {
  totalTxns: number;
  reconciledCount: number;
  inflowMatchedCount: number;
  outflowMatchedCount: number;
  unmatchedCount: number;
  unmatchedInflowCents: number;
  unmatchedOutflowCents: number;
}

interface PlaidData {
  summary: PlaidReconciliationSummary;
  rows: PlaidReconciliationRow[];
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Filter = 'all' | 'unmatched' | 'inflow' | 'outflow';

export default function FinancePlaidPage(): ReactElement {
  const [data, setData] = useState<PlaidData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/finance/plaid?days=${days}`);
        const body = (await res.json()) as ApiResponse<PlaidData>;
        if (body.success) {
          setData(body.data);
          setError(null);
        } else {
          setError(body.error);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load Plaid data');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [days]);

  const rows = (data?.rows ?? []).filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'unmatched') return !r.reconciled && r.direction !== undefined;
    return r.direction === filter;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Plaid reconciliation</h1>
          <p className="text-gray-600 text-sm">
            Phase 2C of the Finance Director. Plaid webhooks + a daily safety
            cron auto-match bank deposits → Stripe payouts and outflows → QB
            expense entries. Unmatched rows are visible here for review.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/finance/connect-bank"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Bank connection
          </Link>
          <Link
            href="/admin/finance"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md text-sm border bg-red-50 border-red-200 text-red-800">
          Error: {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 text-sm">Loading…</p>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Kpi label="Total txns" value={`${data.summary.totalTxns}`} sub={`last ${days}d`} />
            <Kpi
              label="Reconciled"
              value={`${data.summary.reconciledCount}`}
              sub={`${data.summary.inflowMatchedCount} in · ${data.summary.outflowMatchedCount} out`}
            />
            <Kpi
              label="Unmatched"
              value={`${data.summary.unmatchedCount}`}
              alert={data.summary.unmatchedCount > 0}
              sub={
                data.summary.unmatchedCount > 0
                  ? 'review below'
                  : 'all matched'
              }
            />
            <Kpi
              label="Unmatched inflow"
              value={formatCents(data.summary.unmatchedInflowCents)}
              sub="deposits not tied to a Stripe payout"
            />
            <Kpi
              label="Unmatched outflow"
              value={formatCents(data.summary.unmatchedOutflowCents)}
              sub="payments not in QB yet"
            />
          </div>

          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-2">
              {(['all', 'unmatched', 'inflow', 'outflow'] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-md border ${
                    filter === f
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-1 text-xs">
              {[7, 30, 90].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  className={`px-2 py-1 rounded border ${
                    days === n
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {n}d
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-left p-3 font-semibold">Description</th>
                  <th className="text-right p-3 font-semibold">Amount</th>
                  <th className="text-left p-3 font-semibold">Direction</th>
                  <th className="text-left p-3 font-semibold">Match</th>
                  <th className="text-left p-3 font-semibold">Category</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      {data.rows.length === 0
                        ? 'No Plaid transactions in window. After connecting a bank, give Plaid a moment to push transactions.'
                        : 'No rows match this filter.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => <PlaidRow key={r.id} r={r} />)
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}): ReactElement {
  return (
    <div
      className={`p-3 rounded-lg border text-sm ${
        alert ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="text-gray-600 text-xs">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function PlaidRow({ r }: { r: PlaidReconciliationRow }): ReactElement {
  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="p-3 text-gray-700 whitespace-nowrap">{r.date}</td>
      <td className="p-3">
        <div className="text-gray-900">{r.merchantName ?? r.name}</div>
        {r.merchantName && r.merchantName !== r.name && (
          <div className="text-xs text-gray-500">{r.name}</div>
        )}
      </td>
      <td
        className={`p-3 text-right tabular-nums ${
          r.direction === 'inflow' ? 'text-green-700' : 'text-gray-900'
        }`}
      >
        {r.direction === 'inflow' ? '+' : ''}
        {formatCents(Math.abs(r.amountCents))}
      </td>
      <td className="p-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            r.direction === 'inflow'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {r.direction}
        </span>
      </td>
      <td className="p-3 text-xs">
        {r.reconciled ? (
          r.matchedStripePayoutId ? (
            <span className="text-green-700">
              ✓ Stripe payout <code className="text-[10px]">{r.matchedStripePayoutId.slice(0, 8)}…</code>
            </span>
          ) : r.matchedQbExpenseId ? (
            <span className="text-green-700">
              ✓ QB <code className="text-[10px]">{r.matchedQbExpenseId}</code>
            </span>
          ) : (
            <span className="text-green-700">✓</span>
          )
        ) : (
          <span className="text-amber-700">unmatched</span>
        )}
      </td>
      <td className="p-3 text-xs text-gray-600">
        {r.qbCategoryAssigned ?? r.pfcDetailed ?? r.pfcPrimary ?? '—'}
      </td>
    </tr>
  );
}
