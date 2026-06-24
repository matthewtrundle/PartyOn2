/**
 * Weekly cron: refresh the Premier boat schedule (manifest) from the Google
 * Sheet and re-run order↔booking matching, so ops pick sheets stop flagging
 * real bookings as "NOT FOUND on boat manifest" just because the cached copy
 * went stale.
 *
 * Schedule: 0 12 * * 1 (Mondays 12:00 UTC) — ahead of the Monday 13:00 ops
 * briefing so it consumes fresh matches.
 *
 * Syncs the current + next month tabs automatically (no hardcoded month).
 */

import { NextRequest, NextResponse } from 'next/server';
import { runBoatScheduleSync, scheduleTabsForNow } from '@/lib/premier/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // sheet read + full re-match can take a while

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tabs = scheduleTabsForNow(new Date());
  const result = await runBoatScheduleSync(tabs, 'cron');

  console.log(
    `[Boat Schedule Cron] tabs=${tabs.join(',')} status=${result.status} ` +
      `parsed=${result.rowsParsed} upserted=${result.rowsUpserted} matched=${result.autoMatched}`,
  );

  return NextResponse.json(
    { ok: result.status !== 'failed', tabs, ...result },
    { status: result.status === 'failed' ? 500 : 200 },
  );
}
