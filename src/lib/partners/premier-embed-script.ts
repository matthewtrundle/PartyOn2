/**
 * The client script POD injects into Premier's quote shell.
 *
 * Kept in its own module because it is a plain-JS string: it runs inside
 * Premier's page, not our React bundle, so it is neither type-checked nor
 * linted. `premier-embed.test.ts` compiles it with `new Function` and drives
 * it under jsdom so a syntax error or a hero-detection regression fails CI.
 *
 * It does three jobs, in order of importance:
 *
 *  1. **Watchdog** — if Premier's SPA never mounts (the blank-panel bug: their
 *     Netlify answers a vanished bundle with 200 + HTML, so the module script
 *     fails MIME checking), retry exactly once, then fall back to a link-out
 *     card. Never a blank panel.
 *  2. **Hero slideshow** — layer POD's boat photos behind Premier's hero.
 *  3. **Beacons** — report which detection strategy fired, so we find out that
 *     Premier changed before a partner does.
 *
 * CONSTRAINTS when editing the script body below:
 * - No backticks and no `${` — the body is embedded in a template literal.
 * - No `</script>`.
 * - ES5-only: it runs before/alongside Premier's bundle on unknown browsers.
 * - **Never use `location.reload()` or a relative URL.** The script rewrites
 *   the address to Premier's `/quote` so their router mounts the right view,
 *   and POD has no `/quote` route — a reload would land the frame on POD's
 *   404 page with no way back. Navigate to the injected absolute EMBED_PATH.
 */

/** Photos layered behind Premier's hero, served from POD's own `/public`. */
const HERO_SLIDES = [
  '/images/partners/premier-boat-slideshow/unicorn-float-crew.jpg',
  '/images/partners/premier-boat-slideshow/bride-squad-captain.jpg',
  '/images/partners/premier-boat-slideshow/group-pic.jpg',
  '/images/partners/premier-boat-slideshow/pontoon-full-crew.jpg',
  '/images/partners/premier-boat-slideshow/disco-fun-1.jpg',
  '/images/partners/premier-boat-slideshow/disco-fun-2.jpg',
];

/** Public ingest endpoint for the beacons (same-origin, no auth). */
const BEACON_ENDPOINT = '/api/v1/events/track';

/** Storage keys shared with `src/lib/analytics/client-tracker.ts`. */
const SESSION_KEY = 'pod_session_id';
const VISITOR_KEY = 'pod_visitor_id';

export interface EmbedScriptOptions {
  /** POD path serving this embed, e.g. `/partners-embed/premier-quote`. */
  embedPath: string;
  /** Premier's own route the SPA should mount, e.g. `/quote`. */
  quotePath: string;
}

/**
 * Build the `<script>` tag POD injects immediately after `<head>`.
 *
 * All three interpolations are JSON-encoded server-side constants — no request
 * data reaches the script, so there is nothing user-controlled to escape.
 */
