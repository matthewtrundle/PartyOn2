/**
 * POST /api/admin/finance/journals/[id]/reverse
 *
 * Body: `{ reason: string }`
 *
 * Operator click. Reverses a POSTED journal entry by submitting a balanced
 * mirror JournalEntry to QuickBooks, then marks the original REVERSED.
 * Used as the safety-net rollback for the autonomous daily post flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { reverseJournal } from '@/lib/finance/qb-journal-service';

interface Body {
  reason?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Body;
    const reason = (body.reason ?? '').trim();
    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'reason is required' },
        { status: 400 }
      );
    }
    const result = await reverseJournal(id, auth.role, reason);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Journal Reverse] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
