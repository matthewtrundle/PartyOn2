import { describe, it, expect } from 'vitest';
import { EVENT, TICKET_TAX_RATE, ticketTotals, TICKET_TOTAL_DISPLAY } from '@/components/full-moon/event';

/**
 * Ticket pricing is TAX-INCLUDED (2026-07-29): the card is charged a flat
 * $79 × qty, and the Order rows carry the backed-out net/tax split so the
 * Texas filing stays honest. These lock in three things: the charge is always
 * exactly the flat price (no checkout surprise), the split always sums to the
 * charge (charge-snapshot invariant), and tax is never silently zero (the
 * Aug 1 bug).
 */
describe('ticketTotals (tax-included)', () => {
  it('charges exactly the flat price and backs the tax out of it', () => {
    const { subtotal, tax, total } = ticketTotals(1);
    expect(total).toBe(79); // what the card is charged
    expect(subtotal).toBe(72.98); // net ticket revenue
    expect(tax).toBe(6.02); // included Texas sales tax
    expect(subtotal + tax).toBeCloseTo(total, 10);
  });

  it('stays linear in quantity — split × qty always equals flat price × qty', () => {
    for (let q = 1; q <= 8; q++) {
      const { subtotal, tax, total } = ticketTotals(q);
      expect(total).toBe(Math.round(79 * q * 100) / 100);
      expect(Math.round((subtotal + tax) * 100)).toBe(Math.round(total * 100));
    }
  });

  it('always returns whole cents', () => {
    // Compare against the 2-decimal rendering rather than `x * 100`, which
    // reintroduces float error (32.59 * 100 === 3259.0000000000005).
    for (let q = 1; q <= 8; q++) {
      const { subtotal, tax, total } = ticketTotals(q);
      expect(Number(subtotal.toFixed(2))).toBe(subtotal);
      expect(Number(tax.toFixed(2))).toBe(tax);
      expect(Number(total.toFixed(2))).toBe(total);
    }
  });

  it('never records zero tax on a paid ticket (the Aug 1 under-collection bug)', () => {
    for (let q = 1; q <= 8; q++) {
      expect(ticketTotals(q).tax).toBeGreaterThan(0);
    }
  });

  it('floors quantity at 1 so a 0/negative qty can never zero out the charge', () => {
    expect(ticketTotals(0).total).toBe(79);
    expect(ticketTotals(-3).total).toBe(79);
  });

  it('backs out at the shared 8.25% rate (net × (1 + rate) ≈ flat price)', () => {
    const { subtotal } = ticketTotals(1);
    expect(Math.round(subtotal * (1 + TICKET_TAX_RATE) * 100) / 100).toBeCloseTo(EVENT.price, 1);
  });

  it('exposes the flat all-in price for display copy', () => {
    expect(TICKET_TOTAL_DISPLAY).toBe('$79.00');
  });

  it('keeps the advertised price at the value the copy promises', () => {
    // Guards against bumping EVENT.price without revisiting the flat-price copy.
    expect(EVENT.price).toBe(79);
  });
});
