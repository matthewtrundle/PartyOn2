/**
 * Game Plan strategy API — update + archive a single initiative.
 *   PATCH  /api/admin/strategy/[id]  — patch fields (incl. the subtasks array)
 *   DELETE /api/admin/strategy/[id]  — soft-delete (archive)
 *
 * Self-guarded — /api/admin/** is not middleware-protected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { updateInitiative, archiveInitiative } from '@/lib/strategy/strategy-service';
import { updateInitiativeSchema } from '@/lib/strategy/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateInitiativeSchema.parse(body);
    const updated = await updateInitiative(id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[strategy] PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update initiative' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const ok = await archiveInitiative(id);
    if (!ok) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[strategy] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete initiative' }, { status: 500 });
  }
}
