'use client';

import { ReactElement, useState } from 'react';
import Link from 'next/link';

interface ClientOrder {
  id: string;
  type: 'dashboard';
  clientName: string;
  orderName: string;
  createdAt: string;
  deliveryDate: string | null;
  itemCount: number;
  totalCents: number;
  lifecycleStatus: 'draft' | 'in_progress' | 'paid' | 'completed';
  dashboardUrl: string;
  shareCode: string;
  // Engagement analytics (optional — older API payloads omit them)
  viewCount?: number;
  activeSeconds?: number;
  lastActivityAt?: string | null;
  participantCount?: number;
  cartItemCount?: number;
}

interface CommissionOrder {
  orderId: string;
  orderNumber: number;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  subtotalCents: number;
  commissionCents: number;
  commissionRate: number;
  tier: string;
  status: string;
}

// Unified order for display
interface UnifiedOrder {
  id: string;
  source: 'referral' | 'dashboard';
  customerName: string;
  label: string;
  createdAt: string;
  deliveryDate: string | null;
  totalCents: number;
  commissionCents: number | null;
  lifecycleStatus: 'draft' | 'in_progress' | 'paid' | 'completed';
  dashboardUrl: string | null;
  engagement: {
    viewCount: number;
    activeSeconds: number;
    lastActivityAt: string | null;
    participantCount: number;
    cartItemCount: number;
  } | null;
}

interface OrdersTabProps {
  clientOrders: ClientOrder[];
  commissionOrders: CommissionOrder[];
  onCancelClientOrder?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

type SubTab = 'all' | 'draft' | 'in_progress' | 'paid' | 'completed';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'paid', label: 'Paid' },
  { key: 'completed', label: 'Completed' },
];

function mapCommissionStatus(status: string): 'in_progress' | 'paid' | 'completed' {
  // Commission status reflects the order's delivery state
  if (status === 'APPROVED' || status === 'PAID') return 'completed';
  // HELD = order confirmed but not yet delivered
  return 'paid';
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: 'Draft',
    in_progress: 'In Progress',
    paid: 'Paid',
    completed: 'Completed',
  };
  return map[status] || status;
};

