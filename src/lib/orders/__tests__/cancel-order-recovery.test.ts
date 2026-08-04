/**
 * cancelOrder — finishing a cancel that was interrupted after the refund.
 *
 * A cancel issues the Stripe refund FIRST, then claims the order. If the process
 * dies in between, Stripe has fully refunded but Order.status never reached
 * CANCELLED. Every retry then computed a $0 refundable cap and returned
 * ALREADY_REFUNDED *before* reaching the claim, so the order sat non-terminal
 * forever with a delivery still scheduled against it. Recovery meant knowing to
 * re-cancel with `issueRefund: false`, which is not the obvious action.
 *
 * The retry now finishes the job instead — but only when it can prove the refund
 * came from one of our own cancels, via the `type: 'cancel'` metadata stamp. A
 * full refund alone is NOT proof: the Full Moon batch refunder and the admin
 * refund route both fully refund orders and deliberately leave Order.status
 * alone, and cancelling those would be a new and worse bug.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

let orderStatus = 'CONFIRMED';

/** Refund rows the order carries; the crash's Case A leaves this empty. */
let orderRefunds: Array<{ amount: number }> = [];

const mockOrderFindUnique = vi.fn(async () => ({
  ...baseOrder(),
  status: orderStatus,
  refunds: orderRefunds,
}));

/** Emulates `UPDATE ... WHERE status NOT IN (...)` against the in-memory row. */
async function compareAndSet({
  where,
  data,
}: {
  where: { status?: { notIn?: string[] } };
  data: { status: string; financialStatus?: string };
}) {
  if ((where.status?.notIn ?? []).includes(orderStatus)) return { count: 0 };
  orderStatus = data.status;
  return { count: 1 };
}

const mockOrderUpdateMany = vi.fn(compareAndSet);

vi.mock('@/lib/database/client', () => ({
  prisma: {
    order: {
      findUnique: (...a: unknown[]) => mockOrderFindUnique(...(a as [])),
      updateMany: (...a: unknown[]) =>
        mockOrderUpdateMany(...(a as unknown as Parameters<typeof mockOrderUpdateMany>)),
    },
    refund: {
      findFirst: (...a: unknown[]) => mockRefundFindFirst(...a),
      update: (...a: unknown[]) => mockRefundUpdate(...a),
      delete: (...a: unknown[]) => mockRefundDelete(...a),
    },
  },
}));

/** null = the dead attempt never wrote the Refund row (crash before the stamp). */
const mockRefundFindFirst = vi.fn().mockResolvedValue(null);
const mockRefundUpdate = vi.fn().mockResolvedValue({});
const mockRefundDelete = vi.fn().mockResolvedValue({});

const mockCreateRefund = vi.fn().mockResolvedValue('rf_db_1');
const mockReleaseInventory = vi.fn().mockResolvedValue(undefined);
const mockCancellationEmail = vi.fn().mockResolvedValue(undefined);
const mockRefundEmail = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/inventory/services/order-service', () => ({
  createRefund: (...a: unknown[]) => mockCreateRefund(...a),
  recomputeOrderFinancialStatus: vi.fn().mockResolvedValue(undefined),
  releaseCommittedInventory: (...a: unknown[]) => mockReleaseInventory(...a),
}));
vi.mock('@/lib/email/email-service', () => ({
  sendOrderCancellationEmail: (...a: unknown[]) => mockCancellationEmail(...a),
  sendRefundProcessedEmail: (...a: unknown[]) => mockRefundEmail(...a),
}));
vi.mock('@/lib/email/templates/order-cancellation', () => ({
  generateOrderCancellationEmail: vi.fn().mockReturnValue('<html></html>'),
}));

function listOf(refunds: Array<Record<string, unknown>>): AsyncIterable<unknown> {
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
    status: 'CONFIRMED',
    financialStatus: 'PAID',
    fulfillmentStatus: 'PENDING',
    deliveryDate: null,
    stripePaymentIntentId: 'pi_1',
    items: [],
    // Case A of the crash: the DB Refund row was never written either.
    refunds: [],
  };
}

/** The refund the dead cancel attempt left behind at Stripe. */
const interruptedCancelRefund = {
  id: 're_interrupted',
  amount: 15000,
  status: 'succeeded',
  metadata: { orderId: 'order-1', orderNumber: '365', reason: 'Order cancelled', type: 'cancel' },
};

