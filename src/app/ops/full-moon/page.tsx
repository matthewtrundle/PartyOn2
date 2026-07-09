'use client';

import { useState, useEffect, useCallback, type ReactElement } from 'react';

interface RosterOrder {
  orderId: string;
  orderNumber: number;
  name: string;
  email: string;
  phone: string;
  amount: number;
  quantity: number;
  paymentIntentId: string | null;
  createdAt: string;
  financialStatus: string;
  isComp: boolean;
}

interface RosterTotals {
  ticketsSold: number;
  payingOrders: number;
  compOrders: number;
  collected: number;
  minimum: number;
  advertisedCapacity: number;
  hardCap: number;
  overMinimum: boolean;
}

interface RosterResponse {
  success: boolean;
  productFound: boolean;
  orders: RosterOrder[];
  totals: RosterTotals;
  error?: string;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}): ReactElement {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs font-bold uppercase tracking-wider text-gray-500">{label}</div>
      {sub ? <div className="mt-1 text-sm text-gray-500">{sub}</div> : null}
    </div>
  );
}

/**
 * Ops sales roster for the Lake Travis Full Moon Party. Read-only: lists every
 * PAID ticket order with buyer contact info, amount, quantity, and the Stripe
 * payment-intent id, plus rolled-up totals ($ collected, tickets sold vs. the
 * 32 minimum, advertised cap 50, hard cap 60). Auto-gated by the /ops password.
 */
export default function FullMoonRosterPage(): ReactElement {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/full-moon/roster');
      const json = (await res.json()) as RosterResponse;
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load roster.');
        return;
      }
      setData(json);
    } catch {
      setError('Network error — try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const totals = data?.totals;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Full Moon Party — Sales</h1>
            <p className="mt-0.5 text-gray-500">Lake Travis Full Moon Party ticket roster</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/full-moon-aug1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            View page ↗
          </a>
          <button
            onClick={fetchRoster}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white shadow-sm" />
          ))}
        </div>
      ) : !data?.productFound ? (
        <div className="rounded-xl border border-gray-100 bg-white p-16 text-center shadow-sm">
          <p className="text-xl font-semibold text-gray-700">Ticket product not found</p>
          <p className="mt-2 text-gray-500">
            Run <code className="rounded bg-gray-100 px-1.5 py-0.5">scripts/full-moon/upsert-ticket-product.mjs --apply</code> first.
          </p>
        </div>
      ) : (
        <>
          {/* Totals */}
          {totals && (
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Tickets Sold"
                value={String(totals.ticketsSold)}
                sub={`${totals.ticketsSold} of ${totals.minimum} min · ${totals.overMinimum ? 'sailing ✓' : `${Math.max(0, totals.minimum - totals.ticketsSold)} to go`}`}
              />
              <StatTile label="Collected" value={formatMoney(totals.collected)} sub={`${totals.payingOrders} paying orders`} />
              <StatTile label="Comps" value={String(totals.compOrders)} sub="counted, not charged" />
              <StatTile
                label="Capacity"
                value={`${totals.ticketsSold}/${totals.advertisedCapacity}`}
                sub={`advertised ${totals.advertisedCapacity} · hard cap ${totals.hardCap}`}
              />
            </div>
          )}

          {data.orders.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-16 text-center shadow-sm">
              <p className="text-xl font-semibold text-gray-700">No tickets sold yet</p>
              <p className="mt-2 text-gray-500">Paid orders will appear here as they come in.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                        Payment Intent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                        Paid
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.orders.map((o) => (
                      <tr key={o.orderId} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                          #{o.orderNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          <span className="font-medium">{o.name}</span>
                          {o.isComp && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-800">
                              Comp
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{o.email}</div>
                          {o.phone && <div className="text-gray-500">{o.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900">{o.quantity}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                          {formatMoney(o.amount)}
                        </td>
                        <td className="px-4 py-3">
                          {o.paymentIntentId ? (
                            <code className="text-sm text-gray-600">{o.paymentIntentId}</code>
                          ) : (
                            <span className="text-sm text-gray-400">— (no charge)</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {formatWhen(o.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
