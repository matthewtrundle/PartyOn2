/**
 * AI Toolkit · Brand Visibility surface.
 *
 * URL: /ai-toolkit/projects/{projectId}/brand-visibility/
 *
 * Iterates per-LLM tabs (ChatGPT, Gemini, Perplexity, Copilot, Claude
 * — whichever are present). For each: scrapes presence %, sentiment
 * split, and top cited domains.
 *
 * Time-series chart on this page renders into a <canvas> — that data
 * is NOT extractable from the DOM. We only capture the legend totals
 * and screenshots; the series itself is out of reach without an API.
 *
 * If the URL returns 404 / "Upgrade to AI Toolkit" gate, we throw a
 * `gated` error so the orchestrator marks this surface as gracefully
 * unavailable rather than as a real failure.
 */
import type { Page } from 'playwright';
import type { Surface } from './index';
import type { AiBrandVisibilityPayload } from '../lib/types';
import { parseFloatSafe, waitForReady, firstVisible } from './_helpers';

export class AiToolkitGatedError extends Error {
  constructor() {
    super('AI Toolkit not in current plan — surface gated');
    this.name = 'AiToolkitGatedError';
  }
}

export const aiBrandVisibility: Surface<AiBrandVisibilityPayload> = {
  key: 'ai-brand-visibility',
  needsProjectId: true,
  url: (ctx) =>
    `https://www.semrush.com/ai-toolkit/projects/${ctx.tenant.semrushProjectId}/brand-visibility/`,

  async scrape(page: Page): Promise<AiBrandVisibilityPayload> {
    await waitForReady(page);

    // Detect the upgrade gate. SEMrush usually renders a CTA banner with
    // "Upgrade" or "Get AI Toolkit" copy when the feature isn't in the
    // current subscription. If we see it, throw gracefully.
    const gateHit = await page
      .getByText(/upgrade.*ai.*toolkit|get.*ai.*toolkit/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (gateHit) throw new AiToolkitGatedError();

    // Find all per-LLM tabs. SEMrush renders them as tabs at the top.
    const tabSel = await firstVisible(page, [
      '[role="tablist"]',
      '[data-test="llm-tabs"]',
      '.s-llm-tabs',
    ]);
    if (!tabSel) {
      throw new Error('No LLM tab list found — AI Toolkit selector likely changed');
    }

    const llmNames = await page
      .$$eval(`${tabSel} [role="tab"], ${tabSel} button, ${tabSel} a`, (els) =>
        Array.from(new Set(els.map((el) => (el.textContent ?? '').trim()).filter(Boolean))),
      )
      .catch(() => [] as string[]);

    const llms: AiBrandVisibilityPayload['llms'] = [];
    for (const name of llmNames) {
      if (llms.length >= 8) break; // hard cap on LLMs we expect to see
      // Click the tab.
      const tab = page.getByRole('tab', { name: new RegExp(`^${escapeRe(name)}$`, 'i') }).first();
      const clickable = await tab.isVisible().catch(() => false);
      if (!clickable) continue;
      await tab.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(800);

      const presencePct = await parseFloatSafe(
        await page.locator('[data-test="presence-rate"], .s-presence-rate').first().textContent().catch(() => null),
      );

      // Sentiment split — three numbers.
      const sentimentSel = '[data-test="sentiment-split"], .s-sentiment-split';
      const sentimentEl = page.locator(sentimentSel).first();
      let sentiment: AiBrandVisibilityPayload['llms'][number]['sentiment'] = null;
      if (await sentimentEl.isVisible().catch(() => false)) {
        const txt = (await sentimentEl.textContent().catch(() => '')) ?? '';
        const m = txt.match(/(\d+(?:\.\d+)?)%.*?(\d+(?:\.\d+)?)%.*?(\d+(?:\.\d+)?)%/);
        if (m) {
          sentiment = {
            positive: parseFloat(m[1]),
            neutral: parseFloat(m[2]),
            negative: parseFloat(m[3]),
          };
        }
      }

      // Top cited domains.
      const topCitedDomains = await page
        .$$eval(
          '[data-test="top-citations"] li, .s-top-citations li, table tr',
          (els) =>
            els
              .map((el) => {
                const domain = (el.querySelector('a, span')?.textContent ?? '').trim();
                const shareText = (
                  el.querySelector('[data-test="share"], .share, td:last-child')?.textContent ?? ''
                ).trim();
                return { domain, shareText };
              })
              .filter((x) => !!x.domain)
              .slice(0, 10),
        )
        .then(async (raw) =>
          Promise.all(
            raw.map(async (r) => ({
              domain: r.domain,
              sharePct: await parseFloatSafe(r.shareText),
            })),
          ),
        )
        .catch(() => []);

      llms.push({ llm: name, presencePct, sentiment, topCitedDomains });
    }

    if (llms.length === 0) {
      throw new Error('No LLM tabs produced data — page layout likely changed');
    }

    return { llms };
  },
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
