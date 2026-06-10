/**
 * Position Tracking surface.
 *
 * URL: /projects/{projectId}/tracking/positions/
 *
 * SEMrush's Position Tracking dashboard shows per-keyword rank + WoW
 * delta + search volume + KD% + ranking URL for the keywords the
 * operator has set up in the project.
 *
 * Strategy: SEMrush renders the table client-side via a virtualized
 * list. We wait for the data-grid to mount, scroll until we've seen
 * MAX_ROWS rows or the grid stops loading new ones, and pull data from
 * the row elements.
 */
import type { Page } from 'playwright';
import type { Surface } from './index';
import type { PositionTrackingPayload, ScrapeContext } from '../lib/types';
import { parseIntSafe, parseFloatSafe, textOf, waitForReady } from './_helpers';

const MAX_ROWS = 500;

export const positionTracking: Surface<PositionTrackingPayload> = {
  key: 'position-tracking',
  needsProjectId: true,
  url: (ctx) => `https://www.semrush.com/projects/${ctx.tenant.semrushProjectId}/tracking/positions/`,

  async scrape(page: Page): Promise<PositionTrackingPayload> {
    await waitForReady(page);

    // The position-tracking grid is a virtualized table. SEMrush has
    // historically labeled it `[data-test=position-tracking-table]` or
    // `.s-position-tracking__table`. We try several fallback selectors
    // before giving up.
    const tableSel = await firstVisible(page, [
      '[data-test="position-tracking-table"]',
      'table[data-track="position-tracking"]',
      '.s-position-tracking__table',
      'div[role="grid"]',
      'table',
    ]);
    if (!tableSel) {
      throw new Error('Position Tracking table not found — selector likely changed');
    }

    // Total keyword count is in the toolbar above the table; try a few
    // common locations.
    const totalKeywords =
      (await parseIntSafe(await textOf(page, '[data-test="total-keywords"]'))) ??
      (await parseIntSafe(await textOf(page, '.s-position-tracking__total'))) ??
      0;

    const rows: PositionTrackingPayload['rows'] = [];
    const seenKeywords = new Set<string>();
    let stableScrolls = 0;

    while (rows.length < MAX_ROWS && stableScrolls < 3) {
      const beforeCount = rows.length;

      // Capture every visible row.
      const visibleRows = await page.$$eval(
        `${tableSel} tr, ${tableSel} [role="row"]`,
        (els) =>
          els
            .map((el) => {
              const cells = el.querySelectorAll('td, [role="gridcell"]');
              if (cells.length === 0) return null;
              const text = (n: number) => (cells[n]?.textContent ?? '').trim();
              const anchor = el.querySelector('a[href*="://"]');
              return {
                keyword: text(0) || text(1),
                positionText: text(2) || text(1),
                previousText: text(3),
                url: anchor instanceof HTMLAnchorElement ? anchor.href : null,
                volumeText: text(4),
                kdText: text(5),
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null),
      );

      for (const r of visibleRows) {
        if (!r.keyword || seenKeywords.has(r.keyword)) continue;
        seenKeywords.add(r.keyword);
        rows.push({
          keyword: r.keyword,
          position: await parseIntSafe(r.positionText),
          previousPosition: await parseIntSafe(r.previousText),
          url: r.url,
          searchVolume: await parseIntSafe(r.volumeText),
          kdPct: await parseFloatSafe(r.kdText),
          trackedSince: null,
        });
      }

      if (rows.length === beforeCount) stableScrolls++;
      else stableScrolls = 0;

      // Scroll the table body. SEMrush virtualizes, so we need to scroll
      // the inner container, not the page.
      await page.evaluate((sel) => {
        const root = document.querySelector(sel);
        if (root) root.scrollBy(0, 600);
      }, tableSel);
      await page.waitForTimeout(700);
    }

    return { rows: rows.slice(0, MAX_ROWS), totalKeywords };
  },
};

async function firstVisible(page: Page, selectors: string[]): Promise<string | null> {
  for (const sel of selectors) {
    const visible = await page
      .locator(sel)
      .first()
      .isVisible()
      .catch(() => false);
    if (visible) return sel;
  }
  return null;
}

// re-export ScrapeContext to silence the noop unused-import warning when
// TypeScript is configured strict. (Kept inline since Surface uses it.)
export type _Ctx = ScrapeContext;
