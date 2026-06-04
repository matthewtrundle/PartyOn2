'use client';

import { useEffect, useState, useCallback, ReactElement } from 'react';
import {
  usePlaidLink,
  type PlaidLinkOnSuccessMetadata,
} from 'react-plaid-link';

interface PlaidHealthItem {
  itemId: string;
  institutionName: string | null;
  institutionId: string | null;
  environment: string;
  status: string;
  accountCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  accounts: Array<{
    accountId: string;
    name: string;
    mask: string | null;
    type: string;
    subtype: string | null;
  }>;
}

interface PlaidHealth {
  connected: boolean;
  environment: string;
  items: PlaidHealthItem[];
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export default function ConnectBankPage(): ReactElement {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [health, setHealth] = useState<PlaidHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  async function fetchHealth(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/finance/plaid/health');
      const body = (await res.json()) as ApiResponse<PlaidHealth>;
      if (body.success) {
        setHealth(body.data);
        setError(null);
      } else {
        setError(body.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Plaid status');
    } finally {
      setLoading(false);
    }
  }

  async function fetchLinkToken(): Promise<void> {
    try {
      const res = await fetch('/api/admin/finance/plaid/link-token', {
        method: 'POST',
      });
      const body = (await res.json()) as ApiResponse<{ linkToken: string }>;
      if (body.success) {
        setLinkToken(body.data.linkToken);
      } else {
        setError(body.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load link token');
    }
  }

  useEffect(() => {
    void fetchHealth();
    void fetchLinkToken();
  }, []);

  const onSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setExchanging(true);
      try {
        const res = await fetch('/api/admin/finance/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicToken, metadata }),
        });
        const body = (await res.json()) as ApiResponse<unknown>;
        if (!body.success) {
          setError(body.error);
        } else {
          await fetchHealth();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to exchange token');
      } finally {
        setExchanging(false);
      }
    },
    []
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Connect Bank (Plaid)</h1>
        <p className="text-gray-600 text-sm">
          Phase 0 of the Finance Director. Stores a Plaid access token + the
          account list. Transaction sync + reconciliation arrives in Phase 2C.
        </p>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        {loading ? (
          <p className="text-gray-600 text-sm">Checking connection status…</p>
        ) : error ? (
          <p className="text-red-700 text-sm mb-4">Error: {error}</p>
        ) : null}

        {health && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  health.connected ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="font-semibold">
                {health.connected ? 'Connected' : 'Not connected'}
              </span>
              <span className="text-gray-500 text-xs">
                ({health.environment})
              </span>
            </div>

            {health.items.length > 0 && (
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
                {health.items.map((item) => (
                  <li key={item.itemId} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {item.institutionName ?? 'Unknown institution'}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {item.accountCount} account
                          {item.accountCount === 1 ? '' : 's'} · status:{' '}
                          {item.status}
                        </p>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {item.itemId.slice(0, 8)}…
                      </span>
                    </div>
                    {item.accounts.length > 0 && (
                      <ul className="mt-2 ml-2 text-xs text-gray-600 space-y-0.5">
                        {item.accounts.map((a) => (
                          <li key={a.accountId}>
                            {a.name}
                            {a.mask ? ` ••${a.mask}` : ''} —{' '}
                            <span className="text-gray-500">
                              {a.type}
                              {a.subtype ? `/${a.subtype}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.lastError && (
                      <p className="text-red-700 text-xs mt-1">
                        Last error: {item.lastError}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => open()}
              disabled={!ready || exchanging}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {exchanging
                ? 'Exchanging…'
                : health.items.length > 0
                  ? 'Link another bank'
                  : 'Connect bank with Plaid'}
            </button>
            {!linkToken && !error && (
              <p className="text-gray-500 text-xs">Loading Plaid link token…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
