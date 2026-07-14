/**
 * Operator alerting for CoreLinq ingest failures (security review MEDIUM-2).
 *
 * postToCoreLinq is fire-and-forget: once the GHL fan-out is retired after
 * cutover, a silently failing ingest means lost lead notifications with
 * nobody watching the '[CoreLinq Ingest]' log lines. This emails the
 * operator instead — debounced to at most one email per window so a CRM
 * outage during a busy form-submit hour cannot flood the inbox.
 *
 * Debounce is claimed atomically through the feature_flags row
 * `corelinq_ingest_alerted` (its updatedAt is the last-alerted stamp;
 * updateMany's WHERE guards the window so concurrent lambdas race safely),
 * with an in-memory fast path per instance. Never throws, and the send is
 * time-bounded — this runs awaited on customer form-submit paths.
 */

import { EmailType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { sendEmail } from '@/lib/email/resend-client';
import { FEATURE_FLAGS } from '@/lib/features/feature-flags';

const OPS_ALERT_EMAIL = process.env.OPS_ALERT_EMAIL || 'allan@partyondelivery.com';
const ALERT_WINDOW_MS = 6 * 60 * 60 * 1000; // one email per 6h, per failure burst
const SEND_TIMEOUT_MS = 2500; // customer path — never wait longer than this on Resend
const DETAIL_MAX_CHARS = 300;

/** Per-instance fast path — skip the DB claim when this lambda alerted recently. */
let lastAlertAttemptAt = 0;

/** Minimal HTML escape for text-node contexts (& first so &lt; survives). */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/**
 * Redact lead PII (emails, 10+-digit phone runs), truncate, and HTML-escape
 * a failure detail before it may be embedded in the alert email. The detail
 * can contain CoreLinq's raw error body, which might echo submitted contact
 * fields back; the alert diagnoses an integration failure and never needs
 * customer data. Pure — exported for tests.
 */
export function sanitizeAlertDetail(detail: string): string {
  const redacted = detail
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/\+?\d(?:[\s().-]*\d){9,}/g, '[phone]');
  return escapeHtml(redacted.slice(0, DETAIL_MAX_CHARS));
}

/**
 * Atomically claim the right to send this window's alert. Exactly one caller
 * per window wins: the UPDATE only matches when the stamp is older than the
 * window, and the CREATE's unique-key violation tells a racing lambda it
 * lost. Non-race DB errors fail OPEN (send anyway) — this is an alerting
 * path, and the in-memory window still bounds sends per instance.
 */
async function claimAlertWindow(now: Date): Promise<boolean> {
  const cutoff = new Date(now.getTime() - ALERT_WINDOW_MS);
  const description = `CoreLinq ingest failure alert last sent ${now.toISOString()}`;
  const claimed = await prisma.featureFlag.updateMany({
    where: { key: FEATURE_FLAGS.CORELINQ_INGEST_ALERTED, updatedAt: { lt: cutoff } },
    data: { enabled: true, description },
  });
  if (claimed.count > 0) return true;

  const existing = await prisma.featureFlag.findUnique({
    where: { key: FEATURE_FLAGS.CORELINQ_INGEST_ALERTED },
    select: { id: true },
  });
  if (existing) return false; // stamp is fresh — someone alerted this window

  try {
    await prisma.featureFlag.create({
      data: { key: FEATURE_FLAGS.CORELINQ_INGEST_ALERTED, enabled: true, description },
    });
    return true;
  } catch (err) {
    const lostRace =
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
    return !lostRace;
  }
}

/**
 * Email the operator that CoreLinq ingest is failing. Debounced; safe to call
 * on every failure; the send itself is capped at SEND_TIMEOUT_MS.
 */
export async function alertCoreLinqIngestFailure(event: string, detail: string): Promise<void> {
  try {
    const now = new Date();
    if (now.getTime() - lastAlertAttemptAt < ALERT_WINDOW_MS) return;
    if (!(await claimAlertWindow(now))) {
      lastAlertAttemptAt = now.getTime();
      return;
    }
    lastAlertAttemptAt = now.getTime();

    // Race, don't await bare: a slow Resend must not hold a customer's
    // form-submit response (security review MEDIUM). Losing the race can
    // drop this window's email — the console.error log lines remain.
    await Promise.race([
      sendEmail({
        to: OPS_ALERT_EMAIL,
        subject: 'CoreLinq ingest is failing — lead fan-out not reaching the CRM',
        type: EmailType.WELCOME, // reuse — internal ops alert, no dedicated type
        html: `
          <h2>CoreLinq ingest failure</h2>
          <p>A <code>postToCoreLinq</code> call failed at ${now.toISOString()}.</p>
          <p><strong>Event:</strong> ${escapeHtml(event)}</p>
          <p><strong>Detail (PII redacted):</strong> ${sanitizeAlertDetail(detail)}</p>
          <p>Leads and orders keep flowing on the site — only the CRM mirror is
          affected. Check the Vercel logs for <code>[CoreLinq Ingest]</code>
          lines and the CoreLinq app's health. Further failures are suppressed
          for 6 hours.</p>
        `,
        metadata: { kind: 'corelinq-ingest-alert', event },
      }),
      new Promise<void>((resolve) => setTimeout(resolve, SEND_TIMEOUT_MS)),
    ]);
  } catch (err) {
    // Alerting must never make a failing fan-out worse.
    console.error('[CoreLinq Ingest] alert send failed:', err);
  }
}
