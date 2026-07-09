/**
 * Tests for getFullMoonRoster — the load-bearing guarantee is that MONEY is
 * scoped to ticket line items and $0 comps are excluded from "$ collected"
 * while still counting toward the headcount.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  product: { findUnique: vi.fn() },
  order: { findMany: vi.fn() },
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import { getFullMoonRoster } from '../roster';

const D = new Date('2026-07-08T12:00:00Z');

function order(
  overrides: Partial<{
    id: string;
    orderNumber: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    deliveryPhone: string;
    stripePaymentIntentId: string | null;
    internalNote: string | null;
    financialStatus: string;
    items: Array<{ quantity: number; totalPrice: number }>;
  }>,
) {
  return {
    id: 'o1',
    orderNumber: 1,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    customerPhone: '5125551234',
    deliveryPhone: 'n/a',
    createdAt: D,
    stripePaymentIntentId: 'pi_1',
    internalNote: null,
    financialStatus: 'PAID',
    items: [{ quantity: 1, totalPrice: 59 }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getFullMoonRoster', () => {
  it('returns an empty roster when the product does not exist', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);
    const r = await getFullMoonRoster();
    expect(r.productFound).toBe(false);
    expect(r.orders).toEqual([]);
    expect(r.totals.ticketsSold).toBe(0);
    expect(r.totals.collected).toBe(0);
  });

  it('counts comps in headcount but excludes them from money; money is ticket-scoped', async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: 'prod_ticket' });
    prismaMock.order.findMany.mockResolvedValue([
      order({ id: 'comp', orderNumber: 390, customerName: 'Allan', internalNote: 'full-moon-comp', stripePaymentIntentId: null, items: [{ quantity: 1, totalPrice: 0 }] }),
      order({ id: 'a', orderNumber: 401, stripePaymentIntentId: 'pi_a', items: [{ quantity: 2, totalPrice: 118 }] }),
      order({ id: 'b', orderNumber: 402, stripePaymentIntentId: 'pi_b', items: [{ quantity: 1, totalPrice: 59 }] }),
    ]);

    const r = await getFullMoonRoster();

    expect(r.productFound).toBe(true);
    expect(r.totals.ticketsSold).toBe(4); // 1 comp + 2 + 1
    expect(r.totals.payingOrders).toBe(2);
    expect(r.totals.compOrders).toBe(1);
    expect(r.totals.collected).toBe(177); // 118 + 59, comp's $0 excluded
    expect(r.totals.advertisedCapacity).toBe(50);
    expect(r.totals.hardCap).toBe(60);
    expect(r.totals.overMinimum).toBe(false);

    const comp = r.orders.find((o) => o.orderId === 'comp')!;
    expect(comp.isComp).toBe(true);
    expect(comp.amount).toBe(0);
    const a = r.orders.find((o) => o.orderId === 'a')!;
    expect(a.isComp).toBe(false);
    expect(a.amount).toBe(118);
    expect(a.quantity).toBe(2);
  });

  it('marks overMinimum once the headcount reaches the minimum (32)', async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: 'prod_ticket' });
    prismaMock.order.findMany.mockResolvedValue([
      order({ id: 'big', items: [{ quantity: 32, totalPrice: 1888 }] }),
    ]);
    const r = await getFullMoonRoster();
    expect(r.totals.ticketsSold).toBe(32);
    expect(r.totals.overMinimum).toBe(true);
  });
});
