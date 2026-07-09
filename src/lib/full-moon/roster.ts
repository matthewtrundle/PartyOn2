/**
 * Full Moon Party sales roster (server-side, ops-only data).
 *
 * Resolves every PAID order for the DRAFT ticket product into a roster row
 * (buyer name/email/phone, amount, ticket quantity, Stripe payment-intent id,
 * date) plus rolled-up totals. Shared by the ops roster endpoint, the deadline
 * cron, and the operator batch-refund script so they all agree on what "sold"
 * and "collected" mean.
 *
 * Money vs. headcount: a $0 comp (internalNote === 'full-moon-comp', e.g. the
 * host) COUNTS toward the headcount/minimum but is EXCLUDED from dollars
 * collected — matching how the count/guest-list endpoints treat it.
 */
import { prisma } from '@/lib/database/client';
import { EVENT, TICKET_PRODUCT_HANDLE } from '@/components/full-moon/event';

/** internalNote marker written by scripts/full-moon/comp-guest.mjs. */
export const FULL_MOON_COMP_NOTE = 'full-moon-comp';

/** One PAID Full Moon order. */
export interface RosterOrder {
  orderId: string;
  orderNumber: number;
  name: string;
  email: string;
  phone: string;
  /** Ticket-only revenue for this order, in dollars (0 for comps). */
  amount: number;
  /** Number of tickets on this order (sum of the ticket line-item quantities). */
  quantity: number;
  /** Stripe PaymentIntent id — null for $0 comps (no charge). */
  paymentIntentId: string | null;
  createdAt: string;
  financialStatus: string;
  /** True for a $0 comp / host row — counts toward headcount, not money. */
  isComp: boolean;
}

/** Rolled-up roster totals. */
export interface RosterTotals {
  /** Sum of ticket quantities across PAID orders, comps included. */
  ticketsSold: number;
  /** Count of paying (non-comp) orders. */
  payingOrders: number;
  /** Count of $0 comp orders. */
  compOrders: number;
  /** Dollars collected — paying orders only, comps excluded. */
  collected: number;
  minimum: number;
  /** Advertised capacity shown publicly (50). */
  advertisedCapacity: number;
  /** Real hard cap enforced server-side (60) — internal only. */
  hardCap: number;
  /** True once the headcount reaches the minimum. */
  overMinimum: boolean;
}

export interface FullMoonRoster {
  /** False if the ticket product doesn't exist yet. */
  productFound: boolean;
  orders: RosterOrder[];
  totals: RosterTotals;
}

/** Alias — this shape is generic across ticketed events, not Full-Moon-specific. */
export type TicketedEventRoster = FullMoonRoster;

/** Per-event thresholds a ticketed roster needs (each event has its own). */
export interface TicketedEventConfig {
  minimum: number;
  advertisedCapacity: number;
  hardCap: number;
  /** internalNote marker for $0 comps (defaults to the Full Moon marker). */
  compNote?: string;
}

/**
 * Build the full sales roster + totals for ANY ticketed event, identified by
 * its product handle. Money and headcount are scoped to the ticket line items,
 * so a bundled/mixed order can never inflate "$ collected". $0 comps count
 * toward the headcount but are excluded from money. Returns productFound=false
 * if the product doesn't exist yet.
 */
export async function getTicketedEventRoster(
  productHandle: string,
  cfg: TicketedEventConfig,
): Promise<TicketedEventRoster> {
  const compNote = cfg.compNote ?? FULL_MOON_COMP_NOTE;
  const emptyTotals: RosterTotals = {
    ticketsSold: 0,
    payingOrders: 0,
    compOrders: 0,
    collected: 0,
    minimum: cfg.minimum,
    advertisedCapacity: cfg.advertisedCapacity,
    hardCap: cfg.hardCap,
    overMinimum: false,
  };

  const product = await prisma.product.findUnique({
    where: { handle: productHandle },
    select: { id: true },
  });
  if (!product) {
    return { productFound: false, orders: [], totals: emptyTotals };
  }

  const orders = await prisma.order.findMany({
    where: {
      financialStatus: 'PAID',
      items: { some: { productId: product.id } },
    },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      deliveryPhone: true,
      createdAt: true,
      stripePaymentIntentId: true,
      internalNote: true,
      financialStatus: true,
      // Scope BOTH quantity and money to the ticket line items, so a bundled /
      // mixed order can never inflate the headcount or "$ collected".
      items: { where: { productId: product.id }, select: { quantity: true, totalPrice: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rosterOrders: RosterOrder[] = orders.map((o) => {
    const quantity = o.items.reduce((sum, it) => sum + it.quantity, 0);
    // Ticket-only revenue (never order.total, which could include other items).
    const amount = Math.round(o.items.reduce((sum, it) => sum + Number(it.totalPrice), 0) * 100) / 100;
    const isComp = o.internalNote === compNote || amount === 0;
    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      name: o.customerName,
      email: o.customerEmail,
      phone: o.customerPhone || o.deliveryPhone || '',
      amount,
      quantity,
      paymentIntentId: o.stripePaymentIntentId,
      createdAt: o.createdAt.toISOString(),
      financialStatus: String(o.financialStatus),
      isComp,
    };
  });

  const totals: RosterTotals = { ...emptyTotals };
  for (const row of rosterOrders) {
    totals.ticketsSold += row.quantity;
    if (row.isComp) {
      totals.compOrders += 1;
    } else {
      totals.payingOrders += 1;
      totals.collected += row.amount;
    }
  }
  totals.collected = Math.round(totals.collected * 100) / 100;
  totals.overMinimum = totals.ticketsSold >= cfg.minimum;

  return { productFound: true, orders: rosterOrders, totals };
}

/**
 * Full Moon Party sales roster — thin wrapper over getTicketedEventRoster using
 * the Full Moon ticket handle + thresholds from event.ts. Kept as the named
 * entry point for the ticket route, deadline cron, and batch-refund script.
 */
export async function getFullMoonRoster(): Promise<FullMoonRoster> {
  return getTicketedEventRoster(TICKET_PRODUCT_HANDLE, {
    minimum: EVENT.minimum,
    advertisedCapacity: EVENT.capacity,
    hardCap: EVENT.hardCap,
  });
}
