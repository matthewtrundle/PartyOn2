'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddAffiliateModal from '@/components/ops/AddAffiliateModal';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';

interface Application {
  id: string;
  contactName: string;
  businessName: string;
  email: string;
  phone: string | null;
  category: string;
  websiteOrSocial: string | null;
  serviceArea: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  affiliate: { id: string; code: string } | null;
}

interface Affiliate {
  id: string;
  code: string;
  status: string;
  category: string;
  contactName: string;
  businessName: string;
  email: string;
  phone: string | null;
  commissionRateOverride: string | null;
  customerPerk: string;
  createdAt: string;
  _count: { commissions: number; orders: number };
}

type Tab = 'applications' | 'affiliates';

export default function AffiliatesPage(): ReactElement {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('affiliates');
  const [applications, setApplications] = useState<Application[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [impersonateLoading, setImpersonateLoading] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    const res = await fetch('/api/admin/affiliates/applications');
    const data = await res.json();
    if (data.success) setApplications(data.data);
  }, []);

  const fetchAffiliates = useCallback(async () => {
    const res = await fetch('/api/admin/affiliates');
    const data = await res.json();
    if (data.success) setAffiliates(data.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchApplications(), fetchAffiliates()]).finally(() => setLoading(false));
  }, [fetchApplications, fetchAffiliates]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/affiliates/applications/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchApplications(), fetchAffiliates()]);
      } else {
        alert(data.error || 'Failed to approve');
      }
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this application?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/affiliates/applications/${id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchApplications();
      }
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (affiliate: Affiliate) => {
    const newStatus = affiliate.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setActionLoading(affiliate.id);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) await fetchAffiliates();
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async (affiliateId: string) => {
    setImpersonateLoading(affiliateId);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}/impersonate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        router.push(data.redirectTo);
      } else {
        alert(data.error || 'Failed to impersonate');
      }
    } catch {
      alert('Network error');
    } finally {
      setImpersonateLoading(null);
    }
  };

  const pendingApps = applications.filter((a) => a.status === 'PENDING');
  const otherApps = applications.filter((a) => a.status !== 'PENDING');

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      BARTENDER: 'Bartender', BOAT: 'Boat', VENUE: 'Venue', LODGING: 'Lodging', PLANNER: 'Planner', OTHER: 'Other',
    };
    return map[cat] || cat;
  };

  /** Kit flat badge — shared by desktop table + mobile cards. */
  const badgeBase = 'inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase';

  const affiliateStatusBadge = (status: string) =>
    `${badgeBase} ${
      status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
      status === 'DRAFT' ? 'bg-blue-100 text-blue-800' :
      status === 'PAUSED' ? 'bg-amber-100 text-amber-800' :
      'bg-gray-100 text-gray-600'
    }`;

  const filteredAffiliates = affiliates.filter((aff) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return aff.businessName.toLowerCase().includes(q) ||
      aff.contactName.toLowerCase().includes(q) ||
      aff.code.toLowerCase().includes(q) ||
      aff.email.toLowerCase().includes(q);
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <PartnersHubBand active="affiliates" />
      <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl tracking-[0.06em] uppercase text-gray-900">Affiliates</h1>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/affiliates/dashboards"
            className="px-4 py-2 text-sm font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-all shadow-sm"
          >
            Client Dashboards
          </Link>
          <Link
            href="/admin/affiliates/bulk-import"
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
          >
            Bulk Import
          </Link>
          <Link
            href="/admin/affiliates/payouts"
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
          >
            Payouts
          </Link>
          <Link
            href="/admin/affiliates/embed-generator"
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            Embed Widgets
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-semibold text-gray-900 bg-brand-yellow rounded-lg hover:bg-yellow-400 transition-all shadow-sm"
          >
            + Add Affiliate
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('applications')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'applications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Applications {pendingApps.length > 0 && <span className={`ml-1 ${badgeBase} bg-amber-100 text-amber-800`}>{pendingApps.length}</span>}
        </button>
        <button
          onClick={() => setTab('affiliates')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'affiliates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Affiliates ({affiliates.length})
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 py-8 text-center">Loading...</div>
      ) : tab === 'applications' ? (
        <div className="space-y-6">
          {/* Pending Applications */}
          {pendingApps.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Pending Review ({pendingApps.length})</h2>
              <div className="bg-white rounded-lg shadow">
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Name / Business</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingApps.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{app.contactName}</div>
                          <div className="text-gray-500 text-sm">{app.businessName}</div>
                          {app.notes && <div className="text-gray-400 text-sm mt-1 truncate max-w-xs">{app.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700">{app.email}</div>
                          {app.phone && <div className="text-gray-500 text-sm">{app.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{categoryLabel(app.category)}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={actionLoading === app.id}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              disabled={actionLoading === app.id}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="md:hidden divide-y divide-gray-100">
                  {pendingApps.map((app) => (
                    <div key={app.id} className="px-4 py-3 space-y-1">
                      <div className="font-semibold text-sm text-gray-900">{app.contactName}</div>
                      <div className="text-sm text-gray-500">{app.businessName} &middot; {categoryLabel(app.category)}</div>
                      <div className="text-sm text-gray-500">{app.email}{app.phone && <> &middot; {app.phone}</>}</div>
                      {app.notes && <div className="text-sm text-gray-400">{app.notes}</div>}
                      <div className="text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={actionLoading === app.id}
                          className="flex-1 min-h-[44px] px-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 touch-manipulation"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          disabled={actionLoading === app.id}
                          className="flex-1 min-h-[44px] px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 touch-manipulation"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Past Applications */}
          {otherApps.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Past Applications</h2>
              <div className="bg-white rounded-lg shadow">
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Name / Business</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {otherApps.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{app.contactName}</div>
                          <div className="text-gray-500 text-sm">{app.businessName}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{app.email}</td>
                        <td className="px-4 py-3 text-gray-700">{categoryLabel(app.category)}</td>
                        <td className="px-4 py-3">
                          <span className={`${badgeBase} ${
                            app.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="md:hidden divide-y divide-gray-100">
                  {otherApps.map((app) => (
                    <div key={app.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm text-gray-900">{app.contactName}</div>
                        <span className={`${badgeBase} ${
                          app.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">{app.businessName} &middot; {categoryLabel(app.category)}</div>
                      <div className="text-sm text-gray-500">{app.email}</div>
                      <div className="text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {applications.length === 0 && (
            <div className="text-gray-500 py-8 text-center">No applications yet.</div>
          )}
        </div>
      ) : (
        /* Affiliates Tab */
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, business, code, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {affiliates.length === 0 ? (
            <div className="text-gray-500 py-8 text-center">No affiliates yet.</div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Business</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Perk</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Rate</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Orders</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAffiliates.map((aff) => (
                    <tr key={aff.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{aff.code}</code>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{aff.businessName}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700">{aff.contactName}</div>
                        <div className="text-gray-500 text-sm">{aff.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{categoryLabel(aff.category)}</td>
                      <td className="px-4 py-3 text-gray-700">{aff.customerPerk || 'Free Delivery'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {aff.commissionRateOverride ? `${Number(aff.commissionRateOverride) * 100}%` : 'Progressive'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{aff._count.orders}</td>
                      <td className="px-4 py-3">
                        <span className={affiliateStatusBadge(aff.status)}>
                          {aff.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleImpersonate(aff.id)}
                            disabled={impersonateLoading === aff.id}
                            className="px-3 py-1 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                          >
                            {impersonateLoading === aff.id ? '...' : 'Impersonate'}
                          </button>
                          <Link
                            href={`/admin/affiliates/${aff.id}/dashboard`}
                            className="px-3 py-1 bg-gray-800 text-white rounded text-sm font-medium hover:bg-gray-900"
                          >
                            Dashboard
                          </Link>
                          <Link
                            href={`/admin/affiliates/${aff.id}`}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                          >
                            Detail
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(aff)}
                            disabled={actionLoading === aff.id}
                            className={`px-3 py-1 rounded text-sm font-medium disabled:opacity-50 ${
                              aff.status === 'ACTIVE'
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {aff.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div className="md:hidden divide-y divide-gray-100">
                {filteredAffiliates.map((aff) => (
                  <div key={aff.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm text-gray-900">{aff.businessName}</div>
                      <span className={affiliateStatusBadge(aff.status)}>
                        {aff.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{aff.code}</code>
                      <span className="ml-2">{categoryLabel(aff.category)}</span>
                    </div>
                    <div className="text-sm text-gray-500">{aff.contactName} &middot; {aff.email}</div>
                    <div className="text-sm text-gray-500">
                      {aff.customerPerk || 'Free Delivery'} &middot; {aff.commissionRateOverride ? `${Number(aff.commissionRateOverride) * 100}%` : 'Progressive'} &middot; {aff._count.orders} orders
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleImpersonate(aff.id)}
                        disabled={impersonateLoading === aff.id}
                        className="min-h-[44px] px-3 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 touch-manipulation"
                      >
                        {impersonateLoading === aff.id ? '...' : 'Impersonate'}
                      </button>
                      <Link
                        href={`/admin/affiliates/${aff.id}/dashboard`}
                        className="min-h-[44px] px-3 inline-flex items-center justify-center bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 touch-manipulation"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href={`/admin/affiliates/${aff.id}`}
                        className="min-h-[44px] px-3 inline-flex items-center justify-center bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 touch-manipulation"
                      >
                        Detail
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(aff)}
                        disabled={actionLoading === aff.id}
                        className={`min-h-[44px] px-3 rounded-lg text-sm font-medium disabled:opacity-50 touch-manipulation ${
                          aff.status === 'ACTIVE'
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {aff.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddAffiliateModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            setTab('affiliates');
            fetchAffiliates();
          }}
        />
      )}
      </div>
    </div>
  );
}
