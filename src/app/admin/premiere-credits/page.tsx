'use client';

import { ReactElement, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';
import GrantsTable from './_components/GrantsTable';
import InvoiceSummary from './_components/InvoiceSummary';
import type { ListResult } from '@/lib/premiere-credits/admin';

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All' },
  { key: 'NEEDS_CONTACT', label: 'Needs contact' },
  { key: 'HELD_FOR_APPROVAL', label: 'Held' },
  { key: 'READY', label: 'Ready' },
  { key: 'SENT', label: 'Sent' },
  { key: 'SEND_FAILED', label: 'Failed' },
];

/**
 * Admin — Premiere credit grants. List + operator actions (approve & send,
 * resend, add contact, cancel) and an invoice view (redeemed in a date range).
 */
export default function PremiereCreditsPage(): ReactElement {
  const [data, setData] = useState<ListResult | null>(null);
  const [status, setStatus] = useState('');
  const [invoiceMode, setInvoiceMode] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (invoiceMode) {
      params.set('redeemed', 'true');
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    } else if (status) {
      params.set('status', status);
    }
    try {
      const res = await fetch(`/api/v1/admin/premiere-credits?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('load failed', err);
    } finally {
      setLoading(false);
    }
  }, [status, invoiceMode, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (id: string, path: string, opts?: RequestInit) => {
      setBusyId(id);
      try {
        const res = await fetch(`/api/v1/admin/premiere-credits/${id}/${path}`, { method: 'POST', ...opts });
        const json = await res.json();
        if (!json.success) alert(json.error || 'Action failed');
      } catch (err) {
        alert('Request failed');
        console.error(err);
      } finally {
        setBusyId(null);
        await load();
      }
    },
    [load],
  );

  const onApprove = (id: string): void => {
    if (confirm('Approve and send this credit code to the customer now?')) void act(id, 'approve');
  };
  const onResend = (id: string): void => {
    if (confirm('Resend this credit code to the customer?')) void act(id, 'resend');
  };
  const onCancel = (id: string): void => {
    if (confirm('Cancel this grant and deactivate the code? This cannot be undone.')) void act(id, 'cancel');
  };
  const onContact = (id: string): void => {
    const email = prompt('Customer email for this credit:');
    if (!email) return;
    const phone = prompt('Customer phone (optional):') || undefined;
    void act(id, 'contact', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone }),
    });
  };

  return (
    <>
      <PartnersHubBand active="premiere-credits" />
      <div className="container-custom section-padding">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-heading tracking-[0.1em] text-gray-900">Premiere Credits</h1>
          <button
            className={invoiceMode ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setInvoiceMode((v) => !v)}
          >
            {invoiceMode ? 'Back to grants' : 'Invoice view'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Automation state is controlled by the <code>premiere_credits_master</code> and{' '}
          <code>premiere_credits_send</code> flags in{' '}
          <Link href="/admin/features" className="text-brand-blue underline">Features</Link>.
        </p>

        {invoiceMode ? (
          <div className="card mb-6 flex flex-wrap items-end gap-4">
            <label className="text-base text-gray-900">
              From
              <input type="date" className="input-premium mt-1 block" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-base text-gray-900">
              To
              <input type="date" className="input-premium mt-1 block" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <span className="text-sm text-gray-600">Shows credits redeemed in the range.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-6">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key || 'all'}
                onClick={() => setStatus(t.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold tracking-[0.08em] ${
                  status === t.key ? 'bg-brand-blue text-white' : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {data && <InvoiceSummary summary={data.summary} />}

        {loading && !data ? (
          <div className="card text-gray-600">Loading…</div>
        ) : (
          <GrantsTable
            grants={data?.grants ?? []}
            busyId={busyId}
            onApprove={onApprove}
            onResend={onResend}
            onContact={onContact}
            onCancel={onCancel}
          />
        )}
      </div>
    </>
  );
}
