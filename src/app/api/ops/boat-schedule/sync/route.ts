/**
 * POST /api/ops/boat-schedule/sync
 *
 * Reads the Premier Google Sheet, parses into structured data, upserts to
 * `boat_schedule`, and runs auto-matching against orders. Core logic lives in
 * `@/lib/premier/sync` and is shared with the weekly cron.
 *
 * Auth: ops session cookie OR x-api-key header matching BOAT_SCHEDULE_SYNC_KEY
 *
 * Body (optional): { "tabs": ["06-PVT", "06-DSC"], "triggeredBy": "cowork" }
 * When `tabs` is omitted, syncs the current + next month automatically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { getOpsSession } from '@/lib/auth/ops-session';
import { runBoatScheduleSync, scheduleTabsForNow } from '@/lib/premier/sync';

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const apiKey = req.headers.get('x-api-key');
  const expected = process.env.BOAT_SCHEDULE_SYNC_KEY;
  if (expected && apiKey && apiKey === expected) return true;

  // Public captain-facing page is allowed to trigger sync. Sync is idempotent
  // and read-only against the sheet, so no additional data is exposed beyond
  // what the public view already shows.
  const publicKey = process.env.PREMIER_SCHEDULE_PUBLIC_KEY;
  const publicHeader = req.headers.get('x-public-key');
  const publicCookie = req.cookies.get('pbs_key')?.value;
  if (publicKey && (publicHeader === publicKey || publicCookie === publicKey)) {
    return true;
  }

  const session = await getOpsSession();
  return session !== null;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tabs: string[] =
    Array.isArray(body.tabs) && body.tabs.length > 0
      ? body.tabs
      : scheduleTabsForNow(new Date());
  const triggeredBy: string = body.triggeredBy || 'manual';

  const result = await runBoatScheduleSync(tabs, triggeredBy);

  return NextResponse.json(
    {
      status: result.status,
      syncId: result.syncId,
      rows_parsed: result.rowsParsed,
      rows_upserted: result.rowsUpserted,
      rows_stale: result.rowsStale,
      auto_matched: result.autoMatched,
      needs_review: result.needsReview,
      unmatched_bookings: result.unmatchedBookings,
      unmatched_orders: result.unmatchedOrders,
      errors: result.errors.length > 0 ? result.errors : undefined,
    },
    { status: result.status === 'failed' ? 500 : 200 },
  );
}

// GET -- status check
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { startedAt: 'desc' },
  });

  const [activeCount, staleCount, matchedCount, needsReviewCount] = await Promise.all([
    prisma.boatSchedule.count({ where: { isStale: false } }),
    prisma.boatSchedule.count({ where: { isStale: true } }),
    prisma.scheduleOrderMatch.count({ where: { status: 'matched' } }),
    prisma.scheduleOrderMatch.count({ where: { status: 'needs_review' } }),
  ]);

  return NextResponse.json({
    lastSync,
    schedule: { active: activeCount, stale: staleCount },
    matches: { matched: matchedCount, needs_review: needsReviewCount },
  });
}
