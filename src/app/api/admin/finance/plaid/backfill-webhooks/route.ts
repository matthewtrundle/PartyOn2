/**
 * POST /api/admin/finance/plaid/backfill-webhooks
 *
 * One-shot maintenance endpoint. Walks every active PlaidItem and calls
 * /item/webhook/update on Plaid's side to point them at our webhook URL.
 *
 * Use after deploying the change that adds `webhook` to link_token creation
 * (existing Items were linked before that change and have no webhook set
 * on their Plaid Item record).
 *
 * Behind requireOpsAuth. Idempotent — re-running just re-sets the same URL.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { backfillItemWebhooks } from '@/lib/finance/plaid-client';

export async function POST(): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const result = await backfillItemWebhooks();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Plaid backfill-webhooks] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
