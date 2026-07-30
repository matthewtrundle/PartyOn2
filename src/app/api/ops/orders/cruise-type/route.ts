/**
 * PUT /api/ops/orders/cruise-type
 *
 * Persist an operator-set cruise type ('DISCO' | 'PRIVATE', or null to clear)
 * onto a GroupOrderV2 dashboard, keyed by shareCode. Set from the pick-sheet
 * pre-print gate when a marina delivery has no Premier manifest match, so the
 * cruise type sticks on future pick sheets instead of being asked every time.
 *
 * Body: { shareCode: string, cruiseType: 'DISCO' | 'PRIVATE' | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';

const BodySchema = z.object({
  shareCode: z.string().min(1).max(50),
  cruiseType: z.enum(['DISCO', 'PRIVATE']).nullable(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { shareCode, cruiseType } = parsed.data;
  const updated = await prisma.groupOrderV2.updateMany({
    where: { shareCode },
    data: { cruiseType },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, shareCode, cruiseType });
}
