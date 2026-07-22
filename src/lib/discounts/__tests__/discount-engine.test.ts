/**
 * validateDiscountCode — the shared guard the group-v2 checkout charge path now
 * delegates to. These pin the usage-limit / expiry enforcement so a single-use
 * code can't be redeemed twice (or an expired one applied) on any path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDiscountFindUnique = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    discount: {
      findUnique: (...args: unknown[]) => mockDiscountFindUnique(...args),
    },
  },
}));

import { validateDiscountCode } from '@/lib/discounts/discount-engine';

/** A valid, in-window, single-use FIXED_AMOUNT code (Premiere-credit shaped). */
function makeDiscount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'disc-1',
    code: 'PREMIER-X',
    name: 'POD Credit',
    type: 'FIXED_AMOUNT',
    value: 50,
    isActive: true,
    startsAt: new Date('2020-01-01T00:00:00Z'),
    expiresAt: null,
    maxUsageCount: 1,
    usageCount: 0,
    usagePerCustomer: 1,
    minOrderAmount: null,
    minQuantity: null,
    appliesToAll: true,
    applicableProducts: [],
    applicableCategories: [],
    freeShipping: false,
    ...overrides,
  };
}

const context = {
  items: [{ productId: 'p1', variantId: 'v1', quantity: 1, price: 100 }],
  subtotal: 100,
};

describe('validateDiscountCode — usage + expiry limits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a single-use code that has already been redeemed (usageCount ≥ maxUsageCount)', async () => {
    mockDiscountFindUnique.mockResolvedValue(makeDiscount({ maxUsageCount: 1, usageCount: 1 }));

    const result = await validateDiscountCode('PREMIER-X', context);

    expect(result.success).toBe(false);
    expect(result.discountAmount).toBe(0);
    expect(result.error).toMatch(/usage limit/i);
  });

  it('rejects an expired code', async () => {
    mockDiscountFindUnique.mockResolvedValue(makeDiscount({ expiresAt: new Date('2020-06-01T00:00:00Z') }));

    const result = await validateDiscountCode('PREMIER-X', context);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it('rejects an inactive code', async () => {
    mockDiscountFindUnique.mockResolvedValue(makeDiscount({ isActive: false }));

    const result = await validateDiscountCode('PREMIER-X', context);

    expect(result.success).toBe(false);
  });

  it('rejects an unknown code', async () => {
    mockDiscountFindUnique.mockResolvedValue(null);

    const result = await validateDiscountCode('NOPE', context);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });

  it('accepts a valid single-use code and caps the amount at the subtotal', async () => {
    mockDiscountFindUnique.mockResolvedValue(makeDiscount({ maxUsageCount: 1, usageCount: 0 }));

    const result = await validateDiscountCode('PREMIER-X', context);

    expect(result.success).toBe(true);
    expect(result.discountAmount).toBe(50); // min(value 50, subtotal 100)
    expect(result.discountCode).toBe('PREMIER-X');
  });
});
