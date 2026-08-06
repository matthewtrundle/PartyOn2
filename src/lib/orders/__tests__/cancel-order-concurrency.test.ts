/**
 * cancelOrder concurrency — one cancel must mean one set of customer emails.
 *
 * The terminal-state check used to be a plain read taken long before the
 * `status: 'CANCELLED'` write, with the Stripe call in between. Two overlapping
 * requests for the same order both read it as live and both ran to completion: Stripe
 * replayed a single refund (idempotency key) and the DB Refund row was deduped,
 * but the emails sat outside every guard, so the customer got two cancellation
 * emails and two REFUND_PROCESSED emails for one refund. The inventory release
 * ran twice too, double-releasing committedQuantity.
 *
 * Reproducing that needs two genuinely overlapping calls, so these tests run
 * `cancelOrder` twice under Promise.all against an in-memory order row whose
 * updateMany emulates Postgres compare-and-set.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CancelOrderResult } from '@/lib/orders/cancel-order';

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

/**
 * The single order row under test, plus a log of what each read saw. The reads
 * are what prove the race was real: if both calls saw a live status, both got past the
 * fast-path terminal check and the compare-and-set was the only thing standing
 * between them and a second set of emails.
 */
let orderStatus = 'CONFIRMED';
const readStatuses: string[] = [];

/**
 * Emulates `UPDATE ... WHERE status NOT IN (...)`. Postgres re-evaluates that
 * predicate against the committed row once the contended row lock is released,
 * so of two concurrent claims exactly one matches a row. This mock body runs to
 * completion without an await, which is the JS equivalent of that serialization.
 */
const mockOrderUpdateMany = vi.fn(
  async ({
    where,
    data,
  }: {
    where: { status?: { notIn?: string[] } };
    data: { status: string };
  }) => {
    if ((where.status?.notIn ?? []).includes(orderStatus)) return { count: 0 };
    orderStatus = data.status;
    return { count: 1 };
  },
);

const mockOrderFindUnique = vi.fn(async () => {
  readStatuses.push(orderStatus);
  return { ...baseOrder(), status: orderStatus };
});

/**
 * The refunds table, modelling the one property the code leans on:
 * `Refund.stripeRefundId` is UNIQUE, so only one caller can stamp a given Stripe
 * refund id and the loser gets a P2002. Without this the mock would let both
 * callers believe they owned the refund — which is the whole bug.
 */
const refundRows: Array<{ id: string; stripeRefundId: string | null }> = [];

const mockRefundFindFirst = vi.fn(
  async ({ where }: { where: { stripeRefundId: string } }) =>
    refundRows.find((r) => r.stripeRefundId === where.stripeRefundId) ?? null,
);

const mockRefundUpdate = vi.fn(
  async ({ where, data }: { where: { id: string }; data: { stripeRefundId?: string } }) => {
    if (
      data.stripeRefundId &&
      refundRows.some((r) => r.id !== where.id && r.stripeRefundId === data.stripeRefundId)
    ) {
      throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    }
    const row = refundRows.find((r) => r.id === where.id);
    if (row && data.stripeRefundId) row.stripeRefundId = data.stripeRefundId;
    return row ?? {};
  },
);

const mockRefundDelete = vi.fn(async ({ where }: { where: { id: string } }) => {
  const i = refundRows.findIndex((r) => r.id === where.id);
  if (i >= 0) refundRows.splice(i, 1);
  return {};
});

vi.mock('@/lib/database/client', () => ({
  prisma: {
    order: {
      findUnique: (...a: unknown[]) => mockOrderFindUnique(...(a as [])),
      updateMany: (...a: unknown[]) =>
        mockOrderUpdateMany(...(a as unknown as Parameters<typeof mockOrderUpdateMany>)),
    },
    refund: {
      findFirst: (...a: unknown[]) =>
        mockRefundFindFirst(...(a as Parameters<typeof mockRefundFindFirst>)),
      update: (...a: unknown[]) => mockRefundUpdate(...(a as Parameters<typeof mockRefundUpdate>)),
      delete: (...a: unknown[]) => mockRefundDelete(...(a as Parameters<typeof mockRefundDelete>)),
    },
    // Not under test here — see cancel-order-delivery-task.test.ts.
    deliveryTask: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  },
}));

