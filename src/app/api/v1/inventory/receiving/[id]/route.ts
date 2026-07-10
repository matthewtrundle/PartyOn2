import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { getVariantSuggestions } from '@/lib/inventory/receiving/service';
import { requireOpsAuth } from '@/lib/auth/ops-session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const invoice = await prisma.receivingInvoice.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const matchedVariantIds = invoice.lines.map((l) => l.matchedVariantId).filter((v): v is string => !!v);
  const variantById = matchedVariantIds.length
    ? new Map(
        (
          await prisma.productVariant.findMany({
            where: { id: { in: matchedVariantIds } },
            include: { product: { select: { id: true, title: true } } },
          })
        ).map((v) => [v.id, v])
      )
    : new Map();

  const linesWithSuggestions = await Promise.all(
    invoice.lines.map(async (line) => {
      const suggestions = line.matchedVariantId
        ? []
        : await getVariantSuggestions(line.distributorDescription);
      const matched = line.matchedVariantId ? variantById.get(line.matchedVariantId) : null;
      return {
        ...line,
        unitCost: line.unitCost != null ? Number(line.unitCost) : null,
        matchedVariant: matched
          ? {
              variantId: matched.id,
              productId: matched.productId,
              productTitle: matched.product.title,
              variantTitle: matched.title,
            }
          : null,
        suggestions,
      };
    })
  );

  return NextResponse.json({ invoice: { ...invoice, lines: linesWithSuggestions } });
}
