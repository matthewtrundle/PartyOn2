'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddAffiliateModal from '@/components/ops/AddAffiliateModal';
import SectionSubNav from '@/components/backend/SectionSubNav';
import { PARTNERS_SUBNAV } from '@/components/backend/subnav-items';

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4">
        <SectionSubNav items={PARTNERS_SUBNAV} />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Affiliates</h1>
        <div className="flex gap-2">
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
            className="px-4 py-2 text-sm font-semibold text-gray-900 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg hover:from-amber-500 hover:to-yellow-600 transition-all shadow-sm"
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
          Applications {pendingApps.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{pendingApps.length}</span>}
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
              <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                          <div className="text-gray-500 text-xs">{app.businessName}</div>
                          {app.notes && <div className="text-gray-400 text-xs mt-1 truncate max-w-xs">{app.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700">{app.email}</div>
                          {app.phone && <div className="text-gray-500 text-xs">{app.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{categoryLabel(app.category)}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={actionLoading === app.id}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              disabled={actionLoading === app.id}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
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
            </div>
          )}

          {/* Past Applications */}
          {otherApps.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Past Applications</h2>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                          <div className="text-gray-500 text-xs">{app.businessName}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{app.email}</td>
                        <td className="px-4 py-3 text-gray-700">{categoryLabel(app.category)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            app.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
              className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {affiliates.length === 0 ? (
            <div className="text-gray-500 py-8 text-center">No affiliates yet.</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Business</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Perk</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Rate</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Orders</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {affiliates.filter((aff) => {
                    if (!search) return true;
                    const q = search.toLowerCase();
                    return aff.businessName.toLowerCase().includes(q) ||
                      aff.contactName.toLowerCase().includes(q) ||
                      aff.code.toLowerCase().includes(q) ||
                      aff.email.toLowerCase().includes(q);
                  }).map((aff) => (
                    <tr key={aff.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{aff.code}</code>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{aff.businessName}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700">{aff.contactName}</div>
                        <div className="text-gray-500 text-xs">{aff.email}</div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-700">{categoryLabel(aff.category)}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{aff.customerPerk || 'Free Delivery'}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">
                        {aff.commissionRateOverride ? `${Number(aff.commissionRateOverride) * 100}%` : 'Progressive'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{aff._count.orders}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          aff.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          aff.status === 'DRAFT' ? 'bg-blue-100 text-blue-700' :
                          aff.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {aff.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleImpersonate(aff.id)}
                            disabled={impersonateLoading === aff.id}
                            className="px-3 py-1 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
                          >
                            {impersonateLoading === aff.id ? '...' : 'Impersonate'}
                          </button>
                          <Link
                            href={`/admin/affiliates/${aff.id}/dashboard`}
                            className="px-3 py-1 bg-gray-800 text-white rounded text-xs font-medium hover:bg-gray-900"
                          >
                            Dashboard
                          </Link>
                          <Link
                            href={`/admin/affiliates/${aff.id}`}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                          >
                            Detail
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(aff)}
                            disabled={actionLoading === aff.id}
                            className={`px-3 py-1 rounded text-xs font-medium disabled:opacity-50 ${
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
  );
}
