/**
 * findCancelRefund — tells an interrupted cancel apart from a deliberate refund.
 *
 * A cancel that dies between `stripe.refunds.create` and the status write leaves
 * the order fully refunded at Stripe but NOT cancelled, and every retry then
 * short-circuits on "already fully refunded" without finishing the cancel — the
 * order still looks live and its delivery still goes out.
 *
 * The tempting fix is "fully refunded ⇒ safe to cancel", and it is wrong: the
 * Full Moon batch refunder (src/lib/full-moon/refund.ts) and the admin refund
 * route both fully refund orders and deliberately never write Order.status, so
 * that rule would silently cancel their orders. These tests pin the narrower
 * rule that actually distinguishes them — the cancel flow's own metadata stamp.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRefundsList = vi.fn();

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    refunds: { list: (...a: unknown[]) => mockRefundsList(...a) },
    paymentIntents: { retrieve: vi.fn() },
  },
}));

/** Fresh async-iterable per call — one generator object cannot be iterated twice. */
function listOf(refunds: Array<Record<string, unknown>>): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const r of refunds) yield r;
    },
  };
}

const cancelRefund = (over: Record<string, unknown> = {}) => ({
  id: 're_cancel',
  amount: 15000,
  status: 'succeeded',
  metadata: { orderId: 'order-1', orderNumber: '365', reason: 'Order cancelled', type: 'cancel' },
  ...over,
});

describe('findCancelRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds a refund this order’s cancel flow issued', async () => {
    mockRefundsList.mockImplementation(() => listOf([cancelRefund()]));
    const { findCancelRefund } = await import('@/lib/stripe/refund-utils');

    expect(await findCancelRefund('pi_1', 'order-1')).toEqual({
      stripeRefundId: 're_cancel',
      amount: 150, // dollars, not cents
      status: 'succeeded',
    });
  });

  it('ignores a full refund from the Full Moon batch refunder', async () => {
    // Real shape from src/lib/full-moon/refund.ts — same three metadata keys the
    // cancel flow writes, but no `type`. Those orders are fully refunded and
    // intentionally left non-terminal; cancelling them would be a bug.
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
    const { findCancelRefund } = await import('@/lib/stripe/refund-utils');

    expect(await findCancelRefund('pi_1', 'order-1')).toBeNull();
  });

  it('ignores an operator who typed "Order cancelled" as a manual refund reason', async () => {
    // The admin refund route puts operator free text straight into metadata.reason,
    // which is exactly why the marker is a separate `type` key rather than that
    // string. This is the spoof the design has to survive.
    mockRefundsList.mockImplementation(() =>
      listOf([
        {
          id: 're_manual',
          amount: 15000,
          status: 'succeeded',
          metadata: { orderId: 'order-1', orderNumber: '365', reason: 'Order cancelled' },
        },
      ]),
    );
    const { findCancelRefund } = await import('@/lib/stripe/refund-utils');

    expect(await findCancelRefund('pi_1', 'order-1')).toBeNull();
  });

  it('ignores a return-route refund, which stamps a different type', async () => {
    mockRefundsList.mockImplementation(() =>
      listOf([
        {
          id: 're_return',
          amount: 15000,
          status: 'succeeded',
          metadata: { orderId: 'order-1', reason: 'Return: items returned', type: 'return' },
        },
      ]),
    );
    const { findCancelRefund } = await import('@/lib/stripe/refund-utils');

    expect(await findCancelRefund('pi_1', 'order-1')).toBeNull();
  });

  it('ignores a cancel refund belonging to a different order', async () => {
    mockRefundsList.mockImplementation(() =>
      listOf([cancelRefund({ metadata: { orderId: 'order-OTHER', type: 'cancel' } })]),
    );
    const { findCancelRefund } = await import('@/lib/stripe/refund-utils');

    expect(await findCancelRefund('pi_1', 'order-1')).toBeNull();
  });

  it('ignores failed and canceled refunds — no money moved, so they prove nothing', async () => {
    mockRefundsList.mockImplementation(() =>
      listOf([
        cancelRefund({ id: 're_failed', status: 'failed' }),
        cancelRefund({ id: 're_canceled', status: 'canceled' }),
      ]),
    );
    const { findCancelRefund } = await import('@/lib/stripe/refund-utils');

    expect(await findCancelRefund('pi_1', 'order-1')).toBeNull();
  });

  it('picks the cancel refund out of a mixed history', async () => {
    mockRefundsList.mockImplementation(() =>
      listOf([
        { id: 're_partial', amount: 2000, status: 'succeeded', metadata: { orderId: 'order-1' } },
        cancelRefund({ id: 're_the_one', amount: 13000 }),
      ]),
    );
    const { findCancelRefund } = await import('@/lib/stripe/refund-utils');

    expect(await findCancelRefund('pi_1', 'order-1')).toMatchObject({
      stripeRefundId: 're_the_one',
      amount: 130,
    });
  });

  it('returns null when the order has no refunds at all', async () => {
    mockRefundsList.mockImplementation(() => listOf([]));
    const { findCancelRefund } = await import('@/lib/stripe/refund-utils');

    expect(await findCancelRefund('pi_1', 'order-1')).toBeNull();
  });
});
