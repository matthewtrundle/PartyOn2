import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  inventoryMovement: { findMany: vi.fn(), count: vi.fn() },
  orderItem: { findMany: vi.fn() },
  productVariant: { count: vi.fn() },
  receivingInvoice: { findMany: vi.fn() },
  inventoryNote: { count: vi.fn() },
  $queryRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import {
  computeCostCoveragePct,
  computeCycleCountsCompletedLast7d,
  computeInventoryAccuracyPct,
  computePaidOrders14dShortageCount,
  computeReceivingLagPercentiles,
} from '../snapshot';

beforeEach(() => {
  for (const m of Object.values(prismaMock)) {
    if (typeof m === 'function') (m as ReturnType<typeof vi.fn>).mockReset();
    else for (const fn of Object.values(m)) (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

describe('computeInventoryAccuracyPct', () => {
  it('returns null when no counts exist (divide-by-zero guard, not 100)', async () => {
    prismaMock.inventoryMovement.findMany.mockResolvedValue([]);
    const result = await computeInventoryAccuracyPct();
    expect(result).toBeNull();
    expect(result).not.toBe(100);
  });

  it('returns 100 when all counts confirmed (|delta|≤50)', async () => {
    prismaMock.inventoryMovement.findMany.mockResolvedValue([
      { quantity: 0 },
      { quantity: 10 },
      { quantity: -42 },
    ]);
    expect(await computeInventoryAccuracyPct()).toBe(100);
  });

  it('mixes small and large deltas correctly', async () => {
    prismaMock.inventoryMovement.findMany.mockResolvedValue([
      { quantity: 0 }, // within
      { quantity: 200 }, // outside
      { quantity: -300 }, // outside
      { quantity: 5 }, // within
    ]);
    expect(await computeInventoryAccuracyPct()).toBe(50);
  });
});

describe('computeCostCoveragePct', () => {
  it('returns 0 when nothing sold', async () => {
    prismaMock.orderItem.findMany.mockResolvedValue([]);
    expect(await computeCostCoveragePct()).toBe(0);
  });

  it('returns coverage% when some variants have cost set', async () => {
    prismaMock.orderItem.findMany.mockResolvedValue([
      { variantId: 'a' },
      { variantId: 'b' },
      { variantId: 'c' },
      { variantId: 'd' },
    ]);
    prismaMock.productVariant.count.mockResolvedValue(1);
    expect(await computeCostCoveragePct()).toBe(25);
  });
});

describe('computeReceivingLagPercentiles', () => {
  it('returns null/null when <2 samples', async () => {
    prismaMock.receivingInvoice.findMany.mockResolvedValue([
      { createdAt: new Date('2026-01-01T00:00:00Z'), appliedAt: new Date('2026-01-01T05:00:00Z') },
    ]);
    expect(await computeReceivingLagPercentiles()).toEqual({ p50: null, p90: null });
  });

  it('computes nearest-rank percentiles in hours', async () => {
    const base = new Date('2026-01-01T00:00:00Z').getTime();
    const samples = [1, 2, 3, 4, 100].map((h) => ({
      createdAt: new Date(base),
      appliedAt: new Date(base + h * 3600 * 1000),
    }));
    prismaMock.receivingInvoice.findMany.mockResolvedValue(samples);
    const { p50, p90 } = await computeReceivingLagPercentiles();
    expect(p50).toBe(3);
    expect(p90).toBe(100);
  });
});

describe('computePaidOrders14dShortageCount', () => {
  it('returns the raw SQL count', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ count: BigInt(7) }]);
    expect(await computePaidOrders14dShortageCount()).toBe(7);
  });

  it('handles empty result rows', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    expect(await computePaidOrders14dShortageCount()).toBe(0);
  });
});

describe('computeCycleCountsCompletedLast7d', () => {
  it('sums processed notes + count movements', async () => {
    prismaMock.inventoryNote.count.mockResolvedValue(3);
    prismaMock.inventoryMovement.count.mockResolvedValue(5);
    expect(await computeCycleCountsCompletedLast7d()).toBe(8);
  });
});
