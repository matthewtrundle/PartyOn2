/**
 * @vitest-environment jsdom
 */
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PREMIER_QUOTE_EMBED_PATH,
  PROXIED_ASSET_PREFIXES,
  buildPremierEmbedHtml,
  extractAssetPaths,
  extractAssetPrefixes,
  extractEntryScriptUrl,
  isBootablePremierShell,
  isJavaScriptContentType,
  premierEmbedFallbackHtml,
  unproxiedAssetPrefixes,
} from '@/lib/partners/premier-embed';
import { buildEmbedScript } from '@/lib/partners/premier-embed-script';
import { getStrPartnerBySlug, listStrPartners } from '@/lib/partners/str-partners';

/** Minimal stand-in for Premier's Vite SPA shell. */
function shell({
  entry = '/assets/index-BdlBbSmN.js',
  rootTag = '<div id="root"></div>',
  scriptTag,
}: { entry?: string; rootTag?: string; scriptTag?: string } = {}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="/assets/index-CAn9k3cP.css" />
    ${scriptTag ?? `<script type="module" crossorigin src="${entry}"></script>`}
  </head>
  <body>${rootTag}</body>
</html>`;
}

describe('isBootablePremierShell', () => {
  it('accepts Premier\'s shell', () => {
    expect(isBootablePremierShell(shell())).toBe(true);
  });

  it('accepts any entry hash and any asset prefix, so Brian can redeploy or move his build output', () => {
    expect(isBootablePremierShell(shell({ entry: '/assets/index-ZZZ99999.js' }))).toBe(true);
    expect(isBootablePremierShell(shell({ entry: '/static/main-abc.js' }))).toBe(true);
  });

  // The guard fails closed: rejecting a working shell shows the fallback card
  // on EVERY partner page at once. These are all things Brian could change.
  it('tolerates extra attributes on the root div', () => {
    expect(isBootablePremierShell(shell({ rootTag: '<div id="root" class="app"></div>' }))).toBe(true);
    expect(isBootablePremierShell(shell({ rootTag: "<div id='root'></div>" }))).toBe(true);
  });

  it('tolerates src appearing before type on the module script', () => {
    const tag = '<script src="/assets/index-Xy.js" type="module" crossorigin></script>';
    expect(isBootablePremierShell(shell({ scriptTag: tag }))).toBe(true);
  });

  it('rejects an upstream error page served with HTTP 200', () => {
    expect(isBootablePremierShell('<html><body><h1>Not Found</h1></body></html>')).toBe(false);
  });

  it('rejects a shell with no module entry to boot', () => {
    expect(isBootablePremierShell(shell({ scriptTag: '' }))).toBe(false);
  });
});

describe('asset extraction', () => {
  it('finds the entry bundle regardless of attribute order', () => {
    expect(extractEntryScriptUrl(shell())).toBe('/assets/index-BdlBbSmN.js');
    const tag = '<script src="/assets/main-1.js" type="module"></script>';
    expect(extractEntryScriptUrl(shell({ scriptTag: tag }))).toBe('/assets/main-1.js');
  });

  it('collects js and css assets', () => {
    const paths = extractAssetPaths(shell());
    expect(paths).toContain('/assets/index-BdlBbSmN.js');
    expect(paths).toContain('/assets/index-CAn9k3cP.css');
  });

  it('flags an asset prefix our rewrites do not proxy', () => {
    expect(unproxiedAssetPrefixes(shell())).toEqual([]);
    // If Premier's build output moves, the tab blanks until a rewrite is added.
    const moved = shell({ entry: '/static/index-abc.js' });
    expect(extractAssetPrefixes(moved)).toContain('/static/');
    expect(unproxiedAssetPrefixes(moved)).toContain('/static/');
  });

  it('knows which prefixes next.config.ts proxies', () => {
    expect(PROXIED_ASSET_PREFIXES).toContain('/assets/');
    expect(PROXIED_ASSET_PREFIXES).toContain('/attached_assets/');
  });
});

describe('isJavaScriptContentType', () => {
  // The decisive test for the blank-panel bug: a vanished bundle comes back
  // as text/html with HTTP 200, and the browser refuses to execute it.
  it('accepts JavaScript content types', () => {
    expect(isJavaScriptContentType('application/javascript; charset=UTF-8')).toBe(true);
    expect(isJavaScriptContentType('text/javascript')).toBe(true);
  });

  it('rejects the SPA HTML fallback and a missing header', () => {
    expect(isJavaScriptContentType('text/html; charset=UTF-8')).toBe(false);
    expect(isJavaScriptContentType(null)).toBe(false);
  });
});

describe('buildPremierEmbedHtml', () => {
  it('injects directly after <head>', () => {
    const out = buildPremierEmbedHtml(shell())!;
    expect(out.indexOf('history.replaceState')).toBeGreaterThan(out.indexOf('<head>'));
    expect(out.indexOf('history.replaceState')).toBeLessThan(out.indexOf('<meta charset'));
  });

  it('preserves the query string when rewriting to Premier\'s route', () => {
    // PartnerPageTabs appends sourceUrl/sourceType for Premier's attribution;
    // wiping them blanked their partner reporting.
    const out = buildPremierEmbedHtml(shell())!;
    expect(out).toContain("history.replaceState(null, '', QUOTE_PATH + ORIGINAL.search)");
    expect(out).toContain('name="robots" content="noindex,nofollow"');
  });

  it('leaves the upstream entry bundle untouched', () => {
    const out = buildPremierEmbedHtml(shell({ entry: '/assets/index-NEWHASH1.js' }))!;
    expect(out).toContain('src="/assets/index-NEWHASH1.js"');
  });

  it('is idempotent', () => {
    const once = buildPremierEmbedHtml(shell())!;
    expect(buildPremierEmbedHtml(once)).toBe(once);
  });

  it('returns null for upstream HTML that would render blank', () => {
    expect(buildPremierEmbedHtml('<html><body>maintenance</body></html>')).toBeNull();
  });
});

describe('injected script', () => {
  /** Strip the <script> wrapper so the body can be compiled/run. */
  function scriptBody(): string {
    const html = buildEmbedScript({ embedPath: '/e', quotePath: '/quote' });
    return html.replace(/^<script>/, '').replace(/<\/script>$/, '');
  }

  it('compiles — the script is an untyped, unlinted string, so this is its only syntax gate', () => {
    expect(() => new Function(scriptBody())).not.toThrow();
  });

  it('never uses location.reload or a relative recovery URL', () => {
    // POD has no /quote route, and the script rewrites the address to /quote —
    // so a reload would navigate the frame into POD's 404 page.
    const body = scriptBody();
    expect(body).not.toContain('location.reload');
    expect(body).toContain('location.replace(EMBED_PATH');
  });

  it('embeds the server-provided paths', () => {
    const body = buildEmbedScript({ embedPath: '/partners-embed/x', quotePath: '/book' });
    expect(body).toContain('"/partners-embed/x"');
    expect(body).toContain('"/book"');
  });
});

describe('hero detection (jsdom)', () => {
  const HERO_HEIGHT = 700;

  /**
   * jsdom has no layout, so every rect is 0x0. Fake geometry per element via
   * a data attribute the stub reads.
   */
  function stubLayout(): void {
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const h = Number((this as HTMLElement).dataset?.h ?? 0);
      const top = Number((this as HTMLElement).dataset?.top ?? 0);
      const w = Number((this as HTMLElement).dataset?.w ?? 1000);
      return { top, left: 0, width: w, height: h, right: w, bottom: top + h, x: 0, y: top, toJSON() {} };
    } as typeof Element.prototype.getBoundingClientRect;
  }

  beforeEach(() => {
    stubLayout();
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      fn(0);
      return 0;
    });
    // Ids deliberately avoid the word "hero" so these cases exercise the
    // h1-anchored rung — the one that has to survive a copy rewrite.
    document.body.innerHTML = `
      <div id="root">
        <header data-h="80" data-top="0" style="position:fixed">Nav</header>
        <section id="banner" data-h="${HERO_HEIGHT}" data-top="0">
          <h1>Let's Get You on the Water</h1>
        </section>
        <section id="decoy" data-h="${HERO_HEIGHT}" data-top="2000">
          <p>Multi-generational fun on the water</p>
        </section>
      </div>`;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  /** Run the injected script against the current document. */
  function runScript(): void {
    const html = buildEmbedScript({ embedPath: '/e', quotePath: '/quote' });
    new Function(html.replace(/^<script>/, '').replace(/<\/script>$/, ''))();
  }

  it('mounts on the hero, not on a decoy containing the same phrase', () => {
    runScript();
    expect(document.querySelector('#banner .pod-hero-bg')).not.toBeNull();
    expect(document.querySelector('#decoy .pod-hero-bg')).toBeNull();
  });

  it('still finds the hero after the headline is rewritten', () => {
    // The whole point: detection anchors on the h1, not on its wording.
    document.querySelector('h1')!.textContent = 'Book Your Lake Day';
    runScript();
    expect(document.querySelector('#banner .pod-hero-bg')).not.toBeNull();
  });

  it('prefers an explicit data-pod-hero hook when Brian adds one', () => {
    document.getElementById('decoy')!.setAttribute('data-pod-hero', '');
    runScript();
    expect(document.querySelector('#decoy .pod-hero-bg')).not.toBeNull();
  });

  it('uses a hero-named class as a hook — Premier ships class="qp-hero"', () => {
    // Verifies the case-insensitive attribute selector actually resolves;
    // if it threw, detection would silently fall through to another rung.
    document.body.innerHTML = `
      <div id="root">
        <section class="qp-hero" data-h="${HERO_HEIGHT}" data-top="0">
          <div>no heading here</div>
        </section>
      </div>`;
    runScript();
    expect(document.querySelector('.qp-hero .pod-hero-bg')).not.toBeNull();
  });

  it('ignores a hero-named element that is too small to be the hero', () => {
    document.body.innerHTML = `
      <div id="root">
        <span class="hero-badge" data-h="24" data-top="0">Hero deal</span>
      </div>`;
    runScript();
    expect(document.querySelector('.pod-hero-bg')).toBeNull();
  });

  it('does nothing when no element is confidently a hero', () => {
    // Mounting on the wrong element applies overflow:hidden to it — a visible
    // defect. A missing slideshow is merely cosmetic.
    document.body.innerHTML = '<div id="root"><p data-h="20" data-top="0">tiny</p></div>';
    runScript();
    expect(document.querySelector('.pod-hero-bg')).toBeNull();
  });

  it('does not mount twice on repeat runs', () => {
    runScript();
    document.getElementById('root')!.appendChild(document.createElement('div'));
    expect(document.querySelectorAll('.pod-hero-bg').length).toBe(1);
  });
});

describe('premierEmbedFallbackHtml', () => {
  it('links out to Premier so a guest can still book', () => {
    const html = premierEmbedFallbackHtml();
    expect(html).toContain('https://premierpartycruises.com/quote');
    expect(html).toContain('noindex,nofollow');
  });
});

describe('partner boat tab wiring', () => {
  it('points every configured second tab at the live proxy, never a static file', () => {
    const tabs = listStrPartners()
      .map((p) => p.secondTab)
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    expect(tabs.length).toBeGreaterThan(0);
    for (const tab of tabs) {
      expect(tab.embedUrl).toBe(PREMIER_QUOTE_EMBED_PATH);
      expect(tab.embedUrl).not.toMatch(/\.html$/);
    }
  });

  it('gives bulk-imported STR prospect pages a working boat tab', () => {
    // Regression guard for 2026-07-27: co-branded prospect pages such as
    // 512 Retreat are what cold outreach links to, and their boat tab was blank.
    expect(getStrPartnerBySlug('512-retreat')?.secondTab?.embedUrl).toBe(PREMIER_QUOTE_EMBED_PATH);
  });

  it('gives Five Star a boat tab', () => {
    expect(getStrPartnerBySlug('five-star')?.secondTab?.embedUrl).toBe(PREMIER_QUOTE_EMBED_PATH);
  });
});

describe('asset rewrite safety', () => {
  it('POD owns no /assets or /attached_assets, so the global rewrites shadow nothing', () => {
    // next.config.ts proxies these prefixes from POD's ENTIRE origin to
    // Premier. Adding either directory would silently 404 POD's own files.
    for (const dir of ['assets', 'attached_assets']) {
      expect(fs.existsSync(path.join(process.cwd(), 'public', dir))).toBe(false);
    }
  });
});
