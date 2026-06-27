/**
 * charge.refunded webhook idempotency.
 *
 * The webhook fires ~0.5s after the admin cancel/refund routes have ALREADY
 * written (and stamped) a Refund row for the same Stripe refund, and Stripe can
 * re-deliver it at any time. It must reconcile against Stripe's actual refunds,
 * not blindly create a row. Core regression: an admin cancel-with-refund
 * followed by charge.refunded leaves exactly ONE Refund row.
 *
 * order-service (createRefund / recomputeOrderFinancialStatus) is left REAL so
 * the financial-status recompute is exercised against the same in-memory store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

// ---- shared in-memory store (mock-prefixed so vi.mock factories may close over it) ----
interface MockRefund {
  id: string;
  orderId: string;
  stripeRefundId: string | null;
  amount: number;
  reason: string | null;
  status: string;
  processedBy: string | null;
  processedAt: Date | null;
  createdAt: Date;
}
interface MockOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  total: number;
  stripePaymentIntentId: string | null;
  financialStatus: string;
}
const mockDb: { refunds: MockRefund[]; order: MockOrder; seq: number } = {
  refunds: [],
  order: freshOrder(),
  seq: 0,
};

function freshOrder(): MockOrder {
  return {
    id: 'order-1',
    orderNumber: 365,
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    total: 150,
    stripePaymentIntentId: 'pi_1',
    financialStatus: 'PAID',
  };
}

function amtEquals(a: number, b: unknown): boolean {
  return Math.abs(a - Number(b)) < 0.005;
}

function uniqueViolation(): Error {
  const err = new Error('Unique constraint failed') as Error & { code: string };
  err.code = 'P2002';
  return err;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@/lib/database/client', () => ({
  prisma: {
    order: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where?.stripePaymentIntentId && where.stripePaymentIntentId !== mockDb.order.stripePaymentIntentId) return null;
        return mockDb.order;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where?.id && where.id !== mockDb.order.id) return null;
        return mockDb.order;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        if (where?.id === mockDb.order.id) Object.assign(mockDb.order, data);
        return mockDb.order;
      }),
    },
    refund: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where?.stripeRefundId !== undefined) {
          return mockDb.refunds.find((r) => r.stripeRefundId === where.stripeRefundId) ?? null;
        }
        if (where?.id !== undefined) {
          return mockDb.refunds.find((r) => r.id === where.id) ?? null;
        }
        return null;
      }),
      findFirst: vi.fn(async ({ where, orderBy }: any) => {
        let rows = mockDb.refunds.filter((r) => {
          if (where?.orderId !== undefined && r.orderId !== where.orderId) return false;
          if (where?.stripeRefundId === null && r.stripeRefundId !== null) return false;
          if (where?.amount !== undefined && !amtEquals(Number(where.amount), r.amount)) return false;
          return true;
        });
        if (orderBy?.createdAt === 'desc') {
          rows = rows.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return rows[0] ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        if (data.stripeRefundId && mockDb.refunds.some((r) => r.stripeRefundId === data.stripeRefundId)) {
          throw uniqueViolation();
        }
        const row: MockRefund = {
          id: `rf_${++mockDb.seq}`,
          orderId: data.orderId,
          stripeRefundId: data.stripeRefundId ?? null,
          amount: Number(data.amount),
          reason: data.reason ?? null,
          status: data.status ?? 'PENDING',
          processedBy: data.processedBy ?? null,
          processedAt: data.processedAt ?? null,
          createdAt: new Date(Date.now() + mockDb.seq),
        };
        mockDb.refunds.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = mockDb.refunds.find((r) => r.id === where.id);
        if (!row) throw new Error('Refund not found');
        if (data.stripeRefundId && mockDb.refunds.some((r) => r.id !== row.id && r.stripeRefundId === data.stripeRefundId)) {
          throw uniqueViolation();
        }
        Object.assign(row, data, { amount: data.amount !== undefined ? Number(data.amount) : row.amount });
        return row;
      }),
      aggregate: vi.fn(async ({ where }: any) => {
        const sum = mockDb.refunds
          .filter((r) => r.orderId === where.orderId)
          .reduce((s, r) => s + r.amount, 0);
        return { _sum: { amount: sum } };
      }),
    },
  },
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

const mockRefundsList = vi.fn();
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    refunds: { list: (...a: unknown[]) => mockRefundsList(...a) },
    paymentIntents: { retrieve: vi.fn(async () => ({ amount_received: 15000 })) }, // $150 captured
  },
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
}));

const mockSendRefundEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendRefundProcessedEmail: (...a: unknown[]) => mockSendRefundEmail(...a),
}));

const mockVoidCommission = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/affiliates/commission-engine', () => ({
  voidCommissionForOrder: (...a: unknown[]) => mockVoidCommission(...a),
}));

// Heavy / side-effectful imports pulled in by webhooks.ts but unused on the
// charge.refunded path — stub so importing the module stays cheap and isolated.
vi.mock('@/lib/calendar/google-calendar', () => ({
  createOrderCalendarEvent: vi.fn().mockResolvedValue(undefined),
}));

/** Build the async-iterable that stripe.refunds.list() returns. */
function listOf(refunds: Array<{ id: string; amount: number; status: string }>): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const r of refunds) yield r;
    },
  };
}

