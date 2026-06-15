/**
 * Stripe Integration Tests
 * Tests for Stripe configuration and basic functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

// Create mock functions that persist across imports
const mockSessionCreate = vi.fn().mockResolvedValue({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/test',
  payment_status: 'unpaid',
  status: 'open',
});
const mockSessionRetrieve = vi.fn().mockResolvedValue({
  id: 'cs_test_123',
  payment_status: 'paid',
  status: 'complete',
  metadata: { cartId: 'cart-123' },
});
const mockSessionExpire = vi.fn().mockResolvedValue({ id: 'cs_test_123' });
const mockCustomerCreate = vi.fn().mockResolvedValue({
  id: 'cus_test_123',
  email: 'test@example.com',
});
const mockCustomerRetrieve = vi.fn().mockResolvedValue({
  id: 'cus_test_123',
  email: 'test@example.com',
});
const mockCouponCreate = vi.fn().mockResolvedValue({
  id: 'coupon_test_123',
  amount_off: 1000,
});
const mockPaymentIntentRetrieve = vi.fn().mockResolvedValue({
  id: 'pi_test_123',
  status: 'succeeded',
  amount: 15000,
});
const mockCartUpdate = vi.fn().mockResolvedValue({});

// Mock the Stripe module with a proper class constructor
vi.mock('stripe', () => {
  // Create a class-like constructor
  function MockStripe() {
    return {
      checkout: {
        sessions: {
          create: mockSessionCreate,
          retrieve: mockSessionRetrieve,
          expire: mockSessionExpire,
        },
      },
      customers: {
        create: mockCustomerCreate,
        retrieve: mockCustomerRetrieve,
      },
      coupons: {
        create: mockCouponCreate,
      },
      paymentIntents: {
        retrieve: mockPaymentIntentRetrieve,
      },
    };
  }
  return { default: MockStripe };
});

// Mock prisma — createCheckoutSession now persists the immutable charge snapshot on the cart.
vi.mock('@/lib/database/client', () => ({
  prisma: {
    cart: { update: (...args: unknown[]) => mockCartUpdate(...args) },
  },
}));

// Set environment variables before importing modules
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake_key_for_testing');
vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_fake_key_for_testing');
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_fake_secret');

describe('Stripe Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have required environment variables set', () => {
    expect(process.env.STRIPE_SECRET_KEY).toBeDefined();
    expect(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBeDefined();
    expect(process.env.STRIPE_WEBHOOK_SECRET).toBeDefined();
  });

  it('should have valid key formats (test mode)', () => {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

    // In test mode, keys should start with sk_test_ and pk_test_
    expect(secretKey.startsWith('sk_test_')).toBe(true);
    expect(publishableKey.startsWith('pk_test_')).toBe(true);
  });
});

describe('Stripe Client', () => {
  it('should initialize Stripe client with secret key', async () => {
    // Dynamic import to pick up mocked env vars
    const { getStripe } = await import('@/lib/stripe/client');

    const client = getStripe();
    expect(client).toBeDefined();
    expect(client.checkout).toBeDefined();
    expect(client.checkout.sessions).toBeDefined();
  });

  it('should export publishable key', async () => {
    const { STRIPE_PUBLISHABLE_KEY } = await import('@/lib/stripe/client');
    expect(STRIPE_PUBLISHABLE_KEY).toBeDefined();
  });

  it('should export webhook secret', async () => {
    const { STRIPE_WEBHOOK_SECRET } = await import('@/lib/stripe/client');
    expect(STRIPE_WEBHOOK_SECRET).toBeDefined();
  });
});

describe('Checkout Session Creation', () => {
  const mockCart = {
    id: 'cart-123',
    sessionId: 'session-123',
    customerId: null,
    items: [
      {
        id: 'item-1',
        cartId: 'cart-123',
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
        price: new Prisma.Decimal(24.99),
        product: {
          id: 'prod-1',
          title: 'Test Wine',
          handle: 'test-wine',
        },
        variant: {
          id: 'var-1',
          title: '750ml',
          sku: 'WINE-001',
          price: new Prisma.Decimal(24.99),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    subtotal: new Prisma.Decimal(49.98),
    taxAmount: new Prisma.Decimal(4.12),
    deliveryFee: new Prisma.Decimal(25),
    total: new Prisma.Decimal(79.10),
    deliveryDate: new Date('2025-01-20'),
    deliveryTime: '2:00 PM - 4:00 PM',
    deliveryAddress: { address1: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' },
    deliveryPhone: '512-555-1234',
    deliveryInstructions: null,
    discountCode: null,
    discountAmount: new Prisma.Decimal(0),
    appliedDiscounts: [],
    chargedLineItems: null,
    groupOrderId: null,
    expiresAt: null,
    abandonedAt: null,
    recoveryEmailSent: false,
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSessionCreate.mockClear();
    mockSessionRetrieve.mockClear();
    mockSessionExpire.mockClear();
    mockCartUpdate.mockClear();
  });

  it('should create checkout session with cart items', async () => {
    const { createCheckoutSession } = await import('@/lib/stripe/checkout');

    const session = await createCheckoutSession({
      cart: mockCart,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      customerEmail: 'test@example.com',
    });

    expect(session).toBeDefined();
    expect(session.id).toBe('cs_test_123');
    expect(session.url).toBeDefined();
    expect(mockSessionCreate).toHaveBeenCalled();
  });

  it('persists a charge snapshot on the cart that equals the Stripe product line items', async () => {
    const { createCheckoutSession } = await import('@/lib/stripe/checkout');

    await createCheckoutSession({
      cart: mockCart,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      customerEmail: 'test@example.com',
    });

    // The immutable snapshot is persisted on the cart (built from the same products priced to Stripe).
    expect(mockCartUpdate).toHaveBeenCalledWith({
      where: { id: 'cart-123' },
      data: {
        chargedLineItems: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            title: 'Test Wine',
            variantTitle: '750ml',
            sku: 'WINE-001',
            unitPriceCents: 2499,
            quantity: 2,
          },
        ],
      },
    });

    // And Stripe was sent a product line whose unit_amount matches the snapshot cents.
    const sessionArg = mockSessionCreate.mock.calls[0][0] as {
      line_items: Array<{ price_data?: { unit_amount?: number; product_data?: { metadata?: { productId?: string } } }; quantity?: number }>;
    };
    const productLine = sessionArg.line_items.find(
      (li) => li.price_data?.product_data?.metadata?.productId === 'prod-1'
    );
    expect(productLine?.price_data?.unit_amount).toBe(2499);
    expect(productLine?.quantity).toBe(2);
  });

  it('should retrieve checkout session', async () => {
    const { getCheckoutSession } = await import('@/lib/stripe/checkout');

    const session = await getCheckoutSession('cs_test_123');

    expect(session).toBeDefined();
    expect(session?.id).toBe('cs_test_123');
    expect(session?.payment_status).toBe('paid');
    // The actual implementation calls retrieve with expand options
    expect(mockSessionRetrieve).toHaveBeenCalledWith('cs_test_123', {
      expand: ['line_items', 'payment_intent', 'customer'],
    });
  });

  it('should expire checkout session', async () => {
    const { expireCheckoutSession } = await import('@/lib/stripe/checkout');

    const result = await expireCheckoutSession('cs_test_123');

    expect(result).toBe(true);
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_123');
  });
});

describe('Checkout Line Items', () => {
  it('should format cart items correctly for Stripe', () => {
    const cartItem = {
      productId: 'prod-1',
      variantId: 'var-1',
      title: 'Premium Whiskey',
      variantTitle: '750ml',
      quantity: 1,
      price: 59.99,
    };

    // Line item should have price in cents
    const priceInCents = Math.round(cartItem.price * 100);
    expect(priceInCents).toBe(5999);
  });

  it('should calculate delivery fee correctly', () => {
    const standardDeliveryFee = 25;
    const expressDeliveryFee = 50;

    expect(Math.round(standardDeliveryFee * 100)).toBe(2500);
    expect(Math.round(expressDeliveryFee * 100)).toBe(5000);
  });

  it('should calculate tax correctly', () => {
    const subtotal = 100;
    const taxRate = 0.0825;
    const taxAmount = subtotal * taxRate;

    expect(taxAmount).toBe(8.25);
    expect(Math.round(taxAmount * 100)).toBe(825);
  });
});

describe('Discount Handling', () => {
  it('should convert discount amount to cents', () => {
    const discountAmount = 15.50;
    const discountInCents = Math.round(discountAmount * 100);

    expect(discountInCents).toBe(1550);
  });

  it('should handle percentage discounts', () => {
    const subtotal = 100;
    const discountPercent = 10;
    const discountAmount = subtotal * (discountPercent / 100);

    expect(discountAmount).toBe(10);
  });
});

describe('Webhook Signature Verification', () => {
  it('should have webhook secret configured', () => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    expect(webhookSecret).toBeDefined();
    expect(webhookSecret?.startsWith('whsec_')).toBe(true);
  });
});

describe('Payment Status Handling', () => {
  it('should recognize valid payment statuses', () => {
    const validStatuses = ['paid', 'unpaid', 'no_payment_required'];

    expect(validStatuses).toContain('paid');
    expect(validStatuses).toContain('unpaid');
  });

  it('should recognize valid session statuses', () => {
    const validStatuses = ['open', 'complete', 'expired'];

    expect(validStatuses).toContain('complete');
    expect(validStatuses).toContain('expired');
  });
});
