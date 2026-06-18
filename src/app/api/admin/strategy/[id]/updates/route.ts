/**
 * Game Plan strategy API — append a progress note (the "living" log).
 *   POST /api/admin/strategy/[id]/updates  — body { author, body }
 *
 * Append-only: the server stamps the note id + timestamp. Self-guarded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { addUpdate } from '@/lib/strategy/strategy-service';
import { addUpdateSchema } from '@/lib/strategy/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const body = await request.json();
    const data = addUpdateSchema.parse(body);
    const updated = await addUpdate(id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }
    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[strategy] add-update failed:', error);
    return NextResponse.json({ error: 'Failed to add update' }, { status: 500 });
  }
}
