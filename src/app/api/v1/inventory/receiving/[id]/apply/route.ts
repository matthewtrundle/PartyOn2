import { NextRequest, NextResponse } from 'next/server';
import { applyInvoice } from '@/lib/inventory/receiving/service';
import { requireOpsAuth } from '@/lib/auth/ops-session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  // ?skipInventory=1 writes cost-per-unit to matched variants without adjusting stock.
  // Used when ingesting historical invoices for cost data only.
  const skipInventory = req.nextUrl.searchParams.get('skipInventory') === '1';
  try {
    const result = await applyInvoice(id, { skipInventory });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply invoice';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
