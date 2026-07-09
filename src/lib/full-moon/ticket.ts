/**
 * Full Moon Party ticket helpers (server-side).
 *
 * The ticket is sold as a zeroed DraftOrder (no delivery fee, no tax) that
 * rides the existing draft_order_invoice → Stripe → webhook pipeline. These
 * pure helpers keep the money math + validation out of the route so they can
 * be unit-tested.
 */
import { z } from 'zod';
import { MAX_TICKETS_PER_ORDER } from '@/components/full-moon/event';

/** Stripe session metadata key that marks an order as an event ticket. */
export const EVENT_TICKET_METADATA_FLAG = 'eventTicket';

/** Request body for POST /api/v1/full-moon/ticket. */
export const TicketPurchaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(40),
  quantity: z.coerce.number().int().min(1).max(MAX_TICKETS_PER_ORDER),
  // Server-enforced 21+ attestation (audit trail), not just a UI checkbox.
  ageConfirmed: z.literal(true),
  // Honeypot — accepted by the schema, rejected in the route if non-empty
  // (real users never fill it; bots do).
  hp_ticket_note: z.string().max(200).optional(),
  attribution: z
    .object({
      landingPage: z.string().max(200).optional(),
      utmSource: z.string().max(120).optional(),
      utmMedium: z.string().max(120).optional(),
      utmCampaign: z.string().max(120).optional(),
    })
    .partial()
    .optional(),
});

export type TicketPurchaseInput = z.infer<typeof TicketPurchaseSchema>;

export interface TicketAmounts {
  unitPrice: number;
  quantity: number;
  /** Order subtotal in dollars (unitPrice × quantity, rounded to cents). */
  subtotal: number;
  /** Per-ticket amount in cents for the Stripe line item. */
  unitAmountCents: number;
}

/**
 * Compute the ticket amounts from a unit price and a requested quantity.
 * Quantity is floored to a whole number and clamped to at least 1; callers
 * should still validate the upper bound (MAX_TICKETS_PER_ORDER) before this.
 */
export function computeTicketAmounts(unitPrice: number, quantity: number): TicketAmounts {
  const q = Math.max(1, Math.floor(quantity));
  const unitAmountCents = Math.round(unitPrice * 100);
  const subtotal = Math.round(unitPrice * q * 100) / 100;
  return { unitPrice, quantity: q, subtotal, unitAmountCents };
}

/** True when a Stripe session's metadata marks it as an event ticket. */
export function isEventTicketSession(metadata: Record<string, string> | null | undefined): boolean {
  return metadata?.[EVENT_TICKET_METADATA_FLAG] === '1';
}

/**
 * Whether selling `requested` more tickets would push total PAID sales past the
 * real hard cap. The public page advertises a lower capacity (50); this guards
 * the true physical limit (60) server-side so we never oversell the boat.
 *
 * Pure so it can be unit-tested. `sold` is the current PAID ticket count.
 */
export function wouldExceedHardCap(sold: number, requested: number, hardCap: number): boolean {
  return sold + requested > hardCap;
}

/** How many tickets can still be sold before hitting the hard cap (never negative). */
export function remainingUnderHardCap(sold: number, hardCap: number): number {
  return Math.max(0, hardCap - sold);
}

/**
 * Deterministic idempotency key for the Stripe session so rapid duplicate
 * submits (double-click, retry, second tab) resolve to the SAME session — and
 * therefore a single charge — within a short window. Buckets by ~5 minutes.
 */
export function ticketIdempotencyKey(email: string, quantity: number, nowMs: number): string {
  const bucket = Math.floor(nowMs / (5 * 60 * 1000));
  return `fm-ticket:${email.toLowerCase()}:${quantity}:${bucket}`;
}