// --- Side-effectful services ---
/** Inserts an unstamped row, exactly as the real createRefund does. */
const mockCreateRefund = vi.fn(async () => {
  const id = `rf_db_${refundRows.length + 1}`;
  refundRows.push({ id, stripeRefundId: null });
  return id;
});
const mockRecomputeFinancialStatus = vi.fn().mockResolvedValue(undefined);
const mockReleaseInventory = vi.fn().mockResolvedValue(undefined);
const mockCancellationEmail = vi.fn().mockResolvedValue(undefined);
const mockRefundEmail = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/inventory/services/order-service', () => ({
  createRefund: (...a: unknown[]) => mockCreateRefund(...(a as [])),
  recomputeOrderFinancialStatus: (...a: unknown[]) => mockRecomputeFinancialStatus(...a),
  releaseCommittedInventory: (...a: unknown[]) => mockReleaseInventory(...a),
}));
vi.mock('@/lib/email/email-service', () => ({
  sendOrderCancellationEmail: (...a: unknown[]) => mockCancellationEmail(...a),
  sendRefundProcessedEmail: (...a: unknown[]) => mockRefundEmail(...a),
}));
vi.mock('@/lib/email/templates/order-cancellation', () => ({
  generateOrderCancellationEmail: vi.fn().mockReturnValue('<html></html>'),
}));

/** Fresh async-iterable per call — one generator object cannot be iterated twice. */
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
    // Overridden by the live row status on read; CONFIRMED is the real
    // non-terminal OrderStatus a paid-but-undelivered order sits in.
    status: 'CONFIRMED',
    financialStatus: 'PAID',
    fulfillmentStatus: 'PENDING',
    deliveryDate: null,
    stripePaymentIntentId: 'pi_1',
    items: [],
    refunds: [],
  };
}

const failures = (results: CancelOrderResult[]) => results.filter((r) => !r.ok);
const successes = (results: CancelOrderResult[]) => results.filter((r) => r.ok);

