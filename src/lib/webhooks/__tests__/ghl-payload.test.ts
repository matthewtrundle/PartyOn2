import { describe, expect, it } from 'vitest';
import { buildGhlPayload } from '../ghl';

/**
 * A2P 10DLC enforcement — the order.created payload boundary.
 *
 * The design decision (Allan, 2026-07-24 "keep transactional, fork now"): the
 * phone ALWAYS rides to GHL/CoreLinq so transactional order/delivery texts keep
 * working, and a separate `smsConsent` flag gates marketing/reminder campaigns.
 * These tests lock that invariant: consent controls only the flag, never the
 * phone.
 */

type OrderArg = Parameters<typeof buildGhlPayload>[0];

function orderFixture(overrides: Partial<OrderArg> = {}): OrderArg {
  return {
    id: 'order-1',
    orderNumber: 1234,
    customerName: 'Jane Buyer',
    customerEmail: 'jane@example.com',
    customerPhone: '5125550142',
    smsConsent: false,
    items: [
      { title: 'Tito\'s', variantTitle: '1L', quantity: 2, price: 24.99 },
    ],
    subtotal: 49.98,
    taxAmount: 4.12,
    deliveryFee: 20,
    discountAmount: 0,
    total: 74.1,
    deliveryDate: new Date('2026-08-01T12:00:00Z'),
    deliveryTime: '2:00 PM - 4:00 PM',
    deliveryAddress: { address1: '1 Main', city: 'Austin', province: 'TX', zip: '78701' },
    deliveryInstructions: null,
    createdAt: new Date('2026-07-24T00:00:00Z'),
    ...overrides,
  };
}

describe('buildGhlPayload — smsConsent egress (A2P enforcement)', () => {
  it('sets smsConsent:true and keeps the phone when the customer opted in', () => {
    const p = buildGhlPayload(orderFixture({ smsConsent: true }), 'standard');
    expect(p.smsConsent).toBe(true);
    expect(p.phone).toBe('5125550142');
    expect(p.customerPhone).toBe('5125550142');
  });

  it('sets smsConsent:false but STILL forwards the phone (transactional order texts survive)', () => {
    const p = buildGhlPayload(orderFixture({ smsConsent: false }), 'standard');
    expect(p.smsConsent).toBe(false);
    // The whole point: no marketing consent must NOT strip the phone — the
    // order/delivery confirmation text is transactional and still allowed.
    expect(p.phone).toBe('5125550142');
    expect(p.customerPhone).toBe('5125550142');
  });

  it('coerces a missing consent value to false (fail closed) and never emits a truthy non-boolean', () => {
    // Simulate a legacy/raw order object lacking the column.
    const raw = orderFixture();
    delete (raw as { smsConsent?: boolean }).smsConsent;
    const p = buildGhlPayload(raw, 'standard');
    expect(p.smsConsent).toBe(false);
  });

  it('keeps an empty phone empty regardless of consent (no phone captured)', () => {
    const p = buildGhlPayload(orderFixture({ customerPhone: null, smsConsent: true }), 'free');
    expect(p.phone).toBe('');
    expect(p.customerPhone).toBe('');
    // Consent flag is independent of phone presence at this boundary.
    expect(p.smsConsent).toBe(true);
  });
});
