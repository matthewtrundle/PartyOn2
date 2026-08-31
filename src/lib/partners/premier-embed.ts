/**
 * Premier Party Cruises quote-page embed (the "Party Boat Rentals" tab on
 * co-branded partner pages).
 *
 * WHY THIS IS A LIVE PROXY AND NOT A COMMITTED SNAPSHOT
 * ----------------------------------------------------
 * The boat tab renders Premier's live quote page inside an iframe on
 * `/partners/<slug>`. It has always been a live proxy rather than a committed
 * snapshot, because a snapshot goes stale the moment Premier redeploys and then
 * silently blanks the tab.
 *
 * HISTORY — the old Vite SPA and its blank-panel bug
 * --------------------------------------------------
 * Premier's quote page used to be a Vite single-page app served from
 * `/quote`, whose entry bundle was content-hashed (`/assets/index-<hash>.js`).
 * Their Netlify host answers unknown `/assets/*` paths with a 200 + `index.html`
 * SPA fallback rather than a 404, so a stale bundle URL came back as HTML where
 * a `type="module"` script was expected, strict MIME checking refused to run it,
 * React never mounted, and the tab rendered a silent blank white panel. That is
 * why the proxy fetched the shell live (bundle hashes always current) and why an
 * injected client-side watchdog + server-side entry-bundle check existed.
 *
 * NOW — a server-rendered page (migrated 2026-08)
 * -----------------------------------------------
 * Premier replaced the SPA: `/quote` now 301-redirects to `/get-a-quote`, a
 * plain server-rendered HTML page. Its content is in the HTML itself (a quote
 * `<form id="qform">` plus Xola booking iframes); live pricing and availability
 * come from Supabase and Xola over absolute, CORS-enabled URLs, so they do not
 * care which origin serves the page. There is no content-hashed bundle to go
 * stale — the entire blank-panel bug class is gone, and with it the need for the
 * client watchdog and the entry-bundle MIME check (both retired in this change).
 *
 * Same-origin is still required for the one root-relative asset the page uses:
 * a hero video under `/attached_assets/*`. `next.config.ts` proxies `/assets/*`
 * and `/attached_assets/*` through to Premier, which covers it.
 *
 * FAIL OPEN, DELIBERATELY. A guard that rejects a working Premier page blanks
 * the boat tab on every partner page at once — the exact outage this exists to
 * prevent. When the upstream is clearly not the quote page we serve a working
 * link-out card (never a blank panel); otherwise we serve what Premier sent.
 */

/**
 * Premier's live quote page. `/quote` 301-redirects here; we target the final
 * URL directly to skip the redirect hop.
 */
export const PREMIER_QUOTE_UPSTREAM = 'https://premierpartycruises.com/get-a-quote';

/** Public path the partner-page boat tab iframes. */
export const PREMIER_QUOTE_EMBED_PATH = '/partners-embed/premier-quote';

/** How long a fetched copy of Premier's page stays fresh, in seconds. */
export const PREMIER_EMBED_REVALIDATE_SECONDS = 300;

/**
 * Root-relative prefixes `next.config.ts` proxies through to Premier. A page
 * referencing a root-relative bundle outside this set cannot load it on our
 * origin — the health check reports that as "about to go blank" before it does.
 */
export const PROXIED_ASSET_PREFIXES = ['/assets/', '/attached_assets/'] as const;

/** Marker so a double-injection is detectable (and a no-op). */
const INJECTION_MARKER = 'pod-partner-embed-injection';

/**
 * Every root-relative asset URL the page references, deduped.
 *
 * Matches `src="..."` / `href="..."` on any prefix rather than hardcoding
 * `/assets/` — the point is to notice when Premier's build output moves. The
 * current page has none (fonts are absolute, CSS is inline), but this stays so
 * the health check catches a regression if Premier ships root-relative bundles
 * again.
 */
export function extractAssetPaths(html: string): string[] {
  const found = new Set<string>();
  const attr = /(?:src|href)\s*=\s*"(\/[^"]+\.(?:js|css|mjs))"/gi;
  let match = attr.exec(html);
  while (match !== null) {
    found.add(match[1]);
    match = attr.exec(html);
  }
  return [...found];
}

