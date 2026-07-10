import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseInventoryNote, type KnownProduct } from '@/lib/ai/note-parser';
import { requireOpsAuth } from '@/lib/auth/ops-session';

/**
 * POST /api/v1/inventory/notes/[id]/process
 * Parse a pending inventory note with AI and return structured adjustments.
 * Does NOT apply the adjustments - just stores the parsed result on the note.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    // Load the note
    const note = await prisma.inventoryNote.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    if (note.status === 'processed') {
      return NextResponse.json(
        { success: false, error: 'Note has already been processed' },
        { status: 400 }
      );
    }

    // Fetch all active products with variants for AI context
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        variants: {
          select: { id: true, title: true, sku: true },
        },
      },
    });

    const knownProducts: KnownProduct[] = products.map((p) => ({
      id: p.id,
      title: p.title,
      variants: p.variants,
    }));

    // Call AI to parse the note
    const adjustments = await parseInventoryNote(note.content, knownProducts);

    // Store parsed result on the note
    await prisma.inventoryNote.update({
      where: { id },
      data: { parsedResult: adjustments as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      success: true,
      data: {
        noteId: id,
        content: note.content,
        adjustments,
      },
    });
  } catch (error) {
    console.error('Failed to process inventory note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process note with AI' },
      { status: 500 }
    );
  }
}
