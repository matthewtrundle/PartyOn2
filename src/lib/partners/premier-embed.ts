/**
 * Premier Party Cruises quote-page embed (the "Party Boat Rentals" tab on
 * co-branded partner pages).
 *
 * WHY THIS IS A LIVE PROXY AND NOT A COMMITTED SNAPSHOT
 * ----------------------------------------------------
 * The boat tab used to be a frozen copy of Premier's `/quote` page committed
 * to `public/partners-embed/premier-quote.html`. Premier's site is a Vite SPA
 * whose entry bundle is content-hashed (`/assets/index-<hash>.js`), and their
 * Netlify host answers unknown `/assets/*` paths with a 200 + `index.html`
 * SPA fallback rather than a 404. So every time Brian redeployed Premier:
 *
 *   1. the hash in our committed snapshot went stale,
 *   2. the browser fetched HTML where a `type="module"` script was expected,
 *   3. strict MIME checking refused to execute it, React never mounted, and
 *   4. the tab rendered a silent, completely blank white panel.
 *
 * That happened twice (PR #310 re-snapshotted; it broke again by 2026-07-27,
 * blanking the boat tab on every co-branded partner page while cold-outreach
 * emails were pitching it). Re-snapshotting only resets the clock, so we now
 * fetch Premier's `/quote` at request time and inject our additions into the
 * live HTML. Bundle hashes are always current by construction.
 *
 * Same-origin is still required: Premier's build references `/assets/*` and
 * `/attached_assets/*` root-relative and their CDN sends no CORS headers, so
 * the module scripts cannot be `<base>`-loaded cross-origin. `next.config.ts`
 * proxies those two prefixes through to Premier.
 *
 * EVERY CHECK BELOW FAILS OPEN, DELIBERATELY. A guard that rejects a working
 * Premier shell blanks the boat tab on every partner page at once — the exact
 * outage it exists to prevent. Prefer serving a shell we are unsure about.
 */

import { buildEmbedScript } from '@/lib/partners/premier-embed-script';

/** Premier's live quote page. Netlify serves the SPA shell for this route. */
export const PREMIER_QUOTE_UPSTREAM = 'https://premierpartycruises.com/quote';

/** Public path the partner-page boat tab iframes. */
export const PREMIER_QUOTE_EMBED_PATH = '/partners-embed/premier-quote';

/** How long a fetched copy of Premier's shell stays fresh, in seconds. */
export const PREMIER_EMBED_REVALIDATE_SECONDS = 300;

/**
 * Root-relative prefixes `next.config.ts` proxies through to Premier. A shell
 * referencing anything outside this set cannot boot on our origin — the health
 * check reports that as "about to go blank" before it actually does.
 */
export const PROXIED_ASSET_PREFIXES = ['/assets/', '/attached_assets/'] as const;

/** Marker so a double-injection is detectable (and a no-op). */
const INJECTION_MARKER = 'pod-partner-embed-injection';

/** Premier's own route, so the SPA router mounts the quote view. */
function premierQuotePath(): string {
  try {
    return new URL(PREMIER_QUOTE_UPSTREAM).pathname;
  } catch {
    return '/quote';
  }
}

/**
 * Every root-relative asset URL the shell references, deduped.
 *
 * Matches `src="..."` / `href="..."` on any prefix rather than hardcoding
 * `/assets/` — the point is to notice when Premier's build output moves.
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

/**
 * The SPA's entry bundle — the one whose disappearance blanks the page.
 *
 * Attribute-order independent: Vite currently emits
 * `<script type="module" crossorigin src="...">`, but that ordering is a
 * build-tool detail, not a contract.
 */
export function extractEntryScriptUrl(html: string): string | null {
  const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
  for (const tag of scripts) {
    if (!/\btype\s*=\s*["']?module["']?/i.test(tag)) continue;
    const src = tag.match(/\bsrc\s*=\s*"([^"]+)"/i);
    if (src && src[1].startsWith('/')) return src[1];
  }
  return null;
}

/** Distinct `/<prefix>/` segments the shell loads assets from. */
export function extractAssetPrefixes(html: string): string[] {
  const prefixes = new Set<string>();
  for (const path of extractAssetPaths(html)) {
    const slash = path.indexOf('/', 1);
    if (slash > 0) prefixes.add(path.slice(0, slash + 1));
  }
  return [...prefixes];
}

/** Asset prefixes the shell uses that our rewrites do NOT proxy. */
export function unproxiedAssetPrefixes(html: string): string[] {
  const proxied = PROXIED_ASSET_PREFIXES as readonly string[];
  return extractAssetPrefixes(html).filter((p) => !proxied.includes(p));
}

/**
 * Does a content-type header describe executable JavaScript?
 *
 * The decisive test for the blank-panel bug: a vanished bundle comes back as
 * `text/html` (Netlify's SPA fallback), and the browser refuses to run it.
 */
export function isJavaScriptContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return /(?:^|[\s;])(?:application|text)\/(?:x-)?(?:java|ecma)script/i.test(contentType);
}

/**
 * Does this look like Premier's SPA shell, with a bootable entry bundle?
 *
 * Structural only — no filename, prefix, or attribute-order assumptions. It
 * catches an upstream that is HTTP 200 but not a shell at all (a Netlify error
 * page, a holding page), which is the case that would otherwise render blank.
 */
export function isBootablePremierShell(html: string): boolean {
  if (!/<head[^>]*>/i.test(html)) return false;
  if (!/<div\b[^>]*\bid\s*=\s*["']?root["']?/i.test(html)) return false;
  return extractEntryScriptUrl(html) !== null;
}

/**
 * Inject POD's additions into Premier's shell.
 *
 * Returns `null` when the upstream HTML is not a shell we can boot — callers
 * should serve {@link premierEmbedFallbackHtml} instead. Injecting twice is a
 * no-op, so this is safe to call on already-processed HTML.
 */
export function buildPremierEmbedHtml(upstreamHtml: string): string | null {
  if (!isBootablePremierShell(upstreamHtml)) return null;
  if (upstreamHtml.includes(INJECTION_MARKER)) return upstreamHtml;

  const injection = [
    `<meta name="robots" content="noindex,nofollow">`,
    `<!-- ${INJECTION_MARKER}: see src/lib/partners/premier-embed.ts -->`,
    buildEmbedScript({
      embedPath: PREMIER_QUOTE_EMBED_PATH,
      quotePath: premierQuotePath(),
    }),
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
