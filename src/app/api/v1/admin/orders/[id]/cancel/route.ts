/**
 * Order Cancel API
 * POST /api/v1/admin/orders/[id]/cancel
 * Cancel an order with optional refund and email notification.
 *
 * All of the actual work lives in `@/lib/orders/cancel-order` so this route and
 * the bulk (whole-cooler) cancel route share one money path.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  cancelOrder,
  previewCancellationEmail,
  type CancelFailureCode,
} from '@/lib/orders/cancel-order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Preserves the status codes this route returned before the logic was extracted. */
function statusForCode(code: CancelFailureCode): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'ALREADY_TERMINAL':
    case 'NO_PAYMENT':
    case 'ALREADY_REFUNDED':
    case 'STRIPE_ERROR':
      return 400;
    default:
      return 500;
  }
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
    const { customNote, preview, issueRefund } = body as {
      customNote?: string;
      preview?: boolean;
      issueRefund?: boolean;
    };

    // Preview mode: return HTML without changing anything
    if (preview) {
      const previewResult = await previewCancellationEmail(id, { customNote, issueRefund });
      if (!previewResult.ok) {
        return NextResponse.json(
          { success: false, error: previewResult.error },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, html: previewResult.html });
    }

    const result = await cancelOrder(id, { customNote, issueRefund, actorRole: auth.role });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          // Non-null only when this cancel refunded and then lost the order to a
          // concurrent request. The cancel failed but the money left, and the
          // operator must not read the error as "nothing happened" — same reason
          // bulk-cancel reports refundedAmount on its failure rows.
          refund: result.refund ?? null,
        },
        { status: statusForCode(result.code) }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'CANCELLED',
        refund: result.refund,
      },
    });
  } catch (error) {
    console.error('[Cancel API] Error:', error);

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return NextResponse.json(
        { success: false, error: `Stripe error: ${stripeError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
