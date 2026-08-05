/**
 * The abandoned-cart export drives a $88K worked-list, so the number people
 * plan against must separate DEAD carts (cancelled / past delivery date) and
 * EXCLUDED rows (our own/test/outbound-prospect) from the recoverable subtotal.
 * These pin the classification so nobody works a dead cart or plans against a
 * number that silently includes them.
 */
import { describe, it, expect } from 'vitest';
import {
  cartValue,
  classifyDead,
  classifyExcluded,
  isUsableEmail,
  contactability,
  isRecoverable,
  ageDays,
  csvCell,
} from '../_abandoned-carts-lib.mjs';

describe('cartValue', () => {
  it('sums quantity × price (price is per-unit)', () => {
    expect(cartValue([{ quantity: 2, price: 10 }, { quantity: 1, price: 5.5 }])).toBe(25.5);
  });
  it('is 0 for empty / non-array / bad rows', () => {
    expect(cartValue([])).toBe(0);
    expect(cartValue(null)).toBe(0);
    expect(cartValue([{ quantity: 'x', price: null }])).toBe(0);
  });
});

describe('classifyDead', () => {
  const today = '2026-08-05';
  it('marks a cancelled group dead regardless of date', () => {
    expect(classifyDead('CANCELLED', '2027-01-01', today).dead).toBe(true);
  });
  it('marks a past delivery date dead', () => {
    expect(classifyDead('ACTIVE', new Date('2026-08-01T12:00:00Z'), today).dead).toBe(true);
  });
  it('keeps a future or today delivery date alive', () => {
    expect(classifyDead('ACTIVE', '2026-08-10', today).dead).toBe(false);
    expect(classifyDead('ACTIVE', '2026-08-05', today).dead).toBe(false);
  });
  it('keeps a dateless (born-dateless) cart alive — null means no date chosen yet', () => {
    expect(classifyDead('ACTIVE', null, today).dead).toBe(false);
  });
});

describe('classifyExcluded', () => {
  const outreach = new Set(['prospect@barco.com']);
  it('excludes INTERNAL-source dashboards', () => {
    expect(classifyExcluded({ source: 'INTERNAL', email: 'x@y.com' }, outreach).excluded).toBe(true);
  });
  it('excludes our own and test addresses', () => {
    for (const email of [
      'brian@partyondelivery.com',
      'allan+cart@gmail.com',
      'qa.test@gmail.com',
      'foo@example.com',
    ]) {
      expect(classifyExcluded({ source: 'DIRECT', email }, outreach).excluded, email).toBe(true);
    }
  });
  it('excludes hosts that are our own outbound prospects', () => {
    expect(
      classifyExcluded({ source: 'DIRECT', email: 'Prospect@Barco.com' }, outreach).excluded,
    ).toBe(true); // case-insensitive
  });
  it('keeps a genuine inbound customer', () => {
    expect(classifyExcluded({ source: 'DIRECT', email: 'jane@gmail.com' }, outreach).excluded).toBe(
      false,
    );
  });
  it('excludes OUR plus-addressed test aliases but NOT a real customer using plus-addressing', () => {
    expect(classifyExcluded({ source: 'DIRECT', email: 'allan+cart@gmail.com' }, outreach).excluded).toBe(
      true,
    );
    // Real customer plus-addressing must survive — this was over-excluded by a
    // bare /\+/ pattern before.
    expect(classifyExcluded({ source: 'DIRECT', email: 'jane+party@gmail.com' }, outreach).excluded).toBe(
      false,
    );
  });
});

describe('contactability', () => {
  it('prefers a usable email', () => {
    expect(contactability({ email: 'a@b.com', phone: '5125551212' })).toBe('email');
  });
  it('falls back to a 10+ digit phone', () => {
    expect(contactability({ email: 'not-an-email', phone: '(512) 555-1212' })).toBe('phone');
  });
  it('is none when neither is usable', () => {
    expect(contactability({ email: '', phone: '123' })).toBe('none');
  });
  it('isUsableEmail rejects fragments', () => {
    expect(isUsableEmail('an@gmail')).toBe(false);
    expect(isUsableEmail('an@gmail.com')).toBe(true);
  });
});

describe('isRecoverable', () => {
  it('needs alive AND not-excluded AND reachable', () => {
    expect(isRecoverable({ dead: false, excluded: false, contact: 'email' })).toBe(true);
    expect(isRecoverable({ dead: true, excluded: false, contact: 'email' })).toBe(false);
    expect(isRecoverable({ dead: false, excluded: true, contact: 'email' })).toBe(false);
    expect(isRecoverable({ dead: false, excluded: false, contact: 'none' })).toBe(false);
  });
});

describe('ageDays / csvCell', () => {
  it('computes whole-day age', () => {
    const now = Date.parse('2026-08-05T00:00:00Z');
    expect(ageDays('2026-08-01T00:00:00Z', now)).toBe(4);
  });
  it('csv-escapes commas, quotes, newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell(null)).toBe('');
  });
  it('neutralizes spreadsheet formula-injection payloads (customer-controlled names)', () => {
    // A host name like =HYPERLINK(...) must not execute when the CSV opens.
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+cmd')).toBe("'+cmd");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    // A formula payload that ALSO contains a comma gets both defenses.
    expect(csvCell('=HYPERLINK("x","y")')).toBe('"\'=HYPERLINK(""x"",""y"")"');
  });
});
