/**
 * Detector tests — signals 6-10. Same 4-case shape as batch A.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  inventoryNote: { findMany: vi.fn() },
  inventoryMovement: { findFirst: vi.fn() },
  $queryRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import {
  detectAiNoteBacklog,
  detectVariantMismapping,
  detectCostCoverageGap,
  detectCycleCountOverdue,
  detectPreFulfillmentShortage,
} from '../detectors';

beforeEach(() => {
  for (const m of Object.values(prismaMock)) {
    if (typeof m === 'function') (m as ReturnType<typeof vi.fn>).mockReset();
    else for (const fn of Object.values(m)) (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

// ─── Signal #6: ai-note-backlog ───────────────────────────────────────

describe('detectAiNoteBacklog', () => {
  const now = new Date('2026-05-13T10:00:00Z');

  it('flags inventory notes pending ≥24h', async () => {
    prismaMock.inventoryNote.findMany.mockResolvedValue([
      { id: 'n1', content: 'Counted 12 Modelos', createdAt: new Date('2026-05-12T00:00:00Z') },
    ]);
    const recs = await detectAiNoteBacklog(now);
    expect(recs).toHaveLength(1);
    expect(recs[0].targetEntityType).toBe('inventoryNote');
    expect(recs[0].targetEntityId).toBe('n1');
  });

  it('returns [] when no pending notes', async () => {
    prismaMock.inventoryNote.findMany.mockResolvedValue([]);
    expect(await detectAiNoteBacklog(now)).toEqual([]);
  });

  it('previews long content (≤70 chars)', async () => {
    const long = 'x'.repeat(200);
    prismaMock.inventoryNote.findMany.mockResolvedValue([
      { id: 'n1', content: long, createdAt: new Date('2026-05-12T00:00:00Z') },
    ]);
    const [rec] = await detectAiNoteBacklog(now);
    expect(rec.title.includes('…')).toBe(true);
  });

  it('navigate action points to /ops/inventory?openNote=…', async () => {
    prismaMock.inventoryNote.findMany.mockResolvedValue([
      { id: 'n2', content: 'short', createdAt: new Date('2026-05-12T00:00:00Z') },
    ]);
    const [rec] = await detectAiNoteBacklog(now);
    expect((rec.actionPayload.params as { href: string }).href).toContain('openNote=n2');
  });
});

// ─── Signal #7: variant-mismapping ────────────────────────────────────

describe('detectVariantMismapping', () => {
  it('flags variants with committed but no sales when sibling sells', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        product_id: 'p1', product_title: 'Tito',
        suspect_variant_id: 'v_susp', suspect_title: '750ml', suspect_committed: 8,
        sibling_variant_id: 'v_sib', sibling_title: '1L', sibling_units_30d: BigInt(20),
      },
    ]);
    const recs = await detectVariantMismapping();
    expect(recs).toHaveLength(1);
    expect(recs[0].targetEntityId).toBe('v_susp');
  });

  it('returns [] when no candidates', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    expect(await detectVariantMismapping()).toEqual([]);
  });

  it('dedupes when multiple siblings reference the same suspect', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { product_id: 'p', product_title: 'X', suspect_variant_id: 'A', suspect_title: 'a', suspect_committed: 5, sibling_variant_id: 'B', sibling_title: 'b', sibling_units_30d: BigInt(10) },
      { product_id: 'p', product_title: 'X', suspect_variant_id: 'A', suspect_title: 'a', suspect_committed: 5, sibling_variant_id: 'C', sibling_title: 'c', sibling_units_30d: BigInt(7) },
    ]);
    const recs = await detectVariantMismapping();
    expect(recs).toHaveLength(1);
  });

  it('action links to both suspect + sibling for comparison', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { product_id: 'p', product_title: 'X', suspect_variant_id: 'A', suspect_title: 'a', suspect_committed: 5, sibling_variant_id: 'B', sibling_title: 'b', sibling_units_30d: BigInt(10) },
    ]);
    const [rec] = await detectVariantMismapping();
    expect((rec.actionPayload.params as { href: string }).href).toContain('sibling=B');
  });
});

// ─── Signal #8: cost-coverage-gap ─────────────────────────────────────

describe('detectCostCoverageGap', () => {
  it('flags high-velocity variants with no cost', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'X', product_title: 'Y', units_30d: BigInt(50) },
    ]);
    const recs = await detectCostCoverageGap();
    expect(recs).toHaveLength(1);
    expect(recs[0].signalKind).toBe('cost-coverage-gap');
  });

  it('returns [] when no qualifying variants', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    expect(await detectCostCoverageGap()).toEqual([]);
  });

  it('evidence carries units_30d', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'X', product_title: 'Y', units_30d: BigInt(50) },
    ]);
    const [rec] = await detectCostCoverageGap();
    const units = rec.evidence.find((e) => e.metricName === 'units_30d');
    expect(units?.metricValue).toBe(50);
  });

  it('navigate action opens variant with editCost flag', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v8', title: 'X', product_title: 'Y', units_30d: BigInt(50) },
    ]);
    const [rec] = await detectCostCoverageGap();
    expect((rec.actionPayload.params as { href: string }).href).toContain('editCost=1');
  });

  it('caps output at the top 15 variants in velocity order', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      variant_id: `v${i}`,
      title: `T${i}`,
      product_title: `P${i}`,
      // 30, 29, 28, ... 1 — SQL already sorted DESC
      units_30d: BigInt(30 - i),
    }));
    prismaMock.$queryRawUnsafe.mockResolvedValue(rows);
    const recs = await detectCostCoverageGap();
    expect(recs).toHaveLength(15);
    // first rec is the highest-velocity variant, last is the 15th
    expect(recs[0].targetEntityId).toBe('v0');
    expect(recs[14].targetEntityId).toBe('v14');
  });
});

// ─── Signal #9: cycle-count-overdue ───────────────────────────────────

describe('detectCycleCountOverdue', () => {
  it('flags top-N variants without a recent count', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'X', product_title: 'Y', units_14d: BigInt(40) },
    ]);
    prismaMock.inventoryMovement.findFirst.mockResolvedValue(null);
    const recs = await detectCycleCountOverdue();
    expect(recs).toHaveLength(1);
    expect(recs[0].signalKind).toBe('cycle-count-overdue');
  });

  it('skips variants already counted in last 7d', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'X', product_title: 'Y', units_14d: BigInt(40) },
    ]);
    prismaMock.inventoryMovement.findFirst.mockResolvedValue({ id: 'mv_1' });
    expect(await detectCycleCountOverdue()).toEqual([]);
  });

  it('evidence carries units_14d', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'X', product_title: 'Y', units_14d: BigInt(25) },
    ]);
    prismaMock.inventoryMovement.findFirst.mockResolvedValue(null);
    const [rec] = await detectCycleCountOverdue();
    expect(rec.evidence.find((e) => e.metricName === 'units_14d')?.metricValue).toBe(25);
  });

  it('navigate action prefills count modal', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v9', title: 'X', product_title: 'Y', units_14d: BigInt(40) },
    ]);
    prismaMock.inventoryMovement.findFirst.mockResolvedValue(null);
    const [rec] = await detectCycleCountOverdue();
    expect((rec.actionPayload.params as { href: string }).href).toContain('openNoteFor=v9');
  });
});

// ─── Pre-fulfillment shortage ─────────────────────────────────────────

describe('detectPreFulfillmentShortage', () => {
  it('flags any variant with available<0 inside paid 14d window', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        variant_id: 'v1', title: 'X', product_title: 'Y',
        demand: BigInt(20), available: -5,
        earliest: new Date('2026-05-15T12:00:00Z'),
      },
    ]);
    const recs = await detectPreFulfillmentShortage();
    expect(recs).toHaveLength(1);
    expect(recs[0].severity).toBe('urgent');
  });

  it('returns [] when nothing is short', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    expect(await detectPreFulfillmentShortage()).toEqual([]);
  });

  it('reports earliest_delivery + paid_demand_14d + available', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        variant_id: 'v1', title: 'X', product_title: 'Y',
        demand: BigInt(30), available: -10,
        earliest: new Date('2026-05-15T12:00:00Z'),
      },
    ]);
    const [rec] = await detectPreFulfillmentShortage();
    const names = rec.evidence.map((e) => e.metricName);
    expect(names).toContain('paid_demand_14d');
    expect(names).toContain('available');
    expect(names).toContain('earliest_delivery');
  });

  it('navigate action deep-links to purchase plan filtered to variant', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        variant_id: 'v9', title: 'X', product_title: 'Y',
        demand: BigInt(30), available: -10,
        earliest: new Date('2026-05-15T12:00:00Z'),
      },
    ]);
    const [rec] = await detectPreFulfillmentShortage();
    expect((rec.actionPayload.params as { href: string }).href).toContain('variantId=v9');
    expect((rec.actionPayload.params as { href: string }).href).toContain('plan=1');
  });
});
