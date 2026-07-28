import { describe, expect, it } from 'vitest';
import { resolveOrderSmsConsent } from '../order-sms-consent';

describe('resolveOrderSmsConsent — A2P phone binding', () => {
  it('honors consent when the consented phone matches the order phone', () => {
    expect(resolveOrderSmsConsent('true', '512-555-0142', '+15125550142')).toBe(true);
    // Different formatting, same last 10 digits.
    expect(resolveOrderSmsConsent('true', '(512) 555-0142', '5125550142')).toBe(true);
  });

  it('DENIES consent when the order phone differs from the consented phone', () => {
    // Customer checked the box next to .0142 but Stripe collected .0199 — the
    // owner of .0199 never consented, so marketing must not be authorized.
    expect(resolveOrderSmsConsent('true', '5125550142', '5125550199')).toBe(false);
  });

  it("denies when metadata consent is not exactly 'true'", () => {
    expect(resolveOrderSmsConsent('false', '5125550142', '5125550142')).toBe(false);
    expect(resolveOrderSmsConsent(undefined, '5125550142', '5125550142')).toBe(false);
  });

  it('denies (fail closed) when either phone is missing or too short', () => {
    expect(resolveOrderSmsConsent('true', null, '5125550142')).toBe(false);
    expect(resolveOrderSmsConsent('true', '5125550142', null)).toBe(false);
    expect(resolveOrderSmsConsent('true', '5125550142', undefined)).toBe(false);
    expect(resolveOrderSmsConsent('true', '123', '123')).toBe(false); // < 7 digits
  });
});