describe('cancelOrder — concurrent cancels of the same order', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    orderStatus = 'CONFIRMED';
    readStatuses.length = 0;
    refundRows.length = 0;
    mockPiRetrieve.mockResolvedValue({ amount_received: 15000 }); // $150 captured
    mockRefundsList.mockImplementation(() => listOf([])); // nothing refunded yet
    // Stripe replays one refund for both callers — same key, same object back.
    mockRefundsCreate.mockResolvedValue({ id: 're_1', status: 'succeeded' });
  });

  it('REGRESSION: two overlapping refunding cancels send ONE cancellation email and ONE refund email', async () => {
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    const results = await Promise.all([
      cancelOrder('order-1', { issueRefund: true, actorRole: 'ADMIN' }),
      cancelOrder('order-1', { issueRefund: true, actorRole: 'ADMIN' }),
    ]);

    // Both requests read the order before either wrote — the race really happened,
    // rather than the second call short-circuiting on the fast-path read.
    expect(readStatuses).toEqual(['CONFIRMED', 'CONFIRMED']);

    // The invariant: one refund, one of each email.
    expect(mockRefundEmail).toHaveBeenCalledTimes(1);
    expect(mockCancellationEmail).toHaveBeenCalledTimes(1);
    // And the customer is told the real amount, once.
    expect(mockRefundEmail.mock.calls[0][3]).toBe(150);

    // Committed inventory is released once. releaseCommittedInventory subtracts
    // on every call, so a second run would understate what is still committed.
    expect(mockReleaseInventory).toHaveBeenCalledTimes(1);

    // One Stripe refund leaves exactly one Refund row. Both callers raced to
    // insert; the loser hit the unique constraint on stripeRefundId and deleted
    // its orphan, which would otherwise inflate the order's refund total and
    // wrongly cap a later partial refund (getMaxRefundable sums the DB rows).
    expect(refundRows).toHaveLength(1);
    expect(refundRows[0].stripeRefundId).toBe('re_1');
    expect(mockRefundDelete).toHaveBeenCalledTimes(1);

    // Exactly one caller owns the cancel; the other reports losing the race.
    expect(successes(results)).toHaveLength(1);
    const lost = failures(results);
    expect(lost).toHaveLength(1);
    expect(lost[0].ok).toBe(false);
    if (!lost[0].ok) {
      expect(lost[0].code).toBe('ALREADY_TERMINAL');
      // Names the concurrency, not the fast-path "already cancelled" wording —
      // proof the claim (or Stripe's key conflict) is what stopped it.
      expect(lost[0].error).toMatch(/another request|already in progress/i);
    }

    expect(orderStatus).toBe('CANCELLED');
  });

  it('REGRESSION: two overlapping non-refunding cancels send ONE cancellation email', async () => {
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    const results = await Promise.all([
      cancelOrder('order-1', { issueRefund: false }),
      cancelOrder('order-1', { issueRefund: false }),
    ]);

    expect(readStatuses).toEqual(['CONFIRMED', 'CONFIRMED']);
    expect(mockCancellationEmail).toHaveBeenCalledTimes(1);
    expect(mockRefundEmail).not.toHaveBeenCalled();
    expect(mockReleaseInventory).toHaveBeenCalledTimes(1);
    expect(successes(results)).toHaveLength(1);
    expect(failures(results)).toHaveLength(1);
    // No money moved, so the order must not be stamped REFUNDED.
    expect(mockOrderUpdateMany.mock.calls[0][0].data).toEqual({ status: 'CANCELLED' });
  });

  it('REGRESSION: a refunding cancel that loses to a non-refunding one still tells the customer', async () => {
    // The nastier race: cancelling WITHOUT a refund does no Stripe work, so it
    // reaches the claim first and wins, while the refunding call is still
    // mid-Stripe. Gating the refund email on the cancel claim would drop it —
    // money gone, and the only email the customer got says no refund is coming.
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    const [noRefund, refunding] = await Promise.all([
      cancelOrder('order-1', { issueRefund: false }),
      cancelOrder('order-1', { issueRefund: true, actorRole: 'ADMIN' }),
    ]);

    expect(readStatuses).toEqual(['CONFIRMED', 'CONFIRMED']);

    // Money really moved on the refunding call.
    expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
    expect(mockCreateRefund).toHaveBeenCalledTimes(1);

    // The customer is told about it exactly once, by whoever recorded the refund.
    expect(mockRefundEmail).toHaveBeenCalledTimes(1);
    expect(mockRefundEmail.mock.calls[0][3]).toBe(150);
    // And still only one cancellation email overall.
    expect(mockCancellationEmail).toHaveBeenCalledTimes(1);
    expect(mockReleaseInventory).toHaveBeenCalledTimes(1);

    // The no-refund call won the order; the refunding call reports losing it but
    // still carries the amount it sent back, so a bulk run's money total is right.
    expect(noRefund.ok).toBe(true);
    expect(refunding.ok).toBe(false);
    if (!refunding.ok) {
      expect(refunding.code).toBe('ALREADY_TERMINAL');
      expect(refunding.refund?.amount).toBe(150);
    }
  });

  it('does not send a second email when the winner already marked the order cancelled', async () => {
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    // First cancel completes fully.
    const first = await cancelOrder('order-1', { issueRefund: true });
    expect(first.ok).toBe(true);
    expect(mockCancellationEmail).toHaveBeenCalledTimes(1);
    expect(mockRefundEmail).toHaveBeenCalledTimes(1);

    // A later retry short-circuits on the fast-path read: no Stripe, no email.
    mockRefundsCreate.mockClear();
    const second = await cancelOrder('order-1', { issueRefund: true });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe('ALREADY_TERMINAL');
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockCancellationEmail).toHaveBeenCalledTimes(1);
    expect(mockRefundEmail).toHaveBeenCalledTimes(1);
  });

  it("maps Stripe's in-flight idempotency conflict to ALREADY_TERMINAL and sends nothing", async () => {
    const { cancelOrder } = await import('@/lib/orders/cancel-order');

    // Stripe rejects a second live request holding the same key rather than
    // replaying it — the signal that a duplicate cancel is running right now.
    mockRefundsCreate.mockRejectedValue(
      Object.assign(new Error('There is currently another in-progress request using this key'), {
        type: 'idempotency_error',
      }),
    );

    const result = await cancelOrder('order-1', { issueRefund: true });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ALREADY_TERMINAL');
    expect(mockCancellationEmail).not.toHaveBeenCalled();
    expect(mockRefundEmail).not.toHaveBeenCalled();
    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
    expect(orderStatus).toBe('CONFIRMED'); // still retryable
  });

  it('still surfaces real Stripe failures instead of swallowing them as ALREADY_TERMINAL', async () => {
    const { cancelOrderSafe } = await import('@/lib/orders/cancel-order');

    mockRefundsCreate.mockRejectedValue(
      Object.assign(new Error('Your card was declined'), { type: 'card_error' }),
    );

    const result = await cancelOrderSafe('order-1', { issueRefund: true });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('STRIPE_ERROR');
    expect(mockCancellationEmail).not.toHaveBeenCalled();
    // The order stays non-terminal so the operator can retry.
    expect(orderStatus).toBe('CONFIRMED');
  });
});
