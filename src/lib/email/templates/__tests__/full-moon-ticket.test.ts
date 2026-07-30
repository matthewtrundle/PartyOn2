import { describe, it, expect } from 'vitest';
import {
  generateFullMoonTicketEmail,
  generateFullMoonTicketText,
  fullMoonTicketAmounts,
} from '../full-moon-ticket';

const BASE = {
  orderNumber: 439,
  customerName: 'Allan Test',
  customerEmail: 'allan@partyondelivery.com',
  quantity: 1,
  total: 79,
  taxAmount: 6.02,
};

describe('generateFullMoonTicketEmail', () => {
  it('personalizes with the first name only', () => {
    const html = generateFullMoonTicketEmail(BASE);
    expect(html).toContain('the boat, Allan');
    expect(html).not.toContain('the boat, Allan Test');
  });

  it("falls back to y'all when the name is empty", () => {
    const html = generateFullMoonTicketEmail({ ...BASE, customerName: '  ' });
    // Our own literal, not user input — rendered as-is.
    expect(html).toContain("the boat, y'all");
  });

  it('escapes hostile customer names (2026-07-23 html-escaping rule)', () => {
    const html = generateFullMoonTicketEmail({
      ...BASE,
      customerName: '<img src=x onerror=alert(1)>Bob',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('renders the tax-included receipt: flat total, included tax, no addition', () => {
    const html = generateFullMoonTicketEmail({ ...BASE, quantity: 4, total: 316, taxAmount: 24.08 });
    expect(html).toContain('General Admission &times; 4');
    expect(html).toContain('$316.00');
    expect(html).toContain('Includes Texas sales tax');
    expect(html).toContain('$24.08');
    // The old "+tax on top" total must never reappear.
    expect(html).not.toContain('342.07');
  });

  it('uses hosted image URLs, never data URIs (Gmail strips them)', () => {
    const html = generateFullMoonTicketEmail(BASE);
    expect(html).toContain('https://partyondelivery.com/images/full-moon/email/hero.jpg');
    expect(html).toContain('/images/full-moon/email/logo-glow.png');
    expect(html).not.toContain('data:image');
  });

  it('links the event terms and the share URL', () => {
    const html = generateFullMoonTicketEmail(BASE);
    expect(html).toContain('https://partyondelivery.com/full-moon-terms');
    expect(html).toContain('full-moon-aug28-share');
  });
});

describe('generateFullMoonTicketText', () => {
  it('carries the essentials for text-only clients', () => {
    const text = generateFullMoonTicketText(BASE);
    expect(text).toContain('#439');
    expect(text).toContain('$79.00');
    expect(text).toContain('$6.02');
    expect(text).toContain('full-moon-terms');
  });
});

describe('fullMoonTicketAmounts', () => {
  it('matches the tax-included split from ticketTotals', () => {
    expect(fullMoonTicketAmounts(1)).toEqual({ total: 79, taxAmount: 6.02 });
    expect(fullMoonTicketAmounts(4)).toEqual({ total: 316, taxAmount: 24.08 });
  });
});
