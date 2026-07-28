/**
 * GET /api/cron/premier-embed-health — daily.
 *
 * Verifies the Premier boat-tab embed still boots (see
 * `src/lib/partners/premier-embed-health.ts`). Returns 500 when degraded so
 * the run also shows red in Vercel, not just in Allan's inbox.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runPremierEmbedHealthCheck } from '@/lib/partners/premier-embed-health';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runPremierEmbedHealthCheck();
    return NextResponse.json(
      { ok: result.healthy, ...result, at: new Date().toISOString() },
      { status: result.healthy ? 200 : 500 }
    );
  } catch (err) {
    console.error('[premier-embed-health] check failed:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}
