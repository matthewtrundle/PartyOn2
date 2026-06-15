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
const mockPrismaGroupOrderV2FindUnique = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    participantPayment: {
      findFirst: (...args: unknown[]) => mockPrismaParticipantPaymentFindFirst(...args),
      update: (...args: unknown[]) => mockPrismaParticipantPaymentUpdate(...args),
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
}));
vi.mock('@/lib/affiliates/commission-engine', () => ({
  linkOrderToAffiliate: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/affiliates/affiliate-service', () => ({
  getAffiliateByCode: vi.fn().mockResolvedValue(null),
}));
vi.mock('./client', () => ({
  stripe: {},
}));
vi.mock('@/lib/tax', () => ({
  DEFAULT_TAX_RATE: 0.0825,
}));

// Import after mocks are set up
import { handleGroupV2PaymentCompleted } from '@/lib/stripe/group-v2-payments';

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
    mockPrismaSubOrderFindUnique.mockResolvedValue({ ...baseSubOrder });
    mockPrismaPurchasedItemFindMany.mockResolvedValue([{ ...basePurchasedItem }]);
    mockPrismaOrderCreate.mockResolvedValue({ ...createdOrder });
    mockPrismaDeliveryTaskCreate.mockResolvedValue({});
    mockPrismaProductVariantFindUnique.mockResolvedValue({ costPerUnit: null });
    mockPrismaGroupOrderV2FindUnique.mockResolvedValue(null);
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

      expect(mockPrismaParticipantPaymentUpdate).toHaveBeenCalledWith({
        where: { id: 'payment-id-1' },
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
