/**
 * Which email types may be shown in the lead drawer's timeline / body viewer.
 *
 * EmailLog is the shared log for EVERY transactional email — including
 * PASSWORD_RESET (a live account-takeover token in the body) and the affiliate
 * magic-link/payout mails. The lead timeline is keyed by recipient address, and
 * a lead is frequently also a real customer, so those credential-bearing emails
 * would otherwise surface for a lead who shares that address (security review
 * 2026-07-24, HIGH).
 *
 * This is an ALLOW-LIST, deliberately: a future credential-bearing EmailType
 * added to the enum is excluded by default (fail closed), never auto-exposed.
 */
import { EmailType } from '@prisma/client';

export const LEAD_VIEWABLE_EMAIL_TYPES: readonly EmailType[] = [
  EmailType.LEAD_REPLY,
  EmailType.FOLLOW_UP,
  EmailType.PARTNER_INQUIRY,
  EmailType.WELCOME,
  EmailType.INVOICE,
  EmailType.GROUP_ORDER_INVOICE,
  EmailType.RECEIPT,
  EmailType.ORDER_CONFIRMATION,
  EmailType.ORDER_CANCELLED,
  EmailType.DELIVERY_SCHEDULED,
  EmailType.DELIVERY_EN_ROUTE,
  EmailType.DELIVERY_COMPLETED,
  EmailType.PAYMENT_FAILED,
  EmailType.REFUND_PROCESSED,
];

const VIEWABLE = new Set<EmailType>(LEAD_VIEWABLE_EMAIL_TYPES);

/**
 * Excluded (never shown on a lead): PASSWORD_RESET, AFFILIATE_MAGIC_LINK,
 * AFFILIATE_WELCOME, AFFILIATE_PAYOUT — credentials / affiliate-account mail;
 * and PREMIERE_CREDIT, whose body embeds a live redeemable discount code
 * (security review 2026-07-24 follow-up). None are lead correspondence.
 */
export function isLeadViewableEmailType(type: EmailType): boolean {
  return VIEWABLE.has(type);
}
