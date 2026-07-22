import { describe, it, expect } from 'vitest';
import { detectEscalation } from '../escalation-keywords';
import { parseContact, hasContact } from '../parse-contact';

describe('detectEscalation', () => {
  it('flags refund / cancellation language', () => {
    expect(detectEscalation('I want a refund for Saturday')).toBe('refund');
    expect(detectEscalation('please cancel my order')).toBe('refund');
    expect(detectEscalation('my delivery never received')).toBe('refund');
  });

  it('flags complaints', () => {
    expect(detectEscalation('this is unacceptable and terrible')).toBe('complaint');
    expect(detectEscalation("I'm really disappointed")).toBe('complaint');
  });

  it('flags legal / fraud language', () => {
    expect(detectEscalation('I will call my lawyer')).toBe('legal');
    expect(detectEscalation('this is a scam')).toBe('legal');
  });

  it('flags safety: minors + intoxication + injury', () => {
    expect(detectEscalation('you delivered to my son and he is underage')).toBe('safety');
    expect(detectEscalation('the driver seemed drunk')).toBe('safety');
    expect(detectEscalation('someone got hurt on the boat')).toBe('safety');
    expect(detectEscalation('there are minors at this party')).toBe('safety');
  });

  it('orders most-serious first (safety beats a co-occurring refund word)', () => {
    expect(detectEscalation('someone got hurt, we need a refund')).toBe('safety');
  });

  it('does NOT flag benign messages', () => {
    expect(detectEscalation('what time do we board the boat?')).toBeNull();
    expect(detectEscalation('can I get a keg for saturday')).toBeNull();
    expect(detectEscalation('')).toBeNull();
  });

  it('does not trip safety on "a minor issue"', () => {
    expect(detectEscalation('just a minor issue with the ice, no big deal')).toBeNull();
  });
});

describe('parseContact', () => {
  it('extracts email, phone (last 10 digits), and first name', () => {
    const c = parseContact("Hey I'm Sarah, reach me at sarah.b@gmail.com or (512) 555-1234");
    expect(c.email).toBe('sarah.b@gmail.com');
    expect(c.phone).toBe('5125551234');
    expect(c.firstName).toBe('Sarah');
    expect(hasContact(c)).toBe(true);
  });

  it('normalizes +1 and punctuation in phones to last 10 digits', () => {
    expect(parseContact('call +1 512.555.9999').phone).toBe('5125559999');
    expect(parseContact('my number is 5125550000').phone).toBe('5125550000');
  });

  it('handles "my name is" and "this is"', () => {
    expect(parseContact('my name is Robert').firstName).toBe('Robert');
    expect(parseContact('this is Jessica, thanks!').firstName).toBe('Jessica');
  });

  it('does NOT read a verb after "I\'m" as a name', () => {
    // Regression: "I'm doing a wedding" used to capture the name "doing".
    expect(parseContact("I'm doing a wedding").firstName).toBeUndefined();
    expect(parseContact('I am planning a bachelorette').firstName).toBeUndefined();
    expect(parseContact("i'm looking for a keg").firstName).toBeUndefined();
    // A real capitalized name still parses, and phone is still captured alongside.
    const c = parseContact("I'm doing a wedding, my number is 512-555-1000");
    expect(c.firstName).toBeUndefined();
    expect(c.phone).toBe('5125551000');
  });

  it('returns nothing identifiable for a plain message', () => {
    const c = parseContact('do you deliver to 78704?');
    expect(c.email).toBeUndefined();
    // a bare 5-digit zip must not be read as a phone
    expect(c.phone).toBeUndefined();
    expect(hasContact(c)).toBe(false);
  });

  it('handles empty input', () => {
    expect(hasContact(parseContact(''))).toBe(false);
  });
});
