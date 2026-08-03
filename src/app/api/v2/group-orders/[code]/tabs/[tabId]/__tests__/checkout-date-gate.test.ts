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

/**
 * Dates are computed relative to Austin's today, never hardcoded — the
 * past-date gate compares against todayCT(), so a literal like
 * '2026-08-22' would silently start failing the day it goes stale.
 */
const ctDay = (offsetDays: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return `${day}T12:00:00.000Z`;
};

const FUTURE_DATE = ctDay(30);
const TODAY_DATE = ctDay(0);
const PAST_DATE = ctDay(-1);

function group(tabOverrides: Record<string, unknown> = {}, groupOverrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    shareCode: 'ABC123',
    status: 'ACTIVE',
    ...groupOverrides,
    tabs: [
      {
        id: 'tab-1',
        name: 'Boat Order',
        status: 'OPEN',
        deliveryDate: FUTURE_DATE,
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

    it('rejects a delivery date that has already passed', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(group({ deliveryDate: PAST_DATE }));

      const res = await post(makeRequest(), PARAMS);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.code).toBe('DELIVERY_DATE_PAST');
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    // The trap the past-date gate must not fall into: deliveryDate is stored at
    // noon UTC (7am CT), so an instant comparison would reject same-day orders
    // for the rest of the day. Same-day is the highest-intent flow.
    it("allows TODAY's date at any hour (same-day delivery must keep working)", async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(group({ deliveryDate: TODAY_DATE }));

      const res = await post(makeRequest(), PARAMS);

      expect(res.status).toBe(200);
      expect(paymentsMock.createGroupV2CheckoutSession).toHaveBeenCalledOnce();
    });

    // LOCKED must stay payable: the lock stops new items, not payment for
    // items already in the cart, and every same-day tab auto-locks at ~3am CT.
    it('still allows checkout on a LOCKED tab with a valid date', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(group({ status: 'LOCKED' }));

      const res = await post(makeRequest(), PARAMS);

      expect(res.status).toBe(200);
      expect(paymentsMock.createGroupV2CheckoutSession).toHaveBeenCalledOnce();
    });

    // Cancellation is recorded on the GROUP, never the tab — sub_orders has
    // never held a CANCELLED row in production. A guard that only checked
    // tab.status was unreachable while real cancelled dashboards (with open
    // tabs and items in cart) stayed chargeable.
    it('refuses a CANCELLED group even when its tab looks perfectly OPEN', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(group({}, { status: 'CANCELLED' }));

      const res = await post(makeRequest(), PARAMS);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.code).toBe('ORDER_CANCELLED');
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    it('refuses a CANCELLED tab', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(group({ status: 'CANCELLED' }));

      const res = await post(makeRequest(), PARAMS);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.code).toBe('ORDER_CANCELLED');
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    it('refuses a FULFILLED tab', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(group({ status: 'FULFILLED' }));

      const res = await post(makeRequest(), PARAMS);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.code).toBe('TAB_FULFILLED');
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    // Cancelled short-circuits the date errors: telling someone to pick a new
    // date for a cancelled order sends them round a loop.
    it('reports cancellation, not the date, when a cancelled order also has a stale date', async () => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(
        group({ deliveryDate: PAST_DATE }, { status: 'CANCELLED' })
      );

      const res = await post(makeRequest(), PARAMS);
      const json = await res.json();

      expect(json.code).toBe('ORDER_CANCELLED');
    });
  });

  describe(`POST ${label} body validation`, () => {
    beforeEach(() => {
      serviceMock.getGroupOrderByCode.mockResolvedValue(group());
    });

    it('rejects a negative tip before it can reach Stripe', async () => {
      const res = await post(makeRequest({ tipAmount: -50 }), PARAMS);

      expect(res.status).toBe(400);
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    it('rejects a non-numeric tip', async () => {
      const res = await post(makeRequest({ tipAmount: 'lots' }), PARAMS);

      expect(res.status).toBe(400);
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    it('rejects a missing participantId', async () => {
      const res = await post(
        new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({}) }) as never,
        PARAMS
      );

      expect(res.status).toBe(400);
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    it('rejects a non-boolean smsConsent (A2P consent must never be coerced)', async () => {
      const res = await post(makeRequest({ smsConsent: 'yes' }), PARAMS);

      expect(res.status).toBe(400);
      expect(paymentsMock.createGroupV2CheckoutSession).not.toHaveBeenCalled();
    });

    it('accepts the exact body the real client sends', async () => {
      const res = await post(
        makeRequest({ discountCode: 'SAVE10', tipAmount: 12.5, phone: '512-555-1234', smsConsent: true }),
        PARAMS
      );

      expect(res.status).toBe(200);
      expect(paymentsMock.createGroupV2CheckoutSession).toHaveBeenCalledOnce();
    });
  });
}
