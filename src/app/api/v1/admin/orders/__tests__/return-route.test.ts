/**
 * Tests for POST /api/v1/admin/orders/[id]/return
 *
 * The load-bearing guarantee: the Stripe refund amount is computed from the
 * STORED OrderItem.price, never from anything in the request body. An ops
 * admin (or a compromised ops session) that posts an inflated `unitPrice`
 * must not be able to enlarge the refund beyond what the customer paid for
 * that line — even when the inflated total still fits under the whole-order
 * Stripe cap.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// --- Mocks --------------------------------------------------------------

const txMock = vi.hoisted(() => ({
  orderItem: { update: vi.fn() },
  refund: { create: vi.fn() },
  order: { update: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  order: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

const stripeMock = vi.hoisted(() => ({
  refunds: { create: vi.fn() },
}));

const getMaxRefundableMock = vi.hoisted(() => vi.fn());
const sendRefundProcessedEmailMock = vi.hoisted(() => vi.fn());
const releaseCommittedInventoryMock = vi.hoisted(() => vi.fn());
const requireOpsAuthMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));
vi.mock('@/lib/stripe/client', () => ({ stripe: stripeMock }));
vi.mock('@/lib/stripe/refund-utils', () => ({ getMaxRefundable: getMaxRefundableMock }));
vi.mock('@/lib/email/email-service', () => ({ sendRefundProcessedEmail: sendRefundProcessedEmailMock }));
vi.mock('@/lib/inventory/services/order-service', () => ({
  releaseCommittedInventory: releaseCommittedInventoryMock,
}));
vi.mock('@/lib/auth/ops-session', () => ({ requireOpsAuth: requireOpsAuthMock }));

import { POST } from '../[id]/return/route';

// --- Fixtures -----------------------------------------------------------

const ORDER_ID = 'order_1';

/** A two-unit line that the customer actually paid $29.99/unit for. */
function buildOrder() {
  return {
    id: ORDER_ID,
    orderNumber: 1234,
    stripePaymentIntentId: 'pi_test_123',
    fulfillmentStatus: 'UNFULFILLED',
    total: new Prisma.Decimal('100.00'),
    customerEmail: 'customer@example.com',
    customerName: 'Test Customer',
    items: [
      {
        id: 'oi_1',
        productId: 'p_1',
        variantId: 'v_1',
        title: 'Casamigos Blanco',
        price: new Prisma.Decimal('29.99'),
        quantity: 2,
        refundedQuantity: 0,
      },
    ],
    refunds: [],
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/v1/admin/orders/${ORDER_ID}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function callRoute(req: NextRequest) {
  return POST(req, { params: Promise.resolve({ id: ORDER_ID }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireOpsAuthMock.mockResolvedValue({ role: 'admin' }); // not a NextResponse => authorized
  prismaMock.order.findUnique.mockResolvedValue(buildOrder());
  prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof txMock) => unknown) => cb(txMock));
  txMock.orderItem.update.mockResolvedValue({});
  txMock.refund.create.mockResolvedValue({});
  txMock.order.update.mockResolvedValue({});
  // Cap is generous on purpose: an inflated single-line refund would still fit
  // under it, so the cap is NOT what protects us — the server price is.
  getMaxRefundableMock.mockResolvedValue(1000);
  stripeMock.refunds.create.mockResolvedValue({ id: 're_test_1', status: 'succeeded' });
  sendRefundProcessedEmailMock.mockResolvedValue(undefined);
  releaseCommittedInventoryMock.mockResolvedValue(undefined);
});

describe('POST /api/v1/admin/orders/[id]/return — refund amount integrity', () => {
  it('ignores an inflated client unitPrice and refunds the stored price', async () => {
    // Malicious/compromised client: real price is $29.99, body claims $999.99.
    // 1 unit * $999.99 = $999.99 still slips under the $1000 whole-order cap,
    // so only the server-price computation stops the over-refund.
    const res = await callRoute(
      makeRequest({
        items: [
          {
            orderItemId: 'oi_1',
            returnQuantity: 1,
            unitPrice: 999.99,
            productId: 'p_1',
            variantId: 'v_1',
          },
        ],
        reason: 'tampered',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Stripe is charged the STORED price (29.99 => 2999 cents), not 99999.
    // Read the first call arg directly — the route also passes a second
    // idempotency-options arg, which a single-arg matcher would trip on.
    expect(stripeMock.refunds.create).toHaveBeenCalledTimes(1);
    expect(stripeMock.refunds.create.mock.calls[0][0].amount).toBe(2999);
    expect(stripeMock.refunds.create.mock.calls[0][0].amount).not.toBe(99999);

    // Response and persisted refund record both reflect the server amount.
    expect(json.data.amount).toBe(29.99);
    expect(txMock.refund.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: new Prisma.Decimal('29.99') }),
      }),
    );
  });

  it('refunds the correct server amount for a legitimate multi-unit return', async () => {
    const res = await callRoute(
      makeRequest({ items: [{ orderItemId: 'oi_1', returnQuantity: 2 }] }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // 2 * 29.99 = 59.98 => 5998 cents
    expect(stripeMock.refunds.create.mock.calls[0][0].amount).toBe(5998);
    expect(json.data.amount).toBe(59.98);
    expect(json.data.itemsReturned).toBe(2);
  });

  it('rejects a return quantity above what remains and never calls Stripe', async () => {
    const res = await callRoute(
      makeRequest({ items: [{ orderItemId: 'oi_1', returnQuantity: 3 }] }), // only 2 purchased
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('rejects a non-integer return quantity and never calls Stripe', async () => {
    const res = await callRoute(
      makeRequest({ items: [{ orderItemId: 'oi_1', returnQuantity: 1.5 }] }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('rejects a body that lists the same order item twice (no stacked over-refund)', async () => {
    // Both lines reference oi_1 (purchased qty 2). Read against the same
    // in-memory refundedQuantity=0, each clears max-returnable, and they would
    // stack to 3 units of refund without the duplicate guard.
    const res = await callRoute(
      makeRequest({
        items: [
          { orderItemId: 'oi_1', returnQuantity: 2 },
          { orderItemId: 'oi_1', returnQuantity: 1 },
        ],
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('returns the auth response and never touches Stripe when unauthorized', async () => {
    requireOpsAuthMock.mockResolvedValue(
      NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    );

    const res = await callRoute(
      makeRequest({ items: [{ orderItemId: 'oi_1', returnQuantity: 1 }] }),
    );

    expect(res.status).toBe(401);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });
});
