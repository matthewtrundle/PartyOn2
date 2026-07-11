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
  const [receivedRedirectUri, setReceivedRedirectUri] = useState<string | undefined>(
    undefined
  );
  // 'connect' = add a new item (exchange on success); 'extend' = update-mode
  // re-auth of the existing item to request 730 days of history (NO exchange —
  // Plaid backfills via HISTORICAL_UPDATE webhooks). Persisted so the mode
  // survives the OAuth redirect to the bank and back.
  const [mode, setMode] = useState<'connect' | 'extend'>('connect');
  // Set when the operator clicks a button before Link is ready with the new
  // token — the effect below opens Link as soon as it is.
  const [pendingOpen, setPendingOpen] = useState(false);

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

  async function fetchLinkToken(extend = false): Promise<void> {
    try {
      const res = await fetch('/api/admin/finance/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extend ? { extendHistory: true } : {}),
      });
      const body = (await res.json()) as ApiResponse<{ linkToken: string; mode: string }>;
      if (body.success) {
        setLinkToken(body.data.linkToken);
        // Persist so the SAME token + mode survive an OAuth redirect to the bank.
        window.localStorage.setItem('plaid_link_token', body.data.linkToken);
        window.localStorage.setItem('plaid_link_mode', extend ? 'extend' : 'connect');
      } else {
        setError(body.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load link token');
    }
  }

  useEffect(() => {
    void fetchHealth();
    // OAuth banks (Wells Fargo) redirect back here with ?oauth_state_id=… . On
    // return, reuse the link_token that started the flow (Plaid requires the same
    // one) — and restore whether it was a connect or an extend-history flow —
    // then let the auto-open effect below resume Link.
    if (window.location.href.includes('oauth_state_id=')) {
      setReceivedRedirectUri(window.location.href);
      const saved = window.localStorage.getItem('plaid_link_token');
      const savedMode = window.localStorage.getItem('plaid_link_mode');
      if (savedMode === 'extend') setMode('extend');
      if (saved) setLinkToken(saved);
      else void fetchLinkToken(savedMode === 'extend');
    } else {
      void fetchLinkToken();
    }
  }, []);

  const onSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setPendingOpen(false);
      setExchanging(true);
      try {
        if (mode === 'extend') {
          // Update-mode re-auth: the Item is unchanged, so there is NO token
          // exchange. Kick a sync so the first slice of deeper history lands
          // now; the rest arrives via HISTORICAL_UPDATE webhooks.
          const res = await fetch('/api/admin/finance/plaid/sync', { method: 'POST' });
          const body = (await res.json()) as ApiResponse<unknown>;
          if (!body.success) setError(body.error);
        } else {
          const res = await fetch('/api/admin/finance/plaid/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicToken, metadata }),
          });
          const body = (await res.json()) as ApiResponse<unknown>;
          if (!body.success) setError(body.error);
        }
        window.localStorage.removeItem('plaid_link_token');
        window.localStorage.removeItem('plaid_link_mode');
        await fetchHealth();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to complete Plaid flow');
      } finally {
        setExchanging(false);
      }
    },
    [mode]
  );

  // If the operator abandons a flow (closes the Link modal), clear the saved
  // token + mode so a later click can't silently reopen a stale update-mode
  // flow when they meant to connect a new bank. (Does not fire during the
  // OAuth redirect — the page unloads — so the resume path is unaffected.)
  const onExit = useCallback(() => {
    window.localStorage.removeItem('plaid_link_token');
    window.localStorage.removeItem('plaid_link_mode');
    setPendingOpen(false);
  }, []);

  // Clear the pending-open intent only when Link actually OPENS. The auto-open
  // effect below can fire against the PREVIOUS handler while react-plaid-link
  // is still re-initializing for a just-swapped token — that stale open() is a
  // silent no-op, and eagerly consuming pendingOpen there left the flow dead
  // (button click → nothing happens). Keeping the intent until the OPEN event
  // makes the effect self-healing: it simply fires again when the new handler's
  // ready/open land.
  const onEvent = useCallback((eventName: string) => {
    if (eventName === 'OPEN') setPendingOpen(false);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
    onEvent,
    receivedRedirectUri,
  });

  // Resume the OAuth flow automatically once Link is ready after the bank redirect.
  useEffect(() => {
    if (receivedRedirectUri && ready) open();
  }, [receivedRedirectUri, ready, open]);

  // Open Link once it's ready after a button click swapped in a fresh token.
  // Deliberately does NOT clear pendingOpen — see onEvent above.
  useEffect(() => {
    if (pendingOpen && ready) open();
  }, [pendingOpen, ready, open]);

  async function startExtendHistory(): Promise<void> {
    setError(null);
    setMode('extend');
    setLinkToken(null); // force usePlaidLink to re-init with the update-mode token
    await fetchLinkToken(true);
    setPendingOpen(true);
  }

  // The primary connect button always runs the CONNECT flow — if a prior
  // extend attempt left update-mode state behind, fetch a fresh connect token
  // instead of trusting ambient state.
  async function startConnect(): Promise<void> {
    setError(null);
    if (mode !== 'connect') {
      setMode('connect');
      setLinkToken(null);
      await fetchLinkToken(false);
      setPendingOpen(true);
      return;
    }
    if (ready) open();
    else setPendingOpen(true);
  }

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

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void startConnect()}
                disabled={exchanging || pendingOpen}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {exchanging
                  ? 'Working…'
                  : health.items.length > 0
                    ? 'Link another bank'
                    : 'Connect bank with Plaid'}
              </button>
              {health.items.some((i) => i.environment === 'production') && (
                <button
                  type="button"
                  onClick={() => void startExtendHistory()}
                  disabled={exchanging || pendingOpen}
                  className="px-4 py-2 text-sm bg-white text-blue-700 border-2 border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {pendingOpen ? 'Opening…' : 'Extend history to 24 months'}
                </button>
              )}
            </div>
            {health.items.some((i) => i.environment === 'production') && (
              <p className="text-gray-500 text-xs">
                Extend history: quick re-login with the bank so Plaid can pull up
                to 24 months of transactions (the initial connection only fetched
                ~90 days). History fills in over the following hours.
              </p>
            )}
            {!linkToken && !error && (
              <p className="text-gray-500 text-xs">Loading Plaid link token…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
