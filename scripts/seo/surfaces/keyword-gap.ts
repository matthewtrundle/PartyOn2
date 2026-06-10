/**
 * Keyword Gap Analysis surface.
 *
 * URL: /analytics/keywordgap/?q=<domain>&q1=<comp1>&q2=<comp2>&q3=<comp3>
 *
 * Captures keywords from the Missing / Weak / Untapped tabs. Each
 * tab is capped at MAX_PER_TAB rows so a single run doesn't try to
 * paginate through 50k results.
 *
 * Defensive selectors: SEMrush's gap-analysis table changes shape based
 * on how many competitors are loaded. We rely on row structure rather
 * than column indices where possible.
 */
import type { Page } from 'playwright';
import type { Surface } from './index';
import type { KeywordGapPayload, GapRow } from '../lib/types';
import { parseIntSafe, parseFloatSafe, waitForReady, firstVisible } from './_helpers';

const MAX_PER_TAB = 167; // 3 × 167 ≈ 500 total rows across tabs
const TABS: Array<'missing' | 'weak' | 'untapped'> = ['missing', 'weak', 'untapped'];

export const keywordGap: Surface<KeywordGapPayload> = {
  key: 'keyword-gap',
  needsProjectId: false,
  url: (ctx) => {
    const competitors = ctx.tenant.competitors ?? ['drizly.com', 'gopuff.com', 'saucey.com'];
    const params = new URLSearchParams({
      q: ctx.tenant.domain,
    });
    competitors.slice(0, 4).forEach((c, i) => params.set(`q${i + 1}`, c));
    return `https://www.semrush.com/analytics/keywordgap/?${params.toString()}`;
  },

  async scrape(page: Page, ctx): Promise<KeywordGapPayload> {
    await waitForReady(page);
    const competitors = ctx.tenant.competitors ?? ['drizly.com', 'gopuff.com', 'saucey.com'];

    const result: KeywordGapPayload = {
      competitors,
      missing: [],
      weak: [],
      untapped: [],
    };

    for (const tab of TABS) {
      // Click the tab. SEMrush localizes tab text in different cases;
      // try multiple matchers.
      const labels = [tab, tab.charAt(0).toUpperCase() + tab.slice(1), tab.toUpperCase()];
      let clicked = false;
      for (const label of labels) {
        const candidate = page.getByRole('tab', { name: new RegExp(`^${label}$`, 'i') }).first();
        if (await candidate.isVisible().catch(() => false)) {
          await candidate.click({ timeout: 5_000 }).catch(() => {});
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        // Tab not visible — skip and continue rather than abort.
        continue;
      }
      await page.waitForTimeout(900);

      const tableSel = await firstVisible(page, [
        '[data-test="keyword-gap-table"]',
        '.s-keyword-gap__table',
        'div[role="grid"]',
        'table',
      ]);
      if (!tableSel) continue;

      const rows = await page
        .$$eval(`${tableSel} tr, ${tableSel} [role="row"]`, (els) =>
          els
            .map((el) => {
              const cells = el.querySelectorAll('td, [role="gridcell"]');
              if (cells.length === 0) return null;
              const text = (n: number) => (cells[n]?.textContent ?? '').trim();
              return {
                keyword: text(0),
                volume: text(1),
                kd: text(2),
                intent: text(3),
                ourPos: text(4),
                compPositions: Array.from(cells)
                  .slice(5)
                  .map((c) => (c.textContent ?? '').trim()),
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null && !!x.keyword),
        )
        .catch(() => [] as Array<{
          keyword: string;
          volume: string;
          kd: string;
          intent: string;
          ourPos: string;
          compPositions: string[];
        }>);

      const mapped: GapRow[] = await Promise.all(
        rows.slice(0, MAX_PER_TAB).map(async (r) => ({
          keyword: r.keyword,
          volume: await parseIntSafe(r.volume),
          kdPct: await parseFloatSafe(r.kd),
          intent: r.intent || null,
          ourPosition: await parseIntSafe(r.ourPos),
          competitorPositions: Object.fromEntries(
            await Promise.all(
              competitors.slice(0, r.compPositions.length).map(async (c, idx) => [
                c,
                await parseIntSafe(r.compPositions[idx]),
              ] as [string, number | null]),
            ),
          ),
        })),
      );

      result[tab] = mapped;
    }

    return result;
  },
};
