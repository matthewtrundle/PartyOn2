/**
 * Bulk (whole-cooler) cancel route.
 *
 * The case this exists for: a group dashboard splits one delivery across many
 * separate Stripe payments, so cancelling the cooler means cancelling every
 * sub-order. The invariants that matter are (a) one payer's failure never
 * aborts the rest, (b) an already-cancelled payer is never re-refunded, and
 * (c) a runaway selection can't fire dozens of refunds.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// --- Stripe ---
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

const mockRequireAdminRole = vi.fn();
vi.mock('@/lib/auth/ops-session', () => ({
  requireOpsAuth: vi.fn().mockResolvedValue({ role: 'admin' }),
  requireAdminRole: () => mockRequireAdminRole(),
}));

const mockOrderFindUnique = vi.fn();
const mockOrderFindMany = vi.fn();
const mockOrderUpdate = vi.fn().mockResolvedValue({});
const mockRefundFindFirst = vi.fn().mockResolvedValue(null);
const mockRefundUpdate = vi.fn().mockResolvedValue({});
const mockCreateRefund = vi.fn().mockResolvedValue('rf_db_1');

vi.mock('@/lib/database/client', () => ({
  prisma: {
    order: {
      findUnique: (...a: unknown[]) => mockOrderFindUnique(...a),
      findMany: (...a: unknown[]) => mockOrderFindMany(...a),
      update: (...a: unknown[]) => mockOrderUpdate(...a),
    },
    refund: {
      findFirst: (...a: unknown[]) => mockRefundFindFirst(...a),
      update: (...a: unknown[]) => mockRefundUpdate(...a),
    },
  },
}));

vi.mock('@/lib/inventory/services/order-service', () => ({
  createRefund: (...a: unknown[]) => mockCreateRefund(...a),
  releaseCommittedInventory: vi.fn().mockResolvedValue(undefined),
}));
const mockSendCancellationEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/email/email-service', () => ({
  sendOrderCancellationEmail: (...a: unknown[]) => mockSendCancellationEmail(...a),
  sendRefundProcessedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/email/templates/order-cancellation', () => ({
  generateOrderCancellationEmail: vi.fn().mockReturnValue('<html></html>'),
}));

/** The async-iterable shape stripe.refunds.list() returns. */
function listOf(refunds: Array<{ amount: number; status: string }>): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const r of refunds) yield r;
    },
  };
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 420,
    customerName: 'Mike M',
    customerEmail: 'mike@example.com',
    total: 56.6,
    status: 'PAID',
    financialStatus: 'PAID',
    fulfillmentStatus: 'PENDING',
    deliveryDate: null,
    stripePaymentIntentId: 'pi_1',
    items: [],
    refunds: [],
    ...overrides,
  };
}

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

async function post(body: unknown) {
  const { POST } = await import('@/app/api/v1/admin/orders/bulk-cancel/route');
  const res = await POST(makeRequest(body));
  return { res, data: await res.json() };
}

