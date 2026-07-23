/**
 * First-touch attribution capture.
 *
 * Captures the landing page + UTM params + ad-platform click ids + document
 * referrer on the visitor's first page load and persists them to localStorage.
 * Subsequent visits / cart events don't overwrite — first-touch wins — with
 * ONE deliberate exception: click ids (gclid & friends) refresh on every URL
 * that carries one. Ad platforms key conversions to the MOST RECENT ad click,
 * and an old organic first-touch payload would otherwise permanently mask
 * paid visits. Checkout reads these values via `getAttribution()` and passes
 * them into Stripe session metadata, where the webhook reads them when
 * creating the Order.
 */

const STORAGE_KEY = 'pod_attribution_v1';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/** Ad-platform click-id params: gclid/gbraid/wbraid (Google — the *braid
    variants are iOS consent-mode fallbacks), fbclid (Meta), msclkid (Bing). */
const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'] as const;

/** One of the supported ad-platform click-id query params. */
export type ClickIdKey = (typeof CLICK_ID_KEYS)[number];

export interface AttributionPayload {
  landingPage: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  /** Optional so payloads stored before click-id capture still parse. */
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  msclkid?: string | null;
  capturedAt: string;
}

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readClickIds(url: URL): Partial<Record<ClickIdKey, string>> {
  const out: Partial<Record<ClickIdKey, string>> = {};
  for (const key of CLICK_ID_KEYS) {
    const value = url.searchParams.get(key);
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Run once per browser on initial page load. First-touch attribution is
 * no-op when already captured; click ids in the current URL always merge
 * into the stored payload (latest-click wins for click ids only).
 */
export function captureFirstTouch(): void {
  if (!isClient()) return;
  try {
    const url = new URL(window.location.href);
    const clickIds = readClickIds(url);

    const existingRaw = localStorage.getItem(STORAGE_KEY);
    if (existingRaw) {
      if (Object.keys(clickIds).length === 0) return;
      const stored = JSON.parse(existingRaw) as AttributionPayload;
      let changed = false;
      for (const key of CLICK_ID_KEYS) {
        const incoming = clickIds[key];
        if (incoming && stored[key] !== incoming) {
          stored[key] = incoming;
          changed = true;
        }
      }
      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      return;
    }

    const utm: Record<string, string | null> = {};
    for (const key of UTM_KEYS) {
      utm[key] = url.searchParams.get(key);
    }

    const referrer = document.referrer || null;
    const internalReferrer = referrer && referrer.includes(window.location.hostname);

    const payload: AttributionPayload = {
      landingPage: url.pathname + (url.search || ''),
      utmSource: utm.utm_source,
      utmMedium: utm.utm_medium,
      utmCampaign: utm.utm_campaign,
      utmTerm: utm.utm_term,
      utmContent: utm.utm_content,
      referrer: internalReferrer ? null : referrer,
      gclid: clickIds.gclid ?? null,
      gbraid: clickIds.gbraid ?? null,
      wbraid: clickIds.wbraid ?? null,
      fbclid: clickIds.fbclid ?? null,
      msclkid: clickIds.msclkid ?? null,
      capturedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private mode, quota); silently skip.
  }
}

/**
 * First-touch attribution as the plain {landingPage, utm*, referrer} object the
 * group-order create API expects (structurally matches DashboardAttributionInput).
 * Returns undefined when nothing was captured, so the caller omits the field.
 * Used by /order + /order/last-minute to stamp the host's first-touch onto the
 * GroupOrderV2 (the webhook then propagates it to every Order in the group).
 */
export function getAttributionForDashboard():
  | {
      landingPage: string | null;
      utmSource: string | null;
      utmMedium: string | null;
      utmCampaign: string | null;
      utmTerm: string | null;
      utmContent: string | null;
      referrer: string | null;
      gclid: string | null;
      gbraid: string | null;
      wbraid: string | null;
      fbclid: string | null;
      msclkid: string | null;
    }
  | undefined {
  const a = getAttribution();
  if (!a) return undefined;
  // Cap each field at 500 chars (same as attributionToMetadata) BEFORE it hits the
  // create API. A real landingPage/referrer can exceed 500 (stacked UTM + gclid/fbclid,
  // long referrer URLs); pre-slicing keeps the non-critical attribution from tripping
  // validation and blocking order creation. cap() preserves null (absent field) as null.
  const cap = (v: string | null): string | null => (v == null ? v : v.slice(0, 500));
  return {
    landingPage: cap(a.landingPage),
    utmSource: cap(a.utmSource),
    utmMedium: cap(a.utmMedium),
    utmCampaign: cap(a.utmCampaign),
    utmTerm: cap(a.utmTerm),
    utmContent: cap(a.utmContent),
    referrer: cap(a.referrer),
    // Click ids reach the host's Lead mirror (no GroupOrderV2 columns).
    gclid: cap(a.gclid ?? null),
    gbraid: cap(a.gbraid ?? null),
    wbraid: cap(a.wbraid ?? null),
    fbclid: cap(a.fbclid ?? null),
    msclkid: cap(a.msclkid ?? null),
  };
}

export function getAttribution(): AttributionPayload | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionPayload;
  } catch {
    return null;
  }
}

/**
 * Flatten attribution into Stripe metadata (string-only, filter empties).
 * Stripe metadata has a 500-char-per-value limit and ~50 keys total — we're well under.
 */
export function attributionToMetadata(
  a: AttributionPayload | null
): Record<string, string> {
  if (!a) return {};
  const out: Record<string, string> = {};
  if (a.landingPage) out.landingPage = a.landingPage.slice(0, 500);
  if (a.utmSource) out.utmSource = a.utmSource.slice(0, 500);
  if (a.utmMedium) out.utmMedium = a.utmMedium.slice(0, 500);
  if (a.utmCampaign) out.utmCampaign = a.utmCampaign.slice(0, 500);
  if (a.utmTerm) out.utmTerm = a.utmTerm.slice(0, 500);
  if (a.utmContent) out.utmContent = a.utmContent.slice(0, 500);
  if (a.referrer) out.referrer = a.referrer.slice(0, 500);
  for (const key of CLICK_ID_KEYS) {
    const value = a[key];
    if (value) out[key] = value.slice(0, 500);
  }
  return out;
}
