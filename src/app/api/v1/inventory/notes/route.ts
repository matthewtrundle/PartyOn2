import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOpsAuth } from '@/lib/auth/ops-session';

/**
 * GET /api/v1/inventory/notes
 * List inventory notes, most recent first.
 * Query params:
 *   - status: "pending" | "processed" (optional, defaults to all)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const status = request.nextUrl.searchParams.get('status');

    const notes = await prisma.inventoryNote.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('Failed to fetch inventory notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/inventory/notes
 * Create a new inventory adjustment note.
 * Body: { content: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    const note = await prisma.inventoryNote.create({
      data: { content: content.trim() },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error('Failed to create inventory note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
