/**
 * POST /api/webhooks/plaid
 *
 * Plaid sends notifications here when transactions change. Phase 2C cares
 * about TRANSACTIONS / SYNC_UPDATES_AVAILABLE — kicks off a sync for the
 * affected PlaidItem. Other webhook types are acknowledged but ignored.
 *
 * Auth: Plaid signs webhooks via the `plaid-verification` JWT header. For
 * V1 we trust the connection (sandbox / pre-prod) and just log; production
 * hardening adds JWT verification once the operator promotes to production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { syncItem } from '@/lib/finance/plaid-sync-service';

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
    const body = (await request.json().catch(() => ({}))) as PlaidWebhookBody;
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

    const item = await prisma.plaidItem.findFirst({
      where: { itemId },
      select: { id: true },
    });
    if (!item) {
      console.warn('[plaid-webhook] unknown item_id', itemId);
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
