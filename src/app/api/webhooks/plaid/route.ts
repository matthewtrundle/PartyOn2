/**
 * POST /api/webhooks/plaid
 *
 * Plaid sends notifications here when transactions change. Phase 2C cares
 * about TRANSACTIONS / SYNC_UPDATES_AVAILABLE — kicks off a sync for the
 * affected PlaidItem. Other webhook types are acknowledged but ignored.
 *
 * Auth: every request must carry Plaid's `plaid-verification` header — an
 * ES256 JWT binding the exact request body (request_body_sha256). Verified
 * fail-closed via verifyPlaidWebhookJwt (alg pinning, published-key signature,
 * 5-minute freshness, constant-time body-hash check). Unverified requests get
 * a 401 and are never processed; Plaid retries webhooks, so a transient
 * key-fetch failure only delays the sync.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { syncItem } from '@/lib/finance/plaid-sync-service';
import { verifyPlaidWebhookJwt } from '@/lib/finance/plaid-client';

export const maxDuration = 60;

interface PlaidWebhookBody {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: { error_code?: string } | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  try {
    // Verification needs the RAW body — the JWT signs its exact SHA-256.
    // Read failure returns non-2xx explicitly (the generic catch below would
    // 200, and Plaid only retries on non-2xx).
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return NextResponse.json({ success: false, error: 'unreadable body' }, { status: 400 });
    }
    const verificationJwt = request.headers.get('plaid-verification');
    if (!verificationJwt) {
      console.warn('[plaid-webhook] rejected: missing plaid-verification header');
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }
    const verdict = await verifyPlaidWebhookJwt(rawBody, verificationJwt);
    if (!verdict.ok) {
      console.warn('[plaid-webhook] rejected:', verdict.reason);
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    let body: PlaidWebhookBody;
    try {
      body = JSON.parse(rawBody) as PlaidWebhookBody;
    } catch {
      body = {};
    }
    const itemId = body.item_id;
    const type = body.webhook_type;
    const code = body.webhook_code;
    console.log('[plaid-webhook]', { type, code, itemId });

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'missing item_id' },
        { status: 400 }
      );
    }

    if (type === 'ITEM' && code === 'ERROR') {
      const message = body.error?.error_code ?? 'unknown';
      await prisma.plaidItem.updateMany({
        where: { itemId },
        data: { status: 'login_required', lastError: message },
      });
      return NextResponse.json({ success: true, acked: true });
    }

    const shouldSync =
      type === 'TRANSACTIONS' &&
      (code === 'SYNC_UPDATES_AVAILABLE' ||
        code === 'DEFAULT_UPDATE' ||
        code === 'INITIAL_UPDATE' ||
        code === 'HISTORICAL_UPDATE');

    if (!shouldSync) {
      return NextResponse.json({ success: true, acked: true });
    }

    // Same status gate as the daily cron (syncAllItems): items mid-cutover
    // ('retiring') or awaiting a Plaid-removal retry ('removal_failed') must
    // NOT be synced — a webhook landing in that window would resurrect the
    // rows the cutover just deleted.
    const item = await prisma.plaidItem.findFirst({
      where: { itemId, status: { in: ['active', 'error'] } },
      select: { id: true },
    });
    if (!item) {
      console.warn('[plaid-webhook] unknown or non-syncable item_id', itemId);
      return NextResponse.json({ success: true, acked: true, unknownItem: true });
    }

    const result = await syncItem(item.id);
    console.log('[plaid-webhook] sync done', {
      durationMs: Date.now() - startedAt,
      ...result,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[plaid-webhook] error:', message);
    // 200 to Plaid so they don't retry endlessly; we logged the issue.
    return NextResponse.json({ success: false, error: message });
  }
}
