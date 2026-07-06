/**
 * GET /api/ops/followups/log — recent FOLLOW_UP sends with delivery status
 * (from EmailLog, which the Resend webhook keeps current).
 *
 * Ops-auth only.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { maskEmail } from '@/lib/followups/attribution';

export async function GET() {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const logs = await prisma.emailLog.findMany({
      where: { type: 'FOLLOW_UP' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        to: true,
        subject: true,
        status: true,
        sentAt: true,
        openedAt: true,
        bouncedAt: true,
        metadata: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      success: true,
      logs: logs.map((log) => {
        const meta = (log.metadata as Record<string, unknown> | null) ?? {};
        return {
          id: log.id,
          to: maskEmail(log.to),
          subject: log.subject,
          status: log.status,
          sentAt: log.sentAt,
          openedAt: log.openedAt,
          bouncedAt: log.bouncedAt,
          createdAt: log.createdAt,
          journeyKey: typeof meta.journeyKey === 'string' ? meta.journeyKey : null,
          step: typeof meta.step === 'number' ? meta.step : null,
        };
      }),
    });
  } catch (error) {
    console.error('[ops/followups/log GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load log' }, { status: 500 });
  }
}
