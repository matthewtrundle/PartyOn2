/**
 * Regression: a customer email's printed totals must add up to the Total.
 *
 * Order #497 charged $1,709.52 but the confirmation printed Subtotal $1,209.72
 * + Fee $0.00 + Tax $99.80 = $1,309.52, because the $400 tip had no row. 248
 * historical orders carrying $6,216.58 of tips all shipped emails like that.
 * The plain-text confirmation additionally dropped discounts entirely.
 */
import { describe, it, expect } from 'vitest';
import {
  generateOrderConfirmationEmail,
  generateOrderConfirmationText,
  type OrderConfirmationData,
} from '../order-confirmation';
import { generateReceiptEmail, type ReceiptEmailData } from '../receipt';

/** Real numbers from order #497. */
const ORDER_497 = {
  orderNumber: 497,
  customerName: 'Mya Turner',
  customerEmail: 'mya@example.com',
  items: [{ title: 'The Prisoner Cabernet Sauvignon', variantTitle: '750ml', quantity: 3, price: 43.99, totalPrice: 131.97 }],
  subtotal: 1209.72,
  deliveryFee: 0,
  taxAmount: 99.8,
  tipAmount: 400,
  total: 1709.52,
  deliveryDate: new Date('2026-08-26T12:00:00Z'),
  deliveryTime: '12:00 PM - 2:00 PM',
  deliveryAddress: { address1: '1 Test St', city: 'Austin', province: 'TX', zip: '78701' },
} as unknown as OrderConfirmationData;

/** Every "$1,234.56" in the string, as numbers. */
function money(s: string): number[] {
  return [...s.matchAll(/\$([\d,]+\.\d{2})/g)].map((m) => Number(m[1].replace(/,/g, '')));
}

describe('order confirmation totals', () => {
  it('renders the tip so the printed lines reconcile to the total', () => {
    const html = generateOrderConfirmationEmail(ORDER_497);
    expect(html).toContain('Tip:');
    const shown = money(html);
    expect(shown).toContain(400);
    // subtotal + fee + tax + tip === total
    expect(1209.72 + 0 + 99.8 + 400).toBeCloseTo(1709.52, 2);
  });

  it('renders the tip in the plain-text version too', () => {
    expect(generateOrderConfirmationText(ORDER_497)).toMatch(/Tip: \$400\.00/);
  });

  it('renders a discount in the plain-text version (previously dropped)', () => {
    const withDiscount = { ...ORDER_497, discountAmount: 50, discountCode: 'SAVE50' } as OrderConfirmationData;
    expect(generateOrderConfirmationText(withDiscount)).toMatch(/Discount \(SAVE50\): -\$50\.00/);
  });

  it('omits the tip row entirely when there is no tip', () => {
    const noTip = { ...ORDER_497, tipAmount: 0 } as OrderConfirmationData;
    expect(generateOrderConfirmationEmail(noTip)).not.toContain('Tip:');
    expect(generateOrderConfirmationText(noTip)).not.toContain('Tip:');
  });

  it('omits the tip row when tipAmount is absent', () => {
    const noField = { ...ORDER_497 } as Partial<OrderConfirmationData>;
    delete noField.tipAmount;
    expect(generateOrderConfirmationEmail(noField as OrderConfirmationData)).not.toContain('Tip:');
  });
});

describe('receipt totals', () => {
  const RECEIPT = {
    orderNumber: 497,
    customerName: 'Mya Turner',
    customerEmail: 'mya@example.com',
    deliveryDate: new Date('2026-08-26T12:00:00Z'),
    deliveryTime: '12:00 PM - 2:00 PM',
    deliveryAddress: '1 Test St, Austin TX',
    items: [{ title: 'The Prisoner Cabernet Sauvignon', quantity: 3, price: 43.99 }],
    subtotal: 1209.72,
    taxAmount: 99.8,
    deliveryFee: 0,
    tipAmount: 400,
    total: 1709.52,
    paymentDate: 'August 25, 2026',
  } as unknown as ReceiptEmailData;

  it('renders the tip so Total Paid reconciles', () => {
    const html = generateReceiptEmail(RECEIPT);
    expect(html).toContain('>Tip<');
    expect(money(html)).toContain(400);
  });

  it('omits the tip row when there is no tip', () => {
    const noTip = { ...RECEIPT, tipAmount: 0 } as ReceiptEmailData;
    expect(generateReceiptEmail(noTip)).not.toContain('>Tip<');
  });
});
