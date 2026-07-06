'use client';

/**
 * Suppression-list management: view, add manually, remove (admin may clear
 * bounce/complaint rows). Data: /api/ops/followups/suppressions.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';

interface SuppressionRow {
  id: string;
  email: string;
  reason: string;
  source: string | null;
  note: string | null;
  createdAt: string;
}

export default function SuppressionsPanel(): ReactElement {
  const [rows, setRows] = useState<SuppressionRow[] | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/followups/suppressions');
      const json = await res.json();
      if (json.success) setRows(json.suppressions as SuppressionRow[]);
      else setError('Failed to load suppressions');
    } catch {
      setError('Failed to load suppressions');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (): Promise<void> => {
    if (!newEmail.includes('@')) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/ops/followups/suppressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, note: 'added from admin' }),
      });
      if (!res.ok) setError('Add failed');
      setNewEmail('');
      await load();
    } catch {
      setError('Add failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (email: string): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/ops/followups/suppressions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) setError('Remove failed');
      await load();
    } catch {
      setError('Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-1">Suppressions</h2>
      <p className="text-sm text-gray-500 mb-4">
        Do-not-email list for follow-ups. Transactional email (invoices, receipts) ignores this.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@example.com"
          className="input-premium flex-1"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !newEmail.includes('@')}
          className="btn-secondary disabled:opacity-50"
        >
          Suppress
        </button>
      </div>

      {!rows ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Nobody is suppressed.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold">Email</th>
                <th className="py-2 pr-4 font-semibold">Reason</th>
                <th className="py-2 pr-4 font-semibold">Source</th>
                <th className="py-2 pr-4 font-semibold">Added</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-900">{row.email}</td>
                  <td className="py-2 pr-4 text-gray-700">{row.reason}</td>
                  <td className="py-2 pr-4 text-gray-500">{row.source ?? '—'}</td>
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(row.email)}
                      disabled={busy}
                      className="btn-ghost text-red-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
