/**
 * GET /api/cron/lead-hot-alert
 *
 * Vercel cron, every 15 min. Emails the operator (OPS_ALERT_EMAIL) a digest of
 * leads that need a reply and gained a fresh signal since the last run — hot
 * leads + anyone who just emailed info@. No-ops silently until the
 * LEAD_HOT_ALERTS feature flag is flipped on. See src/lib/leads/hot-alert.ts.
 *
 * Auth: requires CRON_SECRET in the Authorization header (Vercel sets it for
 * scheduled jobs). Fail-closed.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { runHotLeadAlert } from '@/lib/leads/hot-alert';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const result = await runHotLeadAlert();
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}
