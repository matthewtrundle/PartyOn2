/**
 * Detector tests — signals 1-5.
 *
 * Each detector has:
 *   (a) generates the rec when conditions are met
 *   (b) returns [] when conditions are not met
 *   (c) populates evidence[] with metric + source link
 *   (d) populates actionPayload with a valid navigate/apiCall
 *
 * The orchestrator handles dedupe (in upsertRecommendations) and suppression
 * (in applySuppression) — those are covered in recommendation-store.test.ts
 * and recommendations.test.ts respectively, not duplicated per detector.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  receivingInvoice: { findMany: vi.fn() },
  orderItemPickState: { findMany: vi.fn() },
  inventoryMovement: { findFirst: vi.fn() },
  order: { findUnique: vi.fn() },
  $queryRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import {
  detectReceivingLag,
  detectPickInventoryLag,
  detectRepeatedShorts,
  detectNegativeAvailable,
  detectVelocityAnomaly,
} from '../detectors';

beforeEach(() => {
  for (const m of Object.values(prismaMock)) {
    if (typeof m === 'function') (m as ReturnType<typeof vi.fn>).mockReset();
    else for (const fn of Object.values(m)) (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

// ─── Signal #1: receiving-lag ──────────────────────────────────────────

describe('detectReceivingLag', () => {
  const now = new Date('2026-05-13T10:00:00Z');

  it('flags invoices PENDING_REVIEW for ≥24h', async () => {
    prismaMock.receivingInvoice.findMany.mockResolvedValue([
      { id: 'inv_1', distributorName: 'RNDC', invoiceNumber: 'A123', createdAt: new Date('2026-05-12T08:00:00Z') },
    ]);
    const recs = await detectReceivingLag(now);
    expect(recs).toHaveLength(1);
    expect(recs[0].signalKind).toBe('receiving-lag');
    expect(recs[0].severity).toBe('high');
    expect(recs[0].targetEntityId).toBe('inv_1');
  });

  it('returns [] when no invoices match', async () => {
    prismaMock.receivingInvoice.findMany.mockResolvedValue([]);
    expect(await detectReceivingLag(now)).toEqual([]);
  });

  it('populates evidence with hours_pending + source link', async () => {
    prismaMock.receivingInvoice.findMany.mockResolvedValue([
      { id: 'inv_2', distributorName: null, invoiceNumber: null, createdAt: new Date('2026-05-12T00:00:00Z') },
    ]);
    const [rec] = await detectReceivingLag(now);
    expect(rec.evidence[0].metricName).toBe('hours_pending');
    expect(rec.evidence[0].metricValue).toBe(34);
    expect(rec.evidence[0].sourceLinks?.[0].href).toBe('/ops/inventory/receiving/inv_2');
  });

  it('builds a navigate actionPayload pointing to the invoice', async () => {
    prismaMock.receivingInvoice.findMany.mockResolvedValue([
      { id: 'inv_3', distributorName: 'Spec', invoiceNumber: 'B-9', createdAt: new Date('2026-05-12T00:00:00Z') },
    ]);
    const [rec] = await detectReceivingLag(now);
    expect(rec.actionPayload.kind).toBe('navigate');
    expect(rec.actionPayload.params).toEqual({ href: '/ops/inventory/receiving/inv_3' });
  });
});

// ─── Signal #2: pick-inventory-lag ────────────────────────────────────

describe('detectPickInventoryLag', () => {
  const now = new Date('2026-05-13T10:00:00Z');

  it('flags packed pick states ≥24h old with no matching movement', async () => {
    prismaMock.orderItemPickState.findMany.mockResolvedValue([
      { orderId: 'o1', itemKey: 'k1', shortBy: 0, updatedAt: new Date('2026-05-10T00:00:00Z') },
    ]);
    prismaMock.inventoryMovement.findFirst.mockResolvedValue(null);
    prismaMock.order.findUnique.mockResolvedValue({ orderNumber: 42, customerName: 'Jane', groupOrderV2: null });
    const recs = await detectPickInventoryLag(now);
    expect(recs).toHaveLength(1);
    expect(recs[0].signalKind).toBe('pick-inventory-lag');
    expect(recs[0].targetEntityId).toBe('o1');
  });

  it('skips orders that already have a pack movement', async () => {
    prismaMock.orderItemPickState.findMany.mockResolvedValue([
      { orderId: 'o2', itemKey: 'k', shortBy: 0, updatedAt: new Date('2026-05-10T00:00:00Z') },
    ]);
    prismaMock.inventoryMovement.findFirst.mockResolvedValue({ id: 'mv_1' });
    expect(await detectPickInventoryLag(now)).toEqual([]);
  });

  it('uses manifest name when groupOrderV2 is set', async () => {
    prismaMock.orderItemPickState.findMany.mockResolvedValue([
      { orderId: 'o3', itemKey: 'k', shortBy: 0, updatedAt: new Date('2026-05-10T00:00:00Z') },
    ]);
    prismaMock.inventoryMovement.findFirst.mockResolvedValue(null);
    prismaMock.order.findUnique.mockResolvedValue({
      orderNumber: 99,
      customerName: 'Maria Mercado',
      groupOrderV2: { name: 'Cynthia Cruz Drink Delivery!', hostName: 'Diana', shareCode: 'X' },
    });
    const [rec] = await detectPickInventoryLag(now);
    expect(rec.title).toContain('Cynthia Cruz');
    expect(rec.title).toContain('paid by Maria Mercado');
  });

  it('uses apiCall actionPayload for reconciliation', async () => {
    prismaMock.orderItemPickState.findMany.mockResolvedValue([
      { orderId: 'o4', itemKey: 'k', shortBy: 0, updatedAt: new Date('2026-05-10T00:00:00Z') },
    ]);
    prismaMock.inventoryMovement.findFirst.mockResolvedValue(null);
    prismaMock.order.findUnique.mockResolvedValue({ orderNumber: 1, customerName: 'X', groupOrderV2: null });
    const [rec] = await detectPickInventoryLag(now);
    expect(rec.actionPayload.kind).toBe('apiCall');
    expect((rec.actionPayload.params as { body: { orderId: string } }).body.orderId).toBe('o4');
  });
});

// ─── Signal #3: repeated-shorts ───────────────────────────────────────

describe('detectRepeatedShorts', () => {
  it('flags variants short on ≥2 orders in last 7d', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'Modelo 12pk', orders: BigInt(3), total_short: BigInt(8) },
    ]);
    const recs = await detectRepeatedShorts();
    expect(recs).toHaveLength(1);
    expect(recs[0].targetEntityType).toBe('productVariant');
    expect(recs[0].targetEntityId).toBe('v1');
  });

  it('returns [] when no shorts qualify', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    expect(await detectRepeatedShorts()).toEqual([]);
  });

  it('populates evidence with orders_shorted_7d + total_units_short', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'X', orders: BigInt(2), total_short: BigInt(4) },
    ]);
    const [rec] = await detectRepeatedShorts();
    const names = rec.evidence.map((e) => e.metricName);
    expect(names).toContain('orders_shorted_7d');
    expect(names).toContain('total_units_short');
  });

  it('builds a navigate action prefilled for the count modal', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v9', title: 'X', orders: BigInt(2), total_short: BigInt(4) },
    ]);
    const [rec] = await detectRepeatedShorts();
    expect(rec.actionPayload.kind).toBe('navigate');
    expect((rec.actionPayload.params as { href: string }).href).toContain('openNoteFor=v9');
  });
});

// ─── Signal #4: negative-available ────────────────────────────────────

describe('detectNegativeAvailable', () => {
  it('flags variants where committed > on-hand', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: 'v1', title: '750ml', product_title: 'Tito', inventory_quantity: 5, committed_quantity: 12 },
    ]);
    const recs = await detectNegativeAvailable();
    expect(recs).toHaveLength(1);
    // shortfall = 7 → urgent
    expect(recs[0].severity).toBe('urgent');
  });

  it('tiers severity by shortfall magnitude (1 → normal, 3 → high, 10 → urgent)', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: 'v_small', title: 'Default', product_title: 'Jameson 750ml', inventory_quantity: 0, committed_quantity: 1 },
      { id: 'v_mid', title: 'Default', product_title: 'Modelo 12pk', inventory_quantity: 2, committed_quantity: 5 },
      { id: 'v_big', title: 'Default', product_title: 'Dripping Springs Vodka', inventory_quantity: 0, committed_quantity: 10 },
    ]);
    const recs = await detectNegativeAvailable();
    expect(recs).toHaveLength(3);
    expect(recs[0].severity).toBe('normal');
    expect(recs[1].severity).toBe('high');
    expect(recs[2].severity).toBe('urgent');
  });

  it('boundary: shortfall=2 is high, shortfall=6 is urgent', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: 'v_2', title: 'X', product_title: 'Y', inventory_quantity: 0, committed_quantity: 2 },
      { id: 'v_6', title: 'X', product_title: 'Y', inventory_quantity: 0, committed_quantity: 6 },
    ]);
    const recs = await detectNegativeAvailable();
    expect(recs[0].severity).toBe('high');
    expect(recs[1].severity).toBe('urgent');
  });

  it('returns [] when no variants in deficit', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    expect(await detectNegativeAvailable()).toEqual([]);
  });

  it('reports the deficit in title + evidence', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: 'v1', title: 'Default', product_title: 'X', inventory_quantity: 0, committed_quantity: 7 },
    ]);
    const [rec] = await detectNegativeAvailable();
    expect(rec.title).toContain('7');
    const deficit = rec.evidence.find((e) => e.metricName === 'deficit');
    expect(deficit?.metricValue).toBe(7);
  });

  it('builds a navigate action pointing to count modal', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: 'v2', title: 'X', product_title: 'Y', inventory_quantity: 1, committed_quantity: 3 },
    ]);
    const [rec] = await detectNegativeAvailable();
    expect(rec.actionPayload.kind).toBe('navigate');
    expect((rec.actionPayload.params as { href: string }).href).toContain('openNoteFor=v2');
  });
});

// ─── Signal #5: velocity-anomaly ──────────────────────────────────────

describe('detectVelocityAnomaly', () => {
  it('flags variants that sold ≥4 in 30d then 0 in last 14d', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'X', product_title: 'Y', units_30d: BigInt(12), units_last_14d: BigInt(0) },
    ]);
    const recs = await detectVelocityAnomaly();
    expect(recs).toHaveLength(1);
    expect(recs[0].signalKind).toBe('velocity-anomaly');
    expect(recs[0].severity).toBe('normal');
  });

  it('returns [] when SQL returns nothing', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    expect(await detectVelocityAnomaly()).toEqual([]);
  });

  it('evidence carries units_30d AND units_last_14d', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v1', title: 'X', product_title: 'Y', units_30d: BigInt(10), units_last_14d: BigInt(0) },
    ]);
    const [rec] = await detectVelocityAnomaly();
    const names = rec.evidence.map((e) => e.metricName);
    expect(names).toContain('units_30d');
    expect(names).toContain('units_last_14d');
  });

  it('navigate action opens variant page', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { variant_id: 'v3', title: 'X', product_title: 'Y', units_30d: BigInt(10), units_last_14d: BigInt(0) },
    ]);
    const [rec] = await detectVelocityAnomaly();
    expect((rec.actionPayload.params as { href: string }).href).toContain('variantId=v3');
  });
});
