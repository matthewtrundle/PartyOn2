/**
 * GET /api/v1/full-moon/count
 *
 * Public live ticket count for the threshold widget: the sum of ticket
 * quantities across PAID orders for the Full Moon Party ticket product, plus
 * the widget `state` ('working' | 'met' | 'cancelled', where 'cancelled' ===
 * postponed). Returns 0 / 'working' gracefully if the product doesn't exist yet
 * or on any error, so the widget always renders.
 *
 * `capacity` intentionally stays the ADVERTISED capacity (50). The real hard
 * cap (60) is enforced server-side in the ticket route and never surfaced here.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { EVENT, TICKET_PRODUCT_HANDLE } from '@/components/full-moon/event';
import { isFullMoonPostponed, deriveFullMoonState } from '@/lib/full-moon/event-state';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const [product, postponed] = await Promise.all([
      prisma.product.findUnique({
        where: { handle: TICKET_PRODUCT_HANDLE },
        select: { id: true },
      }),
      isFullMoonPostponed(),
    ]);

    let sold = 0;
    if (product) {
      const agg = await prisma.orderItem.aggregate({
        _sum: { quantity: true },
        where: { productId: product.id, order: { financialStatus: 'PAID' } },
      });
      sold = agg._sum.quantity ?? 0;
    }

    const state = deriveFullMoonState(sold, EVENT.minimum, postponed);

    return NextResponse.json(
      { sold, minimum: EVENT.minimum, capacity: EVENT.capacity, state },
      { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15' } },
    );
  } catch (error) {
    console.error('[FullMoon Count] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ sold: 0, minimum: EVENT.minimum, capacity: EVENT.capacity, state: 'working' });
  }
}
