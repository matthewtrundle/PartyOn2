/**
 * Event session store — localStorage helpers for the invitee flow.
 *
 * Persists for 24h:
 *   - RSVP form fields (firstName/lastName/email/phone/guestCount/message)
 *   - In-progress drink-order selection + step index
 *
 * Re-hydrates on next page load so the invitee can come back later and
 * pick up where they left off. Also used by the server-side abandoned-
 * cart cron route to decide who to nudge.
 *
 * Schema is intentionally namespaced by event slug — invitees may RSVP
 * to multiple events from the same browser.
 */

const VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type StoredRsvp = {
  v: number;
  ts: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guestCount: number;
  message: string;
  /** Lead row id returned by /api/v1/landing/lead-event after submit. */
  leadId?: string | null;
};

export type StoredCart = {
  v: number;
  ts: number;
  selection: Record<string, number>;
  stepIndex: number;
};

function rsvpKey(slug: string) {
  return `pod_event_rsvp_${slug}`;
}
function cartKey(slug: string) {
  return `pod_event_cart_${slug}`;
}

function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; ts?: number } & T;
    if (parsed.v !== VERSION) return null;
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > TTL_MS) {
      // expired — clean up so we don't keep parsing stale entries
      localStorage.removeItem(key);
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

function writeJSON<T extends object>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ v: VERSION, ts: Date.now(), ...data }),
    );
  } catch {
    // localStorage full / disabled — silently no-op
  }
}

export function loadRsvp(slug: string): StoredRsvp | null {
  return readJSON<StoredRsvp>(rsvpKey(slug));
}
export function saveRsvp(slug: string, data: Omit<StoredRsvp, 'v' | 'ts'>): void {
  writeJSON(rsvpKey(slug), data);
}
export function clearRsvp(slug: string): void {
  if (typeof window !== 'undefined') localStorage.removeItem(rsvpKey(slug));
}

export function loadCart(slug: string): StoredCart | null {
  return readJSON<StoredCart>(cartKey(slug));
}
export function saveCart(slug: string, data: Omit<StoredCart, 'v' | 'ts'>): void {
  writeJSON(cartKey(slug), data);
}
export function clearCart(slug: string): void {
  if (typeof window !== 'undefined') localStorage.removeItem(cartKey(slug));
}
