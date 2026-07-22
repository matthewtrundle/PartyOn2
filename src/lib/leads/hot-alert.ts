/**
 * Lead Flow hot-lead alert — cron service.
 *
 * Every 15 min (via /api/cron/lead-hot-alert) email the operator a digest of
 * leads that gained a fresh signal since the last run and still need a reply:
 * hot leads (score ≥ threshold) and any lead a customer just emailed. Reuses the
 * OPS_ALERT_EMAIL + Resend + feature-flag-watermark patterns from
 * corelinq-alert.ts / full-moon-deadline.
 *
 * Gated by the LEAD_HOT_ALERTS flag (defaults OFF — no-ops until flipped on).
 * Dedup: the LEAD_HOT_ALERT_WATERMARK flag row's updatedAt is the last-run time;
 * `since` is that stamp and each run advances it, so a lead is only reported when
 * it gains NEW activity. A range-guarded updateMany makes overlapping cron
 * invocations claim the window exactly once.
 */
import { EmailType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { sendEmail } from '@/lib/email/resend-client';
import { FEATURE_FLAGS, isFeatureEnabled } from '@/lib/features/feature-flags';
import { SCORE_THRESHOLDS } from './scoring';
import { ACTIVE_STAGES } from './pipeline-types';
import {
  buildHotLeadAlertEmail,
  toAlertItems,
  type HotAlertRow,
} from '@/lib/email/templates/lead-hot-alert';

const OPS_ALERT_EMAIL = process.env.OPS_ALERT_EMAIL || 'allan@partyondelivery.com';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
const CYCLE_MS = 15 * 60 * 1000;
const MAX_ITEMS = 50;

export interface HotAlertResult {
  enabled: boolean;
  claimed: boolean;
  count: number;
  sent: boolean;
}

/**
 * Read the last-run stamp and advance it to now, atomically. Returns the prior
 * stamp (the window's lower bound) when this caller wins the claim, or null when
 * a concurrent run already advanced it this cycle. The first run ever seeds the
 * row and only looks back one cycle, so it can't blast every open lead at once.
 */
async function claimWindow(now: Date): Promise<Date | null> {
  const key = FEATURE_FLAGS.LEAD_HOT_ALERT_WATERMARK;
  const stamp = `lead hot-alert watermark ${now.toISOString()}`;
  const row = await prisma.featureFlag.findUnique({ where: { key }, select: { updatedAt: true } });
  if (!row) {
    try {
      await prisma.featureFlag.create({ data: { key, enabled: true, description: stamp } });
      return new Date(now.getTime() - CYCLE_MS);
    } catch {
      return null; // lost the create race
    }
  }
  // Advance only if the stamp is at least half a cycle old, so two overlapping
  // invocations can't both send. updateMany bumps updatedAt → now.
  const cutoff = new Date(now.getTime() - CYCLE_MS / 2);
  const claimed = await prisma.featureFlag.updateMany({
    where: { key, updatedAt: { lt: cutoff } },
    data: { description: stamp },
  });
  return claimed.count > 0 ? row.updatedAt : null;
}

/** Leads needing a reply with a fresh signal since `since`: hot OR just-emailed. */
async function fetchAlertRows(since: Date): Promise<HotAlertRow[]> {
  const stages = Prisma.join(ACTIVE_STAGES.map((s) => Prisma.sql`${s}`));
  return prisma.$queryRaw<HotAlertRow[]>`
    SELECT l.id, l.first_name, l.last_name, l.email, l.phone, l.lead_score,
           l.metadata,
           EXISTS (
             SELECT 1 FROM inbound_emails ie
             WHERE ie.lead_id = l.id AND ie.received_at > ${since}
           ) AS fresh_inbound
    FROM leads l
    WHERE l.pipeline_stage IN (${stages})
      AND (l.snoozed_until IS NULL OR l.snoozed_until <= NOW())
      AND (
        l.last_contacted_at IS NULL
        OR (l.last_activity_at IS NOT NULL AND l.last_activity_at > l.last_contacted_at)
      )
      AND (
        (l.lead_score >= ${SCORE_THRESHOLDS.hot} AND l.last_activity_at > ${since})
        OR EXISTS (
          SELECT 1 FROM inbound_emails ie
          WHERE ie.lead_id = l.id AND ie.received_at > ${since}
        )
      )
    ORDER BY l.lead_score DESC NULLS LAST, l.last_activity_at DESC
    LIMIT ${MAX_ITEMS}
  `;
}

/** One cron tick. Never throws — an alerting path must not crash the cron. */
export async function runHotLeadAlert(now: Date = new Date()): Promise<HotAlertResult> {
  if (!(await isFeatureEnabled(FEATURE_FLAGS.LEAD_HOT_ALERTS))) {
    return { enabled: false, claimed: false, count: 0, sent: false };
  }
  const since = await claimWindow(now);
  if (!since) return { enabled: true, claimed: false, count: 0, sent: false };

  const rows = await fetchAlertRows(since);
  if (rows.length === 0) return { enabled: true, claimed: true, count: 0, sent: false };

  const items = toAlertItems(rows, now, SITE_URL);
  const email = buildHotLeadAlertEmail(items, SITE_URL);
  let sent = false;
  try {
    const id = await sendEmail({
      to: OPS_ALERT_EMAIL,
      subject: email.subject,
      html: email.html,
      text: email.text,
      type: EmailType.WELCOME, // reuse — internal ops alert, no dedicated type
      metadata: { flow: 'lead-hot-alert', count: items.length },
      tags: [{ name: 'flow', value: 'lead_hot_alert' }],
    });
    sent = Boolean(id);
  } catch (err) {
    console.error('[lead-hot-alert] send failed:', err instanceof Error ? err.message : err);
  }
  return { enabled: true, claimed: true, count: items.length, sent };
}
