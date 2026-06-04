/**
 * GET /api/admin/finance/journals?status=PENDING_APPROVAL|...|ALL
 *
 * Lists QB sales journal entries (drafted by the daily cron). Default is
 * the most recent 100 across all statuses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  listJournals,
  type JournalStatus,
} from '@/lib/finance/qb-journal-service';

const VALID: ReadonlyArray<JournalStatus | 'ALL'> = [
  'PENDING_APPROVAL',
  'APPROVED',
  'POSTED',
  'REJECTED',
  'FAILED',
  'SUPERSEDED',
  'ALL',
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const statusParam = request.nextUrl.searchParams.get('status') as
      | JournalStatus
      | 'ALL'
      | null;
    const status =
      statusParam && VALID.includes(statusParam) ? statusParam : undefined;
    const rows = await listJournals(status);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Finance Journals] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
