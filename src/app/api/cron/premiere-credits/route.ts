/**
 * GET /api/cron/premiere-credits
 *
 * Vercel cron, every 15 minutes. One tick of the Premiere credit engine —
 * see src/lib/premiere-credits/engine.ts (feature-flag kill switches, sheet
 * read, per-row-isolated mint, gated send, partner + operator notifications).
 *
 * Both flags off → fast `{ paused: true }` no-op.
 *
 * Auth: requires CRON_SECRET in the Authorization header (Vercel sets this
 * automatically for scheduled cron jobs). Fails CLOSED — this route can mint
 * spendable value and send customer email, so a misconfigured environment must
 * not leave it open.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { runPremiereCreditsTick } from '@/lib/premiere-credits/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Sheet read + up to PER_RUN_CAP mints + sends — needs more than the default.
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runPremiereCreditsTick();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error('[premiere-credits] tick crashed:', error);
    return NextResponse.json({ ok: false, error: 'engine tick failed' }, { status: 500 });
  }
}
