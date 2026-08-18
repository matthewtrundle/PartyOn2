/**
 * Regression: Cart.deliveryFee must track the CURRENT zip + subtotal.
 *
 * The fee used to be sticky — recalculateCart only recomputed when the stored
 * fee was 0, so once a non-zero fee landed it never moved. Two live overcharges
 * fell out of that: crossing a zone's free-delivery threshold kept charging the
 * old fee, and switching zips kept the old zone's rate.
 *
 * recalculateCart is module-private, so these drive it through setDeliveryInfo,
 * which is the real path the checkout page uses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const updateMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    cart: {
      update: (...a: unknown[]) => updateMock(...a),
      findUnique: (...a: unknown[]) => findUniqueMock(...a),
    },
  },
}));

import { setDeliveryInfo } from '@/lib/inventory/services/cart-service';

function cartFixture(subtotal: number, storedFee: number, zip: string, isPickup = false) {
  return {
    id: 'cart-1',
    subtotal: new Prisma.Decimal(subtotal),
    deliveryFee: new Prisma.Decimal(storedFee),
    discountAmount: new Prisma.Decimal(0),
    appliedDiscounts: [],
    deliveryAddress: {
      zip, address1: '123 Test St', city: 'Austin', province: 'TX', country: 'US',
      ...(isPickup ? { isPickup: true } : {}),
    },
    items: [{ price: new Prisma.Decimal(subtotal), quantity: 1 }],
  };
}

/** The deliveryFee recalculateCart wrote back (its update is the last one). */
function writtenFee(): number {
  const calls = updateMock.mock.calls
    .map((c) => c[0] as { data?: { deliveryFee?: Prisma.Decimal } })
    .filter((c) => c?.data?.deliveryFee !== undefined);
  return Number(calls.at(-1)!.data!.deliveryFee);
}

async function run(cart: ReturnType<typeof cartFixture>) {
  findUniqueMock.mockResolvedValue(cart);
  await setDeliveryInfo('cart-1', {
    date: new Date('2026-09-01T12:00:00Z'),
    time: '12:00 PM - 2:00 PM',
    address: cart.deliveryAddress as never,
    phone: '+15125550123',
    instructions: '',
  });
}

beforeEach(() => {
  updateMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockResolvedValue({});
});

describe('cart delivery fee recalculation', () => {
  it('drops to $0 once the cart crosses the zone free-delivery threshold', async () => {
    // 78701 = Central Austin: $25 base, free at $250. Stored fee is a stale $25
    // from when the cart was cheaper; it is now $300.
    await run(cartFixture(300, 25, '78701'));
    expect(writtenFee()).toBe(0);
  });

  it('re-rates when the zip moves to a different zone', async () => {
    // Stored $25 (Central). 78734 is Greater Austin -> $30, and $200 is under
    // Greater's $300 free threshold.
    await run(cartFixture(200, 25, '78734'));
    expect(writtenFee()).toBe(30);
  });

  it('still charges the zone fee below the threshold', async () => {
    await run(cartFixture(120, 0, '78701'));
    expect(writtenFee()).toBe(25);
  });

  it('keeps pickup free regardless of the stored fee', async () => {
    await run(cartFixture(120, 25, '78752', true));
    expect(writtenFee()).toBe(0);
  });
});
