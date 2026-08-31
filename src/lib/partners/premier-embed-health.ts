/**
 * Daily health check for the Premier boat-tab embed.
 *
 * The degraded-tab bug is silent and customer-facing: it fires on Premier's
 * deploy schedule, not ours, and past occurrences were caught only because
 * Allan happened to look at a partner page. This runs the decisive test — is
 * Premier's `/get-a-quote` still the real quote page, and does every asset it
 * references still come back as the thing it claims to be — and emails when it
 * does not.
 *
 * A vanished asset or a moved page returns HTTP 200 with `text/html` (Netlify's
 * SPA fallback / redirect stub), so status codes alone prove nothing. Page
 * structure and content type are the signal.
 */

import { EmailType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { sendEmail } from '@/lib/email/resend-client';
import {
  PREMIER_QUOTE_UPSTREAM,
  extractAssetPaths,
  isPremierQuotePage,
  isJavaScriptContentType,
  unproxiedAssetPrefixes,
} from '@/lib/partners/premier-embed';

const OPS_ALERT_EMAIL = process.env.OPS_ALERT_EMAIL || 'allan@partyondelivery.com';
const ALERT_FLAG_KEY = 'premier_embed_health_alerted';
const ALERT_WINDOW_MS = 12 * 60 * 60 * 1000;
const SEND_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 10000;

export interface PremierEmbedHealth {
  healthy: boolean;
  /** Human-readable reasons the embed is degraded; empty when healthy. */
  problems: string[];
  checkedAssets: number;
  alertSent: boolean;
}

/** Minimal HTML escape for the alert body. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/**
 * Fetch an asset and confirm its content type matches its extension.
 * Returns a problem string, or null when the asset is fine.
 */
async function checkAsset(path: string): Promise<string | null> {
  const url = new URL(path, PREMIER_QUOTE_UPSTREAM).toString();
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Range: 'bytes=0-0' },
      cache: 'no-store',
    });
  } catch {
    return `${path} — request failed`;
  }
  if (!res.ok && res.status !== 206) return `${path} — HTTP ${res.status}`;

  const contentType = res.headers.get('content-type');
  const isCss = /\.css$/i.test(path);
  const ok = isCss ? /text\/css/i.test(contentType ?? '') : isJavaScriptContentType(contentType);
  if (!ok) {
    return `${path} — served as "${contentType ?? 'no content-type'}" (the bundle has vanished; this blanks the boat tab)`;
  }
  return null;
}

/**
 * Claim the right to send this window's alert, so a sustained Premier outage
 * cannot mail Allan every run. Fails open — alerting beats silence.
 */
async function claimAlertWindow(now: Date): Promise<boolean> {
  const cutoff = new Date(now.getTime() - ALERT_WINDOW_MS);
  const description = `Premier embed health alert last sent ${now.toISOString()}`;
  try {
    const claimed = await prisma.featureFlag.updateMany({
      where: { key: ALERT_FLAG_KEY, updatedAt: { lt: cutoff } },
      data: { enabled: true, description },
    });
    if (claimed.count > 0) return true;

    const existing = await prisma.featureFlag.findUnique({
      where: { key: ALERT_FLAG_KEY },
      select: { id: true },
    });
    if (existing) return false;

    await prisma.featureFlag.create({
      data: { key: ALERT_FLAG_KEY, enabled: true, description },
    });
    return true;
  } catch (err) {
    const lostRace = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
    return !lostRace;
  }
}

async function sendAlert(problems: string[]): Promise<boolean> {
  const now = new Date();
  if (!(await claimAlertWindow(now))) return false;
  try {
    const items = problems.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
    await Promise.race([
      sendEmail({
        to: OPS_ALERT_EMAIL,
        subject: 'Boat tab is degraded on partner pages — Premier embed check failed',
        type: EmailType.WELCOME, // reuse — internal ops alert, no dedicated type
        html: `
          <h2>Premier boat-tab embed is degraded</h2>
          <p>The daily check of <code>/partners-embed/premier-quote</code> failed at
          ${now.toISOString()}. Guests on co-branded partner pages may be seeing the
          link-out fallback card instead of the live booking form.</p>
          <ul>${items}</ul>
          <p>Most likely cause: Premier changed or moved their quote page (it now
          lives at <code>/get-a-quote</code>). The proxy fetches it live, so a
          transient deploy usually clears within minutes — if it does not, check
          that <code>premierpartycruises.com/get-a-quote</code> is up and still
          contains the booking form / Xola embed, and whether their asset paths
          moved (see <code>src/lib/partners/premier-embed.ts</code>).</p>
          <p>Further alerts are suppressed for 12 hours.</p>
        `,
        metadata: { kind: 'premier-embed-health', problems: problems.length },
      }),
      new Promise<void>((resolve) => setTimeout(resolve, SEND_TIMEOUT_MS)),
    ]);
    return true;
  } catch (err) {
    console.error('[premier-embed-health] alert send failed:', err);
    return false;
  }
}

/**
 * Run the check. Never throws — a failure to check is itself reported as a
 * problem so the cron goes red rather than silently passing.
 */
export async function runPremierEmbedHealthCheck(): Promise<PremierEmbedHealth> {
  const problems: string[] = [];
  let html = '';
  let checkedAssets = 0;

  try {
    const res = await fetch(PREMIER_QUOTE_UPSTREAM, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'text/html' },
      cache: 'no-store',
    });
    if (!res.ok) problems.push(`Premier quote page returned HTTP ${res.status}`);
    else html = await res.text();
  } catch (err) {
    problems.push(`Could not reach Premier quote page: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  if (html) {
    if (!isPremierQuotePage(html)) {
      problems.push(
        'Premier /get-a-quote is HTTP 200 but is not the quote page (no booking form or Xola embed found)'
      );
    }

    for (const prefix of unproxiedAssetPrefixes(html)) {
      problems.push(
        `Premier now loads assets from "${prefix}", which next.config.ts does not proxy — the boat tab will go blank until a rewrite is added`
      );
    }

    const assets = extractAssetPaths(html);
    checkedAssets = assets.length;
    const results = await Promise.all(assets.map(checkAsset));
    for (const problem of results) if (problem) problems.push(problem);
  }

  const healthy = problems.length === 0;
  const alertSent = healthy ? false : await sendAlert(problems);

  return {
    healthy,
    problems,
    checkedAssets,
    alertSent,
  };
}
