/**
 * AI Toolkit · Prompt Tracking surface.
 *
 * URL: /ai-toolkit/projects/{projectId}/prompts/
 *
 * For each tracked prompt in the project, we click into the row and
 * scrape every per-LLM cell: full response text (truncated to 4000
 * chars), citation status + rank, competitors mentioned in the
 * response.
 *
 * Hard caps to keep run time bounded:
 *   - MAX_PROMPTS prompts (alphabetical)
 *   - MAX_RESPONSE_CHARS per response
 *
 * Same gating behavior as ai-brand-visibility — throws AiToolkitGatedError
 * if the feature isn't in the plan.
 */
import type { Page } from 'playwright';
import type { Surface } from './index';
import type { AiPromptTrackingPayload } from '../lib/types';
import { waitForReady, firstVisible, parseIntSafe } from './_helpers';
import { AiToolkitGatedError } from './ai-brand-visibility';

const MAX_PROMPTS = 50;
const MAX_RESPONSE_CHARS = 4000;

export const aiPromptTracking: Surface<AiPromptTrackingPayload> = {
  key: 'ai-prompt-tracking',
  needsProjectId: true,
  url: (ctx) =>
    `https://www.semrush.com/ai-toolkit/projects/${ctx.tenant.semrushProjectId}/prompts/`,

  async scrape(page: Page): Promise<AiPromptTrackingPayload> {
    await waitForReady(page);

    // Gate detection — same as brand visibility.
    const gateHit = await page
      .getByText(/upgrade.*ai.*toolkit|get.*ai.*toolkit/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (gateHit) throw new AiToolkitGatedError();

    const promptTableSel = await firstVisible(page, [
      '[data-test="prompts-table"]',
      '.s-prompts-table',
      'table',
    ]);
    if (!promptTableSel) {
      throw new Error('Prompts table not found — selector likely changed');
    }

    // Collect prompt rows (the first cell is the prompt text).
    const promptRows = await page
      .$$eval(`${promptTableSel} tr`, (rows) =>
        rows
          .map((tr, idx) => {
            const cell = tr.querySelector('td');
            const prompt = (cell?.textContent ?? '').trim();
            return prompt ? { idx, prompt } : null;
          })
          .filter((x): x is { idx: number; prompt: string } => x !== null),
      )
      .catch(() => [] as Array<{ idx: number; prompt: string }>);

    const truncated = promptRows.length > MAX_PROMPTS;
    const targetPrompts = promptRows
      .slice()
      .sort((a, b) => a.prompt.localeCompare(b.prompt))
      .slice(0, MAX_PROMPTS);

    const cells: AiPromptTrackingPayload['cells'] = [];
    for (const { prompt } of targetPrompts) {
      // Find the row again by text — DOM may have changed after a
      // previous modal close.
      const row = page.locator(`${promptTableSel} tr`, { hasText: prompt }).first();
      if (!(await row.isVisible().catch(() => false))) continue;
      await row.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(900);

      // Modal opens with per-LLM tabs inside.
      const modal = page.locator('[role="dialog"], .s-prompt-modal').first();
      if (!(await modal.isVisible().catch(() => false))) {
        // Modal didn't open — record an empty entry and move on.
        continue;
      }

      const llmTabs = await modal
        .locator('[role="tab"]')
        .allTextContents()
        .catch(() => [] as string[]);

      for (const llm of llmTabs) {
        const tab = modal.getByRole('tab', { name: new RegExp(`^${escapeRe(llm.trim())}$`, 'i') }).first();
        if (await tab.isVisible().catch(() => false)) {
          await tab.click({ timeout: 3_000 }).catch(() => {});
          await page.waitForTimeout(500);
        }

        const responseEl = modal.locator('[data-test="response"], .s-prompt-response').first();
        const responseText =
          ((await responseEl.textContent({ timeout: 3_000 }).catch(() => '')) ?? '')
            .trim()
            .slice(0, MAX_RESPONSE_CHARS);

        const cited = await modal
          .locator('[data-test="cited-badge"], .s-cited')
          .first()
          .isVisible()
          .catch(() => false);

        const rankText =
          (await modal
            .locator('[data-test="citation-rank"], .s-citation-rank')
            .first()
            .textContent({ timeout: 1_500 })
            .catch(() => null)) ?? '';
        const rank = await parseIntSafe(rankText);

        const competitorsMentioned = await modal
          .locator('[data-test="competitors-mentioned"] li, .s-competitors li')
          .allTextContents()
          .catch(() => [] as string[]);

        cells.push({
          prompt,
          llm: llm.trim(),
          responseText,
          cited,
          rank,
          competitorsMentioned: competitorsMentioned.map((c) => c.trim()).filter(Boolean),
        });
      }

      // Close the modal.
      const closeBtn = modal.locator('[aria-label="Close"], .s-modal-close').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click().catch(() => {});
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }
      await page.waitForTimeout(400);
    }

    return { truncated, cells };
  },
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
