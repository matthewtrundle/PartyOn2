/**
 * HTML-escaping regression tests for the transactional email templates
 * (security review HIGH-1, PR #306 follow-up).
 *
 * Customer-controlled fields (name, delivery instructions, address, and — for
 * defense-in-depth — item titles) are interpolated into HTML email bodies that
 * are sent from a domain-authenticated (SPF/DKIM) address and sometimes CC'd to
 * affiliate partners. `sanitizeName` upstream strips control/format chars but
 * deliberately leaves `<`/`>`/`&` intact, so these templates MUST HTML-escape.
 *
 * NOTE: the `firstName`-style templates render only `customerName.split(/\s+/)[0]`
 * (the first whitespace token), so those cases use a space-free payload to prove
 * the tag reaches the sink; full-name / free-text sinks use a spaced payload.
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../escape-html';
import { generateOrderConfirmationEmail } from '../order-confirmation';
import { generateDeliveryEnRouteEmail, generateDeliveryCompletedEmail } from '../delivery-update';
import { generateInvoiceEmail } from '../invoice';
import { generateOrderCancellationEmail } from '../order-cancellation';
import { generateReceiptEmail } from '../receipt';
import { eventAbandonedCartEmail } from '../event-abandoned-cart';

const TAG = '<script>alert(1)</script>'; // space-free — survives the firstName split
const ESCAPED = '&lt;script&gt;alert(1)&lt;/script&gt;';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
  it('coerces null/undefined to empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
  it('replaces & first so it does not double-encode', () => {
    expect(escapeHtml('a<b')).toBe('a&lt;b');
  });
});

describe('order-confirmation email escapes customer fields', () => {
  const html = generateOrderConfirmationEmail({
    orderNumber: 1,
    customerName: TAG,
    customerEmail: 'a@b.com',
    items: [{ title: TAG, variantTitle: null, quantity: 1, price: 10, totalPrice: 10 }],
    subtotal: 10,
    deliveryFee: 0,
    taxAmount: 0,
    total: 10,
    deliveryDate: new Date('2026-08-01T12:00:00Z'),
    deliveryTime: '5:00 PM - 5:30 PM',
    deliveryAddress: { address1: TAG, city: 'Austin', province: 'TX', zip: '78701' },
    deliveryInstructions: TAG,
  });
  it('does not emit the raw <script> tag anywhere', () => {
    expect(html).not.toContain('<script>');
  });
  it('emits the escaped name, instructions, address, and item title', () => {
    expect(html).toContain(ESCAPED);
  });
});

describe('delivery-update (en route) email escapes customer fields', () => {
  const html = generateDeliveryEnRouteEmail({
    orderNumber: 1,
    customerName: TAG,
    deliveryDate: new Date('2026-08-01T12:00:00Z'),
    deliveryTime: '5:00 PM',
    deliveryAddress: { address1: TAG, city: 'Austin', province: 'TX', zip: '78701' },
    driverName: TAG,
    estimatedArrival: '5:30 PM',
  });
  it('does not emit the raw <script> tag (name, driver, address)', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain(ESCAPED);
  });
});

describe('delivery-update (completed) email escapes the customer name', () => {
  const html = generateDeliveryCompletedEmail({
    orderNumber: 1,
    customerName: TAG,
    deliveryDate: new Date('2026-08-01T12:00:00Z'),
    deliveryTime: '5:00 PM',
    deliveryAddress: { address1: '1 Main', city: 'Austin', province: 'TX', zip: '78701' },
    total: 42,
  });
  it('does not emit the raw <script> tag', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain(ESCAPED);
  });
});

describe('invoice email escapes customer fields', () => {
  const html = generateInvoiceEmail({
    customerName: TAG,
    deliveryDate: new Date('2026-08-01T12:00:00Z'),
    deliveryTime: '5:00 PM',
    deliveryAddress: TAG,
    deliveryCity: 'Austin',
    deliveryState: 'TX',
    deliveryZip: '78701',
    items: [{ title: TAG, quantity: 1, price: 10 }],
    subtotal: 10,
    taxAmount: 0,
    deliveryFee: 0,
    discountAmount: 0,
    total: 10,
    invoiceUrl: 'https://partyondelivery.com/invoice/abc',
    personalNote: TAG,
  });
  it('does not emit the raw <script> tag (name, address, personalNote, item)', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain(ESCAPED);
  });
});

describe('order-cancellation email escapes the full customer name', () => {
  // Full customerName is rendered (not just the first token), so a spaced payload works.
  const html = generateOrderCancellationEmail({
    customerName: `Mallory ${TAG}`,
    orderNumber: 1,
    total: 10,
    items: [{ title: TAG, quantity: 1, price: 10 }],
  });
  it('does not emit the raw <script> tag', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain(ESCAPED);
  });
});

describe('receipt email escapes customer fields', () => {
  const html = generateReceiptEmail({
    orderNumber: 1,
    customerName: `Mallory ${TAG}`,
    customerEmail: 'a@b.com',
    deliveryDate: new Date('2026-08-01T12:00:00Z'),
    deliveryTime: '5:00 PM',
    deliveryAddress: TAG,
    items: [{ title: TAG, variantTitle: null, quantity: 1, price: 10 }],
    subtotal: 10,
    taxAmount: 0,
    deliveryFee: 0,
    total: 10,
    paymentDate: '2026-08-01',
  });
  it('does not emit the raw <script> tag (name, address, item)', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain(ESCAPED);
  });
});

describe('event abandoned-cart email escapes its fields', () => {
  // Unlike the others this one renders from an UNAUTHENTICATED endpoint's
  // output, and it has an href sink. Deeper coverage lives in
  // ./event-abandoned-cart.test.ts; this keeps it in the shared sweep.
  const { html } = eventAbandonedCartEmail({
    firstName: TAG,
    eventTitle: TAG,
    eventDateLine: TAG,
    eventVenue: TAG,
    eventAddress: TAG,
    resumeUrl: 'https://partyondelivery.com/events/x',
    unsubscribeUrl: 'https://partyondelivery.com/email/preferences?email=a%40b.com&token=t',
    itemCount: 2,
    cartTotal: 40,
  });
  it('does not emit the raw <script> tag (name, title, venue, address, date)', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain(ESCAPED);
  });
});