export function buildEmbedScript({ embedPath, quotePath }: EmbedScriptOptions): string {
  return `<script>
(function () {
  'use strict';

  var EMBED_PATH = ${JSON.stringify(embedPath)};
  var QUOTE_PATH = ${JSON.stringify(quotePath)};
  var SLIDES = ${JSON.stringify(HERO_SLIDES)};
  var ENDPOINT = ${JSON.stringify(BEACON_ENDPOINT)};
  var SESSION_KEY = ${JSON.stringify(SESSION_KEY)};
  var VISITOR_KEY = ${JSON.stringify(VISITOR_KEY)};
  var RETRY_KEY = 'pod_premier_embed_retry';
  var RETRY_TTL_MS = 600000;
  var MAX_MOUNTS = 4;
  var OBSERVE_DEADLINE_MS = 30000;
  // Layout settles on its own schedule; re-check on a backoff ladder.
  var RETRY_DELAYS = [0, 120, 300, 700, 1500, 3000, 6000, 10000, 16000, 24000];

  // Capture the real address BEFORE rewriting it. Everything downstream needs
  // these: the beacons record which partner page this was (the rewritten URL
  // would say "/quote", which does not exist on POD), and the watchdog builds
  // its recovery URL from them.
  var ORIGINAL = {
    search: location.search,
    href: location.href,
    path: location.pathname
  };

  // Point Premier's client router at their quote view. Preserve the query
  // string — PartnerPageTabs appends sourceUrl/sourceType for Premier's own
  // attribution, and dropping it silently blanked their partner reporting.
  try { history.replaceState(null, '', QUOTE_PATH + ORIGINAL.search); } catch (e) {}

  // ---------------------------------------------------------------- beacons

  var sentEvents = {};

  function uuid() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) {}
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Storage throws (not returns null) in some partitioned/blocked-cookie
  // iframes, so every access is guarded.
  function storeGet(kind, key) {
    try { return window[kind].getItem(key); } catch (e) { return null; }
  }
  function storeSet(kind, key, value) {
    try { window[kind].setItem(key, value); return true; } catch (e) { return false; }
  }

  function identity(kind, key) {
    var id = storeGet(kind, key);
    if (!id) { id = uuid(); storeSet(kind, key, id); }
    return id;
  }

  function beaconOnce(name, props) {
    if (sentEvents[name]) return;
    sentEvents[name] = true;
    var body;
    try {
      body = JSON.stringify({ events: [{
        name: name,
        occurredAt: new Date().toISOString(),
        sessionId: identity('sessionStorage', SESSION_KEY),
        visitorId: identity('localStorage', VISITOR_KEY),
        path: ORIGINAL.path,
        fullUrl: ORIGINAL.href,
        referrer: document.referrer || null,
        properties: props || {}
      }] });
    } catch (e) { return; }
    try {
      var blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
    } catch (e) {}
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      })['catch'](function () {});
    } catch (e) {}
  }

  // --------------------------------------------------------------- watchdog

  var recovering = false;
  var loadFired = false;
  var retryCleared = false;

  function spaMounted() {
    var root = document.getElementById('root');
    return !!root && root.childElementCount > 0;
  }

  function readRetry() {
    try {
      var raw = window.sessionStorage.getItem(RETRY_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && (Date.now() - parsed.at) < RETRY_TTL_MS) return parsed;
      return null;
    } catch (e) { return null; }
  }

  function clearRetry() {
    if (retryCleared) return;
    retryCleared = true;
    try { window.sessionStorage.removeItem(RETRY_KEY); } catch (e) {}
  }

  function goFallback(reason) {
    beaconOnce('partner_embed_blank_failed', { reason: reason });
    location.replace(EMBED_PATH + '?fallback=1');
  }

  function recover(reason) {
    if (recovering || spaMounted()) return;
    recovering = true;
    // Already burned the retry this session — Premier is genuinely down.
    if (readRetry()) { goFallback(reason); return; }
    // Mark BEFORE navigating, so a crash between the two can only
    // under-retry, never loop. Without storage the retry cannot be bounded at
    // all, so go straight to the card rather than risk a reload loop.
    var marked = storeSet('sessionStorage', RETRY_KEY, JSON.stringify({ n: 1, at: Date.now() }));
    if (!marked) { goFallback(reason + '_nostorage'); return; }
    beaconOnce('partner_embed_blank_recovered', { reason: reason });
    // ?fresh=1 makes the route bypass both the edge cache and its upstream
    // cache, so the retry cannot re-serve the same broken shell.
    location.replace(EMBED_PATH + (ORIGINAL.search ? ORIGINAL.search + '&' : '?') + 'fresh=1');
  }

  // A vanished bundle fires a resource error on the <script> within ~200ms.
  // Resource errors do not bubble, so listen in the capture phase.
  window.addEventListener('error', function (event) {
    var target = event && event.target;
    if (target && target.tagName === 'SCRIPT' && target.src) recover('module_script_error');
  }, true);

  function armBackstop() {
    loadFired = true;
    // Gate on load: a bare timer false-positives a slow phone mid-download,
    // and every false positive costs a full reload.
    setTimeout(function () {
      if (spaMounted()) { clearRetry(); return; }
      recover('root_empty_after_load');
    }, 1500);
  }
  if (document.readyState === 'complete') armBackstop();
  else window.addEventListener('load', armBackstop);

  // Slow network: report it, but never reload — that makes it strictly worse.
  setTimeout(function () {
    if (!spaMounted() && !loadFired) beaconOnce('partner_embed_blank_slow', {});
  }, 20000);

  // --------------------------------------------------- hero identification

  function documentRect(el) {
    var r = el.getBoundingClientRect();
    return { top: r.top + (window.scrollY || 0), height: r.height, width: r.width };
  }

  function safeQuery(selector) {
    try { return document.querySelector(selector); } catch (e) { return null; }
  }

  // Deliberately conservative: mounting on the wrong element applies
  // overflow:hidden to it, which is a visible defect. A missing slideshow is
  // merely cosmetic, so "not confident" must mean "do nothing".
  function heroLike(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (!el.isConnected) return false;
    var cs;
    try { cs = window.getComputedStyle(el); } catch (e) { return false; }
    if (!cs) return false;
    // Skips Premier's fixed header and promo bar.
    if (cs.position === 'fixed' || cs.position === 'sticky') return false;
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    var vw = window.innerWidth || 1024;
    var vh = window.innerHeight || 800;
    var r = documentRect(el);
    // A zero width means the layout has not settled (or a flex parent has not
    // resolved yet) — fall through to the height/position checks rather than
    // rejecting a hero we simply cannot measure yet.
    if (r.width > 0 && r.width < vw * 0.8) return false;
    if (r.height < Math.max(320, vh * 0.4)) return false;
    if (r.height > vh * 2.5) return false;
    if (r.top > 350) return false;
    var footer = document.querySelector('footer');
    if (footer && el.contains(footer)) return false;
    return true;
  }

  function outermostHeroLike(el) {
    var best = null;
    while (el && el !== document.body) {
      if (heroLike(el)) best = el;
      el = el.parentElement;
    }
    return best;
  }

  function findHero() {
    // 1. Explicit contract. If Brian tags his hero, trust it outright.
    var tagged = safeQuery('[data-pod-hero]');
    if (tagged && tagged.isConnected && tagged.getBoundingClientRect().height > 0) {
      return { el: tagged, strategy: 'data-attr' };
    }
    // 2. Conventional hooks, then any element whose id/class names it a hero.
    //    Premier's own hero section carries class "qp-hero" today, so this
    //    rung usually fires — and unlike the old phrase search it survives
    //    any copy edit.
    var hook =
      safeQuery('#hero, .hero-section, [data-hero], [data-testid="hero"]') ||
      safeQuery('[id*="hero" i], [class*="hero" i]');
    if (hook) {
      var hooked = outermostHeroLike(hook);
      if (hooked) return { el: hooked, strategy: 'hook' };
    }
    // 3. Geometric: ask the browser what is visually at the top of the page,
    //    then widen to the outermost element that still reads as a hero.
    //    O(depth), and only trustworthy while scrolled to the top.
    if ((window.scrollY || 0) <= 40) {
      var probe = null;
      try {
        probe = document.elementFromPoint(
          (window.innerWidth || 1024) / 2,
          Math.min((window.innerHeight || 800) * 0.6, 420)
        );
      } catch (e) {}
      if (probe) {
        var geo = outermostHeroLike(probe);
        if (geo) return { el: geo, strategy: 'geometry' };
      }
    }
    // 4. The hero is the block containing the page's main headline — true
    //    whatever that headline says. Replaces the old phrase search, which
    //    broke on any copy edit and could match review text further down.
    var root = document.getElementById('root') || document.body;
    var headings = root.querySelectorAll('h1');
    for (var i = 0; i < headings.length; i++) {
      var byHeading = outermostHeroLike(headings[i]);
      if (byHeading) return { el: byHeading, strategy: 'h1' };
    }
    return null;
  }

  // ------------------------------------------------------------- slideshow

  var slideTimer = null;
  var slideIndex = 0;

  function startSlideshow(bg) {
    if (slideTimer) clearInterval(slideTimer);
    slideIndex = 0;
    slideTimer = setInterval(function () {
      if (!bg.isConnected) { clearInterval(slideTimer); slideTimer = null; return; }
      if (document.visibilityState === 'hidden') return;
      var imgs = bg.querySelectorAll('img');
      if (imgs.length < 2) return;
      imgs[slideIndex].style.opacity = '0';
      slideIndex = (slideIndex + 1) % imgs.length;
      imgs[slideIndex].style.opacity = '1';
    }, 4500);
  }

  function mount(hero) {
    var cs = window.getComputedStyle(hero);
    if (cs.position === 'static') hero.style.position = 'relative';
    hero.style.overflow = 'hidden';

    var bg = document.createElement('div');
    bg.className = 'pod-hero-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;';
    for (var i = 0; i < SLIDES.length; i++) {
      var img = document.createElement('img');
      img.src = SLIDES[i];
      img.alt = '';
      img.loading = 'eager';
      img.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' +
        'transition:opacity 1.2s ease;opacity:' + (i === 0 ? '1' : '0') + ';';
      bg.appendChild(img);
    }
    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:absolute;inset:0;background:linear-gradient(rgba(8,17,34,0.45),rgba(8,17,34,0.6));';
    bg.appendChild(overlay);
    hero.insertBefore(bg, hero.firstChild);

    // Lift Premier's own hero content above our background.
    for (var c = 0; c < hero.children.length; c++) {
      var child = hero.children[c];
      if (child === bg) continue;
      var ccs = window.getComputedStyle(child);
      if (ccs.position === 'static') child.style.position = 'relative';
      if (ccs.zIndex === 'auto' || parseInt(ccs.zIndex, 10) < 1) child.style.zIndex = '1';
    }

    startSlideshow(bg);
  }

  // ------------------------------------------------- observer + lifecycle

  var observer = null;
  var scheduled = false;
  var stopped = false;
  var mounts = 0;
  var mountedEl = null;
  var lastStrategy = null;

  function stop(reason) {
    if (stopped) return;
    stopped = true;
    if (observer) { observer.disconnect(); observer = null; }
    window.removeEventListener('load', schedule);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('visibilitychange', schedule);
    if (!mountedEl && slideTimer) { clearInterval(slideTimer); slideTimer = null; }
    beaconOnce(
      mountedEl ? 'partner_embed_hero_mounted' : 'partner_embed_hero_missing',
      { reason: reason, strategy: lastStrategy, mounts: mounts }
    );
  }

  function attempt() {
    if (stopped) return;
    if (spaMounted()) clearRetry();
    // Cheap guard first — this runs on every mutation batch.
    if (mountedEl && mountedEl.isConnected && mountedEl.querySelector('.pod-hero-bg')) return;
    if (mounts >= MAX_MOUNTS) { stop('remount_cap'); return; }
    var found = findHero();
    if (!found) return;
    // Disconnect across our own writes: records generated while disconnected
    // are dropped, so we never pay for a self-triggered rescan.
    if (observer) observer.disconnect();
    try {
      mount(found.el);
      mounts++;
      mountedEl = found.el;
      lastStrategy = found.strategy;
    } finally {
      if (observer && !stopped) observer.observe(observeTarget(), { childList: true, subtree: true });
    }
  }

  function schedule() {
    if (scheduled || stopped) return;
    scheduled = true;
    var ran = false;
    var run = function () {
      if (ran) return;
      ran = true;
      scheduled = false;
      attempt();
    };
    // Prefer rAF: the geometric strategy reads layout, and rAF coalesces a
    // whole hydration burst into one post-layout scan. But rAF does NOT fire
    // in a hidden or background tab, so always keep a timer path alive —
    // otherwise opening the boat tab and switching away means the slideshow
    // never mounts at all.
    try {
      if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    } catch (e) {}
    setTimeout(run, 50);
  }

  function observeTarget() {
    return document.getElementById('root') || document.body;
  }

  function boot() {
    attempt();

    // Retry on a backoff ladder, NOT only on DOM mutations. Premier's bundle
    // is a deferred module, so React has usually finished mounting before
    // DOMContentLoaded fires: the first attempt runs while the hero exists but
    // has not been laid out yet (height still 0, so the gate rejects it), and
    // because React then makes no further DOM changes the observer never fires
    // again. Without these timers the slideshow silently never mounts.
    for (var i = 0; i < RETRY_DELAYS.length; i++) {
      setTimeout(schedule, RETRY_DELAYS[i]);
    }
    // Images and webfonts settling can change the hero's measured height.
    window.addEventListener('load', schedule);
    window.addEventListener('resize', schedule);
    // A tab hidden during load has zero-height layout; re-measure on return.
    document.addEventListener('visibilitychange', schedule);

    if (typeof MutationObserver === 'function') {
      observer = new MutationObserver(schedule);
      observer.observe(observeTarget(), { childList: true, subtree: true });
    }
    // Past hydration every mutation is the user typing in Premier's form —
    // stop paying for it, and report what we ended up with.
    setTimeout(function () { stop('deadline'); }, OBSERVE_DEADLINE_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>`;
}