describe('cancelOrder — interrupted-cancel recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderStatus = 'CONFIRMED';
    orderRefunds = [];
    mockPiRetrieve.mockResolvedValue({ amount_received: 15000 }); // $150 captured
    // Full reset, not just clearAllMocks: a `...Once` queued by a test that
    // failed before consuming it would otherwise leak into the next test and
    // fail it for an unrelated reason.
    mockOrderUpdateMany.mockReset();
    mockOrderUpdateMany.mockImplementation(compareAndSet);
    mockRefundFindFirst.mockReset();
    mockRefundFindFirst.mockResolvedValue(null);
    mockRefundUpdate.mockReset();
    mockRefundUpdate.mockResolvedValue({});
  });

  it('REGRESSION: a retry finishes the cancel instead of bouncing off ALREADY_REFUNDED', async () => {
    // Stripe shows the full amount already refunded, by our own cancel.
    mockRefundsList.mockImplementation(() => listOf([interruptedCancelRefund]));
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    const result = await cancelOrder('order-1', { issueRefund: true, actorRole: 'ADMIN' });

    // The order finally reaches its terminal state — this is the whole point.
    // Before the fix it stayed live and its delivery still went out.
    expect(result.ok).toBe(true);
    expect(orderStatus).toBe('CANCELLED');
    expect(mockOrderUpdateMany.mock.calls[0][0].data).toEqual({
      status: 'CANCELLED',
      financialStatus: 'REFUNDED',
    });

    // No new money moves — it adopts the refund that already happened.
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(result.ok && result.refund).toMatchObject({
      stripeRefundId: 're_interrupted',
      amount: 150,
    });

    // The inventory the dead attempt never released is released now.
    expect(mockReleaseInventory).toHaveBeenCalledTimes(1);

    // The cancellation email the crash swallowed goes out, quoting the real
    // refunded amount rather than order.total.
    expect(mockCancellationEmail).toHaveBeenCalledTimes(1);
    const [, emailData] = mockCancellationEmail.mock.calls[0];
    expect(emailData.refundIssued).toBe(true);
    expect(emailData.refundAmount).toBe(150);

    // The dead attempt never wrote the Refund row, so recovery writes it. The
    // finance P&L and the auto-drafted QuickBooks journal read Refund rows by
    // createdAt, so leaving this to a possibly-delayed webhook would under-count
    // the refund on the day it posts.
    expect(mockCreateRefund).toHaveBeenCalledWith('order-1', 150, 'Order cancelled');
    expect(mockRefundUpdate).toHaveBeenCalledTimes(1);
    expect(mockRefundUpdate.mock.calls[0][0].data).toMatchObject({
      stripeRefundId: 're_interrupted',
      processedBy: 'ADMIN',
    });

    // Having recorded it, this call owns the refund email too.
    expect(mockRefundEmail).toHaveBeenCalledTimes(1);
    expect(mockRefundEmail.mock.calls[0][3]).toBe(150);
  });

  it('stays quiet on the refund email when the dead attempt had already recorded the row', async () => {
    // The other crash sub-case: the attempt died AFTER writing and stamping the
    // Refund row. This call does not own that refund, so it must not re-send the
    // refund email — a row that already exists cannot be distinguished from one
    // whose author emailed, and re-sending risks the double-notify PR #361 closed.
    // The customer still learns the amount: the cancellation email carries it.
    mockRefundsList.mockImplementation(() => listOf([interruptedCancelRefund]));
    mockRefundFindFirst.mockResolvedValue({ id: 'rf_existing' });
    // Keep the fixture self-consistent: a Refund row that exists would also show
    // up on the order, and its prior-refunds sum is what getMaxRefundable caps on.
    orderRefunds = [{ amount: 150 }];
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    const result = await cancelOrder('order-1', { issueRefund: true });

    expect(result.ok).toBe(true);
    expect(orderStatus).toBe('CANCELLED');
    expect(mockCreateRefund).not.toHaveBeenCalled();
    expect(mockRefundEmail).not.toHaveBeenCalled();
    // The cancellation email still tells them the money is coming back.
    expect(mockCancellationEmail).toHaveBeenCalledTimes(1);
    expect(mockCancellationEmail.mock.calls[0][1]).toMatchObject({
      refundIssued: true,
      refundAmount: 150,
    });
  });

  it('does NOT cancel an order fully refunded by the Full Moon batch refunder', async () => {
    // Same end state at Stripe — fully refunded, order non-terminal — but this
    // refund was deliberate and carries no cancel marker. Cancelling it would be
    // a new bug, worse than the one being fixed.
    mockRefundsList.mockImplementation(() =>
      listOf([
        {
          id: 're_fm',
          amount: 15000,
          status: 'succeeded',
          metadata: { orderId: 'order-1', orderNumber: '365', reason: 'Event cancelled' },
        },
      ]),
    );
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    const result = await cancelOrder('order-1', { issueRefund: true });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ALREADY_REFUNDED');
    expect(orderStatus).toBe('CONFIRMED'); // untouched
    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
    expect(mockCancellationEmail).not.toHaveBeenCalled();
    expect(mockReleaseInventory).not.toHaveBeenCalled();
  });

  it('recovery still loses cleanly to a concurrent cancel that got there first', async () => {
    mockRefundsList.mockImplementation(() => listOf([interruptedCancelRefund]));
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    // Someone else finished the cancel between our read and our claim.
    mockOrderUpdateMany.mockResolvedValueOnce({ count: 0 });

    const result = await cancelOrder('order-1', { issueRefund: true });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('ALREADY_TERMINAL');
      // Carries the adopted refund so a bulk run's money total stays right.
      expect(result.refund?.amount).toBe(150);
    }
    // The claim gates these, so the winner sent them, not us.
    expect(mockCancellationEmail).not.toHaveBeenCalled();
    expect(mockReleaseInventory).not.toHaveBeenCalled();
  });

  it('a cancel WITHOUT a refund is unaffected — it never consults Stripe', async () => {
    mockRefundsList.mockImplementation(() => listOf([interruptedCancelRefund]));
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    const result = await cancelOrder('order-1', { issueRefund: false });

    expect(result.ok).toBe(true);
    expect(orderStatus).toBe('CANCELLED');
    // No money status change, since this call moved no money.
    expect(mockOrderUpdateMany.mock.calls[0][0].data).toEqual({ status: 'CANCELLED' });
    expect(mockCancellationEmail).toHaveBeenCalledTimes(1);
    expect(mockRefundEmail).not.toHaveBeenCalled();
  });

  it('an already-CANCELLED order still short-circuits on the fast path', async () => {
    orderStatus = 'CANCELLED';
    mockRefundsList.mockImplementation(() => listOf([interruptedCancelRefund]));
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    const result = await cancelOrder('order-1', { issueRefund: true });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ALREADY_TERMINAL');
    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
    expect(mockCancellationEmail).not.toHaveBeenCalled();
  });
});
