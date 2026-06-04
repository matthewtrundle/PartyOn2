/**
 * GET /api/admin/finance/plaid/health
 *
 * Returns `{ connected, items: [...] }` where items lists every linked
 * institution + its accounts. Phase 0's exit criterion is `connected: true`
 * after the operator completes Plaid Link once.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { listConnectedItems } from '@/lib/finance/plaid-client';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const items = await listConnectedItems();
    return NextResponse.json({
      success: true,
      data: {
        connected: items.length > 0,
        environment: process.env.PLAID_ENV ?? 'sandbox',
        items,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Plaid Health] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
