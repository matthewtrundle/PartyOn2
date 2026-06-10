/**
 * Keyword Magic surface (conditional).
 *
 * URL: /analytics/keywordmagic/?q=<seed-keyword>
 *
 * Only runs when there are queued seed keywords. The queue lives at
 * `data/seo/semrush/_queue/keyword-magic.txt` (one keyword per line).
 * If the file is missing or empty, this surface no-ops cleanly with an
 * empty seeds array — NOT an error.
 *
 * For each seed: capture the top 100 related keywords with volume, KD%,
 * intent, and SERP features.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
import type { Surface } from './index';
import type { KeywordMagicPayload } from '../lib/types';
import { parseIntSafe, parseFloatSafe, waitForReady, firstVisible } from './_helpers';

const QUEUE_PATH = path.join(process.cwd(), 'data', 'seo', 'semrush', '_queue', 'keyword-magic.txt');
const MAX_PER_SEED = 100;

export const keywordMagic: Surface<KeywordMagicPayload> = {
  key: 'keyword-magic',
  needsProjectId: false,
  // Base URL — the seed is templated in at scrape time per-seed.
  url: () => 'https://www.semrush.com/analytics/keywordmagic/',

  async scrape(page: Page): Promise<KeywordMagicPayload> {
    if (!existsSync(QUEUE_PATH)) {
      return { seeds: [] };
    }
    const queued = readFileSync(QUEUE_PATH, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    if (queued.length === 0) return { seeds: [] };

    const seeds: KeywordMagicPayload['seeds'] = [];
    for (const seed of queued) {
      await page.goto(
        `https://www.semrush.com/analytics/keywordmagic/?q=${encodeURIComponent(seed)}`,
        { waitUntil: 'domcontentloaded', timeout: 30_000 },
      );
      await waitForReady(page);

      const tableSel = await firstVisible(page, [
        '[data-test="keyword-magic-table"]',
        '.s-keyword-magic__table',
        'table',
      ]);
      if (!tableSel) {
        seeds.push({ seed, related: [] });
        continue;
      }

      const rows = await page
        .$$eval(`${tableSel} tr`, (els) =>
          els
            .map((tr) => {
              const cells = tr.querySelectorAll('td');
              if (cells.length < 2) return null;
              const text = (n: number) => (cells[n]?.textContent ?? '').trim();
              return {
                keyword: text(0),
                volume: text(1),
                kd: text(2),
                intent: text(3),
                serpFeatures: (cells[4]?.textContent ?? '').trim(),
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null && !!x.keyword)
            .slice(0, 100),
        )
        .catch(() => [] as Array<{
          keyword: string;
          volume: string;
          kd: string;
          intent: string;
          serpFeatures: string;
        }>);

      const related = await Promise.all(
        rows.slice(0, MAX_PER_SEED).map(async (r) => ({
          keyword: r.keyword,
          volume: await parseIntSafe(r.volume),
          kdPct: await parseFloatSafe(r.kd),
          intent: r.intent || null,
          serpFeatures: r.serpFeatures.split(/[,\s]+/).filter(Boolean),
        })),
      );

      seeds.push({ seed, related });
    }

    return { seeds };
  },
};
