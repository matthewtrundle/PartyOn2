/**
 * Pure parsing + noise-filtering for the inbound-email poller. No Prisma, no
 * network — unit-tested in isolation. Operates on the Gmail message shape
 * (gmail_v1.Schema$Message) the poller fetches with format=full.
 *
 * "Only likely inquiries" (operator decision 2026-07-14): person-to-person mail
 * boards; no-reply / bulk / list / auto-generated mail is filtered out so the
 * sales board doesn't fill with vendor spam and newsletters.
 */
import type { gmail_v1 } from 'googleapis';

/** Headers we keep — enough to filter noise and show provenance, not the whole blob. */
const KEPT_HEADERS = [
  'from',
  'to',
  'subject',
  'date',
  'reply-to',
  'list-unsubscribe',
  'list-id',
  'precedence',
  'auto-submitted',
] as const;

const MAX_BODY_CHARS = 16_000;

export interface ParsedInbound {
  gmailMessageId: string;
  gmailThreadId: string | null;
  fromEmail: string;
  fromName: string | null;
  toAddress: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  receivedAt: Date;
  /** Lower-cased whitelist of headers (see KEPT_HEADERS). */
  headers: Record<string, string>;
}

function collectHeaders(raw: gmail_v1.Schema$MessagePartHeader[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of raw ?? []) {
    const name = h.name?.toLowerCase();
    if (name && h.value != null && (KEPT_HEADERS as readonly string[]).includes(name)) {
      out[name] = h.value;
    }
  }
  return out;
}

/** `"Jane Doe" <jane@x.com>` / `Jane <jane@x.com>` / `jane@x.com` → parts. */
export function parseAddress(raw: string | null | undefined): { email: string | null; name: string | null } {
  if (!raw) return { email: null, name: null };
  const s = raw.trim();
  const angle = /<([^>]+)>/.exec(s);
  const email = (angle ? angle[1] : s).trim().toLowerCase();
  const name = angle ? s.slice(0, angle.index).trim().replace(/^"|"$/g, '').trim() || null : null;
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return { email: valid ? email : null, name };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'");
}

function stripHtml(html: string): string {
  // Decode entities FIRST, then strip tags. If we stripped first, a body like
  // `&amp;lt;img onerror=...&gt;` would survive the strip (no literal `<...>`)
  // and then decode into a literal tag in the stored text — a latent
  // HTML-injection payload for the planned reply/quote-original feature.
  return decodeHtmlEntities(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeB64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

/** First part matching `mime`, walking multipart trees depth-first. */
function findMimeData(part: gmail_v1.Schema$MessagePart | undefined, mime: string): string | null {
  if (!part) return null;
  if (part.mimeType === mime && part.body?.data) return decodeB64Url(part.body.data);
  for (const child of part.parts ?? []) {
    const found = findMimeData(child, mime);
    if (found) return found;
  }
  return null;
}

/** Plaintext body — prefer text/plain, fall back to stripped text/html. Capped. */
export function extractBodyText(payload: gmail_v1.Schema$MessagePart | undefined): string | null {
  const plain = findMimeData(payload, 'text/plain');
  let text: string | null;
  if (plain) {
    text = plain;
  } else {
    const html = findMimeData(payload, 'text/html');
    // Root single-part fallback only when it's actually text — never decode a
    // lone application/* part as utf8. Cap the HTML fed to the regex passes so
    // a multi-MB body isn't fully processed before the char cap below applies.
    const rootIsText = payload?.mimeType?.startsWith('text/') ?? false;
    text = html
      ? stripHtml(html.slice(0, 4 * MAX_BODY_CHARS))
      : rootIsText && payload?.body?.data
        ? decodeB64Url(payload.body.data)
        : null;
  }
  if (!text) return null;
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  return trimmed.length > MAX_BODY_CHARS ? trimmed.slice(0, MAX_BODY_CHARS) : trimmed;
}

/** Parse a Gmail message into our shape, or null if it has no usable sender. */
export function parseGmailMessage(msg: gmail_v1.Schema$Message): ParsedInbound | null {
  if (!msg.id) return null;
  const payload = msg.payload ?? undefined;
  const headers = collectHeaders(payload?.headers ?? undefined);
  const from = parseAddress(headers['from']);
  if (!from.email) return null; // can't anchor a lead or dedupe without a sender

  const fromInternal = msg.internalDate ? new Date(Number(msg.internalDate)) : null;
  const fromDate = headers['date'] ? new Date(headers['date']) : null;
  const receivedAt =
    fromInternal && !Number.isNaN(fromInternal.getTime())
      ? fromInternal
      : fromDate && !Number.isNaN(fromDate.getTime())
        ? fromDate
        : new Date();

  return {
    gmailMessageId: msg.id,
    gmailThreadId: msg.threadId ?? null,
    fromEmail: from.email,
    fromName: from.name,
    toAddress: headers['to'] ?? null,
    subject: headers['subject'] ?? null,
    snippet: msg.snippet ? decodeHtmlEntities(msg.snippet).trim() || null : null,
    bodyText: extractBodyText(payload),
    receivedAt,
    headers,
  };
}

// Anchored AND boundary-guarded (the token must be the whole local-part or end
// at a separator/digit) so real people — notifyjane@, updateme@, bouncer@,
// mailerman@ — aren't dropped. Ambiguous words (notify/updates/alerts) are left
// to the stronger List-*/Precedence/Auto-Submitted header checks below.
const AUTOMATED_LOCALPART =
  /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|mailer|postmaster|bounces?|notifications?|newsletter|auto-?confirm|automated)(?=$|[._+-]|\d)/i;

/**
 * Should this inbound email become a lead card? Filters out our own mail and
 * the automated/bulk/list traffic info@ collects, keeping person-to-person
 * inquiries. Returns a reason on skip so the poller can log it quietly.
 */
export function shouldIngestInbound(parsed: ParsedInbound): { ingest: boolean; reason?: string } {
  const email = parsed.fromEmail.toLowerCase();
  if (!email) return { ingest: false, reason: 'no-sender' };
  if (email.endsWith('@partyondelivery.com')) return { ingest: false, reason: 'self' };

  const localPart = email.split('@')[0] ?? '';
  if (AUTOMATED_LOCALPART.test(localPart)) return { ingest: false, reason: 'automated-sender' };

  const h = parsed.headers;
  if (h['list-unsubscribe'] || h['list-id']) return { ingest: false, reason: 'bulk-list' };
  if (['bulk', 'list', 'junk'].includes((h['precedence'] ?? '').toLowerCase())) {
    return { ingest: false, reason: 'bulk-precedence' };
  }
  const autoSubmitted = (h['auto-submitted'] ?? '').toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') return { ingest: false, reason: 'auto-submitted' };

  return { ingest: true };
}
