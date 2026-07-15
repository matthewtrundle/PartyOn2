/**
 * Gmail API client for the info@ inbound-email poller.
 *
 * Uses a service account with DOMAIN-WIDE DELEGATION: the account impersonates
 * the mailbox (`subject`) to read its INBOX. That delegation + the
 * gmail.readonly scope must be authorized in the Google Workspace admin console
 * before this works (see docs/inbound-email-setup.md) — until then Google 401s
 * the token request and the caller logs (message only) + no-ops.
 *
 * Read-only on Gmail: we never modify labels or mark-as-read. Idempotency is
 * tracked in our own DB (inbound_emails.gmail_message_id is UNIQUE), so
 * gmail.readonly is sufficient (least privilege).
 *
 * Prefers a DEDICATED Gmail service account (GMAIL_SERVICE_ACCOUNT_EMAIL /
 * GMAIL_PRIVATE_KEY). Domain-wide delegation is keyed on (client-id, scope),
 * NOT on the subject — so granting gmail.readonly to the shared analytics
 * account (GOOGLE_*) would let that key impersonate ANY mailbox in the domain.
 * A dedicated account keeps that blast radius off the analytics key. Falls back
 * to GOOGLE_* when the dedicated one isn't set.
 */
import { google, type gmail_v1 } from 'googleapis';

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const DEFAULT_MAILBOX = 'info@partyondelivery.com';

/** Mailbox whose INBOX we ingest. Override with GMAIL_INBOUND_ADDRESS. */
export function inboundMailbox(): string {
  return process.env.GMAIL_INBOUND_ADDRESS?.trim() || DEFAULT_MAILBOX;
}

/** Dedicated Gmail SA if set, else the shared analytics SA. Null if neither. */
function gmailCredentials(): { email: string; key: string } | null {
  const email = process.env.GMAIL_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GMAIL_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  // Vercel stores the PEM with escaped newlines — same unescape as the GA4/GSC helper.
  return { email, key: key.replace(/\\n/g, '\n') };
}

/** True when the service-account creds needed for Gmail delegation are present. */
export function isGmailInboundConfigured(): boolean {
  return gmailCredentials() !== null;
}

/**
 * A gmail_v1 client authenticated as the service account impersonating the
 * inbound mailbox, or null when creds are absent (caller no-ops). The token
 * request only succeeds once domain-wide delegation is granted in Workspace.
 */
export function getGmailClient(): gmail_v1.Gmail | null {
  const creds = gmailCredentials();
  if (!creds) return null;
  const auth = new google.auth.JWT({
    email: creds.email,
    key: creds.key,
    scopes: [GMAIL_READONLY_SCOPE],
    subject: inboundMailbox(),
  });
  return google.gmail({ version: 'v1', auth });
}

/**
 * Log-safe description of an error — message + status only, never the raw
 * object. A Google `GaxiosError` carries `.config` (the request body, which
 * includes the signed JWT assertion — a bearer-equivalent credential) and
 * `.response`; Node's console prints those in full, so logging the raw error
 * would leak the assertion into the log stream (CWE-532). Use this everywhere
 * a Gmail/Prisma error is logged.
 */
export function safeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const e = err as Error & { code?: unknown; response?: { status?: unknown } };
  const status = e.response?.status ?? e.code;
  return status != null ? `${e.message} (status=${String(status)})` : e.message;
}
