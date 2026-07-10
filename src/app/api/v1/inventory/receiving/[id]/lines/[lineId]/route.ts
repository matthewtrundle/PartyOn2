import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';

const patchSchema = z.object({
  matchedVariantId: z.string().nullable().optional(),
  cases: z.number().int().min(0).optional(),
  unitsPerCase: z.number().int().min(1).optional(),
  unitCost: z.number().min(0).nullable().optional(),
  status: z.enum(['PENDING', 'MATCHED', 'SKIPPED']).optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const { id, lineId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.receivingInvoiceLine.findUnique({ where: { id: lineId } });
  if (!existing || existing.invoiceId !== id) {
    return NextResponse.json({ error: 'Line not found' }, { status: 404 });
  }

  const updates = parsed.data;
  const nextCases = updates.cases ?? existing.cases;
  const nextUnitsPerCase = updates.unitsPerCase ?? existing.unitsPerCase;

  const updated = await prisma.receivingInvoiceLine.update({
    where: { id: lineId },
    data: {
      ...updates,
      totalUnits: nextCases * nextUnitsPerCase,
      status:
        updates.status ??
        (updates.matchedVariantId === null
          ? 'PENDING'
          : updates.matchedVariantId
          ? 'MATCHED'
          : existing.status),
    },
  });

  return NextResponse.json({ line: updated });
}