const cents = (c: number) =>
  `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "45s", "12m", "1h 20m" — compact time-on-dashboard label. */
const activeTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const sourceBadge = (source: 'referral' | 'dashboard') => {
  if (source === 'referral') return 'bg-purple-50 text-purple-700';
  return 'bg-blue-50 text-blue-700';
};

export default function OrdersTab({
  clientOrders,
  commissionOrders,
  onCancelClientOrder,
}: OrdersTabProps): ReactElement {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const handleCancel = async (id: string) => {
    if (!onCancelClientOrder) return;
    if (!confirm('Cancel this dashboard? The link will stop working for the customer.')) return;
    setCancellingId(id);
    const result = await onCancelClientOrder(id);
    setCancellingId(null);
    if (!result.ok) alert(result.error || 'Failed to cancel');
  };

  const canCancel = (order: UnifiedOrder): boolean =>
    !!onCancelClientOrder &&
    order.source === 'dashboard' &&
    (order.lifecycleStatus === 'draft' || order.lifecycleStatus === 'in_progress');

  // Merge both order types into unified list
  const unified: UnifiedOrder[] = [
    ...commissionOrders.map((o): UnifiedOrder => ({
      id: o.orderId,
      source: 'referral',
      customerName: o.customerName,
      label: `PO-${o.orderNumber}`,
      createdAt: o.orderDate,
      deliveryDate: o.deliveryDate,
      totalCents: o.subtotalCents,
      commissionCents: o.commissionCents,
      lifecycleStatus: mapCommissionStatus(o.status),
      dashboardUrl: null,
      engagement: null,
    })),
    ...clientOrders.map((o): UnifiedOrder => ({
      id: o.id,
      source: 'dashboard',
      customerName: o.clientName,
      label: o.orderName,
      createdAt: o.createdAt,
      deliveryDate: o.deliveryDate,
      totalCents: o.totalCents,
      commissionCents: null,
      lifecycleStatus: o.lifecycleStatus,
      dashboardUrl: `/dashboard/${o.shareCode}`,
      engagement: {
        viewCount: o.viewCount ?? 0,
        activeSeconds: o.activeSeconds ?? 0,
        lastActivityAt: o.lastActivityAt ?? null,
        participantCount: o.participantCount ?? 0,
        cartItemCount: o.cartItemCount ?? 0,
      },
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts: Record<SubTab, number> = {
    all: unified.length,
    draft: unified.filter((o) => o.lifecycleStatus === 'draft').length,
    in_progress: unified.filter((o) => o.lifecycleStatus === 'in_progress').length,
    paid: unified.filter((o) => o.lifecycleStatus === 'paid').length,
    completed: unified.filter((o) => o.lifecycleStatus === 'completed').length,
  };

  const query = search.trim().toLowerCase();
  const searched = query
    ? unified.filter(
        (o) =>
          o.customerName.toLowerCase().includes(query) ||
          o.label.toLowerCase().includes(query) ||
          (o.dashboardUrl ?? '').toLowerCase().includes(query)
      )
    : unified;

  const filtered = activeSubTab === 'all'
    ? searched
    : searched.filter((o) => o.lifecycleStatus === activeSubTab);

  const emptyMessages: Record<SubTab, string> = {
    all: 'No orders yet. Share your referral link to get started!',
    draft: 'No draft orders.',
    in_progress: 'No orders in progress.',
    paid: 'No paid orders yet.',
    completed: 'No completed orders.',
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by client name, order name, or dashboard code…"
        className="w-full md:max-w-md rounded-lg border-2 border-gray-200 px-4 py-2.5 text-base focus:border-brand-blue focus:outline-none"
      />

      {/* Sub-tab bar */}
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeSubTab === tab.key
                ? 'bg-brand-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full ${
                  activeSubTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-gray-500">
          {emptyMessages[activeSubTab]}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Delivery</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Engagement</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Commission</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.label}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceBadge(order.source)}`}>
                        {order.source === 'referral' ? 'Referral' : 'Dashboard'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {order.totalCents > 0 ? cents(order.totalCents) : '--'}
                    </td>
                    <td className="px-4 py-3">
                      {order.engagement ? (
                        <div className="text-sm text-gray-700 whitespace-nowrap">
                          <div>
                            {order.engagement.viewCount} view{order.engagement.viewCount === 1 ? '' : 's'}
                            {order.engagement.activeSeconds > 0 && (
                              <> · {activeTime(order.engagement.activeSeconds)}</>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.engagement.participantCount} in group
                            {order.engagement.cartItemCount > 0 && (
                              <> · {order.engagement.cartItemCount} in cart</>
                            )}
                            {order.engagement.lastActivityAt && (
                              <> · seen {new Date(order.engagement.lastActivityAt).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">
                      {order.commissionCents != null ? cents(order.commissionCents) : '--'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(order.lifecycleStatus)}`}>
                        {statusLabel(order.lifecycleStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {order.dashboardUrl && (
                        <Link
                          href={order.dashboardUrl}
                          className="text-sm text-brand-blue hover:underline font-medium"
                        >
                          Open
                        </Link>
                      )}
                      {canCancel(order) && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancellingId === order.id}
                          className="ml-3 text-sm text-red-600 hover:underline font-medium disabled:opacity-50"
                        >
                          {cancellingId === order.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.label}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceBadge(order.source)}`}>
                      {order.source === 'referral' ? 'Referral' : 'Dashboard'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(order.lifecycleStatus)}`}>
                      {statusLabel(order.lifecycleStatus)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">Date:</span>{' '}
                    <span className="text-gray-700">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Delivery:</span>{' '}
                    <span className="text-gray-700">
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
                        : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total:</span>{' '}
                    <span className="text-gray-700 font-medium">
                      {order.totalCents > 0 ? cents(order.totalCents) : '--'}
                    </span>
                  </div>
                  {order.commissionCents != null && (
                    <div>
                      <span className="text-gray-500">Commission:</span>{' '}
                      <span className="text-green-700 font-medium">{cents(order.commissionCents)}</span>
                    </div>
                  )}
                </div>
                {order.engagement && (
                  <div className="text-sm text-gray-600 border-t border-gray-100 pt-2 mb-3">
                    {order.engagement.viewCount} view{order.engagement.viewCount === 1 ? '' : 's'}
                    {order.engagement.activeSeconds > 0 && <> · {activeTime(order.engagement.activeSeconds)}</>}
                    {' · '}{order.engagement.participantCount} in group
                    {order.engagement.cartItemCount > 0 && <> · {order.engagement.cartItemCount} in cart</>}
                  </div>
                )}
                {order.dashboardUrl && (
                  <Link
                    href={order.dashboardUrl}
                    className="block text-center text-sm font-medium text-brand-blue hover:underline"
                  >
                    Open Dashboard
                  </Link>
                )}
                {canCancel(order) && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    className="mt-2 block w-full text-center text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    {cancellingId === order.id ? 'Cancelling…' : 'Cancel Dashboard'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
