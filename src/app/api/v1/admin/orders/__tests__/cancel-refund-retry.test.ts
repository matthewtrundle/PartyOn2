/**
 * Cancel-route refund retry regression.
 *
 * Scenario from prod (order #365 era): the cancel route creates the Stripe
 * refund FIRST, then writes the DB Refund record. If the process dies in
 * between, the DB shows 0 prior refunds while Stripe has already refunded.
 * A retry must NOT issue a second Stripe refund.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// --- Stripe mock (shared by the route and by refund-utils) ---
const mockPiRetrieve = vi.fn();
const mockRefundsList = vi.fn();
const mockRefundsCreate = vi.fn();

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    paymentIntents: { retrieve: (...a: unknown[]) => mockPiRetrieve(...a) },
    refunds: {
      list: (...a: unknown[]) => mockRefundsList(...a),
      create: (...a: unknown[]) => mockRefundsCreate(...a),
    },
  },
}));

// --- Auth: pass through (not a NextResponse) ---
vi.mock('@/lib/auth/ops-session', () => ({
  requireOpsAuth: vi.fn().mockResolvedValue({ sub: 'admin', role: 'ADMIN' }),
}));

// --- Prisma ---
const mockOrderFindUnique = vi.fn();
// The terminal-status write is a compare-and-set (updateMany + status notIn),
// so that concurrent cancels can't both run the emails. count: 1 = claim won.
const mockOrderUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
// No DB row yet for the Stripe refund id — the normal case. The route's
// duplicate guard only short-circuits when a row already carries that id.
const mockRefundFindFirst = vi.fn().mockResolvedValue(null);
const mockRefundUpdate = vi.fn().mockResolvedValue({});

vi.mock('@/lib/database/client', () => ({
  prisma: {
    order: {
      findUnique: (...a: unknown[]) => mockOrderFindUnique(...a),
      updateMany: (...a: unknown[]) => mockOrderUpdateMany(...a),
    },
    refund: {
      findFirst: (...a: unknown[]) => mockRefundFindFirst(...a),
      update: (...a: unknown[]) => mockRefundUpdate(...a),
    },
  },
}));

// --- Side-effectful services (no-ops here) ---
vi.mock('@/lib/inventory/services/order-service', () => ({
  // Returns the new Refund row id — the route stamps THAT row by id.
  createRefund: vi.fn().mockResolvedValue('rf_db_1'),
  releaseCommittedInventory: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/email/email-service', () => ({
  sendOrderCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendRefundProcessedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/email/templates/order-cancellation', () => ({
  generateOrderCancellationEmail: vi.fn().mockReturnValue('<html></html>'),
}));

/** Build the async-iterable that stripe.refunds.list() returns. */
function listOf(refunds: Array<{ amount: number; status: string }>): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const r of refunds) yield r;
    },
  };
}

function baseOrder() {
  return {
    id: 'order-1',
    orderNumber: 365,
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    total: 150,
    status: 'PAID',
    financialStatus: 'PAID',
    fulfillmentStatus: 'PENDING',
    deliveryDate: null,
    stripePaymentIntentId: 'pi_1',
    items: [],
    refunds: [], // DB shows NO prior refunds
  };
}

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const routeParams = { params: Promise.resolve({ id: 'order-1' }) };

describe('POST /cancel — refund retry safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrderFindUnique.mockResolvedValue(baseOrder());
    mockOrderUpdateMany.mockResolvedValue({ count: 1 });
    mockRefundFindFirst.mockResolvedValue(null);
    mockRefundUpdate.mockResolvedValue({});
    mockPiRetrieve.mockResolvedValue({ amount_received: 15000 }); // $150 captured
  });

  it('REGRESSION: Stripe already refunded but DB empty → retry does NOT create a second refund', async () => {
    // Stripe already shows the full refund (the DB write that should have
    // recorded it never landed). Note the refund carries NO metadata, so it is a
    // refund of unknown origin — cancelOrder cannot prove one of its own cancels
    // issued it, and correctly refuses to cancel the order off the back of it.
    // (A refund stamped `type: 'cancel'` DOES complete the cancel instead; that
    // is covered in src/lib/orders/__tests__/cancel-order-recovery.test.ts.)
    mockRefundsList.mockReturnValue(listOf([{ amount: 15000, status: 'succeeded' }]));

    const { POST } = await import('@/app/api/v1/admin/orders/[id]/cancel/route');
    const res = await POST(makeRequest({ issueRefund: true }), routeParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/already been fully refunded/i);
    // The critical assertion: no second Stripe refund was issued.
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  it('happy path: issues the refund once, with an order-derived idempotency key', async () => {
    mockRefundsList.mockReturnValue(listOf([])); // nothing refunded yet
    mockRefundsCreate.mockResolvedValue({ id: 're_1', status: 'succeeded' });

    const { POST } = await import('@/app/api/v1/admin/orders/[id]/cancel/route');
    const res = await POST(makeRequest({ issueRefund: true }), routeParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.refund.amount).toBe(150);

    expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
    const [params, options] = mockRefundsCreate.mock.calls[0];
    expect(params.amount).toBe(15000);
    // Key includes the amount so an amended retry gets a fresh key instead of
    // colliding with the old amount and locking Stripe for 24h.
    expect(options).toEqual({ idempotencyKey: 'order-cancel-refund-order-1-15000' });
    // The cancel marker is what lets a retry finish a cancel that died before the
    // status write. Dropping it silently would not fail anything else, so pin it
    // here — along with the orderId the recovery lookup matches on.
    expect(params.metadata).toMatchObject({ type: 'cancel', orderId: 'order-1' });
  });
});
