/**
 * Tests for refundFullMoonOrder — the money-safety branches:
 *  - mixed (non-ticket) orders are NEVER blind-refunded
 *  - $0 comps and no-payment orders are skipped
 *  - already-refunded orders (cap ≤ 0) are skipped (idempotent re-run)
 *  - dry-run computes but never writes; apply refunds + stamps + emails
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  order: { findUnique: vi.fn() },
  product: { findUnique: vi.fn() },
  refund: { update: vi.fn() },
}));
const stripeMock = vi.hoisted(() => ({ refunds: { create: vi.fn() } }));
const getMaxRefundableMock = vi.hoisted(() => vi.fn());
const createRefundMock = vi.hoisted(() => vi.fn());
const sendFullMoonRefundEmailMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));
vi.mock('@/lib/stripe/client', () => ({ stripe: stripeMock }));
vi.mock('@/lib/stripe/refund-utils', () => ({ getMaxRefundable: getMaxRefundableMock }));
vi.mock('@/lib/inventory/services/order-service', () => ({ createRefund: createRefundMock }));
vi.mock('@/lib/email/email-service', () => ({ sendFullMoonRefundEmail: sendFullMoonRefundEmailMock }));

import { refundFullMoonOrder } from '../refund';

const TICKET = { id: 'prod_ticket' };

function buildOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    orderNumber: 401,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    total: 59,
    stripePaymentIntentId: 'pi_1',
    internalNote: null,
    refunds: [] as Array<{ amount: number }>,
    items: [{ productId: 'prod_ticket', totalPrice: 59 }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.product.findUnique.mockResolvedValue(TICKET);
});

describe('refundFullMoonOrder — skip branches (no Stripe call)', () => {
  it('skips a mixed order (non-ticket line item)', async () => {
    prismaMock.order.findUnique.mockResolvedValue(
      buildOrder({ items: [{ productId: 'prod_ticket', totalPrice: 59 }, { productId: 'other', totalPrice: 20 }] }),
    );
    const r = await refundFullMoonOrder('o1', { apply: true });
    expect(r.status).toBe('skipped-mixed-order');
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(getMaxRefundableMock).not.toHaveBeenCalled();
  });

  it('skips a $0 comp (ticket-only, total 0)', async () => {
    prismaMock.order.findUnique.mockResolvedValue(
      buildOrder({ total: 0, stripePaymentIntentId: null, internalNote: 'full-moon-comp', items: [{ productId: 'prod_ticket', totalPrice: 0 }] }),
    );
    const r = await refundFullMoonOrder('o1', { apply: true });
    expect(r.status).toBe('skipped-comp');
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('skips an order with no payment intent', async () => {
    prismaMock.order.findUnique.mockResolvedValue(buildOrder({ stripePaymentIntentId: null }));
    const r = await refundFullMoonOrder('o1', { apply: true });
    expect(r.status).toBe('skipped-no-payment');
  });

  it('skips an already fully-refunded order (cap ≤ 0) — idempotent re-run', async () => {
    prismaMock.order.findUnique.mockResolvedValue(buildOrder());
    getMaxRefundableMock.mockResolvedValue(0);
    const r = await refundFullMoonOrder('o1', { apply: true });
    expect(r.status).toBe('skipped-already-refunded');
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });
});

describe('refundFullMoonOrder — dry-run vs apply', () => {
  it('dry-run computes the amount but never writes or emails', async () => {
    prismaMock.order.findUnique.mockResolvedValue(buildOrder());
    getMaxRefundableMock.mockResolvedValue(59);
    const r = await refundFullMoonOrder('o1', { apply: false });
    expect(r.status).toBe('would-refund');
    expect(r.amount).toBe(59);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(createRefundMock).not.toHaveBeenCalled();
    expect(sendFullMoonRefundEmailMock).not.toHaveBeenCalled();
  });

  it('apply refunds the full remaining amount, stamps the row, and emails the buyer', async () => {
    prismaMock.order.findUnique.mockResolvedValue(buildOrder());
    getMaxRefundableMock.mockResolvedValue(59);
    stripeMock.refunds.create.mockResolvedValue({ id: 're_1', status: 'succeeded' });
    createRefundMock.mockResolvedValue('refund_row_1');
    sendFullMoonRefundEmailMock.mockResolvedValue('email_1');

    const r = await refundFullMoonOrder('o1', { apply: true });

    expect(r.status).toBe('refunded');
    expect(r.amount).toBe(59);
    expect(r.stripeRefundId).toBe('re_1');
    expect(r.emailSent).toBe(true);

    // Idempotency key is scoped to (order, amountCents).
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_1', amount: 5900 }),
      { idempotencyKey: 'fm-batch-refund-o1-5900' },
    );
    expect(createRefundMock).toHaveBeenCalledWith('o1', 59, expect.any(String));
    expect(prismaMock.refund.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'refund_row_1' } }),
    );
    expect(sendFullMoonRefundEmailMock).toHaveBeenCalledTimes(1);
  });

  it('apply with sendEmail:false refunds but does not email', async () => {
    prismaMock.order.findUnique.mockResolvedValue(buildOrder());
    getMaxRefundableMock.mockResolvedValue(59);
    stripeMock.refunds.create.mockResolvedValue({ id: 're_2', status: 'succeeded' });
    createRefundMock.mockResolvedValue('refund_row_2');

    const r = await refundFullMoonOrder('o1', { apply: true, sendEmail: false });
    expect(r.status).toBe('refunded');
    expect(sendFullMoonRefundEmailMock).not.toHaveBeenCalled();
  });
});
