import { describe, expect, it } from 'vitest';
import {
  PREMIER_QUOTE_EMBED_PATH,
  buildPremierEmbedHtml,
  isBootablePremierShell,
  premierEmbedFallbackHtml,
} from '@/lib/partners/premier-embed';
import { getStrPartnerBySlug, listStrPartners } from '@/lib/partners/str-partners';

/** Minimal stand-in for Premier's Vite SPA shell. */
function shell({ entry = '/assets/index-BdlBbSmN.js' }: { entry?: string } = {}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" crossorigin src="${entry}"></script>
  </head>
  <body><div id="root"></div></body>
</html>`;
}

describe('isBootablePremierShell', () => {
  it('accepts a shell with a hashed module entry bundle', () => {
    expect(isBootablePremierShell(shell())).toBe(true);
  });

  it('accepts any entry hash, so Premier can redeploy freely', () => {
    expect(isBootablePremierShell(shell({ entry: '/assets/index-ZZZ99999.js' }))).toBe(true);
  });

  it('rejects a shell whose module entry is missing', () => {
    const noEntry = shell().replace(/<script[^>]*><\/script>/, '');
    expect(isBootablePremierShell(noEntry)).toBe(false);
  });

  it('rejects an upstream error page served with HTTP 200', () => {
    expect(isBootablePremierShell('<html><body><h1>Not Found</h1></body></html>')).toBe(false);
  });
});

describe('buildPremierEmbedHtml', () => {
  it('injects POD additions directly after <head>', () => {
    const out = buildPremierEmbedHtml(shell());
    expect(out).not.toBeNull();
    const headIndex = out!.indexOf('<head>');
    const injectionIndex = out!.indexOf('history.replaceState');
    const charsetIndex = out!.indexOf('<meta charset');
    expect(injectionIndex).toBeGreaterThan(headIndex);
    expect(injectionIndex).toBeLessThan(charsetIndex);
  });

  it('routes the SPA to /quote and keeps the embed out of search', () => {
    const out = buildPremierEmbedHtml(shell())!;
    expect(out).toContain('history.replaceState(null,"","/quote")');
    expect(out).toContain('name="robots" content="noindex,nofollow"');
  });

  it('preserves the upstream entry bundle untouched', () => {
    const out = buildPremierEmbedHtml(shell({ entry: '/assets/index-NEWHASH1.js' }))!;
    expect(out).toContain('src="/assets/index-NEWHASH1.js"');
  });

  it('mounts the hero slideshow', () => {
    const out = buildPremierEmbedHtml(shell())!;
    expect(out).toContain('/images/partners/premier-boat-slideshow/unicorn-float-crew.jpg');
    expect(out).toContain('MutationObserver');
  });

  it('is idempotent — injecting twice does not duplicate the script', () => {
    const once = buildPremierEmbedHtml(shell())!;
    const twice = buildPremierEmbedHtml(once)!;
    expect(twice).toBe(once);
  });

  it('returns null for upstream HTML that would render blank', () => {
    expect(buildPremierEmbedHtml('<html><body>maintenance</body></html>')).toBeNull();
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

  it('gives bulk-imported STR prospect pages the same working boat tab', () => {
    // Regression guard for 2026-07-27: co-branded prospect pages such as
    // 512 Retreat are what cold outreach links to, and their boat tab was
    // blank. They inherit the template config rather than declaring one.
    const prospect = getStrPartnerBySlug('512-retreat');
    expect(prospect?.secondTab?.embedUrl).toBe(PREMIER_QUOTE_EMBED_PATH);
  });
});
