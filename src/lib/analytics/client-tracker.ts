/**
 * First-party event tracker. Buffers events client-side, flushes every 5s
 * and on visibility change / unload via sendBeacon. Survives page navs
 * and last-second exits.
 *
 * Used in addition to (not instead of) GA4 + Vercel Analytics — gives us
 * a sample-free copy in our own DB that the A/B significance code reads.
 */

import { getAttribution } from './attribution';

interface QueuedEvent {
  name: string;
  occurredAt: string;
  sessionId: string;
  visitorId?: string;
  path?: string;
  fullUrl?: string;
  referrer?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  experimentId?: string;
  variantId?: string;
  customerId?: string;
  orderId?: string;
  properties?: Record<string, unknown>;
}

const SESSION_KEY = 'pod_session_id';
const VISITOR_KEY = 'pod_visitor_id';
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 50;
const ENDPOINT = '/api/v1/events/track';

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function uuid(): string {
  if (isClient() && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId(): string {
  if (!isClient()) return 'ssr';
  // Fully guarded: storage access can THROW (not just fail to persist) when
  // storage is disabled — and this helper now sits on the critical path of
  // lead-magnet submits and concierge CTA tracking. An analytics ID must never
  // take down the flow it measures.
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return uuid(); // per-call fallback — session continuity lost, flow intact
  }
}

function getVisitorId(): string {
  if (!isClient()) return 'ssr';
  // getItem can throw too (storage disabled entirely) — guard the whole read,
  // same rationale as getSessionId above.
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = uuid();
      try { localStorage.setItem(VISITOR_KEY, id); } catch { /* private mode */ }
    }
    return id;
  } catch {
    return uuid();
  }
}

function pageContext(): Pick<QueuedEvent, 'path' | 'fullUrl' | 'referrer'> {
  if (!isClient()) return {};
  return {
    path: window.location.pathname,
    fullUrl: window.location.href.slice(0, 2048),
    referrer: (document.referrer || '').slice(0, 2048) || undefined,
  };
}

function attributionContext(): Pick<QueuedEvent, 'utmSource' | 'utmMedium' | 'utmCampaign'> {
  const a = getAttribution();
  if (!a) return {};
  return {
    utmSource: a.utmSource ?? undefined,
    utmMedium: a.utmMedium ?? undefined,
    utmCampaign: a.utmCampaign ?? undefined,
  };
}

/**
 * Track an event. Queued, not sent immediately. Safe to call from anywhere.
 *
 * @example trackPodEvent('cta_click', { button_text: 'Order Now', section: 'hero' })
 * @example trackPodEvent('experiment_exposure', {}, { experimentId: 'wed_hero_v2', variantId: 'b' })
 */
export function trackPodEvent(
  name: string,
  properties?: Record<string, unknown>,
  context?: { experimentId?: string; variantId?: string; customerId?: string; orderId?: string }
): void {
  if (!isClient()) return;

  ensureInitialized();

  queue.push({
    name,
    occurredAt: new Date().toISOString(),
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    ...pageContext(),
    ...attributionContext(),
    ...(context ?? {}),
    properties,
  });

  if (queue.length >= MAX_BATCH) flush();
}

function flush(useBeacon = false): void {
  if (!isClient() || queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  const body = JSON.stringify({ events: batch });

  if (useBeacon && 'sendBeacon' in navigator) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(ENDPOINT, blob);
    return;
  }

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Re-queue on failure so next flush retries; cap to avoid runaway growth
    if (queue.length < 200) queue.unshift(...batch);
  });
}

function ensureInitialized(): void {
  if (initialized || !isClient()) return;
  initialized = true;

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });

  window.addEventListener('pagehide', () => flush(true));
  window.addEventListener('beforeunload', () => flush(true));
}

/**
 * Manually flush — useful right before navigation in single-page apps where
 * we want the event to land before the request is interrupted.
 */
export function flushPodEvents(): void {
  flush(true);
}

// Stop timer in HMR / test
export function teardownPodTracker(): void {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  initialized = false;
}
