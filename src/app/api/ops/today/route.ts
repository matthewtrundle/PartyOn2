import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getTodayData } from '@/lib/ops/today-data';

export const dynamic = 'force-dynamic';

/** GET /api/ops/today — the Shift Board aggregate (KPIs, triage, runs). */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await getTodayData(auth.role === 'admin' ? 'admin' : 'employee');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[ops/today] aggregate failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build today view' },
      { status: 500 },
    );
  }
}