/** Distinct `/<prefix>/` segments the page loads assets from. */
export function extractAssetPrefixes(html: string): string[] {
  const prefixes = new Set<string>();
  for (const path of extractAssetPaths(html)) {
    const slash = path.indexOf('/', 1);
    if (slash > 0) prefixes.add(path.slice(0, slash + 1));
  }
  return [...prefixes];
}

/** Asset prefixes the page uses that our rewrites do NOT proxy. */
export function unproxiedAssetPrefixes(html: string): string[] {
  const proxied = PROXIED_ASSET_PREFIXES as readonly string[];
  return extractAssetPrefixes(html).filter((p) => !proxied.includes(p));
}

/**
 * Does a content-type header describe executable JavaScript?
 *
 * Kept from the SPA era for the health check's per-asset test: if Premier ever
 * ships a root-relative bundle again, a vanished one comes back as `text/html`
 * (Netlify's SPA fallback) and the browser refuses to run it.
 */
export function isJavaScriptContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return /(?:^|[\s;])(?:application|text)\/(?:x-)?(?:java|ecma)script/i.test(contentType);
}

/**
 * Does this look like Premier's real quote page?
 *
 * Structural and deliberately forgiving — no filename or attribute-order
 * assumptions. It needs a `<head>` plus a positive booking signal: their quote
 * form (`id="qform"`) or the Xola checkout embed. Either alone is enough, so a
 * form-id rename or a booking-provider swap does not blank the tab; both would
 * have to change at once (and the health check would then alert). It rejects the
 * cases that render blank or dead: a bare Netlify redirect stub (no `<head>`)
 * and a generic 200 error/holding page (no booking surface).
 */
export function isPremierQuotePage(html: string): boolean {
  if (!/<head[^>]*>/i.test(html)) return false;
  const hasQuoteForm = /<form\b[^>]*\bid\s*=\s*["']?qform\b/i.test(html);
  const hasXolaBooking = /checkout\.xola\.app/i.test(html);
  return hasQuoteForm || hasXolaBooking;
}

/**
 * Inject POD's additions into Premier's quote page.
 *
 * The page is server-rendered and self-sufficient, so the injection is minimal:
 * a `noindex` robots meta (we must not let the proxied copy get indexed) and a
 * marker comment. No client script — the SPA watchdog and hero overlay it
 * carried are obsolete now that the page ships its content and its own hero.
 *
 * Returns `null` when the upstream HTML is not the quote page — callers should
 * serve {@link premierEmbedFallbackHtml} instead. Injecting twice is a no-op,
 * so this is safe to call on already-processed HTML.
 */
export function buildPremierEmbedHtml(upstreamHtml: string): string | null {
  if (!isPremierQuotePage(upstreamHtml)) return null;
  if (upstreamHtml.includes(INJECTION_MARKER)) return upstreamHtml;

  const injection = [
    `<meta name="robots" content="noindex,nofollow">`,
    `<!-- ${INJECTION_MARKER}: see src/lib/partners/premier-embed.ts -->`,
  ].join('\n');

  return upstreamHtml.replace(/<head[^>]*>/i, (head) => `${head}\n${injection}`);
}

/**
 * Shown inside the boat tab when Premier's site is unreachable or has changed
 * shape. Deliberately a working link-out rather than a stale cached copy: a
 * partner's guest gets a real path to booking, and the failure is visible
 * instead of silent.
 */
export function premierEmbedFallbackHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Party Boat Rentals — Premier Party Cruises</title>
<style>
  body { margin:0; font-family: Inter, system-ui, sans-serif; background:#fff; color:#111827;
         display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
  .card { max-width:520px; text-align:center; }
  h1 { font-size:1.75rem; margin:0 0 12px; letter-spacing:0.08em; text-transform:uppercase; }
  p { font-size:1rem; line-height:1.6; color:#374151; margin:0 0 24px; }
  a { display:inline-block; background:#0B74B8; color:#fff; text-decoration:none;
      padding:14px 28px; border-radius:8px; font-weight:600; letter-spacing:0.08em; }
</style>
</head>
<body>
  <div class="card">
    <h1>Book Your Party Boat</h1>
    <p>Premier Party Cruises runs private charters and the ATX Disco Cruise on Lake Travis.
       The booking form could not be loaded here — open it directly to get your quote.</p>
    <a href="${PREMIER_QUOTE_UPSTREAM}" target="_blank" rel="noopener noreferrer">Get a Boat Quote &rarr;</a>
  </div>
</body>
</html>`;
}
