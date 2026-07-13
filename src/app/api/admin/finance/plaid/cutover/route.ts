/**
 * POST /api/admin/finance/plaid/cutover
 *
 * Body: `{ keepId: string, apply?: boolean }`
 *
 * Retires duplicate production Plaid Items for the same institution as
 * `keepId` — used after re-linking a bank as a FRESH Item (e.g. to get the
 * 730-day history window that update mode failed to deliver). Refuses to
 * remove any duplicate the keeper does not fully cover (date range + row
 * count), resets Stripe-payout matches off the removed rows, deletes them,
 * removes the Item at Plaid (stops billing), then re-categorizes and
 * re-reconciles the keeper. Defaults to DRY-RUN; pass `apply: true` to write.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { cutoverDuplicateItems } from '@/lib/finance/plaid-sync-service';

export const maxDuration = 120;

interface CutoverBody {
  keepId?: string;
  apply?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Deleting production bank history is the most destructive finance action
    // in the codebase — admin role required, not any ops session.
    const auth = await requireAdminRole();
    if (auth instanceof NextResponse) return auth;

    const body = (await request.json().catch(() => ({}))) as CutoverBody;
    if (!body.keepId || typeof body.keepId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'keepId is required' },
        { status: 400 }
      );
    }

    const result = await cutoverDuplicateItems(body.keepId, {
      dryRun: body.apply !== true,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Plaid Cutover] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
