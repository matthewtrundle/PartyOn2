import { describe, it, expect } from 'vitest';
import { calculateTax } from '@/lib/tax';
import { EVENT, TICKET_TAX_RATE, ticketTotals, TICKET_TOTAL_DISPLAY } from '@/components/full-moon/event';

/**
 * Ticket tax. The Aug 1 build charged $0 sales tax on a taxable amusement
 * service; these lock in that tax is charged, that the client-side breakdown
 * the buyer sees matches what the server actually bills, and that rounding
 * lands on whole cents.
 */
describe('ticketTotals', () => {
  it('adds 8.25% on top of the advertised price', () => {
    const { subtotal, tax, total } = ticketTotals(1);
    expect(subtotal).toBe(79);
    expect(tax).toBe(6.52); // 79 * 0.0825 = 6.5175 -> 6.52
    expect(total).toBe(85.52);
  });

  it('scales with quantity and taxes the whole subtotal', () => {
    const { subtotal, tax, total } = ticketTotals(4);
    expect(subtotal).toBe(316);
    expect(tax).toBe(26.07); // 316 * 0.0825 = 26.07
    expect(total).toBe(342.07);
  });

  it('always returns whole cents', () => {
    // Compare against the 2-decimal rendering rather than `x * 100`, which
    // reintroduces float error (32.59 * 100 === 3259.0000000000005).
    for (let q = 1; q <= 8; q++) {
      const { tax, total } = ticketTotals(q);
      expect(Number(tax.toFixed(2))).toBe(tax);
      expect(Number(total.toFixed(2))).toBe(total);
    }
  });

  it('floors quantity at 1 so a 0/negative qty can never zero out the charge', () => {
    expect(ticketTotals(0).total).toBe(85.52);
    expect(ticketTotals(-3).total).toBe(85.52);
  });

  it('exposes the all-in single-ticket price for display copy', () => {
    expect(TICKET_TOTAL_DISPLAY).toBe('$85.52');
  });
});

describe('client breakdown matches the server charge', () => {
  // The modal renders ticketTotals(); the route bills calculateTax(). If these
  // ever diverge the buyer is quoted one number and charged another.
  it('agrees with the tax lib for the marina zip at every allowed quantity', () => {
    for (let q = 1; q <= 8; q++) {
      const client = ticketTotals(q);
      const server = calculateTax({ taxableAmount: client.subtotal, zipCode: '78734' });
      expect(server.taxAmount).toBe(client.tax);
    }
  });

  it('uses the same rate the tax lib uses for the lake zips', () => {
    const { taxAmount } = calculateTax({ taxableAmount: 100, zipCode: '78734' });
    expect(taxAmount).toBe(Math.round(100 * TICKET_TAX_RATE * 100) / 100);
  });

  it('keeps the advertised price at the value the copy promises', () => {
    // Guards against bumping EVENT.price without revisiting the "+ tax" copy.
    expect(EVENT.price).toBe(79);
  });
});
