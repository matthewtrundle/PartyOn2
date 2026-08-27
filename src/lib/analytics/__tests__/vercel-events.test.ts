/**
 * Tests for the log-drain traffic definitions.
 *
 * `BOT_UA_REGEX` is written as a POSIX regex string for Postgres, but it is
 * deliberately kept to plain literal alternation so the exact same string is
 * also a valid JavaScript RegExp. That is what lets these tests exercise the
 * real production classifier rather than a copy of it — if someone adds a `\b`
 * or `\d` that Postgres and JS disagree about, the mirror here is the tripwire.
 */

import { describe, it, expect, vi } from 'vitest';

// vercel-events imports the prisma singleton; stub it so no live client is built.
vi.mock('@/lib/database/client', () => ({
  prisma: {},
  kv: {},
  isKVConfigured: () => false,
}));

import {
  BOT_UA_REGEX,
  ASSET_PATH_SQL_REGEX,
  VERCEL_DRAIN_PATH,
  isNoisePath,
  redactPath,
  redactReferrer,
} from '../vercel-events';

const botRe = new RegExp(BOT_UA_REGEX, 'i');

describe('isNoisePath', () => {
  it('keeps real pages', () => {
    expect(isNoisePath('/')).toBe(false);
    expect(isNoisePath('/products')).toBe(false);
    expect(isNoisePath('/blog/how-much-beer')).toBe(false);
    expect(isNoisePath('/products?category=beer')).toBe(false);
  });

  it('drops every API path — they carry the same credentials as the pages', () => {
    // /api/v1/invoice/<token> and /api/group-orders/<code> are possession-based,
    // and a dashboard page load calls them; storing these would leak the codes
    // that redactPath strips from the page path.
    expect(isNoisePath('/api/v1/invoice/tok_live_9f3a2b')).toBe(true);
    expect(isNoisePath('/api/group-orders/E97WPQ/items')).toBe(true);
    expect(isNoisePath('/api/v2/group-orders/ABC123/join')).toBe(true);
    expect(isNoisePath('/api/cart/share/9c1f')).toBe(true);
    expect(isNoisePath('/api/v1/products')).toBe(true);
    expect(isNoisePath('/api')).toBe(true);
    // Not an API route despite the prefix.
    expect(isNoisePath('/api-docs')).toBe(false);
  });

  it('drops our own drain endpoint, which every delivery would otherwise log', () => {
    expect(isNoisePath(VERCEL_DRAIN_PATH)).toBe(true);
    expect(isNoisePath(`${VERCEL_DRAIN_PATH}?x=1`)).toBe(true);
  });

  it('drops Next.js internals and static assets', () => {
    expect(isNoisePath('/_next/static/chunks/main.js')).toBe(true);
    expect(isNoisePath('/__nextjs_original-stack-frame')).toBe(true);
    expect(isNoisePath('/images/hero.webp')).toBe(true);
    expect(isNoisePath('/fonts/inter.woff2')).toBe(true);
    expect(isNoisePath('/styles.css?v=2')).toBe(true);
  });

  it('drops crawler furniture and empty paths', () => {
    expect(isNoisePath('/favicon.ico')).toBe(true);
    expect(isNoisePath('/robots.txt')).toBe(true);
    expect(isNoisePath('/sitemap.xml')).toBe(true);
    expect(isNoisePath('')).toBe(true);
    expect(isNoisePath(null)).toBe(true);
    expect(isNoisePath(undefined)).toBe(true);
  });
});

describe('BOT_UA_REGEX', () => {
  it('is a valid JavaScript regex too, so Postgres and JS agree', () => {
    expect(() => new RegExp(BOT_UA_REGEX, 'i')).not.toThrow();
    expect(BOT_UA_REGEX).not.toMatch(/\\[bdswBDSW]/);
  });

  it('matches search crawlers, AI crawlers, tools and monitors', () => {
    const bots = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
      'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
      'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
      'Mozilla/5.0 (compatible; SemrushBot/7~bl)',
      'curl/8.4.0',
      'python-requests/2.31.0',
      'axios/1.6.2',
      'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0 Safari/537.36',
      'Pingdom.com_bot_version_1.4',
      'facebookexternalhit/1.1',
    ];
    for (const ua of bots) {
      expect(botRe.test(ua), `expected bot: ${ua}`).toBe(true);
    }
  });

  it('does not match real browsers — the false-positive case that would erase real customers', () => {
    const humans = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    ];
    for (const ua of humans) {
      expect(botRe.test(ua), `expected human: ${ua}`).toBe(false);
    }
  });
});

