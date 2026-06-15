/**
 * Charge snapshot tests — the invariant "OrderItems must equal the Stripe-charged product lines".
 * Covers the pure mapper (snapshot == charge), the COGS-bearing OrderItem builder, and the guard
 * that hard-fails when items drift from the charge (the two-snapshot race).
 */

import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  buildChargedLineItems,
  chargedLineItemToStripe,
  chargedProductsTotalCents,
  snapshotToOrderItemCreates,
  assertOrderItemsMatchCharge,
  parseChargedLineItems,
  ChargeReconciliationError,
  type ChargedLineItem,
} from '@/lib/stripe/charge-snapshot';

// A fake transaction client whose productVariant.findUnique returns a fixed COGS (or null).
function fakeTx(costPerUnit: number | null): Parameters<typeof snapshotToOrderItemCreates>[0] {
  return {
    productVariant: {
      findUnique: vi.fn().mockResolvedValue({
        costPerUnit: costPerUnit === null ? null : new Prisma.Decimal(costPerUnit),
      }),
    },
  } as unknown as Parameters<typeof snapshotToOrderItemCreates>[0];
}

// Mixed input: a Prisma.Decimal price with a sku, and a plain-number price with no variant title.
const inputItems = [
  { productId: 'p1', variantId: 'v1', title: 'Beer', variantTitle: '12pk', sku: 'B12', price: new Prisma.Decimal(22.99), quantity: 2 },
  { productId: 'p2', variantId: 'v2', title: 'Wine', variantTitle: null, price: 14.5, quantity: 1 },
];

describe('buildChargedLineItems', () => {
  it('maps prices to cents and normalizes optional fields', () => {
    expect(buildChargedLineItems(inputItems)).toEqual([
      { productId: 'p1', variantId: 'v1', title: 'Beer', variantTitle: '12pk', sku: 'B12', unitPriceCents: 2299, quantity: 2 },
      { productId: 'p2', variantId: 'v2', title: 'Wine', variantTitle: null, sku: null, unitPriceCents: 1450, quantity: 1 },
    ]);
  });
});

describe('chargedLineItemToStripe — the snapshot IS what is charged', () => {
  it('produces Stripe line items whose unit_amount equals the snapshot cents', () => {
    const snap = buildChargedLineItems(inputItems);
    const lines = snap.map(chargedLineItemToStripe);

    expect(lines[0].price_data?.unit_amount).toBe(2299);
    expect(lines[0].quantity).toBe(2);
    expect(lines[0].price_data?.product_data?.metadata).toMatchObject({ productId: 'p1', variantId: 'v1', sku: 'B12' });

    // The total priced into Stripe equals chargedProductsTotalCents of the persisted snapshot.
    const stripeTotal = lines.reduce((s, li) => s + li.price_data!.unit_amount! * (li.quantity ?? 1), 0);
    expect(stripeTotal).toBe(chargedProductsTotalCents(snap));
  });

  it('omits sku metadata when absent and drops a "Default Title" description', () => {
    const [li] = buildChargedLineItems([
      { productId: 'p3', variantId: 'v3', title: 'X', variantTitle: 'Default Title', price: 10, quantity: 1 },
    ]).map(chargedLineItemToStripe);
    expect(li.price_data?.product_data?.description).toBeUndefined();
    expect(li.price_data?.product_data?.metadata).not.toHaveProperty('sku');
  });
});

describe('chargedProductsTotalCents', () => {
  it('sums unitPriceCents * quantity (products only)', () => {
    expect(chargedProductsTotalCents(buildChargedLineItems(inputItems))).toBe(2299 * 2 + 1450);
  });
});

