/**
 * Cron: Auto-lock expired tabs
 * Run periodically to lock tabs whose orderDeadline has passed
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel cron or manual trigger)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Lock tabs whose deadline has passed and are still OPEN
    const result = await prisma.subOrder.updateMany({
      where: {
        status: 'OPEN',
        orderDeadline: { lt: now },
      },
      data: {
        status: 'LOCKED',
      },
    });

    // Auto-close of expired group orders is intentionally disabled.
    // Business rule: dashboards must never close on their own — a customer
    // hitting a CLOSED group sees "not accepting new participants" and we
    // lose the order. If a group genuinely needs to be ended, do it manually.

    return NextResponse.json({
      success: true,
      tabsLocked: result.count,
      groupsClosed: 0,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Group Orders V2 error:', error);
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
