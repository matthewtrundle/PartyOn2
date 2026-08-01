/**
 * Group V2 Payment Webhook Tests
 * Tests for handleGroupV2PaymentCompleted, focusing on customer resolution
 * when participant records are missing email/name.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

// --- Prisma mock ---
const mockPrismaParticipantPaymentFindFirst = vi.fn();
const mockPrismaParticipantPaymentUpdate = vi.fn();
const mockPrismaGroupParticipantV2FindUnique = vi.fn();
const mockPrismaGroupParticipantV2Update = vi.fn();
const mockPrismaSubOrderFindUnique = vi.fn();
const mockPrismaPurchasedItemFindMany = vi.fn();
const mockPrismaCustomerFindFirst = vi.fn();
const mockPrismaCustomerCreate = vi.fn();
const mockPrismaOrderCreate = vi.fn();
const mockPrismaDeliveryTaskCreate = vi.fn();
const mockPrismaProductVariantFindUnique = vi.fn();
const mockPrismaProductVariantFindMany = vi.fn();
const mockPrismaGroupOrderV2FindUnique = vi.fn();
const mockPrismaParticipantPaymentCreate = vi.fn();
const mockPrismaParticipantPaymentUpdateMany = vi.fn();
const mockStripeCheckoutSessionsCreate = vi.fn();
const mockValidateDiscountCode = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    participantPayment: {
      findFirst: (...args: unknown[]) => mockPrismaParticipantPaymentFindFirst(...args),
      update: (...args: unknown[]) => mockPrismaParticipantPaymentUpdate(...args),
      updateMany: (...args: unknown[]) => mockPrismaParticipantPaymentUpdateMany(...args),
      create: (...args: unknown[]) => mockPrismaParticipantPaymentCreate(...args),
    },
    groupParticipantV2: {
      findUnique: (...args: unknown[]) => mockPrismaGroupParticipantV2FindUnique(...args),
      update: (...args: unknown[]) => mockPrismaGroupParticipantV2Update(...args),
    },
    subOrder: {
      findUnique: (...args: unknown[]) => mockPrismaSubOrderFindUnique(...args),
    },
    purchasedItem: {
      findMany: (...args: unknown[]) => mockPrismaPurchasedItemFindMany(...args),
    },
    customer: {
      findFirst: (...args: unknown[]) => mockPrismaCustomerFindFirst(...args),
      create: (...args: unknown[]) => mockPrismaCustomerCreate(...args),
    },
    order: {
      create: (...args: unknown[]) => mockPrismaOrderCreate(...args),
    },
    deliveryTask: {
      create: (...args: unknown[]) => mockPrismaDeliveryTaskCreate(...args),
    },
    productVariant: {
      findUnique: (...args: unknown[]) => mockPrismaProductVariantFindUnique(...args),
      findMany: (...args: unknown[]) => mockPrismaProductVariantFindMany(...args),
    },
    groupOrderV2: {
      findUnique: (...args: unknown[]) => mockPrismaGroupOrderV2FindUnique(...args),
    },
  },
}));

// --- Mock side-effect modules (non-fatal, just need to not throw) ---
vi.mock('@/lib/group-orders-v2/service', () => ({
  moveDraftToPurchased: vi.fn().mockResolvedValue(undefined),
  moveAllDraftsToPurchased: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/webhooks/ghl', () => ({
  notifyNewOrder: vi.fn().mockResolvedValue(undefined),
  buildGhlPayload: vi.fn().mockReturnValue({}),
}));
vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/discounts/discount-engine', () => ({
  recordDiscountUsage: vi.fn().mockResolvedValue(undefined),
  validateDiscountCode: (...args: unknown[]) => mockValidateDiscountCode(...args),
}));
vi.mock('@/lib/affiliates/commission-engine', () => ({
  linkOrderToAffiliate: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/affiliates/affiliate-service', () => ({
  getAffiliateByCode: vi.fn().mockResolvedValue(null),
}));
// NOTE: the SUT imports `stripe` from '@/lib/stripe/client' (a lazy Proxy that
// throws without STRIPE_SECRET_KEY). Mock that exact module id — a relative
// './client' here resolves against the test dir and silently no-ops.
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    checkout: {
      sessions: { create: (...args: unknown[]) => mockStripeCheckoutSessionsCreate(...args) },
    },
    coupons: { create: vi.fn().mockResolvedValue({ id: 'coupon_test' }) },
  },
  getStripe: vi.fn(),
  STRIPE_PUBLISHABLE_KEY: 'pk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
}));
vi.mock('@/lib/tax', () => ({
  DEFAULT_TAX_RATE: 0.0825,
}));

// Import after mocks are set up
import {
  handleGroupV2PaymentCompleted,
  createGroupV2CheckoutSession,
  DiscountNotApplicableError,
} from '@/lib/stripe/group-v2-payments';
import { ProductNotPurchasableError } from '@/lib/products/availability';

// --- Test helpers ---

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_test_session_123',
    object: 'checkout.session',
    payment_intent: 'pi_test_123',
    payment_status: 'paid',
    status: 'complete',
    metadata: {
      type: 'group_v2',
      groupOrderId: 'group-order-id-1',
      subOrderId: 'sub-order-id-1',
      participantId: 'participant-id-1',
      checkoutType: 'participant',
    },
    customer_details: {
      email: 'stripe-customer@example.com',
      name: 'Stripe Customer Name',
      phone: '+15551234567',
      address: null,
      tax_exempt: 'none',
      tax_ids: [],
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

const basePayment = {
  id: 'payment-id-1',
  subOrderId: 'sub-order-id-1',
  participantId: 'participant-id-1',
  stripeCheckoutSessionId: 'cs_test_session_123',
  stripePaymentIntentId: null,
  subtotal: 22.99,
  taxAmount: 1.90,
  discountCode: null,
  discountAmount: 0,
  total: 24.89,
  chargedLineItems: null,
  status: 'PENDING',
  paidAt: null,
  orderId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseSubOrder = {
  id: 'sub-order-id-1',
  groupOrderId: 'group-order-id-1',
  deliveryDate: new Date('2026-03-05T12:00:00Z'),
  deliveryTime: '5:00 PM - 5:30 PM',
  deliveryAddress: { address1: '123 Test St', city: 'Austin', province: 'TX', zip: '78701' },
  deliveryPhone: '',
};

const basePurchasedItem = {
  id: 'purchased-item-1',
  productId: 'product-id-1',
  variantId: 'variant-id-1',
  title: 'Test Beer Pack',
  variantTitle: '12 Pack',
  price: 22.99,
  quantity: 1,
};

const createdOrder = {
  id: 'order-id-1',
  orderNumber: 99,
  items: [basePurchasedItem],
};

// --- Tests ---

describe('handleGroupV2PaymentCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: payment exists, not yet processed
    mockPrismaParticipantPaymentFindFirst.mockResolvedValue({ ...basePayment });
    mockPrismaParticipantPaymentUpdate.mockResolvedValue({});
    mockPrismaParticipantPaymentUpdateMany.mockResolvedValue({ count: 1 });
    mockPrismaSubOrderFindUnique.mockResolvedValue({ ...baseSubOrder });
    mockPrismaPurchasedItemFindMany.mockResolvedValue([{ ...basePurchasedItem }]);
    mockPrismaOrderCreate.mockResolvedValue({ ...createdOrder });
    mockPrismaDeliveryTaskCreate.mockResolvedValue({});
    mockPrismaProductVariantFindUnique.mockResolvedValue({ costPerUnit: null });
    mockPrismaGroupOrderV2FindUnique.mockResolvedValue(null);
  });

  describe('dateless sub-order guard (delivery-date fix 2026-08-01)', () => {
    it('throws (so Stripe retries) and writes no Order when the tab has no delivery date', async () => {
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: 'existing-customer-id',
        guestName: 'Party Host',
        guestEmail: 'host@example.com',
        guestPhone: null,
      });
      mockPrismaSubOrderFindUnique.mockResolvedValue({ ...baseSubOrder, deliveryDate: null });

      await expect(handleGroupV2PaymentCompleted(makeSession())).rejects.toThrow(/no delivery date/);
      expect(mockPrismaOrderCreate).not.toHaveBeenCalled();
      expect(mockPrismaDeliveryTaskCreate).not.toHaveBeenCalled();
    });
  });

  describe('customer resolution from Stripe session (no email on participant)', () => {
    it('should create customer using Stripe session email when participant has no email', async () => {
      // Participant has no email, no customerId -- the bug scenario
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: null,
        guestName: 'Party Host',
        guestEmail: null,
        guestPhone: null,
      });
      mockPrismaCustomerFindFirst.mockResolvedValue(null); // No existing customer
      mockPrismaCustomerCreate.mockResolvedValue({ id: 'new-customer-id' });
      mockPrismaGroupParticipantV2Update.mockResolvedValue({});

      await handleGroupV2PaymentCompleted(makeSession());

      // Should create customer with Stripe-provided email and name
      expect(mockPrismaCustomerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'stripe-customer@example.com',
          firstName: 'Stripe',
          lastName: 'Customer Name',
          phone: '+15551234567',
        }),
      });

      // Should update participant with Stripe details
      expect(mockPrismaGroupParticipantV2Update).toHaveBeenCalledWith({
        where: { id: 'participant-id-1' },
        data: expect.objectContaining({
          customerId: 'new-customer-id',
          guestEmail: 'stripe-customer@example.com',
          guestName: 'Stripe Customer Name',
        }),
      });

      // Should create order with Stripe-provided details
      expect(mockPrismaOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'new-customer-id',
            customerEmail: 'stripe-customer@example.com',
            customerName: 'Stripe Customer Name',
          }),
        }),
      );
    });

    it('should find existing customer by Stripe session email', async () => {
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: null,
        guestName: 'Party Host',
        guestEmail: null,
        guestPhone: null,
      });
      mockPrismaCustomerFindFirst.mockResolvedValue({ id: 'existing-customer-id' });
      mockPrismaGroupParticipantV2Update.mockResolvedValue({});

      await handleGroupV2PaymentCompleted(makeSession());

      // Should NOT create a new customer
      expect(mockPrismaCustomerCreate).not.toHaveBeenCalled();

      // Should use existing customer ID
      expect(mockPrismaOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'existing-customer-id',
          }),
        }),
      );
    });

    it('should prefer participant email over Stripe session email', async () => {
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: null,
        guestName: 'Real Name',
        guestEmail: 'participant@example.com',
        guestPhone: '+15559999999',
      });
      mockPrismaCustomerFindFirst.mockResolvedValue(null);
      mockPrismaCustomerCreate.mockResolvedValue({ id: 'new-customer-id' });
      mockPrismaGroupParticipantV2Update.mockResolvedValue({});

      await handleGroupV2PaymentCompleted(makeSession());

      // Should use participant email, not Stripe session email
      expect(mockPrismaCustomerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'participant@example.com',
        }),
      });

      expect(mockPrismaOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerEmail: 'participant@example.com',
            customerName: 'Real Name',
          }),
        }),
      );
    });

    it('should use participant name over "Party Host" default even with Stripe fallback', async () => {
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: null,
        guestName: 'Jane Doe',
        guestEmail: null,
        guestPhone: null,
      });
      mockPrismaCustomerFindFirst.mockResolvedValue(null);
      mockPrismaCustomerCreate.mockResolvedValue({ id: 'new-customer-id' });
      mockPrismaGroupParticipantV2Update.mockResolvedValue({});

      await handleGroupV2PaymentCompleted(makeSession());

      // Should use participant name (not "Party Host", not Stripe name)
      expect(mockPrismaCustomerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      });
    });

    it('should throw when neither participant nor Stripe session has email', async () => {
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: null,
        guestName: 'Party Host',
        guestEmail: null,
        guestPhone: null,
      });
      mockPrismaGroupParticipantV2Update.mockResolvedValue({});

      const sessionNoEmail = makeSession({
        customer_details: {
          email: null,
          name: null,
          phone: null,
          address: null,
          tax_exempt: 'none',
          tax_ids: [],
          business_name: null,
          individual_name: null,
        },
      });

      await expect(handleGroupV2PaymentCompleted(sessionNoEmail)).rejects.toThrow(
        'No customer ID or email for participant'
      );
    });
  });

  describe('customer name sanitization (egress hardening, PR #306 follow-up)', () => {
    it('sanitizes a malicious Stripe checkout name before it reaches Order + Customer', async () => {
      // guestName is the 'Party Host' placeholder, so name resolution falls
      // through to the raw Stripe checkout name — which must be neutralized
      // before it is stored and forwarded to GHL/CoreLinq.
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: null,
        guestName: 'Party Host',
        guestEmail: null,
        guestPhone: null,
      });
      mockPrismaCustomerFindFirst.mockResolvedValue(null);
      mockPrismaCustomerCreate.mockResolvedValue({ id: 'new-customer-id' });
      mockPrismaGroupParticipantV2Update.mockResolvedValue({});

      const evilSession = makeSession({
        customer_details: {
          email: 'stripe-customer@example.com',
          name: '  Injected\nName\u202e  ', // newline (Cc) + bidi override (Cf) + padding
          phone: '+15551234567',
          address: null,
          tax_exempt: 'none',
          tax_ids: [],
          business_name: null,
          individual_name: null,
        },
      } as Partial<Stripe.Checkout.Session>);

      await handleGroupV2PaymentCompleted(evilSession);

      // Control/format chars replaced with spaces, whitespace collapsed + trimmed.
      // The exact expected value proves the newline and bidi override are gone.
      expect(mockPrismaOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ customerName: 'Injected Name' }),
        }),
      );
      expect(mockPrismaCustomerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ firstName: 'Injected', lastName: 'Name' }),
      });
    });

    it('sanitizes a malicious participant guestName (guestName branch, not Stripe)', async () => {
      // A non-placeholder guestName wins over the Stripe name — but it is also
      // customer-supplied and must be sanitized.
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: null,
        guestName: 'Evil\u202eGuest',
        guestEmail: 'guest@example.com',
        guestPhone: null,
      });
      mockPrismaCustomerFindFirst.mockResolvedValue(null);
      mockPrismaCustomerCreate.mockResolvedValue({ id: 'new-customer-id' });
      mockPrismaGroupParticipantV2Update.mockResolvedValue({});

      await handleGroupV2PaymentCompleted(makeSession());

      expect(mockPrismaOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ customerName: 'Evil Guest' }),
        }),
      );
    });
  });

  describe('idempotency', () => {
    it('should skip processing if payment already has orderId', async () => {
      mockPrismaParticipantPaymentFindFirst.mockResolvedValue({
        ...basePayment,
        orderId: 'existing-order-id',
      });

      await handleGroupV2PaymentCompleted(makeSession());

      // Should not create order or touch customer
      expect(mockPrismaOrderCreate).not.toHaveBeenCalled();
      expect(mockPrismaCustomerCreate).not.toHaveBeenCalled();
      expect(mockPrismaCustomerFindFirst).not.toHaveBeenCalled();
    });
  });

  describe('order creation', () => {
    it('should create order with correct financial data', async () => {
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: 'existing-customer-id',
        guestName: 'Test User',
        guestEmail: 'test@example.com',
        guestPhone: '+15551111111',
      });

      await handleGroupV2PaymentCompleted(makeSession());

      expect(mockPrismaOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CONFIRMED',
            financialStatus: 'PAID',
            fulfillmentStatus: 'UNFULFILLED',
            subtotal: 22.99,
            taxAmount: 1.90,
            deliveryFee: 0,
            total: 24.89,
            stripeCheckoutSessionId: 'cs_test_session_123',
            stripePaymentIntentId: 'pi_test_123',
          }),
        }),
      );
    });

    it('should link payment to created order', async () => {
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue({
        id: 'participant-id-1',
        groupOrderId: 'group-order-id-1',
        customerId: 'existing-customer-id',
        guestName: 'Test User',
        guestEmail: 'test@example.com',
        guestPhone: null,
      });

      await handleGroupV2PaymentCompleted(makeSession());

      // Conditional claim (orderId: null in the WHERE) so a concurrent Stripe
      // retry and the reconcile cron can never both link an Order.
      expect(mockPrismaParticipantPaymentUpdateMany).toHaveBeenCalledWith({
        where: { id: 'payment-id-1', orderId: null },
        data: { orderId: 'order-id-1' },
      });
    });
  });

  describe('charge snapshot — OrderItems come from the charge, not a re-read', () => {
    const paidParticipant = {
      id: 'participant-id-1',
      groupOrderId: 'group-order-id-1',
      customerId: 'existing-customer-id',
      guestName: 'Test User',
      guestEmail: 'test@example.com',
      guestPhone: null,
    };

    it('builds the Order from the charged snapshot, excluding items added after checkout', async () => {
      mockPrismaParticipantPaymentFindFirst.mockResolvedValue({
        ...basePayment,
        chargedLineItems: [
          { productId: 'product-id-1', variantId: 'variant-id-1', title: 'Test Beer Pack', variantTitle: '12 Pack', sku: null, unitPriceCents: 2299, quantity: 1 },
        ],
      });
      // Drafts were re-read and now contain a SECOND item added after the session was created.
      mockPrismaPurchasedItemFindMany.mockResolvedValue([
        { ...basePurchasedItem },
        { id: 'purchased-item-2', productId: 'product-id-2', variantId: 'variant-id-2', title: 'Sneaky Add-on', variantTitle: null, price: 40, quantity: 3 },
      ]);
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue(paidParticipant);

      await handleGroupV2PaymentCompleted(makeSession());

      const orderArg = mockPrismaOrderCreate.mock.calls[0][0];
      const createdItems = orderArg.data.items.create;
      // Only the charged item makes it onto the Order; the post-checkout add is excluded.
      expect(createdItems).toHaveLength(1);
      expect(createdItems[0]).toMatchObject({ productId: 'product-id-1', quantity: 1 });
      expect(Number(createdItems[0].totalPrice)).toBeCloseTo(22.99);
    });

    it('falls back to purchasedItems when the payment has no snapshot (pre-feature)', async () => {
      mockPrismaGroupParticipantV2FindUnique.mockResolvedValue(paidParticipant);

      await handleGroupV2PaymentCompleted(makeSession());

      const orderArg = mockPrismaOrderCreate.mock.calls[0][0];
      expect(orderArg.data.items.create).toHaveLength(1);
      expect(orderArg.data.items.create[0]).toMatchObject({ productId: 'product-id-1' });
    });
  });
});

describe('createGroupV2CheckoutSession availability guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseInput = {
    groupOrderId: 'group-order-id-1',
    subOrderId: 'sub-order-id-1',
    participantId: 'participant-id-1',
    participantName: 'Guest',
    draftItems: [
      {
        id: 'draft-1',
        productId: 'product-id-1',
        variantId: 'variant-id-1',
        title: 'Test Beer Pack',
        variantTitle: '12 Pack',
        price: 22.99,
        imageUrl: null,
        quantity: 1,
      },
    ],
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  };

  it('refuses to create a checkout session for a DRAFT product, before any Stripe charge', async () => {
    mockPrismaProductVariantFindMany.mockResolvedValue([
      {
        id: 'variant-id-1',
        availableForSale: true,
        product: { id: 'product-id-1', status: 'DRAFT', title: 'Test Beer Pack' },
      },
    ]);

    // A ProductNotPurchasableError (rather than a Stripe/DB crash) proves the guard ran first:
    // the stripe client is mocked as {}, so reaching the charge would throw a different error.
    await expect(createGroupV2CheckoutSession(baseInput)).rejects.toBeInstanceOf(
      ProductNotPurchasableError
    );
  });
});

describe('createGroupV2CheckoutSession — SMS consent metadata (A2P 10DLC)', () => {
  const purchasableInput = {
    groupOrderId: 'group-order-id-1',
    subOrderId: 'sub-order-id-1',
    participantId: 'participant-id-1',
    participantName: 'Guest',
    draftItems: [
      {
        id: 'draft-1',
        productId: 'product-id-1',
        variantId: 'variant-id-1',
        title: 'Test Beer Pack',
        variantTitle: '12 Pack',
        price: 22.99,
        imageUrl: null,
        quantity: 1,
      },
    ],
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Product purchasable → availability guard passes → we reach the Stripe call.
    mockPrismaProductVariantFindMany.mockResolvedValue([
      {
        id: 'variant-id-1',
        availableForSale: true,
        product: { id: 'product-id-1', status: 'ACTIVE', title: 'Test Beer Pack' },
      },
    ]);
    mockStripeCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test_x', url: 'https://stripe.test/x' });
    mockPrismaParticipantPaymentCreate.mockResolvedValue({ id: 'payment-x' });
  });

  function lastSessionParams(): Stripe.Checkout.SessionCreateParams {
    return mockStripeCheckoutSessionsCreate.mock.calls[0][0] as Stripe.Checkout.SessionCreateParams;
  }

  it('omits smsConsent from metadata when no phone was provided (even if consent is true)', async () => {
    await createGroupV2CheckoutSession({ ...purchasableInput, smsConsent: true });
    expect(lastSessionParams().metadata).not.toHaveProperty('smsConsent');
  });

  it("records smsConsent 'false' when a phone is present but the box is unchecked", async () => {
    await createGroupV2CheckoutSession({
      ...purchasableInput,
      participantPhone: '5551234567',
      smsConsent: false,
    });
    expect(lastSessionParams().metadata?.smsConsent).toBe('false');
  });

  it("records smsConsent 'true' and binds it to the consented phone in metadata (and nowhere else)", async () => {
    await createGroupV2CheckoutSession({
      ...purchasableInput,
      participantPhone: '5559998888',
      smsConsent: true,
    });
    const params = lastSessionParams();
    expect(params.metadata?.smsConsent).toBe('true');
    // A2P binding: the consented phone is intentionally carried in the
    // smsConsentPhone metadata field so the payment webhook can bind the opt-in
    // to the number actually texted (see resolveOrderSmsConsent). It must NOT
    // leak anywhere else — e.g. custom_text shown to the payer.
    expect(params.metadata?.smsConsentPhone).toBe('5559998888');
    const otherMeta = { ...(params.metadata ?? {}) };
    delete otherMeta.smsConsentPhone;
    expect(JSON.stringify({ ...params, metadata: otherMeta })).not.toContain('5559998888');
  });
});

describe('createGroupV2CheckoutSession — discount validation (usage/expiry limits)', () => {
  const purchasableInput = {
    groupOrderId: 'group-order-id-1',
    subOrderId: 'sub-order-id-1',
    participantId: 'participant-id-1',
    participantName: 'Guest',
    draftItems: [
      {
        id: 'draft-1',
        productId: 'product-id-1',
        variantId: 'variant-id-1',
        title: 'Test Beer Pack',
        variantTitle: '12 Pack',
        price: 22.99,
        imageUrl: null,
        quantity: 1,
      },
    ],
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Product purchasable → availability guard passes → we reach the discount check.
    mockPrismaProductVariantFindMany.mockResolvedValue([
      {
        id: 'variant-id-1',
        availableForSale: true,
        product: { id: 'product-id-1', status: 'ACTIVE', title: 'Test Beer Pack' },
      },
    ]);
    mockStripeCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test_x', url: 'https://stripe.test/x' });
    mockPrismaParticipantPaymentCreate.mockResolvedValue({ id: 'payment-x' });
  });

  it('rejects a code that fails validation (e.g. a single-use code already redeemed) and never charges', async () => {
    // Simulates a maxUsageCount:1 code whose usageCount is already 1.
    mockValidateDiscountCode.mockResolvedValue({
      success: false,
      discountAmount: 0,
      error: 'This discount code has reached its usage limit',
    });

    await expect(
      createGroupV2CheckoutSession({ ...purchasableInput, discountCode: 'PREMIER-USED' }),
    ).rejects.toBeInstanceOf(DiscountNotApplicableError);

    // The exhausted code must never reach a Stripe charge.
    expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('proceeds to checkout when the code validates', async () => {
    mockValidateDiscountCode.mockResolvedValue({
      success: true,
      discountAmount: 15,
      discountCode: 'PREMIER-OK',
      freeShipping: false,
    });

    await createGroupV2CheckoutSession({ ...purchasableInput, discountCode: 'PREMIER-OK' });

    expect(mockValidateDiscountCode).toHaveBeenCalledWith(
      'PREMIER-OK',
      expect.objectContaining({ subtotal: 22.99 }),
    );
    expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalled();
  });
});
