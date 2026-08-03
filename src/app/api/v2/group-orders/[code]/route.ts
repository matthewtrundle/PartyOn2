/**
 * GET /api/v2/group-orders/[code] - Get full group order by share code
 * PATCH /api/v2/group-orders/[code] - Update group order (name, status)
 * DELETE /api/v2/group-orders/[code] - Cancel group order
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getGroupOrderByCode,
  updateGroupOrderFields,
  cancelGroupOrder,
  NotHostError,
} from '@/lib/group-orders-v2/service';
import { UpdateGroupOrderSchema } from '@/lib/group-orders-v2/validation';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const group = await getGroupOrderByCode(code);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group order not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error('[Group V2] Get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group order' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const body = await request.json();
    const parsed = UpdateGroupOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { participantId, ...fields } = parsed.data;
    await updateGroupOrderFields(code, participantId, fields);
    const updated = await getGroupOrderByCode(code);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof NotHostError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    if (error instanceof Error && error.message === 'HAS_PAID_PAYMENT') {
      return NextResponse.json(
        {
          success: false,
          error: 'This order already has payments on it and can no longer be cancelled here.',
          code: 'HAS_PAID_PAYMENT',
        },
        { status: 409 }
      );
    }
    console.error('[Group V2] Update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update group order' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const hostParticipantId = request.nextUrl.searchParams.get('hostParticipantId');
    if (!hostParticipantId) {
      return NextResponse.json(
        { success: false, error: 'hostParticipantId is required' },
        { status: 400 }
      );
    }

    await cancelGroupOrder(code, hostParticipantId);
    // After success: cancelling blocks checkout on every tab, so it is
    // effectively a remote kill-switch authorized by a public id.
    console.warn(`[Group V2] group cancelled: code=***${code.slice(-3)} by=${hostParticipantId}`);
    return NextResponse.json({ success: true, message: 'Group order cancelled' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to cancel';
    if (msg === 'HAS_PAID_PAYMENT') {
      return NextResponse.json(
        {
          success: false,
          error: 'This order already has payments on it and can no longer be cancelled here.',
          code: 'HAS_PAID_PAYMENT',
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}
