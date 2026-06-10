/**
 * SEMrush session-cookie restore.
 *
 * The scrape job runs unattended in GitHub Actions — no interactive
 * login. We restore a logged-in SEMrush session by injecting cookies
 * captured from a human-driven Chrome session.
 *
 * Cookie source of truth:
 *   - In CI: `SEMRUSH_COOKIE_JSON` repository secret (JSON array of
 *     Playwright cookie objects, as exported via DevTools → Application
 *     → Cookies → .semrush.com)
 *   - Locally: `SEMRUSH_COOKIE_JSON` env var, or a path in
 *     `SEMRUSH_COOKIE_FILE`
 *
 * Cookie format (Playwright shape):
 *   [{ name, value, domain, path, expires?, httpOnly?, secure?, sameSite? }]
 *
 * Failure mode: if the dashboard URL redirects to /login after restoring
 * cookies, we throw a clearly-tagged error so the orchestrator knows the
 * session expired and can surface a "refresh the cookie" alert.
 */
import { readFileSync } from 'node:fs';
import type { BrowserContext, Cookie, Page } from 'playwright';

export class SemrushSessionExpiredError extends Error {
  constructor(message = 'SEMrush session cookie has expired — refresh SEMRUSH_COOKIE_JSON') {
    super(message);
    this.name = 'SemrushSessionExpiredError';
  }
}

export function loadCookies(): Cookie[] {
  const inline = process.env.SEMRUSH_COOKIE_JSON;
  const filePath = process.env.SEMRUSH_COOKIE_FILE;
  let raw: string | null = null;
  if (inline && inline.trim().length > 0) {
    raw = inline;
  } else if (filePath) {
    raw = readFileSync(filePath, 'utf8');
  } else {
    throw new Error(
      'Missing SEMrush auth — set SEMRUSH_COOKIE_JSON or SEMRUSH_COOKIE_FILE',
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`SEMRUSH_COOKIE_JSON is not valid JSON: ${(err as Error).message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('SEMRUSH_COOKIE_JSON must be an array of cookie objects');
  }
  // Normalize: Playwright is strict about sameSite + url/domain. If the
  // export didn't set sameSite, Playwright defaults to 'Lax' which is fine.
  return (parsed as Cookie[]).map((c) => ({
    ...c,
    sameSite: (c.sameSite ?? 'Lax') as Cookie['sameSite'],
    domain: c.domain?.startsWith('.') ? c.domain : `.${c.domain ?? 'semrush.com'}`,
    path: c.path ?? '/',
  }));
}

export async function restoreSession(context: BrowserContext): Promise<void> {
  const cookies = loadCookies();
  await context.addCookies(cookies);
}

/**
 * Verify we're actually authenticated by hitting the dashboard. If the
 * URL settles on /login, throw SemrushSessionExpiredError so the
 * orchestrator can fail cleanly.
 */
export async function verifySession(page: Page): Promise<void> {
  await page.goto('https://www.semrush.com/dashboard/', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  // Give post-load redirects a moment to settle.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  const url = page.url();
  if (/\/login|\/signin|\/oauth/i.test(url)) {
    throw new SemrushSessionExpiredError(
      `Dashboard redirected to ${url} — cookie expired`,
    );
  }
  // Also look for the dashboard sidebar as a positive signal.
  const navHit = await page.locator('nav, [data-testid="header"]').first().isVisible().catch(() => false);
  if (!navHit) {
    // Not fatal — SEMrush sometimes hides nav for a frame. Log it.
    console.warn('[auth] dashboard loaded but nav not visible — continuing cautiously');
  }
}
