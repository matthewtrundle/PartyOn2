import { describe, it, expect } from 'vitest';
import {
  computeTicketAmounts,
  isEventTicketSession,
  ticketIdempotencyKey,
  TicketPurchaseSchema,
} from '../ticket';

describe('computeTicketAmounts', () => {
  it('computes subtotal and per-unit cents for a single ticket', () => {
    expect(computeTicketAmounts(69, 1)).toEqual({
      unitPrice: 69,
      quantity: 1,
      subtotal: 69,
      unitAmountCents: 6900,
    });
  });

  it('multiplies subtotal by quantity while keeping the unit amount fixed', () => {
    const r = computeTicketAmounts(69, 4);
    expect(r.quantity).toBe(4);
    expect(r.subtotal).toBe(276);
    expect(r.unitAmountCents).toBe(6900);
  });

  it('rounds cents cleanly for fractional prices', () => {
    const r = computeTicketAmounts(69.99, 3);
    expect(r.unitAmountCents).toBe(6999);
    expect(r.subtotal).toBe(209.97);
  });

  it('floors and clamps quantity to at least 1', () => {
    expect(computeTicketAmounts(69, 0).quantity).toBe(1);
    expect(computeTicketAmounts(69, -5).quantity).toBe(1);
    expect(computeTicketAmounts(69, 2.9).quantity).toBe(2);
  });
});

describe('isEventTicketSession', () => {
  it('is true only for the exact eventTicket=1 flag', () => {
    expect(isEventTicketSession({ eventTicket: '1' })).toBe(true);
  });

  it('is false for absent / null / other values (backward-compatible)', () => {
    expect(isEventTicketSession(null)).toBe(false);
    expect(isEventTicketSession(undefined)).toBe(false);
    expect(isEventTicketSession({})).toBe(false);
    expect(isEventTicketSession({ eventTicket: '0' })).toBe(false);
    expect(isEventTicketSession({ eventTicket: 'true' })).toBe(false);
    expect(isEventTicketSession({ type: 'draft_order_invoice' })).toBe(false);
  });
});

describe('ticketIdempotencyKey', () => {
  it('is stable for the same email+quantity within a 5-minute bucket', () => {
    const t = 1_800_000_000_000;
    expect(ticketIdempotencyKey('a@b.com', 2, t)).toBe(ticketIdempotencyKey('a@b.com', 2, t + 60_000));
  });

  it('differs across buckets, quantities, and emails; lowercases the email', () => {
    const t = 1_800_000_000_000;
    expect(ticketIdempotencyKey('a@b.com', 2, t)).not.toBe(ticketIdempotencyKey('a@b.com', 2, t + 6 * 60_000));
    expect(ticketIdempotencyKey('a@b.com', 2, t)).not.toBe(ticketIdempotencyKey('a@b.com', 3, t));
    expect(ticketIdempotencyKey('A@B.com', 2, t)).toBe(ticketIdempotencyKey('a@b.com', 2, t));
  });
});

describe('TicketPurchaseSchema', () => {
  const valid = { name: 'Sam', email: 'sam@example.com', phone: '5125551234', quantity: 2, ageConfirmed: true };

  it('accepts a well-formed purchase', () => {
    expect(TicketPurchaseSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects out-of-range, negative, or fractional quantities', () => {
    expect(TicketPurchaseSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(TicketPurchaseSchema.safeParse({ ...valid, quantity: 9 }).success).toBe(false);
    expect(TicketPurchaseSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(false);
    expect(TicketPurchaseSchema.safeParse({ ...valid, quantity: 2.5 }).success).toBe(false);
  });

  it('requires the 21+ attestation to be exactly true', () => {
    expect(TicketPurchaseSchema.safeParse({ ...valid, ageConfirmed: false }).success).toBe(false);
    const { ageConfirmed, ...noAge } = valid;
    void ageConfirmed;
    expect(TicketPurchaseSchema.safeParse(noAge).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(TicketPurchaseSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });
});
