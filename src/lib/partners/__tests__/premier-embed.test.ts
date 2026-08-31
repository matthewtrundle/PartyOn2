import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  PREMIER_QUOTE_EMBED_PATH,
  PROXIED_ASSET_PREFIXES,
  buildPremierEmbedHtml,
  extractAssetPaths,
  extractAssetPrefixes,
  isJavaScriptContentType,
  isPremierQuotePage,
  premierEmbedFallbackHtml,
  unproxiedAssetPrefixes,
} from '@/lib/partners/premier-embed';
import { getStrPartnerBySlug, listStrPartners } from '@/lib/partners/str-partners';

/**
 * Stand-in for Premier's server-rendered `/get-a-quote` page: a `<head>`, a
 * hero video under the proxied `/attached_assets/`, the quote form, and the
 * Xola booking iframe. Live pricing/booking come from absolute Supabase + Xola
 * URLs, so nothing here is a root-relative bundle.
 */
function quotePage({
  form = true,
  xola = true,
  extraHeadAsset = '',
}: { form?: boolean; xola?: boolean; extraHeadAsset?: string } = {}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Get a Quote — Premier Party Cruises</title>
    <link href="https://fonts.googleapis.com/css2?family=Jost" rel="stylesheet" />
    <style>body{margin:0}</style>
    ${extraHeadAsset}
  </head>
  <body>
    <section class="hero">
      <video src="/attached_assets/fireball_dance_party_compressed.mp4" autoplay muted></video>
      <h1>Get a Quote &amp; Book Your Lake Travis Cruise</h1>
    </section>
    ${form ? '<form id="qform" class="qcard" novalidate></form>' : ''}
    ${xola ? '<iframe class="xframe" title="Book" loading="lazy" src="https://checkout.xola.app/index.html#seller/64c43a70/experiences/6902"></iframe>' : ''}
  </body>
</html>`;
}

describe('isPremierQuotePage', () => {
  it('accepts the real quote page', () => {
    expect(isPremierQuotePage(quotePage())).toBe(true);
  });

  it('accepts the page on either signal alone, so a form-id rename or a booking-provider swap does not blank the tab', () => {
    expect(isPremierQuotePage(quotePage({ xola: false }))).toBe(true); // quote form only
    expect(isPremierQuotePage(quotePage({ form: false }))).toBe(true); // Xola embed only
  });

  it('rejects the bare Netlify redirect stub that /quote returns', () => {
    // `/quote` 301s to `/get-a-quote`; a stray fetch of the stub has no <head>.
    expect(isPremierQuotePage('Redirecting to /get-a-quote')).toBe(false);
  });

  it('rejects a 200 error/holding page with no booking surface', () => {
    expect(isPremierQuotePage('<html><head></head><body><h1>Not Found</h1></body></html>')).toBe(false);
  });
});

describe('asset extraction', () => {
  it('finds no root-relative bundle on the current page (fonts are absolute, CSS is inline, the video is not js/css)', () => {
    expect(extractAssetPaths(quotePage())).toEqual([]);
  });

  it('flags a root-relative bundle prefix our rewrites do not proxy, if Premier ever ships one again', () => {
    const moved = quotePage({ extraHeadAsset: '<script src="/static/app-abc.js"></script>' });
    expect(extractAssetPaths(moved)).toContain('/static/app-abc.js');
    expect(extractAssetPrefixes(moved)).toContain('/static/');
    expect(unproxiedAssetPrefixes(moved)).toContain('/static/');
  });

  it('does not flag a bundle under a proxied prefix', () => {
    const proxied = quotePage({ extraHeadAsset: '<script src="/assets/app-abc.js"></script>' });
    expect(unproxiedAssetPrefixes(proxied)).toEqual([]);
  });

  it('knows which prefixes next.config.ts proxies', () => {
    expect(PROXIED_ASSET_PREFIXES).toContain('/assets/');
    expect(PROXIED_ASSET_PREFIXES).toContain('/attached_assets/');
  });
});

describe('isJavaScriptContentType', () => {
  // Kept for the health check's per-asset test: if Premier ships a root-relative
  // bundle again, a vanished one comes back as text/html and the browser refuses it.
  it('accepts JavaScript content types', () => {
    expect(isJavaScriptContentType('application/javascript; charset=UTF-8')).toBe(true);
    expect(isJavaScriptContentType('text/javascript')).toBe(true);
  });

  it('rejects the HTML fallback and a missing header', () => {
    expect(isJavaScriptContentType('text/html; charset=UTF-8')).toBe(false);
    expect(isJavaScriptContentType(null)).toBe(false);
  });
});

describe('buildPremierEmbedHtml', () => {
  it('injects a noindex robots meta immediately inside <head>', () => {
    const out = buildPremierEmbedHtml(quotePage())!;
    expect(out).toContain('name="robots" content="noindex,nofollow"');
    expect(out.indexOf('pod-partner-embed-injection')).toBeGreaterThan(out.indexOf('<head>'));
    expect(out.indexOf('pod-partner-embed-injection')).toBeLessThan(out.indexOf('</head>'));
  });

  it('does not inject a client script — the page is server-rendered', () => {
    expect(buildPremierEmbedHtml(quotePage())!).not.toContain('<script>');
  });

  it('leaves the upstream page content untouched', () => {
    const out = buildPremierEmbedHtml(quotePage())!;
    expect(out).toContain('src="/attached_assets/fireball_dance_party_compressed.mp4"');
    expect(out).toContain('checkout.xola.app');
    expect(out).toContain('id="qform"');
  });

  it('is idempotent', () => {
    const once = buildPremierEmbedHtml(quotePage())!;
    expect(buildPremierEmbedHtml(once)).toBe(once);
  });

  it('returns null for upstream HTML that is not the quote page', () => {
    expect(buildPremierEmbedHtml('<html><body>maintenance</body></html>')).toBeNull();
    expect(buildPremierEmbedHtml('Redirecting to /get-a-quote')).toBeNull();
  });
});

describe('premierEmbedFallbackHtml', () => {
  it('links out to Premier so a guest can still book', () => {
    const html = premierEmbedFallbackHtml();
    expect(html).toContain('https://premierpartycruises.com/get-a-quote');
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
