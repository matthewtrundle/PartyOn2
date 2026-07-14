/**
 * Resend Email Client
 * Handles all transactional email sending for Party On Delivery
 */

import { Resend } from 'resend';
import { prisma } from '@/lib/database/client';
import { EmailType, EmailStatus } from '@prisma/client';

// Initialize Resend client. Sanitize whitespace/newlines that can sneak into
// env values — both real CR/LF bytes and literal `\n` / `\r` escape sequences
// from a quoted .env entry. Either form would corrupt the From header and
// cause Resend to reject sends with a 422 validation error.
const sanitizeEnv = (v: string | undefined) =>
  v ? v.replace(/\\[rn]/g, '').trim() : v;
const RESEND_API_KEY = sanitizeEnv(process.env.RESEND_API_KEY);
const FROM_EMAIL = sanitizeEnv(process.env.RESEND_FROM_EMAIL) || 'orders@partyondelivery.com';
const FROM_NAME = 'Party On Delivery';

if (!RESEND_API_KEY) {
  console.warn('[Email] RESEND_API_KEY not configured - emails will be logged but not sent');
}

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Optional attachment for outbound emails (matches Resend's attachment shape).
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

/**
 * Email sending options
 */
export interface SendEmailOptions {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  type: EmailType;
  orderId?: string;
  customerId?: string;
  draftOrderId?: string;
  metadata?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  /** Additional Resend tags for campaign / source tracking */
  tags?: Array<{ name: string; value: string }>;
  /** Extra headers (e.g. List-Unsubscribe) */
  headers?: Record<string, string>;
  /** Reply-To mailbox — where customer replies land (e.g. info@ for 1:1
      lead replies; without this they'd route to the From default). */
  replyTo?: string;
}

/**
 * Extended options for sendEmailDetailed.
 */
export interface SendEmailDetailedOptions extends SendEmailOptions {
  /** Override the From mailbox (default: RESEND_FROM_EMAIL / orders@). */
  from?: { email: string; name?: string };
  /**
   * Skip the send entirely (no EmailLog row) when the recipient is on the
   * follow-up suppression list. Leave unset for transactional email —
   * invoices and receipts must send regardless.
   */
  respectSuppression?: boolean;
}

/**
 * Result of sendEmailDetailed — exposes the EmailLog id (which sendEmail
 * does not) so callers like the follow-up engine can link the log row.
 */
export interface SendEmailDetailedResult {
  sent: boolean;
  emailLogId: string | null;
  resendId: string | null;
  /** True when the send was skipped because the recipient is suppressed. */
  suppressed?: boolean;
  error?: string;
}

/**
 * Send an email and log it
 */
export async function sendEmail(options: SendEmailOptions): Promise<string | null> {
  const result = await sendEmailDetailed(options);
  return result.resendId;
}

/**
 * Send an email and log it, returning the EmailLog id and Resend id.
 * Superset of sendEmail: optional From override + suppression check.
 */
export async function sendEmailDetailed(
  options: SendEmailDetailedOptions
): Promise<SendEmailDetailedResult> {
  const { to, cc, subject, html, text, type, orderId, customerId, draftOrderId, metadata, attachments, tags, headers, replyTo, from, respectSuppression } = options;

  if (respectSuppression) {
    // Lazy import keeps the common transactional path free of the check.
    const { isSuppressed } = await import('@/lib/followups/suppression');
    if (await isSuppressed(to)) {
      // No recipient/subject at INFO (PII rule, commit 85d4159f) — the
      // suppression row itself is the queryable record.
      console.log('[Email] Skipped (suppressed):', { type });
      return { sent: false, emailLogId: null, resendId: null, suppressed: true };
    }
  }

  // Create email log entry
  const emailLog = await prisma.emailLog.create({
    data: {
      type,
      to,
      subject,
      status: EmailStatus.PENDING,
      orderId,
      customerId,
      draftOrderId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });

  // If Resend is not configured, log and return
  if (!resend) {
    console.log('[Email] Would send email:', { to, subject, type });
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.FAILED,
        errorMessage: 'RESEND_API_KEY not configured',
      },
    });
    return { sent: false, emailLogId: emailLog.id, resendId: null, error: 'RESEND_API_KEY not configured' };
  }

  const fromEmail = sanitizeEnv(from?.email) || FROM_EMAIL;
  const fromName = sanitizeEnv(from?.name) || FROM_NAME;

  try {
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      ...(cc && cc.length > 0 ? { cc } : {}),
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
      ...(tags && tags.length > 0 ? { tags } : {}),
      ...(headers && Object.keys(headers).length > 0 ? { headers } : {}),
    });

    // Resend doesn't throw on rejected sends — it returns the error in
    // result.error. Surface it the same way as a thrown error.
    if (result.error) {
      const errorMessage = `${result.error.name || 'Resend error'}: ${result.error.message || JSON.stringify(result.error)}`;
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: EmailStatus.FAILED, errorMessage },
      });
      console.error('[Email] Failed to send:', { type, emailLogId: emailLog.id, error: result.error });
      return { sent: false, emailLogId: emailLog.id, resendId: null, error: errorMessage };
    }

    // Update log with success
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.SENT,
        resendId: result.data?.id,
        sentAt: new Date(),
      },
    });

    // Recipient/subject live on the EmailLog row — keep INFO logs PII-free.
    console.log('[Email] Sent successfully:', { type, emailLogId: emailLog.id, resendId: result.data?.id });
    return { sent: true, emailLogId: emailLog.id, resendId: result.data?.id || null };
  } catch (error) {
    // Update log with error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.FAILED,
        errorMessage,
      },
    });

    console.error('[Email] Failed to send:', { type, emailLogId: emailLog.id, error: errorMessage });
    return { sent: false, emailLogId: emailLog.id, resendId: null, error: errorMessage };
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format time for display
 */
export function formatTime(time: string): string {
  // Handle various time formats (e.g., "14:00", "2:00 PM")
  if (time.includes('AM') || time.includes('PM')) {
    return time;
  }
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
