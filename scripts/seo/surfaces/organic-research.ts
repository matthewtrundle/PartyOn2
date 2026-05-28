/**
 * Organic Research surface — domain-level organic-search overview.
 *
 * URL: /analytics/organic/overview/?q=<domain>
 *
 * Captures: traffic estimate, total ranking keywords, authority score,
 * position-bucket counts (top 3 / 10 / 20), and the top 20 organic
 * pages.
 */
import type { Page } from 'playwright';
import type { Surface } from './index';
import type { OrganicResearchPayload } from '../lib/types';
import { parseIntSafe, parseFloatSafe, textOf, waitForReady } from './_helpers';

export const organicResearch: Surface<OrganicResearchPayload> = {
  key: 'organic-research',
  needsProjectId: false,
  url: (ctx) =>
    `https://www.semrush.com/analytics/organic/overview/?q=${encodeURIComponent(ctx.tenant.domain)}`,

  async scrape(page: Page): Promise<OrganicResearchPayload> {
    await waitForReady(page);

    const trafficEstimate = await parseIntSafe(
      (await textOf(page, '[data-test="organic-traffic"]')) ??
        (await textOf(page, '.s-organic-overview__traffic')) ??
        (await textOf(page, '[data-track="overview-traffic"]')),
    );
    const rankingKeywords = await parseIntSafe(
      (await textOf(page, '[data-test="organic-keywords"]')) ??
        (await textOf(page, '.s-organic-overview__keywords')),
    );
    const authorityScore = await parseFloatSafe(
      (await textOf(page, '[data-test="authority-score"]')) ??
        (await textOf(page, '.s-authority-score')),
    );

    // Position-bucket counts — SEMrush shows them as small stat cards.
    const top3 = (await parseIntSafe(await textOf(page, '[data-test="positions-top3"]'))) ?? 0;
    const top10 = (await parseIntSafe(await textOf(page, '[data-test="positions-top10"]'))) ?? 0;
    const top20 = (await parseIntSafe(await textOf(page, '[data-test="positions-top20"]'))) ?? 0;

    // Top organic pages table — try a few selector strategies.
    const topPages: OrganicResearchPayload['topPages'] = await page
      .$$eval(
        '[data-test="top-pages"] tr, .s-top-pages tr, table tr',
        (rows) =>
          rows
            .map((tr) => {
              const cells = tr.querySelectorAll('td');
              if (cells.length < 2) return null;
              const anchor = tr.querySelector('a[href*="://"]');
              return {
                url:
                  anchor instanceof HTMLAnchorElement
                    ? anchor.href
                    : (cells[0]?.textContent ?? '').trim(),
                trafficText: (cells[1]?.textContent ?? '').trim(),
                keywordsText: (cells[2]?.textContent ?? '').trim(),
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null && !!x.url)
            .slice(0, 20),
      )
      .then(async (rows) =>
        Promise.all(
          rows.map(async (r) => ({
            url: r.url,
            traffic: (await parseIntSafe(r.trafficText)) ?? 0,
            keywords: (await parseIntSafe(r.keywordsText)) ?? 0,
          })),
        ),
      )
      .catch(() => []);

    return {
      trafficEstimate,
      rankingKeywords,
      authorityScore,
      topCount: { top3, top10, top20 },
      topPages,
    };
  },
};
