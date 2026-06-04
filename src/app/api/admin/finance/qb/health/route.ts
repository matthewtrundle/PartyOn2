/**
 * GET /api/admin/finance/qb/health
 *
 * Returns the QuickBooks connection state. Phase 0's exit criterion is this
 * endpoint returning `{ connected: true, companyName: ... }` after the
 * operator completes the OAuth flow.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getStoredTokens, getCompanyInfo } from '@/lib/finance/qb-client';

interface HealthPayload {
  connected: boolean;
  environment: string | null;
  realmId: string | null;
  companyName: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  lastRefreshedAt: string | null;
  lastError: string | null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const tokens = await getStoredTokens();
    if (!tokens) {
      const payload: HealthPayload = {
        connected: false,
        environment: process.env.INTUIT_ENV ?? 'sandbox',
        realmId: null,
        companyName: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        lastRefreshedAt: null,
        lastError: null,
      };
      return NextResponse.json({ success: true, data: payload });
    }

    let companyName: string | null = null;
    let lastError: string | null = tokens.lastError;
    try {
      const info = await getCompanyInfo();
      companyName = info.companyName;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    const payload: HealthPayload = {
      connected: companyName !== null,
      environment: tokens.environment,
      realmId: tokens.realmId,
      companyName,
      accessTokenExpiresAt: tokens.accessTokenExpires.toISOString(),
      refreshTokenExpiresAt: tokens.refreshTokenExpires.toISOString(),
      lastRefreshedAt: tokens.lastRefreshedAt?.toISOString() ?? null,
      lastError,
    };
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[QB Health] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