function chargeRefundedEvent(): Stripe.Event {
  return {
    type: 'charge.refunded',
    data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount_refunded: 15000 } },
  } as unknown as Stripe.Event;
}

/** Seed a Refund row exactly as the admin cancel route leaves it. */
function seedAdminRefund(overrides: Partial<MockRefund> = {}): void {
  mockDb.refunds.push({
    id: `rf_${++mockDb.seq}`,
    orderId: 'order-1',
    stripeRefundId: 're_1',
    amount: 150,
    reason: 'Order cancelled',
    status: 'SUCCEEDED',
    processedBy: 'admin',
    processedAt: new Date(),
    createdAt: new Date(Date.now() + mockDb.seq),
    ...overrides,
  });
}

describe('charge.refunded webhook — idempotent reconciliation', () => {
  let processWebhookEvent: (event: Stripe.Event) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSendRefundEmail.mockResolvedValue(undefined);
    mockVoidCommission.mockResolvedValue(undefined);
    mockDb.refunds = [];
    mockDb.order = freshOrder();
    mockDb.seq = 0;
    ({ processWebhookEvent } = await import('@/lib/stripe/webhooks'));
  });

  it('REGRESSION: admin cancel-with-refund then charge.refunded leaves exactly ONE row', async () => {
    seedAdminRefund(); // route already created + stamped re_1
    mockRefundsList.mockReturnValue(listOf([{ id: 're_1', amount: 15000, status: 'succeeded' }]));

    await processWebhookEvent(chargeRefundedEvent());

    expect(mockDb.refunds).toHaveLength(1);
    const [row] = mockDb.refunds;
    expect(row.stripeRefundId).toBe('re_1');
    expect(row.processedBy).toBe('admin'); // untouched — webhook did not overwrite
    // No duplicate customer email: the route already emailed.
    expect(mockSendRefundEmail).not.toHaveBeenCalled();
    expect(mockDb.order.financialStatus).toBe('REFUNDED');
  });

  it('race: route created the row but webhook beat the stamping → webhook stamps, ONE row', async () => {
    seedAdminRefund({ stripeRefundId: null, processedAt: null }); // unstamped
    mockRefundsList.mockReturnValue(listOf([{ id: 're_1', amount: 15000, status: 'succeeded' }]));

    await processWebhookEvent(chargeRefundedEvent());

    expect(mockDb.refunds).toHaveLength(1);
    const [row] = mockDb.refunds;
    expect(row.stripeRefundId).toBe('re_1'); // claimed
    expect(row.processedBy).toBe('admin'); // route's row, just stamped — not a new dashboard row
    expect(mockSendRefundEmail).not.toHaveBeenCalled();
  });

  it('Stripe-dashboard refund (no prior row) → creates ONE row and emails the customer', async () => {
    mockRefundsList.mockReturnValue(listOf([{ id: 're_dash', amount: 15000, status: 'succeeded' }]));

    await processWebhookEvent(chargeRefundedEvent());

    expect(mockDb.refunds).toHaveLength(1);
    const [row] = mockDb.refunds;
    expect(row.stripeRefundId).toBe('re_dash');
    expect(row.processedBy).toBe('stripe');
    expect(mockSendRefundEmail).toHaveBeenCalledTimes(1);
    expect(mockSendRefundEmail.mock.calls[0][3]).toBeCloseTo(150); // amount
    expect(mockVoidCommission).toHaveBeenCalledWith('order-1', 'refund');
  });

  it('re-delivery is idempotent → still ONE row, customer emailed only once', async () => {
    mockRefundsList.mockReturnValue(listOf([{ id: 're_dash', amount: 15000, status: 'succeeded' }]));

    await processWebhookEvent(chargeRefundedEvent());
    await processWebhookEvent(chargeRefundedEvent());

    expect(mockDb.refunds).toHaveLength(1);
    expect(mockSendRefundEmail).toHaveBeenCalledTimes(1);
  });

  it('two same-amount refunds with two unstamped rows → each row claimed once, no third row', async () => {
    // Two distinct $50 Stripe refunds; two unstamped $50 DB rows. Each loop
    // iteration stamps one row, which leaves the unstamped pool, so the next
    // iteration claims the OTHER row — never the same one twice, never a 3rd row.
    seedAdminRefund({ stripeRefundId: null, processedAt: null, amount: 50 });
    seedAdminRefund({ stripeRefundId: null, processedAt: null, amount: 50 });
    mockRefundsList.mockReturnValue(
      listOf([
        { id: 're_A', amount: 5000, status: 'succeeded' },
        { id: 're_B', amount: 5000, status: 'succeeded' },
      ])
    );

    await processWebhookEvent(chargeRefundedEvent());

    expect(mockDb.refunds).toHaveLength(2);
    const stampedIds = mockDb.refunds.map((r) => r.stripeRefundId).sort();
    expect(stampedIds).toEqual(['re_A', 're_B']); // 1:1, both claimed, distinct
    expect(mockSendRefundEmail).not.toHaveBeenCalled(); // both matched existing rows
  });

  it('ignores failed/canceled refunds — no row, no email', async () => {
    mockRefundsList.mockReturnValue(
      listOf([
        { id: 're_fail', amount: 15000, status: 'failed' },
        { id: 're_cxl', amount: 15000, status: 'canceled' },
      ])
    );

    await processWebhookEvent(chargeRefundedEvent());

    expect(mockDb.refunds).toHaveLength(0);
    expect(mockSendRefundEmail).not.toHaveBeenCalled();
  });

  it('partial admin refund + later dashboard refund → two distinct rows, no duplicates', async () => {
    // Admin already refunded $50 (stamped re_1); Stripe now also shows a $25
    // dashboard refund (re_2). amount_refunded would be cumulative ($75).
    seedAdminRefund({ stripeRefundId: 're_1', amount: 50, reason: 'Order amendment refund' });
    mockRefundsList.mockReturnValue(
      listOf([
        { id: 're_1', amount: 5000, status: 'succeeded' },
        { id: 're_2', amount: 2500, status: 'succeeded' },
      ])
    );

    await processWebhookEvent(chargeRefundedEvent());

    expect(mockDb.refunds).toHaveLength(2);
    const byId = Object.fromEntries(mockDb.refunds.map((r) => [r.stripeRefundId, r]));
    expect(byId['re_1'].processedBy).toBe('admin');
    expect(byId['re_2'].processedBy).toBe('stripe');
    expect(byId['re_2'].amount).toBeCloseTo(25);
    // Only the newly-recorded dashboard refund is emailed.
    expect(mockSendRefundEmail).toHaveBeenCalledTimes(1);
    expect(mockSendRefundEmail.mock.calls[0][3]).toBeCloseTo(25);
    expect(mockDb.order.financialStatus).toBe('PARTIALLY_REFUNDED'); // 75 of 150
  });
});
