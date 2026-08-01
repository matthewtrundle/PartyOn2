/**
 * Server-side delivery-date gate on both checkout routes (wrong-date fix
 * 2026-08-01): no Stripe session may be created for a tab without a
 * customer-confirmed delivery date. This is the unbypassable half of the fix —
 * the modal UI can be sidestepped, this cannot.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const serviceMock = vi.hoisted(() => ({
  getGroupOrderByCode: vi.fn(),
  getParticipantById: vi.fn(),
  getParticipantDraftItems: vi.fn(),
}));
const paymentsMock = vi.hoisted(() => ({
  createGroupV2CheckoutSession: vi.fn(),
}));
const prismaMock = vi.hoisted(() => ({
  groupParticipantV2: { update: vi.fn() },
  groupDeliveryInvoice: { findFirst: vi.fn() },
  draftCartItem: { findMany: vi.fn() },
  discount: { findUnique: vi.fn() },
}));

vi.mock('@/lib/group-orders-v2/service', () => serviceMock);
vi.mock('@/lib/stripe/group-v2-payments', () => ({
  createGroupV2CheckoutSession: paymentsMock.createGroupV2CheckoutSession,
  DiscountNotApplicableError: class DiscountNotApplicableError extends Error {},
}));
vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import { POST as checkoutPost } from '../checkout/route';
import { POST as checkoutAllPost } from '../checkout-all/route';

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new Request('http://localhost/api/v2/group-orders/ABC123/tabs/tab-1/checkout', {
    method: 'POST',
    body: JSON.stringify({ participantId: 'p1', email: 'guest@example.com', ...body }),
  }) as unknown as NextRequest;
}

const PARAMS = { params: Promise.resolve({ code: 'ABC123', tabId: 'tab-1' }) };

function group(tabOverrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    shareCode: 'ABC123',
    tabs: [
      {
        id: 'tab-1',
        name: 'Boat Order',
        status: 'OPEN',
        deliveryDate: '2026-08-22T12:00:00.000Z',
        deliveryDateConfirmed: true,
        deliveryTime: '12:00 PM - 2:00 PM',
        deliveryAddress: { address1: '16405 Clara Van St', city: 'Austin', zip: '78734' },
        ...tabOverrides,
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  serviceMock.getParticipantById.mockResolvedValue({
    id: 'p1',
    groupOrderId: 'g1',
    guestEmail: 'guest@example.com',
  });
  serviceMock.getParticipantDraftItems.mockResolvedValue([
    { id: 'd1', variantId: 'v1', quantity: 1, price: 10 },
  ]);
  paymentsMock.createGroupV2CheckoutSession.mockResolvedValue({
    checkoutUrl: 'https://stripe.test/session',
    sessionId: 'cs_123',
  });
  prismaMock.groupParticipantV2.update.mockResolvedValue({});
  prismaMock.groupDeliveryInvoice.findFirst.mockResolvedValue(null);
  prismaMock.draftCartItem.findMany.mockResolvedValue([
    { id: 'd1', variantId: 'v1', quantity: 1, price: 10, addedByParticipantId: 'p1' },
  ]);
  prismaMock.discount.findUnique.mockResolvedValue(null);
});

for (const [label, post] of [
  ['checkout', checkoutPost],
  ['checkout-all', checkoutAllPost],
] as const) {
  describe(`POST ${label} delivery-date gate`, () => {
    it('rejects a dateless tab with DELIVERY_DATE_REQUIRED and creates no session', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(
        group({ deliveryDate: null, deliveryDateConfirmed: false })
      );

      const res = await post(makeRequest(), PARAMS);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.code).toBe('DELIVERY_DATE_REQUIRED');
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    it('rejects an unconfirmed placeholder date (legacy fake +7d rows)', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(
        group({ deliveryDateConfirmed: false })
      );

      const res = await post(makeRequest(), PARAMS);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.code).toBe('DELIVERY_DATE_REQUIRED');
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    it('proceeds to Stripe when the date is set and confirmed', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(group());

      const res = await post(makeRequest(), PARAMS);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(paymentsMock.createGroupV2CheckoutSession).toHaveBeenCalledOnce();
    });
  });
}
