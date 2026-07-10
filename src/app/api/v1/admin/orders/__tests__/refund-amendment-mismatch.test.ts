/**
 * Refund/amendment mismatch guard (CWE-840, flagged by the PR #221 security review).
 *
 * The route may only stamp OrderAmendment.resolution = REFUNDED when the
 * refunded amount actually matches the amendment's amountDelta (±$0.005).
 * A mismatched, missing, or foreign amendment must NOT block the refund —
 * the money still moves — but the amendment stays pending and the response
 * carries a warning. The client detaches amendmentId when the operator edits
 * the amount, but the server cannot trust that.
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
const mockRefundUpdate = vi.fn().mockResolvedValue({});
const mockAmendmentFindUnique = vi.fn();
const mockAmendmentUpdate = vi.fn().mockResolvedValue({});

vi.mock('@/lib/database/client', () => ({
  prisma: {
    order: { findUnique: (...a: unknown[]) => mockOrderFindUnique(...a) },
    refund: { update: (...a: unknown[]) => mockRefundUpdate(...a) },
    orderAmendment: {
      findUnique: (...a: unknown[]) => mockAmendmentFindUnique(...a),
      update: (...a: unknown[]) => mockAmendmentUpdate(...a),
    },
  },
}));

// --- Side-effectful services (no-ops here) ---
vi.mock('@/lib/inventory/services/order-service', () => ({
  // Returns the new Refund row id — the route stamps THAT row by id.
  createRefund: vi.fn().mockResolvedValue('rf_db_1'),
}));
vi.mock('@/lib/email/email-service', () => ({
  sendRefundProcessedEmail: vi.fn().mockResolvedValue(undefined),
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
    orderNumber: 412,
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    total: 150,
    stripePaymentIntentId: 'pi_1',
    refunds: [], // no prior DB refunds
  };
}

/** Amendment owing the customer $50 (negative delta = refund direction). */
function baseAmendment() {
  return {
    id: 'amend-1',
    orderId: 'order-1',
    amountDelta: '-50.00', // string mimics Prisma Decimal's Number() coercion
    resolution: 'PENDING',
  };
}

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const routeParams = { params: Promise.resolve({ id: 'order-1' }) };

async function callRoute(body: unknown) {
  const { POST } = await import('@/app/api/v1/admin/orders/[id]/refund/route');
  const res = await POST(makeRequest(body), routeParams);
  return { res, data: await res.json() };
}

describe('POST /refund — amendment stamp guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrderFindUnique.mockResolvedValue(baseOrder());
    mockAmendmentFindUnique.mockResolvedValue(baseAmendment());
    mockRefundUpdate.mockResolvedValue({});
    mockAmendmentUpdate.mockResolvedValue({});
    mockPiRetrieve.mockResolvedValue({ amount_received: 15000 }); // $150 captured
    mockRefundsList.mockReturnValue(listOf([])); // nothing refunded on Stripe yet
    mockRefundsCreate.mockResolvedValue({ id: 're_1', status: 'succeeded' });
  });

  it('SECURITY: amount below the amendment delta → refund processes but amendment is NOT stamped', async () => {
    const { res, data } = await callRoute({ amount: 20, amendmentId: 'amend-1' });

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRefundsCreate).toHaveBeenCalledTimes(1); // money still moves
    expect(mockAmendmentUpdate).not.toHaveBeenCalled(); // stamp withheld
    expect(data.warning).toMatch(/does not match/i);
    expect(data.warning).toContain('$20.00');
    expect(data.warning).toContain('$50.00');
  });

  it('a one-cent mismatch is still a mismatch', async () => {
    const { data } = await callRoute({ amount: 49.99, amendmentId: 'amend-1' });

    expect(data.success).toBe(true);
    expect(mockAmendmentUpdate).not.toHaveBeenCalled();
    expect(data.warning).toMatch(/does not match/i);
  });

  it('matching amount stamps the amendment REFUNDED with the refund row id', async () => {
    const { res, data } = await callRoute({ amount: 50, amendmentId: 'amend-1' });

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.warning).toBeUndefined();

    expect(mockAmendmentUpdate).toHaveBeenCalledTimes(1);
    const [updateArg] = mockAmendmentUpdate.mock.calls[0];
    expect(updateArg.where).toEqual({ id: 'amend-1' });
    expect(updateArg.data.resolution).toBe('REFUNDED');
    expect(updateArg.data.refundId).toBe('rf_db_1');

    // Refund-trilogy invariants stay intact: cents amount + scoped idempotency key.
    const [params, options] = mockRefundsCreate.mock.calls[0];
    expect(params.amount).toBe(5000);
    expect(options).toEqual({ idempotencyKey: 'order-refund-order-1-amend-1-5000' });
  });

  it('sub-half-cent float drift still counts as a match', async () => {
    const { data } = await callRoute({ amount: 50.004, amendmentId: 'amend-1' });

    expect(data.warning).toBeUndefined();
    expect(mockAmendmentUpdate).toHaveBeenCalledTimes(1);
  });

  it('unknown amendmentId → refund processes, warning, no stamp (and no P2025 crash)', async () => {
    mockAmendmentFindUnique.mockResolvedValue(null);
    const { res, data } = await callRoute({ amount: 20, amendmentId: 'ghost' });

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
    expect(mockAmendmentUpdate).not.toHaveBeenCalled();
    expect(data.warning).toMatch(/not found/i);
  });

  it("an amendment belonging to a different order can't be stamped through this order", async () => {
    mockAmendmentFindUnique.mockResolvedValue({ ...baseAmendment(), orderId: 'other-order' });
    const { data } = await callRoute({ amount: 50, amendmentId: 'amend-1' });

    expect(data.success).toBe(true);
    expect(mockAmendmentUpdate).not.toHaveBeenCalled();
    expect(data.warning).toMatch(/different order/i);
  });

  it('manual refund (no amendmentId) never touches amendments and carries no warning', async () => {
    const { res, data } = await callRoute({ amount: 20 });

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAmendmentFindUnique).not.toHaveBeenCalled();
    expect(mockAmendmentUpdate).not.toHaveBeenCalled();
    expect('warning' in data).toBe(false);
  });

  it('non-numeric amount is rejected before any Stripe call', async () => {
    const { res, data } = await callRoute({ amount: '50', amendmentId: 'amend-1' });

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });
});