describe('POST /bulk-cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminRole.mockResolvedValue({ role: 'admin' });
    mockPiRetrieve.mockResolvedValue({ amount_received: 5660 });
    mockRefundsList.mockReturnValue(listOf([]));
    mockRefundsCreate.mockResolvedValue({ id: 're_1', status: 'succeeded' });
    mockOrderUpdate.mockResolvedValue({});
    mockRefundFindFirst.mockResolvedValue(null);
    mockRefundUpdate.mockResolvedValue({});
    mockCreateRefund.mockResolvedValue('rf_db_1');
    mockSendCancellationEmail.mockResolvedValue(undefined);
  });

  it('cancels and refunds every selected payer in one pass', async () => {
    mockOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(order({ id: where.id, orderNumber: where.id === 'a' ? 420 : 430 })),
    );

    const { res, data } = await post({ orderIds: ['a', 'b'], issueRefund: true });

    expect(res.status).toBe(200);
    expect(data.data.cancelledCount).toBe(2);
    expect(data.data.failedCount).toBe(0);
    expect(data.data.refundedTotal).toBeCloseTo(113.2);
    expect(mockRefundsCreate).toHaveBeenCalledTimes(2);
    // Each payer gets their OWN idempotency key — a shared key would make
    // Stripe replay payer A's refund for payer B.
    const keys = mockRefundsCreate.mock.calls.map(([, opts]) => opts.idempotencyKey);
    expect(new Set(keys).size).toBe(2);
  });

  it('one payer failing does not abort the rest', async () => {
    mockOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'bad') return Promise.resolve(null); // deleted mid-run
      return Promise.resolve(order({ id: where.id }));
    });

    const { data } = await post({ orderIds: ['a', 'bad', 'c'], issueRefund: true });

    expect(data.data.cancelledCount).toBe(2);
    expect(data.data.failedCount).toBe(1);
    expect(data.data.results.find((r: { orderId: string }) => r.orderId === 'bad')).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(mockRefundsCreate).toHaveBeenCalledTimes(2);
  });

  it('skips an already-cancelled payer instead of re-refunding them', async () => {
    mockOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(order({ id: where.id, status: where.id === 'done' ? 'CANCELLED' : 'PAID' })),
    );

    const { data } = await post({ orderIds: ['done', 'live'], issueRefund: true });

    expect(data.data.cancelledCount).toBe(1);
    expect(data.data.results.find((r: { orderId: string }) => r.orderId === 'done')).toMatchObject({
      ok: false,
      code: 'ALREADY_TERMINAL',
    });
    expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
  });

  it('refuses a runaway selection rather than firing dozens of refunds', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `order-${i}`);
    const { res, data } = await post({ orderIds: ids, issueRefund: true });

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/more than 50/i);
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  it('de-duplicates ids so a doubled selection cannot double-refund', async () => {
    mockOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(order({ id: where.id })),
    );

    const { data } = await post({ orderIds: ['a', 'a', 'a'], issueRefund: true });

    expect(data.data.requestedCount).toBe(1);
    expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
  });

  it('preview reports Stripe-refundable amounts and moves no money', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'a', orderNumber: 420, customerName: 'Mike M', total: 56.6, status: 'PAID', stripePaymentIntentId: 'pi_1', refunds: [] },
      { id: 'b', orderNumber: 430, customerName: 'Yader', total: 35.7, status: 'CANCELLED', stripePaymentIntentId: 'pi_2', refunds: [] },
    ]);

    const { data } = await post({ orderIds: ['a', 'b'], preview: true });

    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(data.data.orders[0]).toMatchObject({ orderId: 'a', refundable: 56.6, alreadyTerminal: false });
    // Already-cancelled rows are shown as skipped with nothing to refund.
    expect(data.data.orders[1]).toMatchObject({ orderId: 'b', refundable: 0, alreadyTerminal: true });
  });

  it('rejects a non-array / empty orderIds payload', async () => {
    expect((await post({ orderIds: [] })).res.status).toBe(400);
    expect((await post({ orderIds: 'a,b' })).res.status).toBe(400);
    expect((await post({ orderIds: [1, 2] })).res.status).toBe(400);
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  it('requires the admin role — a shared employee login cannot bulk-refund', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireAdminRole.mockResolvedValue(
      NextResponse.json({ success: false, error: 'Admin role required' }, { status: 403 }),
    );

    const { res } = await post({ orderIds: ['a'], issueRefund: true });

    expect(res.status).toBe(403);
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it('does not write a second DB refund row when Stripe replays an existing refund', async () => {
    // A concurrent cancel — or the charge.refunded webhook — already recorded
    // this exact Stripe refund. Stripe's idempotency key replays the same
    // refund object, so the row must be reused: a duplicate would inflate the
    // DB total and wrongly cap getMaxRefundable on any later partial refund.
    mockOrderFindUnique.mockResolvedValue(order());
    mockRefundFindFirst.mockResolvedValue({ id: 'rf_existing' });

    const { data } = await post({ orderIds: ['a'], issueRefund: true });

    expect(data.data.cancelledCount).toBe(1);
    expect(mockCreateRefund).not.toHaveBeenCalled();
    // And the existing row keeps its own attribution — re-stamping it would
    // relabel the webhook's processedBy: 'stripe' record as an admin action.
    expect(mockRefundUpdate).not.toHaveBeenCalled();
  });

  it('emails the amount Stripe actually refunded, not the order total', async () => {
    // $56.60 order with $20 already refunded → only $36.60 can go back. The
    // cancellation email must not promise the full total.
    mockOrderFindUnique.mockResolvedValue(order({ refunds: [{ amount: 20 }] }));
    mockRefundsList.mockReturnValue(listOf([{ amount: 2000, status: 'succeeded' }]));

    await post({ orderIds: ['a'], issueRefund: true });

    const [, emailData] = mockSendCancellationEmail.mock.calls[0];
    expect(emailData.refundAmount).toBeCloseTo(36.6);
    expect(emailData.total).toBe(56.6);
  });
});
