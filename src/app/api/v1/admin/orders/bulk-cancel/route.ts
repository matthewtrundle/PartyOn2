/**
 * Bulk Order Cancel API
 * POST /api/v1/admin/orders/bulk-cancel
 *
 * Cancels every selected order — the whole cooler in one pass — optionally
 * refunding each payer in full. Built for group dashboards where one delivery
 * is split across many separate Stripe payments: cancelling a cruise used to
 * mean opening every sub-order's detail page and refunding it by hand.
 *
 * `preview: true` returns what WOULD happen (per-payer refundable amounts read
 * from Stripe) without moving any money, so the confirm dialog shows real
 * numbers rather than Order.total, which OrderAmendment can rewrite.
 *
 * Orders are processed sequentially: each one issues its own Stripe refund and
 * sends its own emails, and a failure on one payer must not abort the rest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { getMaxRefundable } from '@/lib/stripe/refund-utils';
import { cancelOrderSafe, type CancelOrderResult } from '@/lib/orders/cancel-order';

/**
 * Backstop against a runaway selection. A cooler is a couple dozen payers at
 * most; anything larger is a mis-click, and this is a money-out action.
 */
const MAX_BULK_CANCEL = 50;

const BulkCancelSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1),
  issueRefund: z.boolean().optional(),
  customNote: z.string().max(500).optional(),
  preview: z.boolean().optional(),
});

interface PreviewRow {
  orderId: string;
  orderNumber: number;
  customerName: string;
  total: number;
  /** What Stripe would actually send back, in dollars. */
  refundable: number;
  /** Already CANCELLED/REFUNDED — will be skipped. */
  alreadyTerminal: boolean;
  hasPayment: boolean;
  /** Set when the refundable amount could not be read from Stripe. */
  refundableError?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Admin only. The employee role is a shared password, and this endpoint turns
  // one click into up to 50 refunds — a wider blast radius than the per-order
  // cancel it composes.
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = BulkCancelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }
    const { orderIds, issueRefund, customNote, preview } = parsed.data;

    // Dedup BEFORE the cap check so a repeated id can't inflate the count.
    const ids = [...new Set(orderIds)];

    if (ids.length > MAX_BULK_CANCEL) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel more than ${MAX_BULK_CANCEL} orders at once (${ids.length} selected)`,
        },
        { status: 400 }
      );
    }

    if (preview) {
      return NextResponse.json({
        success: true,
        data: { orders: await buildPreview(ids) },
      });
    }

    // Sequential on purpose: each order hits Stripe and Resend, and a partial
    // failure must leave a readable per-payer record rather than a race.
    const results: CancelOrderResult[] = [];
    for (const id of ids) {
      results.push(await cancelOrderSafe(id, { customNote, issueRefund, actorRole: auth.role }));
    }

    const cancelled = results.filter((r) => r.ok);
    const refundedTotal = cancelled.reduce(
      (sum, r) => sum + (r.ok && r.refund ? r.refund.amount : 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        requestedCount: ids.length,
        cancelledCount: cancelled.length,
        failedCount: results.length - cancelled.length,
        refundedTotal,
        results: results.map((r) =>
          r.ok
            ? {
                orderId: r.orderId,
                orderNumber: r.orderNumber,
                customerName: r.customerName,
                ok: true as const,
                refundedAmount: r.refund?.amount ?? 0,
              }
            : {
                orderId: r.orderId,
                orderNumber: r.orderNumber,
                customerName: r.customerName,
                ok: false as const,
                code: r.code,
                error: r.error,
              }
        ),
      },
    });
  } catch (error) {
    console.error('[Bulk Cancel API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel orders' },
      { status: 500 }
    );
  }
}

/**
 * Reads each order's true remaining refundable amount from Stripe. A Stripe
 * read that fails is reported on its row instead of failing the whole preview —
 * the operator still needs to see the rest of the cooler.
 */
async function buildPreview(ids: string[]): Promise<PreviewRow[]> {
  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      total: true,
      status: true,
      stripePaymentIntentId: true,
      refunds: { select: { amount: true } },
    },
    orderBy: { orderNumber: 'asc' },
  });

  return Promise.all(
    orders.map(async (o) => {
      const alreadyTerminal = ['CANCELLED', 'REFUNDED'].includes(o.status);
      const row: PreviewRow = {
        orderId: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: Number(o.total),
        refundable: 0,
        alreadyTerminal,
        hasPayment: !!o.stripePaymentIntentId,
      };

      if (alreadyTerminal || !o.stripePaymentIntentId) return row;

      try {
        const priorRefunds = o.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
        row.refundable = await getMaxRefundable(o.stripePaymentIntentId, priorRefunds);
      } catch (error) {
        console.error(`[Bulk Cancel API] Refundable lookup failed for ${o.id}:`, error);
        row.refundableError = 'Could not read the refundable amount from Stripe';
      }

      return row;
    })
  );
}
