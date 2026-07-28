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
 */

/** Premier's live quote page. Netlify serves the SPA shell for this route. */
export const PREMIER_QUOTE_UPSTREAM = 'https://premierpartycruises.com/quote';

/** Public path the partner-page boat tab iframes. */
export const PREMIER_QUOTE_EMBED_PATH = '/partners-embed/premier-quote';

/** How long a fetched copy of Premier's shell stays fresh, in seconds. */
export const PREMIER_EMBED_REVALIDATE_SECONDS = 300;

/** Marker so a double-injection is detectable (and a no-op). */
const INJECTION_MARKER = 'pod-partner-embed-injection';

/**
 * Photos layered behind Premier's hero inside the embed. Served from POD's
 * own `/public`, which the iframe can reach because the embed is same-origin.
 */
const HERO_SLIDES = [
  '/images/partners/premier-boat-slideshow/unicorn-float-crew.jpg',
  '/images/partners/premier-boat-slideshow/bride-squad-captain.jpg',
  '/images/partners/premier-boat-slideshow/group-pic.jpg',
  '/images/partners/premier-boat-slideshow/pontoon-full-crew.jpg',
  '/images/partners/premier-boat-slideshow/disco-fun-1.jpg',
  '/images/partners/premier-boat-slideshow/disco-fun-2.jpg',
];

/**
 * Everything POD adds to Premier's shell, injected immediately after `<head>`:
 *
 * - `history.replaceState` to `/quote` so Premier's client router mounts the
 *   quote view (their Netlify host returns the same shell for every route, and
 *   the iframe's own URL is a POD path their router would not recognise).
 * - `noindex` so the embed never competes with either site in search.
 * - the hero background slideshow, re-mounted via MutationObserver because the
 *   SPA replaces the static shell on hydration.
 *
 * Kept verbatim from the committed snapshot it replaces (PRs #308 / #310) so
 * the proxy is a drop-in swap of delivery mechanism, not a visual change.
 */
const POD_INJECTION = `<script>try{history.replaceState(null,"","/quote")}catch(e){}</script>
<meta name="robots" content="noindex,nofollow">
<!-- ${INJECTION_MARKER}: Premier hero background slideshow (see src/lib/partners/premier-embed.ts) -->
<script>
(function () {
  var SLIDES = ${JSON.stringify(HERO_SLIDES)};
  var current = 0;
  var timer = null;

  function findHero() {
    // SPA hero: the section containing "Let's Get You on the Water".
    // Tag-agnostic: find the deepest short-text element matching, then
    // walk up to its SECTION (or a reasonable-height ancestor).
    var all = document.body.querySelectorAll('*');
    var best = null;
    for (var i = 0; i < all.length; i++) {
      var t = all[i].textContent || '';
      if (t.length < 160 && /on the water/i.test(t)) best = all[i];
    }
    if (!best) return null;
    var el = best;
    while (el && el !== document.body) {
      if (el.tagName === 'SECTION') return el;
      el = el.parentElement;
    }
    // No <section> ancestor: use the highest ancestor under 90vh tall.
    var pick = best.parentElement;
    el = best.parentElement;
    while (el && el !== document.body) {
      if (el.clientHeight > 0 && el.clientHeight < window.innerHeight * 1.2) pick = el;
      el = el.parentElement;
    }
    return pick;
  }

  function mount() {
    var hero = findHero();
    if (!hero || hero.clientHeight < 200 || hero.querySelector('.pod-hero-bg')) return;
    var cs = window.getComputedStyle(hero);
    if (cs.position === 'static') hero.style.position = 'relative';
    hero.style.overflow = 'hidden';

    var bg = document.createElement('div');
    bg.className = 'pod-hero-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;';
    SLIDES.forEach(function (src, i) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'eager';
      img.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' +
        'transition:opacity 1.2s ease;opacity:' + (i === 0 ? '1' : '0') + ';';
      bg.appendChild(img);
    });
    // Dark overlay keeps the hero copy readable over the photos.
    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:absolute;inset:0;background:linear-gradient(rgba(8,17,34,0.45),rgba(8,17,34,0.6));';
    bg.appendChild(overlay);
    hero.insertBefore(bg, hero.firstChild);

    // Lift the hero content above the background.
    for (var c = 0; c < hero.children.length; c++) {
      var child = hero.children[c];
      if (child === bg) continue;
      var ccs = window.getComputedStyle(child);
      if (ccs.position === 'static') child.style.position = 'relative';
      if (ccs.zIndex === 'auto' || parseInt(ccs.zIndex, 10) < 1) child.style.zIndex = '1';
    }

    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      var imgs = bg.querySelectorAll('img');
      if (!document.body.contains(bg)) { clearInterval(timer); timer = null; return; }
      imgs[current].style.opacity = '0';
      current = (current + 1) % imgs.length;
      imgs[current].style.opacity = '1';
    }, 4500);
  }

  function boot() {
    mount();
    // The SPA replaces the static shell after hydration — re-mount when it does.
    new MutationObserver(function () { mount(); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>`;

/**
 * Does this look like Premier's SPA shell, with a bootable entry bundle?
 *
 * Guards the exact failure this module exists to prevent: an upstream response
 * that is HTTP 200 but is not a shell we can boot (Netlify error page, holding
 * page, a build that stopped emitting a module entry). Serving the fallback is
 * always better than serving something that renders blank.
 */
export function isBootablePremierShell(html: string): boolean {
  if (!/<head[^>]*>/i.test(html)) return false;
  if (!/<div id="root">/i.test(html)) return false;
  return /<script[^>]+type="module"[^>]+src="\/assets\/index-[^"]+\.js"/i.test(html);
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
  return upstreamHtml.replace(/<head[^>]*>/i, (head) => `${head}\n${POD_INJECTION}`);
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
