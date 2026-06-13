/**
 * GET /api/ops/orders-view — unified day-grouped cooler cards for the ops
 * Orders page. Replaces the flat /api/v1/admin/orders listing AND
 * /api/ops/weekly-summary for that page.
 *
 * Auth: ops session cookie required.
 *
 * Query params (all optional):
 *   start=YYYY-MM-DD     window start (default today America/Chicago)
 *   days=1..31           window length (default 7)
 *   q=<search>           order #, customer name, or email — ignores window
 *   status=...           OrderStatus
 *   fulfillmentStatus=...FulfillmentStatus
 *   deliveryType=...     DeliveryType
 *   groupType=regular|group   legacy v1 group filter
 *   groupOrderV2Id=<id>  single dashboard filter
 *   reviewSent=sent|unsent
 *   overdue=0            disable the overdue section
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getOrdersView } from '@/lib/ops/orders-view-data';
import { DeliveryType, FulfillmentStatus, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(31).optional(),
  q: z.string().trim().max(200).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  fulfillmentStatus: z.nativeEnum(FulfillmentStatus).optional(),
  deliveryType: z.nativeEnum(DeliveryType).optional(),
  groupType: z.enum(['all', 'regular', 'group']).optional(),
  groupOrderV2Id: z.string().uuid().optional(),
  reviewSent: z.enum(['sent', 'unsent']).optional(),
  overdue: z.enum(['0', '1']).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const raw = Object.fromEntries(
    [...req.nextUrl.searchParams.entries()].filter(([, v]) => v !== ''),
  );
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const p = parsed.data;

  try {
    const data = await getOrdersView({
      start: p.start,
      days: p.days,
      search: p.q,
      status: p.status,
      fulfillmentStatus: p.fulfillmentStatus,
      deliveryType: p.deliveryType,
      groupType: p.groupType,
      groupOrderV2Id: p.groupOrderV2Id,
      reviewSent: p.reviewSent,
      includeOverdue: p.overdue !== '0',
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Orders View API] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load orders view' },
      { status: 500 },
    );
  }
}
