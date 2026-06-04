'use client';

import { useEffect, useState, ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';

interface QbHealth {
  connected: boolean;
  environment: string | null;
  realmId: string | null;
  companyName: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  lastRefreshedAt: string | null;
  lastError: string | null;
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export default function ConnectQuickBooksPage(): ReactElement {
  const params = useSearchParams();
  const callbackStatus = params?.get('status') ?? null;

  const [health, setHealth] = useState<QbHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function fetchHealth(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/finance/qb/health');
      const body = (await res.json()) as ApiResponse<QbHealth>;
      if (body.success) {
        setHealth(body.data);
        setError(null);
      } else {
        setError(body.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load QuickBooks status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchHealth();
  }, []);

  async function handleConnect(): Promise<void> {
    setConnecting(true);
    try {
      const res = await fetch('/api/admin/finance/qb/connect');
      const body = (await res.json()) as ApiResponse<{ authUrl: string }>;
      if (!body.success) {
        setError(body.error);
        setConnecting(false);
        return;
      }
      window.location.href = body.data.authUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start OAuth');
      setConnecting(false);
    }
  }

  const callbackBanner = callbackStatus ? (
    <div
      className={`mb-4 p-3 rounded-md text-sm border ${
        callbackStatus === 'connected'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      {callbackStatus === 'connected'
        ? 'QuickBooks connected successfully.'
        : `Connection failed: ${callbackStatus.replace('error:', '')}`}
    </div>
  ) : null;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Connect QuickBooks Online</h1>
        <p className="text-gray-600 text-sm">
          Phase 0 of the Finance Director. Authorizes Party On Delivery to read and
          write QuickBooks data. No data flows yet — that arrives in Phase 2A.
        </p>
      </div>

      {callbackBanner}

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        {loading ? (
          <p className="text-gray-600 text-sm">Checking connection status…</p>
        ) : error ? (
          <p className="text-red-700 text-sm">Error: {error}</p>
        ) : health?.connected ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="font-semibold">Connected</span>
            </div>
            <p>
              <span className="text-gray-600">Company:</span>{' '}
              <span className="font-medium">{health.companyName}</span>
            </p>
            <p>
              <span className="text-gray-600">Realm ID:</span> {health.realmId}
            </p>
            <p>
              <span className="text-gray-600">Environment:</span>{' '}
              {health.environment}
            </p>
            <p>
              <span className="text-gray-600">Access token expires:</span>{' '}
              {health.accessTokenExpiresAt
                ? new Date(health.accessTokenExpiresAt).toLocaleString()
                : '—'}
            </p>
            {health.lastError ? (
              <p className="text-red-700">Last error: {health.lastError}</p>
            ) : null}
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="mt-4 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {connecting ? 'Redirecting…' : 'Reconnect QuickBooks'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-gray-700">
              QuickBooks Online is not connected. Click below to open the Intuit
              consent screen.
            </p>
            <p className="text-gray-500 text-xs">
              Environment: {health?.environment ?? process.env.INTUIT_ENV ?? 'sandbox'}
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {connecting ? 'Redirecting…' : 'Connect QuickBooks'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
