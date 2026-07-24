/**
 * Lead-viewable email allow-list — credential-bearing mail must never be
 * shown on a lead (a lead is often also a customer sharing that address).
 */
import { describe, it, expect } from 'vitest';
import { EmailType } from '@prisma/client';
import { isLeadViewableEmailType } from '../email-visibility';

describe('isLeadViewableEmailType', () => {
  it('blocks credential / affiliate / redeemable-code mail (fail closed)', () => {
    expect(isLeadViewableEmailType(EmailType.PASSWORD_RESET)).toBe(false);
    expect(isLeadViewableEmailType(EmailType.AFFILIATE_MAGIC_LINK)).toBe(false);
    expect(isLeadViewableEmailType(EmailType.AFFILIATE_WELCOME)).toBe(false);
    expect(isLeadViewableEmailType(EmailType.AFFILIATE_PAYOUT)).toBe(false);
    expect(isLeadViewableEmailType(EmailType.PREMIERE_CREDIT)).toBe(false);
  });

  it('allows lead correspondence + order/delivery mail', () => {
    for (const t of [
      EmailType.LEAD_REPLY,
      EmailType.FOLLOW_UP,
      EmailType.WELCOME,
      EmailType.INVOICE,
      EmailType.RECEIPT,
      EmailType.ORDER_CONFIRMATION,
      EmailType.DELIVERY_COMPLETED,
    ]) {
      expect(isLeadViewableEmailType(t)).toBe(true);
    }
  });
});
