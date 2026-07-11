/**
 * POST /api/admin/finance/plaid/link-token
 *
 * Returns a Plaid link_token the browser-side Plaid Link SDK uses to launch
 * the institution-picker UI. Per Plaid recs, link_tokens are short-lived
 * (30 min) so the connect page fetches a fresh one on mount.
 *
 * Body (optional): `{ extendHistory: true }` — returns an UPDATE-MODE token
 * for the existing production Item instead, requesting the full 730 days of
 * transaction history (the fresh-connect default was Plaid's 90 days). The
 * operator re-auths through Link; no token exchange follows — Plaid backfills
 * deeper history via HISTORICAL_UPDATE webhooks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { createLinkToken, createUpdateLinkToken } from '@/lib/finance/plaid-client';
import { prisma } from '@/lib/database/client';

interface LinkTokenBody {
  extendHistory?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    // Body is optional (the connect flow sends none).
    const body = (await request.json().catch(() => ({}))) as LinkTokenBody;

    if (body.extendHistory) {
      // Single-item assumption: the business operates ONE production bank
      // account (operator-confirmed 2026-07-10), so "extend" targets the most
      // recent production item. If a second bank is ever linked, this needs an
      // item picker — the response's `institution` field says which one it hit.
      const item = await prisma.plaidItem.findFirst({
        where: { environment: 'production', status: { in: ['active', 'error'] } },
        orderBy: { createdAt: 'desc' },
        select: { accessToken: true, institutionName: true },
      });
      if (!item) {
        return NextResponse.json(
          { success: false, error: 'No production bank item to extend — connect one first' },
          { status: 400 }
        );
      }
      const linkToken = await createUpdateLinkToken(item.accessToken);
      return NextResponse.json({
        success: true,
        data: { linkToken, mode: 'extend', institution: item.institutionName },
      });
    }

    const linkToken = await createLinkToken(`ops-${auth.role}`);
    return NextResponse.json({ success: true, data: { linkToken, mode: 'connect' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Plaid Link Token] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
