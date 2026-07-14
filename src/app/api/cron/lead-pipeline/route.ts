/**
 * GET /api/cron/lead-pipeline
 *
 * Daily Lead Flow board tick (vercel.json: 30 11 * * * = 6:30am CDT /
 * 5:30am CST), the
 * backstop behind the realtime hooks in leadCapture/enqueue:
 *   1. enroll  — SUBMITTED leads that never got a board card
 *   2. reopen  — WON/LOST leads with a fresh submit re-enter NEW
 *   3. quote   — outstanding drafts move cards to QUOTE_SENT
 *   4. won     — verified paid-order matches move cards to WON
 *   5. rescore — daily recency/proximity decay for every open card
 *
 * Auth: CRON_SECRET bearer (same pattern as event-abandoned-rsvps).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { runLeadPipelineTick } from '@/lib/leads/pipeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Fail CLOSED when CRON_SECRET is unset (follow-up-engine precedent): this
  // route mass-mutates board state, so a misconfigured environment must not
  // leave it publicly triggerable.
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runLeadPipelineTick();
    console.log('[lead-pipeline cron]', JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (err) {
    console.error('[lead-pipeline cron] tick failed', err);
    return NextResponse.json({ ok: false, error: 'tick-failed' }, { status: 500 });
  }
}
