/**
 * cancelOrder — cancelling an order must cancel its linked DeliveryTask too.
 *
 * Prod incident: cancelling an order (and refunding it) never touched the
 * order's DeliveryTask row, so it sat at PENDING forever — 16 orders back to
 * late June found with this drift, one of them (#455) scheduled for the next
 * day. Nothing in the app currently reads DeliveryTask.status for display, so
 * this wasn't yet visible on any operator-facing schedule, but it's wrong data
 * and a latent trap for the next feature that does read it (a driver app, say).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

let orderStatus = 'CONFIRMED';

const mockOrderFindUnique = vi.fn(async () => ({ ...baseOrder(), status: orderStatus }));

/** Emulates `UPDATE ... WHERE status NOT IN (...)` against the in-memory row. */
const mockOrderUpdateMany = vi.fn(
  async ({ where, data }: { where: { status?: { notIn?: string[] } }; data: { status: string } }) => {
    if ((where.status?.notIn ?? []).includes(orderStatus)) return { count: 0 };
    orderStatus = data.status;
    return { count: 1 };
  },
);

const mockDeliveryTaskUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

vi.mock('@/lib/database/client', () => ({
  prisma: {
    order: {
      findUnique: (...a: unknown[]) => mockOrderFindUnique(...(a as [])),
      updateMany: (...a: unknown[]) =>
        mockOrderUpdateMany(...(a as unknown as Parameters<typeof mockOrderUpdateMany>)),
    },
    deliveryTask: {
      updateMany: (...a: unknown[]) => mockDeliveryTaskUpdateMany(...a),
    },
  },
}));

vi.mock('@/lib/stripe/client', () => ({ stripe: { refunds: { create: vi.fn() } } }));
vi.mock('@/lib/inventory/services/order-service', () => ({
  releaseCommittedInventory: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/email/email-service', () => ({
  sendOrderCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendRefundProcessedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/email/templates/order-cancellation', () => ({
  generateOrderCancellationEmail: vi.fn().mockReturnValue('<html></html>'),
}));

function baseOrder() {
  return {
    id: 'order-1',
    orderNumber: 455,
    customerName: 'Alyssa Moran',
    customerEmail: 'alyssa@example.com',
    total: 234.37,
    fulfillmentStatus: 'PENDING',
    deliveryDate: null,
    stripePaymentIntentId: null,
    items: [],
    refunds: [],
  };
}

describe('cancelOrder — DeliveryTask cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderStatus = 'CONFIRMED';
    mockDeliveryTaskUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('cancels the linked delivery task when the cancel wins', async () => {
    const { cancelOrder } = await import('@/lib/orders/cancel-order');
    const result = await cancelOrder('order-1', { issueRefund: false });

    expect(result.ok).toBe(true);
    expect(mockDeliveryTaskUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockDeliveryTaskUpdateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { status: 'CANCELLED' },
    });
  });

  it('does not touch the delivery task when the order is already terminal', async () => {
    orderStatus = 'CANCELLED';

    const { cancelOrder } = await import('@/lib/orders/cancel-order');
    const result = await cancelOrder('order-1', { issueRefund: false });

    expect(result.ok).toBe(false);
    expect(mockDeliveryTaskUpdateMany).not.toHaveBeenCalled();
  });

  it('a delivery-task update failure does not fail the cancel itself', async () => {
    mockDeliveryTaskUpdateMany.mockRejectedValue(new Error('db blip'));

    const { cancelOrder } = await import('@/lib/orders/cancel-order');
    const result = await cancelOrder('order-1', { issueRefund: false });

    // Matches the existing inventory-release and email failure handling: a
    // secondary side effect must never undo an order that already cancelled.
    expect(result.ok).toBe(true);
  });
});
