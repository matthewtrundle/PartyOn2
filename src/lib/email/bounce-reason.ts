/**
 * Bounce-reason formatting for the Resend webhook.
 *
 * Resend's `email.bounced` event carries a `bounce` object
 * ({ type, subType, message }) that we previously dropped — EmailLog rows
 * showed BOUNCED with no way to tell "mailbox does not exist" from
 * "mailbox full" without opening the Resend dashboard. This composes the
 * parts into one human-readable line for EmailLog.errorMessage, e.g.
 * "Permanent/General: The recipient's mailbox does not exist."
 *
 * Pure + defensive: every field is optional (webhook payloads are untrusted
 * external data), and the result is clamped so an oversized upstream message
 * can never bloat the row.
 */

/** Shape of Resend's bounce payload — all fields optional by design. */
export interface ResendBounceInfo {
  message?: string;
  type?: string;
  subType?: string;
}

/** Max stored length — generous for real SMTP diagnostics, hostile-proof. */
export const BOUNCE_REASON_MAX_LENGTH = 500;

/**
 * Compose a single-line bounce reason from Resend's bounce object.
 * Returns null when there is nothing usable to record (missing/empty object),
 * so callers can skip the write entirely.
 */
export function formatBounceReason(bounce?: ResendBounceInfo | null): string | null {
  if (!bounce) return null;
  const type = typeof bounce.type === 'string' ? bounce.type.trim() : '';
  const subType = typeof bounce.subType === 'string' ? bounce.subType.trim() : '';
  const message = typeof bounce.message === 'string' ? bounce.message.trim() : '';

  const kind = [type, subType].filter(Boolean).join('/');
  const composed = kind && message ? `${kind}: ${message}` : kind || message;
  if (!composed) return null;
  return composed.slice(0, BOUNCE_REASON_MAX_LENGTH);
}
