/**
 * GET /api/cron/follow-up-engine
 *
 * Vercel cron, every 15 minutes. One tick of the follow-up email engine —
 * see src/lib/followups/engine.ts for the full pipeline (kill switches,
 * send window, sweeps, atomic claim, per-job cancel checks, send).
 *
 * All flags off → fast `{ paused: true }` no-op.
 *
 * Auth: requires CRON_SECRET in the Authorization header (Vercel sets this
 * automatically for scheduled cron jobs).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { runFollowUpEngine } from '@/lib/followups/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Up to 50 sends with ~600ms spacing plus sweeps — needs more than default.
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Fail CLOSED when CRON_SECRET is unset (stricter than the repo's usual
  // cron pattern): this route can send real customer email, so a
  // misconfigured environment must not leave it open.
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runFollowUpEngine();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error('[follow-up-engine] tick crashed:', error);
    return NextResponse.json(
      { ok: false, error: 'engine tick failed' },
      { status: 500 }
    );
  }
}
