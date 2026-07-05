/**
 * Follow-up email system — suppression list + unsubscribe tokens.
 *
 * email_suppressions is the global do-not-email list for FOLLOW-UP sends.
 * Transactional emails (invoices, receipts, order confirmations) deliberately
 * bypass it — the pre-send check lives in the engine and in the optional
 * respectSuppression flag on sendEmailDetailed, never inside plain sendEmail.
 *
 * Unsubscribe URLs are HMAC-signed with UNSUBSCRIBE_SECRET so nobody can
 * unsubscribe someone else's address by guessing the URL.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/database/client';
import { SITE_BASE_URL } from './types';

export type SuppressionReason = 'unsubscribe' | 'bounce' | 'complaint' | 'manual';

/** Reasons a customer may publicly reverse on the preferences page. Bounces/complaints stay. */
const PUBLICLY_REVERSIBLE: SuppressionReason[] = ['unsubscribe', 'manual'];

/** Canonical form used everywhere in the follow-up system. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * HMAC token binding an email address to UNSUBSCRIBE_SECRET.
 * Returns null when the secret is not configured (engine refuses to run then).
 */
export function unsubscribeToken(email: string): string | null {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret)
    .update(normalizeEmail(email))
    .digest('hex')
    .slice(0, 32);
}

/** Constant-time verification of an unsubscribe token. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = unsubscribeToken(email);
  if (!expected || !token) return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Human-facing preferences page URL (used in the CAN-SPAM footer). */
export function buildPreferencesUrl(email: string): string {
  const normalized = normalizeEmail(email);
  const token = unsubscribeToken(normalized) ?? '';
  return `${SITE_BASE_URL}/email/preferences?email=${encodeURIComponent(normalized)}&token=${token}`;
}

/** RFC 8058 one-click POST target (used in the List-Unsubscribe header). */
export function buildOneClickUnsubscribeUrl(email: string): string {
  const normalized = normalizeEmail(email);
  const token = unsubscribeToken(normalized) ?? '';
  return `${SITE_BASE_URL}/api/email/unsubscribe?email=${encodeURIComponent(normalized)}&token=${token}`;
}

/** Is this address on the follow-up suppression list? */
export async function isSuppressed(email: string): Promise<boolean> {
  const row = await prisma.emailSuppression.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Add an address to the suppression list and cancel its scheduled follow-up
 * jobs. Idempotent. A harder reason (bounce/complaint) is never downgraded to
 * a softer one (unsubscribe) — resubscribing must not clear delivery problems.
 */
export async function suppress(
  email: string,
  reason: SuppressionReason,
  source?: string,
  note?: string
): Promise<{ suppressed: boolean; canceledJobs: number }> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) {
    return { suppressed: false, canceledJobs: 0 };
  }

  const existing = await prisma.emailSuppression.findUnique({
    where: { email: normalized },
  });

  if (!existing) {
    await prisma.emailSuppression.create({
      data: { email: normalized, reason, source, note },
    });
  } else if (
    PUBLICLY_REVERSIBLE.includes(existing.reason as SuppressionReason) &&
    !PUBLICLY_REVERSIBLE.includes(reason)
  ) {
    // Upgrade unsubscribe/manual → bounce/complaint; never the other way.
    await prisma.emailSuppression.update({
      where: { email: normalized },
      data: { reason, source, note },
    });
  }

  const canceled = await prisma.followUpJob.updateMany({
    where: { email: normalized, status: 'scheduled' },
    data: {
      status: 'suppressed',
      canceledAt: new Date(),
      cancelReason: `suppressed-${reason}`,
    },
  });

  return { suppressed: true, canceledJobs: canceled.count };
}

/**
 * Remove an address from the suppression list (resubscribe).
 * Publicly only reverses unsubscribe/manual rows; pass allowHardReasons for
 * admin-driven removal of bounce/complaint rows.
 */
export async function unsuppress(
  email: string,
  opts: { allowHardReasons?: boolean } = {}
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const existing = await prisma.emailSuppression.findUnique({
    where: { email: normalized },
  });
  if (!existing) return false;
  const reversible =
    opts.allowHardReasons ||
    PUBLICLY_REVERSIBLE.includes(existing.reason as SuppressionReason);
  if (!reversible) return false;
  await prisma.emailSuppression.delete({ where: { email: normalized } });
  return true;
}
