/**
 * Outbound notifications from the scrape job.
 *
 * Fires a webhook on success + failure so Brian/Allan know the scrape
 * landed (or didn't) without having to babysit the GitHub Actions UI.
 *
 * Uses the existing GHL_DASHBOARD_WEBHOOK_URL the rest of the app
 * already uses for ops alerts — payload structure mirrors POD's
 * existing webhook events (event + first_name + email + body).
 */
import type { SurfaceKey } from './types';

export type ScrapeSummary = {
  capturedAt: string;
  domain: string;
  runRef: string;
  durations: Partial<Record<SurfaceKey, number>>;
  successes: SurfaceKey[];
  failures: Array<{ surface: SurfaceKey; reason: string }>;
};

export async function notifyScrapeCompleted(s: ScrapeSummary) {
  const webhook = process.env.GHL_DASHBOARD_WEBHOOK_URL;
  if (!webhook) {
    console.log('[notify] GHL_DASHBOARD_WEBHOOK_URL not set — skipping notification');
    return;
  }
  const ok = s.failures.length === 0;
  const subject = ok
    ? `✅ SEMrush scrape OK — ${s.successes.length} surfaces`
    : `⚠️ SEMrush scrape partial — ${s.successes.length} ok, ${s.failures.length} failed`;
  const body = [
    `Captured at: ${s.capturedAt}`,
    `Domain: ${s.domain}`,
    `Run: ${s.runRef}`,
    '',
    'Surfaces:',
    ...s.successes.map((k) => `  ✓ ${k} (${s.durations[k] ?? '?'}ms)`),
    ...s.failures.map((f) => `  ✗ ${f.surface} — ${f.reason}`),
  ].join('\n');

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'seo.scrape.completed',
        domain: s.domain,
        run_ref: s.runRef,
        captured_at: s.capturedAt,
        success_count: s.successes.length,
        failure_count: s.failures.length,
        failed_surfaces: s.failures.map((f) => f.surface),
        subject,
        body,
      }),
    });
    if (!res.ok) {
      console.warn(`[notify] webhook returned ${res.status}`);
    }
  } catch (err) {
    console.warn('[notify] webhook fetch failed', err);
  }
}

export async function notifyCookieExpired(runRef: string) {
  const webhook = process.env.GHL_DASHBOARD_WEBHOOK_URL;
  if (!webhook) return;
  await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event: 'seo.scrape.cookie_expired',
      run_ref: runRef,
      subject: '🔑 SEMrush cookie expired — refresh required',
      body:
        'The daily SEMrush scrape failed authentication. Refresh the ' +
        'SEMRUSH_COOKIE_JSON GitHub secret per the runbook in ' +
        '/admin/brians-stuff?tab=seo, then re-run the workflow.',
    }),
  }).catch(() => {});
}
