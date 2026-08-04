/**
 * Throttles for the public lead-capture routes that email a caller-supplied
 * address: /api/v1/chat/submit, /api/v1/quote/start, /api/v1/event-quiz/submit.
 *
 * These are unauthenticated by design and mail whatever address is in the body,
 * with no proof the submitter owns it. Unthrottled, that is a primitive for
 * mail-bombing a third party from our domain (and burning the Resend sender
 * reputation with it), plus unbounded Lead rows on the board.
 *
 * TWO limits, because either alone is porous:
 *
 *   - by IP    — volumetric abuse from one machine. Checked BEFORE the body is
 *                parsed so a flood is rejected as cheaply as possible.
 *   - by EMAIL — the one that actually matters here. The abuse is "mail this
 *                victim over and over", which a rotating-IP attacker performs
 *                without ever tripping a per-IP counter. Checked after parsing,
 *                since the address only exists once the body is read.
 *
 * Both counters are SHARED across the three routes, so cycling between them
 * multiplies nothing.
 *
 * BOTH KEYS MUST BE CANONICAL, or the counter never sees a repeat and the limit
 * is decorative:
 *   - The IP comes from clientIpFrom, which prefers the platform-set headers
 *     over the client-suppliable x-forwarded-for. Reading XFF first would let
 *     an attacker mint a fresh bucket per request by forging one header.
 *   - The address is reduced to the mailbox it actually reaches: sub-address
 *     tags stripped, and dots collapsed for Gmail. Without that,
 *     victim+1@gmail.com and victim+2@gmail.com are two budgets for one inbox,
 *     which is the same rotating-identity bypass one layer up — and cheaper,
 *     since it needs no proxy pool at all.
 *
 * Sizing is set by the real chat flow: a genuine visitor POSTs /chat/submit and
 * then /quote/start with the same address seconds to minutes apart, and may
 * legitimately come back through the event quiz. Five per hour per mailbox
 * clears that with room for retries while capping a targeted victim at a level
 * that is a nuisance rather than an outage.
 *
 * Fails OPEN on a KV outage (see checkRateLimit) — this is a throttle, not an
 * access control, and none of these routes guard anything sensitive.
 */

import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { clientIpFrom } from '@/lib/group-orders-v2/client-ip';
import { checkRateLimit } from './rate-limit';

/** Shared scopes — cycling routes must not multiply an attacker's budget. */
const IP_SCOPE = 'lead-capture-ip';
const EMAIL_SCOPE = 'lead-capture-email';

/** Generous: a real session makes two or three of these calls. */
const IP_LIMIT = 15;
const IP_WINDOW_SECONDS = 60;

/** Tight: legitimate use is a couple of sends per person per sitting. */
const EMAIL_LIMIT = 5;
const EMAIL_WINDOW_SECONDS = 60 * 60;

/** Providers that ignore dots in the local part. Deliberately not domain-wide. */
const DOT_INSENSITIVE_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Reduce an address to the mailbox it actually lands in, so one inbox gets one
 * budget however the sender dresses the address up.
 *
 * Strips RFC 5233 sub-addressing (`user+anything@`) everywhere — no mainstream
 * provider routes `+tag` to a different mailbox — and collapses dots only for
 * Gmail, because some corporate mail does treat them as significant.
 */
export function canonicalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return trimmed;

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);
  if (DOT_INSENSITIVE_DOMAINS.has(domain)) local = local.replace(/\./g, '');

  return `${local}@${domain}`;
}

/**
 * Key on a digest rather than the address itself: the counter only needs
 * equality, and this keeps customer emails out of the KV store in plaintext.
 */
function emailKey(email: string): string {
  return createHash('sha256').update(canonicalizeEmail(email)).digest('hex').slice(0, 32);
}

/**
 * Best-effort client IP, from the most trustworthy header available.
 *
 * Delegates to the audited resolver rather than re-deriving it — a hand-rolled
 * "x-forwarded-for first" version is forgeable, and this file previously had
 * exactly that bug.
 */
export function clientIp(request: NextRequest): string {
  return clientIpFrom(request);
}

/** True when this IP may proceed. Call before parsing the body. */
export async function allowLeadCaptureIp(request: NextRequest): Promise<boolean> {
  return checkRateLimit(IP_SCOPE, clientIp(request), IP_LIMIT, IP_WINDOW_SECONDS);
}

/** True when we may still send to this mailbox. Call after parsing the body. */
export async function allowLeadCaptureEmail(email: string): Promise<boolean> {
  if (!email.trim()) return true; // nothing to key on; the IP limit still applies
  return checkRateLimit(EMAIL_SCOPE, emailKey(email), EMAIL_LIMIT, EMAIL_WINDOW_SECONDS);
}

/** The 429 body these routes return, matching their `{ ok: false }` shape. */
export const LEAD_CAPTURE_THROTTLED = {
  ok: false,
  error: 'rate_limited',
  message: 'Too many requests — please try again shortly.',
} as const;
