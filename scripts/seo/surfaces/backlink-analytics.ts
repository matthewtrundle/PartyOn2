/**
 * Backlink Analytics surface — link profile overview.
 *
 * URL: /analytics/backlinks/overview/?q=<domain>
 *
 * Captures: total backlinks, total referring domains, top anchor
 * distribution, and the 20 most recently observed referring domains.
 */
import type { Page } from 'playwright';
import type { Surface } from './index';
import type { BacklinkAnalyticsPayload } from '../lib/types';
import { parseIntSafe, parseFloatSafe, textOf, waitForReady } from './_helpers';

export const backlinkAnalytics: Surface<BacklinkAnalyticsPayload> = {
  key: 'backlink-analytics',
  needsProjectId: false,
  url: (ctx) =>
    `https://www.semrush.com/analytics/backlinks/overview/?q=${encodeURIComponent(ctx.tenant.domain)}`,

  async scrape(page: Page): Promise<BacklinkAnalyticsPayload> {
    await waitForReady(page);

    const totalBacklinks = await parseIntSafe(
      (await textOf(page, '[data-test="backlinks-total"]')) ??
        (await textOf(page, '.s-backlinks-total')),
    );
    const referringDomains = await parseIntSafe(
      (await textOf(page, '[data-test="referring-domains-total"]')) ??
        (await textOf(page, '.s-referring-domains-total')),
    );

    // Top anchors — usually a small list.
    const topAnchors = await page
      .$$eval(
        '[data-test="top-anchors"] li, .s-top-anchors li, table tr',
        (els) =>
          els
            .map((el) => {
              const anchor = (el.querySelector('a, span')?.textContent ?? '').trim();
              const shareText = (
                el.querySelector('[data-test="share"], .s-share, td:last-child')?.textContent ?? ''
              ).trim();
              return { anchor, shareText };
            })
            .filter((x) => !!x.anchor)
            .slice(0, 20),
      )
      .then(async (raw) =>
        Promise.all(
          raw.map(async (r) => ({
            anchor: r.anchor,
            sharePct: (await parseFloatSafe(r.shareText)) ?? 0,
          })),
        ),
      )
      .catch(() => []);

    // Recent referring domains.
    const recentDomains = await page
      .$$eval(
        '[data-test="recent-referring"] tr, .s-recent-referring tr, table tr',
        (rows) =>
          rows
            .map((tr) => {
              const cells = tr.querySelectorAll('td');
              if (cells.length < 1) return null;
              const anchor = tr.querySelector('a[href*="://"]');
              return {
                domain:
                  anchor instanceof HTMLAnchorElement
                    ? new URL(anchor.href).hostname
                    : (cells[0]?.textContent ?? '').trim(),
                firstSeen: (cells[1]?.textContent ?? '').trim() || null,
                pageScoreText: (cells[2]?.textContent ?? '').trim(),
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null && !!x.domain)
            .slice(0, 20),
      )
      .then(async (raw) =>
        Promise.all(
          raw.map(async (r) => ({
            domain: r.domain,
            firstSeen: r.firstSeen,
            pageScore: await parseFloatSafe(r.pageScoreText),
          })),
        ),
      )
      .catch(() => []);

    return {
      totalBacklinks,
      referringDomains,
      topAnchors,
      recentDomains,
    };
  },
};