describe('snapshotToOrderItemCreates', () => {
  it('builds OrderItem payloads with COGS from snapshotItemCost', async () => {
    const creates = await snapshotToOrderItemCreates(fakeTx(5), buildChargedLineItems(inputItems));
    expect(creates).toHaveLength(2);
    expect(Number(creates[0].price)).toBeCloseTo(22.99);
    expect(Number(creates[0].totalPrice)).toBeCloseTo(45.98);
    expect(Number(creates[0].unitCost)).toBeCloseTo(5);
    expect(Number(creates[0].totalCost)).toBeCloseTo(10);
    expect(creates[1].variantTitle).toBeNull();
    expect(creates[1].sku).toBeNull();
  });

  it('leaves cost null when the variant has no costPerUnit', async () => {
    const creates = await snapshotToOrderItemCreates(fakeTx(null), buildChargedLineItems(inputItems));
    expect(creates[0].unitCost).toBeNull();
    expect(creates[0].totalCost).toBeNull();
  });
});

describe('assertOrderItemsMatchCharge — the guard', () => {
  const snap: ChargedLineItem[] = [
    { productId: 'p1', variantId: 'v1', title: 'Beer', variantTitle: '12pk', sku: 'B12', unitPriceCents: 2299, quantity: 2 },
  ];
  const matching = [{ productId: 'p1', variantId: 'v1', price: new Prisma.Decimal(22.99), quantity: 2, totalPrice: new Prisma.Decimal(45.98) }];

  it('passes when OrderItems equal the charged snapshot', () => {
    expect(() => assertOrderItemsMatchCharge(matching, snap)).not.toThrow();
  });

  it('throws when an item was added that was not charged (the undercharge bug)', () => {
    const withAddedItem = [
      ...matching,
      { productId: 'p2', variantId: 'v2', price: new Prisma.Decimal(14.5), quantity: 1, totalPrice: new Prisma.Decimal(14.5) },
    ];
    expect(() => assertOrderItemsMatchCharge(withAddedItem, snap)).toThrow(ChargeReconciliationError);
  });

  it('throws when a charged item is missing from OrderItems (the overcharge bug)', () => {
    expect(() => assertOrderItemsMatchCharge([], snap)).toThrow(/missing from OrderItems/);
  });

  it('throws on quantity drift', () => {
    const qtyDrift = [{ productId: 'p1', variantId: 'v1', price: new Prisma.Decimal(22.99), quantity: 5, totalPrice: new Prisma.Decimal(114.95) }];
    expect(() => assertOrderItemsMatchCharge(qtyDrift, snap)).toThrow(/qty mismatch/);
  });

  it('throws on unit-price drift beyond epsilon', () => {
    const priceDrift = [{ productId: 'p1', variantId: 'v1', price: new Prisma.Decimal(30), quantity: 2, totalPrice: new Prisma.Decimal(60) }];
    expect(() => assertOrderItemsMatchCharge(priceDrift, snap)).toThrow(ChargeReconciliationError);
  });

  it('tolerates a 1-cent rounding difference within epsilon', () => {
    const penny = [{ productId: 'p1', variantId: 'v1', price: new Prisma.Decimal(22.99), quantity: 2, totalPrice: new Prisma.Decimal(45.99) }];
    expect(() => assertOrderItemsMatchCharge(penny, snap, { epsilonCents: 1 })).not.toThrow();
  });

  it('warns instead of throwing when CHARGE_GUARD_MODE=warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('CHARGE_GUARD_MODE', 'warn');
    expect(() => assertOrderItemsMatchCharge([], snap)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    vi.unstubAllEnvs();
    warn.mockRestore();
  });
});

describe('parseChargedLineItems', () => {
  it('returns null for empty / missing / malformed values', () => {
    expect(parseChargedLineItems(null)).toBeNull();
    expect(parseChargedLineItems([])).toBeNull();
    expect(parseChargedLineItems([{ foo: 1 }] as unknown as Prisma.JsonValue)).toBeNull();
  });

  it('round-trips a built snapshot through JSON storage', () => {
    const snap = buildChargedLineItems(inputItems);
    const stored = JSON.parse(JSON.stringify(snap)) as Prisma.JsonValue;
    expect(parseChargedLineItems(stored)).toEqual(snap);
  });
});
