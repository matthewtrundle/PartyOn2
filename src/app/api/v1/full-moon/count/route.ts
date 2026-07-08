/**
 * GET /api/v1/full-moon/count
 *
 * Public live ticket count for the threshold widget: the sum of ticket
 * quantities across PAID orders for the Full Moon Party ticket product.
 * Returns 0 gracefully if the product doesn't exist yet or on any error, so
 * the widget always renders.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { EVENT, TICKET_PRODUCT_HANDLE } from '@/components/full-moon/event';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const product = await prisma.product.findUnique({
      where: { handle: TICKET_PRODUCT_HANDLE },
      select: { id: true },
    });

    let sold = 0;
    if (product) {
      const agg = await prisma.orderItem.aggregate({
        _sum: { quantity: true },
        where: { productId: product.id, order: { financialStatus: 'PAID' } },
      });
      sold = agg._sum.quantity ?? 0;
    }

    return NextResponse.json(
      { sold, minimum: EVENT.minimum, capacity: EVENT.capacity },
      { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15' } },
    );
  } catch (error) {
    console.error('[FullMoon Count] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ sold: 0, minimum: EVENT.minimum, capacity: EVENT.capacity });
  }
}
