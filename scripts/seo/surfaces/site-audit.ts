/**
 * Site Audit surface — technical-SEO crawl results.
 *
 * URL: /projects/{projectId}/siteaudit/campaign/
 *
 * Captures: site-health %, errors/warnings/notices counts, top issue
 * categories, total pages crawled, blocked-pages count, last crawl
 * timestamp.
 *
 * If the last crawl is >7 days old we DO NOT trigger a re-crawl from
 * the scraper — that's the operator's call (re-crawls cost SEMrush
 * quota). We just record the staleness via `lastCrawlAt` and let the
 * SEO Director flag it.
 */
import type { Page } from 'playwright';
import type { Surface } from './index';
import type { SiteAuditPayload } from '../lib/types';
import { parseIntSafe, parseFloatSafe, textOf, waitForReady } from './_helpers';

export const siteAudit: Surface<SiteAuditPayload> = {
  key: 'site-audit',
  needsProjectId: true,
  url: (ctx) => `https://www.semrush.com/projects/${ctx.tenant.semrushProjectId}/siteaudit/campaign/`,

  async scrape(page: Page): Promise<SiteAuditPayload> {
    await waitForReady(page);

    const healthPct = await parseFloatSafe(
      (await textOf(page, '[data-test="site-health-score"]')) ??
        (await textOf(page, '.s-site-audit-health')),
    );
    const errors = (await parseIntSafe(await textOf(page, '[data-test="errors-count"]'))) ?? 0;
    const warnings = (await parseIntSafe(await textOf(page, '[data-test="warnings-count"]'))) ?? 0;
    const notices = (await parseIntSafe(await textOf(page, '[data-test="notices-count"]'))) ?? 0;
    const pagesCrawled = await parseIntSafe(await textOf(page, '[data-test="pages-crawled"]'));
    const pagesBlocked = await parseIntSafe(await textOf(page, '[data-test="pages-blocked"]'));
    const lastCrawlAt = await textOf(page, '[data-test="last-crawl-date"]');

    // Top issues — usually a list of rows with severity badges.
    const topIssues = await page
      .$$eval(
        '[data-test="top-issues"] li, .s-issues-list li, table tr',
        (els) =>
          els
            .map((el) => {
              const name = (el.querySelector('a, span')?.textContent ?? '').trim();
              const countText = (
                el.querySelector('[data-test="count"], .s-issues-list__count, td:last-child')?.textContent ?? ''
              ).trim();
              const severity =
                (el.querySelector('[data-test="severity"], .severity')?.textContent ?? '')
                  .trim()
                  .toLowerCase() || 'unknown';
              return { name, severity, countText };
            })
            .filter((x) => !!x.name)
            .slice(0, 10),
      )
      .then(async (raw) =>
        Promise.all(
          raw.map(async (r) => ({
            name: r.name,
            severity: r.severity,
            count: (await parseIntSafe(r.countText)) ?? 0,
          })),
        ),
      )
      .catch(() => []);

    return {
      healthPct,
      errors,
      warnings,
      notices,
      topIssues,
      pagesCrawled,
      pagesBlocked,
      lastCrawlAt,
    };
  },
};
