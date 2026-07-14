'use client';

/**
 * /admin/affiliates/dashboards
 *
 * POD-admin roster of every client dashboard (GroupOrderV2) across all
 * partners: searchable by host/name/code, filterable by partner, party
 * type, and lifecycle, with engagement (views, time-on-dashboard, group
 * size, cart) and payment status per row.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';

interface DashboardRow {
  id: string;
  name: string;
  hostName: string;
  hostEmail: string | null;
  shareCode: string;
  partyType: string | null;
  source: string;
  partner: { id: string; businessName: string; partnerSlug: string | null } | null;
  createdAt: string;
  deliveryDate: string | null;
  lifecycleStatus: 'draft' | 'in_progress' | 'paid' | 'completed';
  totalCents: number;
  cartItemCount: number;
  viewCount: number;
  activeSeconds: number;
  lastActivityAt: string | null;
  participantCount: number;
}

interface Filters {
  partners: { id: string; businessName: string }[];
  partyTypes: string[];
  lifecycles: string[];
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  paid: 'Paid',
  completed: 'Completed',
};

const cents = (c: number) =>
  `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const activeTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function PartnerDashboardsPage(): ReactElement {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [partyType, setPartyType] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (partnerId) params.set('affiliateId', partnerId);
    if (partyType) params.set('partyType', partyType);
    if (lifecycle) params.set('lifecycle', lifecycle);
    params.set('page', String(page));
    try {
      const res = await fetch(`/api/v1/admin/partner-dashboards?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setRows(json.data.dashboards);
      setFilters(json.data.filters);
      setPages(json.data.pagination.pages);
      setTotal(json.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search, partnerId, partyType, lifecycle, page]);

  // Debounce reloads so typing in search doesn't fire per keystroke
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const resetPage = () => setPage(1);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/affiliates" className="text-sm text-brand-blue underline">
            ← Partners
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Client dashboards</h1>
          <p className="text-sm text-gray-600 mt-1">
            Every dashboard created by partner clients — {total} total. Search, filter by
            partner, and see how far each group has gotten toward checkout.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          placeholder="Search host, dashboard name, email, or code…"
          className="flex-1 min-w-[240px] rounded-lg border-2 border-gray-200 px-4 py-2.5 text-base focus:border-brand-blue focus:outline-none"
        />
        <select
          value={partnerId}
          onChange={(e) => { setPartnerId(e.target.value); resetPage(); }}
          className="rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base bg-white focus:border-brand-blue focus:outline-none"
        >
          <option value="">All partners</option>
          {filters?.partners.map((p) => (
            <option key={p.id} value={p.id}>{p.businessName}</option>
          ))}
        </select>
        <select
          value={partyType}
          onChange={(e) => { setPartyType(e.target.value); resetPage(); }}
          className="rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base bg-white focus:border-brand-blue focus:outline-none"
        >
          <option value="">All party types</option>
          {filters?.partyTypes.map((t) => (
            <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>
          ))}
        </select>
        <select
          value={lifecycle}
          onChange={(e) => { setLifecycle(e.target.value); resetPage(); }}
          className="rounded-lg border-2 border-gray-200 px-3 py-2.5 text-base bg-white focus:border-brand-blue focus:outline-none"
        >
          <option value="">All statuses</option>
          {filters?.lifecycles.map((l) => (
            <option key={l} value={l}>{STATUS_LABEL[l] ?? l}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
            <tr>
              <th className="text-left p-3">Host / dashboard</th>
              <th className="text-left p-3">Partner</th>
              <th className="text-left p-3">Party type</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Delivery</th>
              <th className="text-left p-3">Engagement</th>
              <th className="text-right p-3">Paid total</th>
              <th className="text-center p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && rows.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-gray-500">No dashboards match.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={loading ? 'opacity-50' : ''}>
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{r.hostName}</div>
                    <div className="text-xs text-gray-500">{r.name}</div>
                  </td>
                  <td className="p-3">
                    {r.partner ? (
                      <span className="text-gray-800">{r.partner.businessName}</span>
                    ) : (
                      <span className="text-gray-400">Direct</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-600">
                    {r.partyType ? r.partyType.replaceAll('_', ' ') : '--'}
                  </td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">
                    {r.deliveryDate
                      ? new Date(r.deliveryDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
                      : '--'}
                  </td>
                  <td className="p-3">
                    <div className="text-gray-700 whitespace-nowrap">
                      {r.viewCount} view{r.viewCount === 1 ? '' : 's'}
                      {r.activeSeconds > 0 && <> · {activeTime(r.activeSeconds)}</>}
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {r.participantCount} in group
                      {r.cartItemCount > 0 && <> · {r.cartItemCount} in cart</>}
                      {r.lastActivityAt && (
                        <> · seen {new Date(r.lastActivityAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium text-gray-900">
                    {r.totalCents > 0 ? cents(r.totalCents) : '--'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[r.lifecycleStatus]}`}>
                      {STATUS_LABEL[r.lifecycleStatus]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <a
                      href={`/dashboard/${r.shareCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-blue hover:underline font-medium"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="btn-secondary px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-600">Page {page} of {pages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages || loading}
            className="btn-secondary px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
