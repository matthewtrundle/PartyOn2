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

  it('parses a "phone--name--email" paste without mangling the email or dropping the name', () => {
    // Regression: real WAYNE_CHAT lead (leads.id 7802a299…, 2026-08-28) typed
    // phone + name + email jammed together with "--". The old email regex let
    // "nicaj--" become part of the local-part (stored `nicaj--hello@…`) and the
    // name was left NULL. Email must be clean and the name must split First/Last.
    const c = parseContact(
      "5126224061--anthony nicaj--hello@happycookingatx.com We're looking for more information on coolers and ice...",
    );
    expect(c.email).toBe('hello@happycookingatx.com');
    expect(c.phone).toBe('5126224061');
    expect(c.firstName).toBe('Anthony');
    expect(c.lastName).toBe('Nicaj');
    expect(hasContact(c)).toBe(true);
  });

  it('keeps genuine hyphens/dots/plus inside an email local-part', () => {
    // The "--" fix must not over-restrict: a single hyphen (or dot/plus) is a
    // valid local-part separator and stays part of the address.
    expect(parseContact('reach me at mary-jane.smith+parties@example.co.uk').email).toBe(
      'mary-jane.smith+parties@example.co.uk',
    );
  });

  it('handles the paste in email-first order too (the "--" after the domain)', () => {
    // "-" is legal in a domain as well, so the boundary has to hold on both
    // sides of the "@", not just the local-part.
    const c = parseContact('hello@happycookingatx.com--anthony nicaj--5126224061');
    expect(c.email).toBe('hello@happycookingatx.com');
    expect(c.phone).toBe('5126224061');
    expect(c.firstName).toBe('Anthony');
    expect(c.lastName).toBe('Nicaj');
  });

  it('accepts accented names in the paste', () => {
    const c = parseContact('5125551234--José García--jose@example.com');
    expect(c.firstName).toBe('José');
    expect(c.lastName).toBe('García');
  });

  it('does NOT mint a name from prose "--" next to a phone number', () => {
    // A typed em-dash is not a contact dump. One-word segments, sign-offs, and
    // pronoun phrases must all stay unnamed — a wrong name reaches the CRM.
    expect(parseContact('call me at 5125551234 -- no rush').firstName).toBeUndefined();
    expect(parseContact('5125551234 -- Best regards').firstName).toBeUndefined();
    expect(parseContact('5126224061--austin--hello@x.com').firstName).toBeUndefined();
    expect(parseContact('5125551234 -- we are flexible').firstName).toBeUndefined();
  });

  it('only mines a name from the line that carries the phone/email', () => {
    // capture.ts joins every user message with "\n"; a "--" in an earlier
    // message plus a number given later must not combine into a name, and two
    // one-word replies on adjacent lines must not read as First Last.
    const c = parseContact("we're doing a party -- big one -- Saturday\nmy number is 5125551234");
    expect(c.phone).toBe('5125551234');
    expect(c.firstName).toBeUndefined();
    expect(parseContact('Yes\nAnthony--5126224061--hello@x.com').firstName).toBeUndefined();
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
