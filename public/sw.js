/**
 * Party On HQ service worker — deliberately minimal for an authenticated
 * dashboard:
 *   - navigations + API calls + all writes: NETWORK ONLY (never cache
 *     authenticated JSON, never replay POSTs)
 *   - /_next/static: cache-first (immutable content hashes)
 *   - offline: precached /offline fallback for failed navigations
 *
 * Served with Cache-Control: no-cache (next.config.ts) and registered with
 * updateViaCache: 'none' so updates roll out on next launch.
 */

const STATIC_CACHE = 'hq-static-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // writes: straight to network

  const url = new URL(request.url);

  // HARD SCOPE GUARD: this worker is registered at root scope (the manifest
  // needs scope "/" to span /ops + /admin), but it must never touch
  // customer-facing pages or APIs. Only backend surfaces, build assets, and
  // the offline page may be intercepted — keep this list tight even if the
  // strategies below change.
  const p = url.pathname;
  const inScope =
    url.origin === self.location.origin &&
    (p.startsWith('/ops') ||
      p.startsWith('/admin') ||
      p.startsWith('/_next/static/') ||
      p === OFFLINE_URL);
  if (!inScope) return;

  // Immutable build assets: cache-first
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Navigations: network, falling back to the offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((hit) => hit || Response.error()),
      ),
    );
  }
  // Everything else (APIs, images, fonts): default network behavior
});
