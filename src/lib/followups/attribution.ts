/**
 * Follow-up email system — conversion attribution.
 *
 * A paid order counts as a follow-up conversion when it lands within
 * `windowDays` (default 30) after a sent follow-up to the same lowercased
 * email. Each order is attributed to AT MOST ONE sent job (the most recent
 * send before the order) so a two-touch journey never double-counts revenue.
 *
 * Order.customerEmail is stored as-typed, so the join lowercases both sides
 * (no expression index — fine at current order volume).
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';

export interface JourneyStats {
  journeyKey: string;
  sends: number;
  opens: number;
  conversions: number;
  revenue: number;
}

interface SendOpenRow {
  journey_key: string;
  sends: number;
  opens: number;
}

interface ConversionRow {
  journey_key: string;
  conversions: number;
  revenue: number;
}

/** Per-journey sends/opens/conversions/revenue. */
export async function getFollowUpStats(windowDays = 30): Promise<JourneyStats[]> {
  const sendsOpens = await prisma.$queryRaw<SendOpenRow[]>`
    SELECT j.journey_key,
           COUNT(*)::int AS sends,
           COUNT(el.id) FILTER (WHERE el.opened_at IS NOT NULL)::int AS opens
    FROM follow_up_jobs j
    LEFT JOIN email_logs el ON el.id = j.email_log_id
    WHERE j.status = 'sent'
    GROUP BY j.journey_key
  `;

  // DISTINCT ON (o.id): attribute each order to exactly one job — the most
  // recent send that preceded it.
  const conversions = await prisma.$queryRaw<ConversionRow[]>`
    WITH attributed AS (
      SELECT DISTINCT ON (o.id) o.id AS order_id, o.total::float AS total, j.journey_key
      FROM orders o
      JOIN follow_up_jobs j
        ON lower(o.customer_email) = j.email
       AND j.status = 'sent'
       AND o.created_at >= j.sent_at
       AND o.created_at <= j.sent_at + make_interval(days => ${windowDays})
      WHERE o.financial_status IN ('PAID', 'PARTIALLY_REFUNDED')
      ORDER BY o.id, j.sent_at DESC
    )
    SELECT journey_key,
           COUNT(*)::int AS conversions,
           COALESCE(SUM(total), 0)::float AS revenue
    FROM attributed
    GROUP BY journey_key
  `;

  const byJourney = new Map<string, JourneyStats>();
  for (const row of sendsOpens) {
    byJourney.set(row.journey_key, {
      journeyKey: row.journey_key,
      sends: row.sends,
      opens: row.opens,
      conversions: 0,
      revenue: 0,
    });
  }
  for (const row of conversions) {
    const entry = byJourney.get(row.journey_key) ?? {
      journeyKey: row.journey_key,
      sends: 0,
      opens: 0,
      conversions: 0,
      revenue: 0,
    };
    entry.conversions = row.conversions;
    entry.revenue = Math.round(row.revenue * 100) / 100;
    byJourney.set(row.journey_key, entry);
  }
  return [...byJourney.values()].sort((a, b) => a.journeyKey.localeCompare(b.journeyKey));
}

export interface JourneyQueueCounts {
  journeyKey: string;
  scheduled: number;
  sent: number;
  canceled: number;
  suppressed: number;
  failed: number;
}

/** Per-journey job counts for the admin flags panel. */
export async function getJourneyQueueCounts(): Promise<JourneyQueueCounts[]> {
  const rows = await prisma.followUpJob.groupBy({
    by: ['journeyKey', 'status'],
    _count: { _all: true },
  });
  const byJourney = new Map<string, JourneyQueueCounts>();
  for (const row of rows) {
    const entry = byJourney.get(row.journeyKey) ?? {
      journeyKey: row.journeyKey,
      scheduled: 0,
      sent: 0,
      canceled: 0,
      suppressed: 0,
      failed: 0,
    };
    const n = row._count._all;
    switch (row.status) {
      case 'scheduled':
      case 'processing': // in-flight reads as scheduled for display
        entry.scheduled += n;
        break;
      case 'sent':
        entry.sent += n;
        break;
      case 'canceled':
        entry.canceled += n;
        break;
      case 'suppressed':
        entry.suppressed += n;
        break;
      case 'failed':
        entry.failed += n;
        break;
    }
    byJourney.set(row.journeyKey, entry);
  }
  return [...byJourney.values()];
}

/** "guest@example.com" → "g***@example.com" for admin display. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${(local ?? '').slice(0, 1)}***@${domain}`;
}

/** Serialization-safe Decimal → number for admin JSON responses. */
export function decimalToNumber(value: Prisma.Decimal | number | null): number {
  return value === null ? 0 : Number(value);
}
