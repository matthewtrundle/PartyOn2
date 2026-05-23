'use client';

import { useEffect, useState, ReactElement } from 'react';
import Link from 'next/link';

interface QbAccountOption {
  qbAccountId: string;
  name: string;
  fullyQualifiedName: string | null;
  accountType: string | null;
  accountSubType: string | null;
}

interface JournalConfig {
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

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const ROWS: Array<{
  key: keyof JournalConfig;
  label: string;
  hint: string;
  required: boolean;
}> = [
  {
    key: 'stripeClearingAccountId',
    label: 'Stripe clearing (debit)',
    hint: 'Asset / undeposited-funds account where net Stripe deposits land.',
    required: true,
  },
  {
    key: 'stripeFeesAccountId',
    label: 'Stripe processing fees (debit)',
    hint: 'Expense account for Stripe fees deducted from each charge.',
    required: true,
  },
  {
    key: 'salesRevenueAccountId',
    label: 'Sales revenue (credit)',
    hint: 'Income account where subtotal (net of discounts) is credited.',
    required: true,
  },
  {
    key: 'salesTaxPayableAccountId',
    label: 'Sales tax payable (credit)',
    hint: 'Liability account for collected TX sales tax (8.25%).',
    required: true,
  },
  {
    key: 'deliveryRevenueAccountId',
    label: 'Delivery fees (credit)',
    hint: 'Optional. Separate revenue account for delivery fee income.',
    required: false,
  },
  {
    key: 'tipsPayableAccountId',
    label: 'Tips payable (credit)',
    hint: 'Optional. Liability — pass-through to drivers.',
    required: false,
  },
  {
    key: 'refundsAccountId',
    label: 'Refunds (debit)',
    hint: 'Optional. Contra-revenue account for daily refund totals.',
    required: false,
  },
  {
    key: 'discountsAccountId',
    label: 'Discounts (debit)',
    hint: 'Optional. Contra-revenue account; if set, daily discount $ is journaled separately instead of netted into sales revenue.',
    required: false,
  },
];

export default function JournalsSettingsPage(): ReactElement {
  const [config, setConfig] = useState<JournalConfig | null>(null);
  const [accounts, setAccounts] = useState<QbAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/finance/journals/config');
      const body = (await res.json()) as ApiResponse<{
        config: JournalConfig;
        accounts: QbAccountOption[];
      }>;
      if (body.success) {
        setConfig(body.data.config);
        setAccounts(body.data.accounts);
        setError(null);
      } else {
        setError(body.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function setField(key: keyof JournalConfig, value: string | boolean | null): void {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  }

  async function save(): Promise<void> {
    if (!config) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/finance/journals/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const body = (await res.json()) as ApiResponse<JournalConfig>;
      if (body.success) {
        setConfig(body.data);
        setStatus('Saved.');
      } else {
        setError(body.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const grouped = accounts.reduce<Record<string, QbAccountOption[]>>((acc, a) => {
    const type = a.accountType ?? 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(a);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Sales journal — account mapping</h1>
          <p className="text-gray-600 text-sm">
            Map each PartyOn concept to a QuickBooks account ID. The daily
            journal cron uses these to draft entries.
          </p>
        </div>
        <Link
          href="/admin/finance/journals"
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to journals
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md text-sm border bg-red-50 border-red-200 text-red-800">
          {error}
        </div>
      )}
      {status && (
        <div className="mb-4 p-3 rounded-md text-sm border bg-green-50 border-green-200 text-green-800">
          {status}
        </div>
      )}

      {loading || !config ? (
        <p className="text-gray-600 text-sm">Loading…</p>
      ) : accounts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm">
          <p>
            No synced QuickBooks accounts. Run the weekly pull first (or
            trigger <code>/api/cron/finance-qb-pull</code> manually), then
            refresh this page.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {ROWS.map((row) => {
            const value = (config[row.key] as string | null) ?? '';
            return (
              <div key={row.key} className="flex flex-col md:flex-row md:items-center gap-2">
                <div className="md:w-1/3">
                  <div className="text-sm font-medium text-gray-900">
                    {row.label}
                    {row.required && <span className="text-red-600 ml-0.5">*</span>}
                  </div>
                  <div className="text-xs text-gray-500">{row.hint}</div>
                </div>
                <div className="flex-1">
                  <select
                    value={value}
                    onChange={(e) =>
                      setField(row.key, e.target.value === '' ? null : e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="">— not mapped —</option>
                    {Object.entries(grouped).map(([type, list]) => (
                      <optgroup key={type} label={type}>
                        {list.map((a) => (
                          <option key={a.qbAccountId} value={a.qbAccountId}>
                            {a.fullyQualifiedName ?? a.name}
                            {a.accountSubType ? ` (${a.accountSubType})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}

          <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setField('enabled', e.target.checked)}
                className="border border-gray-300 rounded"
              />
              <span>Enable daily auto-post to QuickBooks</span>
              <span className="text-gray-500 text-xs">
                (kill switch — cron silently skips when off)
              </span>
            </label>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save mapping'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
