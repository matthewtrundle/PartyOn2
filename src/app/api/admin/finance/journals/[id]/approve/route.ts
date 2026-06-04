/**
 * POST /api/admin/finance/journals/[id]/approve
 *
 * Operator click. Approves a PENDING_APPROVAL (or retries a FAILED) entry
 * and immediately posts it to QuickBooks. Returns the resulting QB
 * transaction ID on success, or the failure reason if QB rejected the post.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { approveAndPostJournal } from '@/lib/finance/qb-journal-service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const result = await approveAndPostJournal(id, auth.role);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Journal Approve] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
