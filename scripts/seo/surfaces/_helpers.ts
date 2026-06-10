/**
 * Shared selector helpers used by every surface module.
 *
 * - waitForReady: combo of domcontentloaded + networkidle so we don't
 *   start scraping while React's still hydrating.
 * - parseIntSafe / parseFloatSafe: tolerant of SEMrush's locale-aware
 *   number formatting ("1,234" or "1.2K" or "—" or "$420").
 * - textOf: get the trimmed text content of the first matching element
 *   or null if missing.
 * - firstVisible: returns the first selector in a fallback list that's
 *   actually visible on the page.
 */
import type { Page } from 'playwright';

export async function waitForReady(page: Page, timeoutMs = 25_000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
}

export async function textOf(page: Page, selector: string): Promise<string | null> {
  try {
    const el = page.locator(selector).first();
    const visible = await el.isVisible().catch(() => false);
    if (!visible) return null;
    const txt = (await el.textContent({ timeout: 2_000 })) ?? '';
    return txt.trim();
  } catch {
    return null;
  }
}

export async function parseIntSafe(input: string | null | undefined): Promise<number | null> {
  if (!input) return null;
  const cleaned = input.replace(/[^\d.,KMB-]/gi, '').trim();
  if (!cleaned || cleaned === '—' || cleaned === '-') return null;
  // Handle "1.2K" / "3.4M" / "1.5B" shorthand.
  const m = cleaned.match(/^([\d.,]+)\s*([KMB])$/i);
  if (m) {
    const base = Number(m[1].replace(/,/g, ''));
    const mult = m[2].toUpperCase() === 'K' ? 1_000 : m[2].toUpperCase() === 'M' ? 1_000_000 : 1_000_000_000;
    return Number.isFinite(base) ? Math.round(base * mult) : null;
  }
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function parseFloatSafe(input: string | null | undefined): Promise<number | null> {
  if (!input) return null;
  const cleaned = input.replace(/[^\d.,%-]/g, '').replace(/,/g, '').trim();
  if (!cleaned || cleaned === '—' || cleaned === '-') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function firstVisible(page: Page, selectors: string[]): Promise<string | null> {
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