describe('redactPath', () => {
  it('replaces credential-bearing segments with their route template', () => {
    // These URLs grant access by possession — storing them verbatim would make
    // the analytics table a list of working links into customer data.
    expect(redactPath('/dashboard/E97WPQ')).toBe('/dashboard/[code]');
    expect(redactPath('/dashboard/E97WPQ/success')).toBe('/dashboard/[code]/success');
    expect(redactPath('/group/ABC123')).toBe('/group/[code]');
    expect(redactPath('/group/ABC123/dashboard')).toBe('/group/[code]/dashboard');
    expect(redactPath('/invoice/tok_live_9f3a2b')).toBe('/invoice/[token]');
    expect(redactPath('/cart/shared/9c1f')).toBe('/cart/shared/[id]');
    expect(redactPath('/concierge-quote/lead_88')).toBe('/concierge-quote/[leadId]');
    expect(redactPath('/s/xY9k2')).toBe('/s/[slug]');
    expect(redactPath('/invoices/2026/abc-token')).toBe('/invoices/[...]');
    expect(redactPath('/store-7/invoices/abc-token')).toBe('/store-7/invoices/[...]');
  });

  it('is not fooled by casing or repeated slashes', () => {
    expect(redactPath('/DASHBOARD/E97WPQ')).toBe('/dashboard/[code]');
    // A doubled slash reaches the same page but would slip past a segment match.
    expect(redactPath('/dashboard//E97WPQ')).toBe('/dashboard/[code]');
    expect(redactPath('/invoice//tok_live_9f3a2b')).toBe('/invoice/[token]');
  });

  it('leaves public marketing pages intact — they are the point of the report', () => {
    const untouched = [
      '/',
      '/products',
      '/products/tito-s-handmade-vodka',
      '/blog/how-much-beer-for-a-party',
      '/blog/category/weddings',
      '/venues/the-oasis',
      '/partners/lake-travis-yacht-rentals',
      '/delivery/lake-travis',
      '/weddings/packages/premium',
      '/austin-corporate-event-delivery',
      // Not the credential routes, despite similar prefixes.
      '/dashboard',
      '/invoice',
    ];
    for (const p of untouched) {
      expect(redactPath(p), `expected untouched: ${p}`).toBe(p);
    }
  });
});

describe('redactReferrer', () => {
  it('redacts our own credential URLs arriving as a referrer', () => {
    // Clicking away from a dashboard sends its URL as the next request's Referer.
    expect(redactReferrer('https://partyondelivery.com/dashboard/E97WPQ')).toBe(
      'https://partyondelivery.com/dashboard/[code]'
    );
    expect(redactReferrer('https://partyondelivery.com/invoice/tok_live_9f3a2b?pay=1')).toBe(
      'https://partyondelivery.com/invoice/[token]'
    );
  });

  it('keeps external referrers useful while dropping their query strings', () => {
    expect(redactReferrer('https://www.google.com/search?q=beer+delivery')).toBe(
      'https://www.google.com/search'
    );
    expect(redactReferrer('https://partyondelivery.com/products')).toBe(
      'https://partyondelivery.com/products'
    );
  });

  it('handles a bare path referrer', () => {
    expect(redactReferrer('/dashboard/E97WPQ')).toBe('/dashboard/[code]');
  });

  it('drops anything it cannot make safe rather than guessing', () => {
    // Protocol-relative: unparseable without a base, and treating it as a path
    // would leave the code intact.
    expect(redactReferrer('//partyondelivery.com/dashboard/E97WPQ')).toBeNull();
    expect(redactReferrer('not a url /dashboard/E97WPQ')).toBeNull();
    expect(redactReferrer('javascript:alert(1)')).toBeNull();
    expect(redactReferrer('')).toBeNull();
  });

  it('strips credentials and fragments from the URL itself', () => {
    expect(redactReferrer('https://user:pw@partyondelivery.com/invoice/TOKEN')).toBe(
      'https://partyondelivery.com/invoice/[token]'
    );
    expect(redactReferrer('https://partyondelivery.com/dashboard/E97WPQ#tok=SECRET')).toBe(
      'https://partyondelivery.com/dashboard/[code]'
    );
  });
});

describe('ASSET_PATH_SQL_REGEX', () => {
  it('anchors on the extension at end-of-path or before a query string', () => {
    const re = new RegExp(ASSET_PATH_SQL_REGEX, 'i');
    expect(re.test('/app.js')).toBe(true);
    expect(re.test('/app.css?v=3')).toBe(true);
    expect(re.test('/products')).toBe(false);
    expect(re.test('/blog/css-tricks')).toBe(false);
  });
});
