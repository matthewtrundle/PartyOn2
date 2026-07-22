import { describe, expect, it } from 'vitest';
import {
  generatePremiereCreditEmail,
  generatePremiereCreditText,
  premiereCreditSubject,
} from '../premiere-credit';

const data = {
  customerName: 'Sarah LeBlanc',
  code: 'LEBLANC33621',
  amount: 336.21,
  expiresAt: new Date('2026-09-20T12:00:00Z'),
  redeemUrl: 'https://partyondelivery.com',
};

describe('premiere-credit email', () => {
  it('renders the code, amount, and CTA', () => {
    const html = generatePremiereCreditEmail(data);
    expect(html).toContain('LEBLANC33621');
    expect(html).toContain('$336.21');
    expect(html).toContain('ORDER NOW');
    expect(html).toContain('one-time use');
  });

  it('states the expiry prominently — at least twice', () => {
    const html = generatePremiereCreditEmail(data);
    const occurrences = html.split('September 20, 2026').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('escapes HTML in the customer name', () => {
    const html = generatePremiereCreditEmail({ ...data, customerName: '<script>x</script> Doe' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('plaintext carries code + expiry, subject carries amount', () => {
    const text = generatePremiereCreditText(data);
    expect(text).toContain('LEBLANC33621');
    expect(text).toContain('September 20, 2026');
    expect(premiereCreditSubject(336.21)).toContain('$336.21');
  });
});
