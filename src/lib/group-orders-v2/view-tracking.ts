/**
 * Dashboard View Tracking
 * Tracks unique visitors to dashboard pages using IP-based hashing.
 */

import { prisma } from '@/lib/database/client';
import { createHash } from 'crypto';

/**
 * Track a unique dashboard view by hashed IP.
 * Uses INSERT ON CONFLICT DO NOTHING to only count new visitors.
 * Increments viewCount on GroupOrderV2 only for new views.
 */
export async function trackDashboardView(
  shareCode: string,
  ip: string
): Promise<void> {
  const visitorHash = createHash('sha256')
    .update(ip + shareCode)
    .digest('hex')
    .slice(0, 32);

  // Insert new view row; if already exists, do nothing
  const result = await prisma.$executeRaw`
    INSERT INTO dashboard_views (id, share_code, visitor_hash, viewed_at)
    VALUES (gen_random_uuid(), ${shareCode}, ${visitorHash}, NOW())
    ON CONFLICT (share_code, visitor_hash) DO NOTHING
  `;

  // result = 1 if row was inserted (new visitor), 0 if already existed
  if (result === 1) {
    await prisma.$executeRaw`
      UPDATE group_orders_v2
      SET view_count = view_count + 1
      WHERE share_code = ${shareCode}
    `;
  }
}

/** Max seconds a single heartbeat may credit — the client pings every
 *  30s, so anything larger is a replayed/forged request. */
const MAX_HEARTBEAT_SECONDS = 120;

/**
 * Guard for the public tracking endpoints: true only when the share
 * code belongs to a real GroupOrderV2. Prevents unbounded garbage-row
 * writes for arbitrary codes (dashboard_views.share_code has no FK).
 */
export async function shareCodeExists(shareCode: string): Promise<boolean> {
  if (!shareCode || shareCode.length > 64) return false;
  const group = await prisma.groupOrderV2.findUnique({
    where: { shareCode },
    select: { id: true },
  });
  return group !== null;
}

/**
 * Record a dashboard heartbeat: bump lastSeenAt and accumulate active
 * time on this visitor's view row. Creates the row if the initial
 * track-view call was missed (e.g. ad blocker raced it).
 *
 * Rate limit: the SQL only credits time when the previous heartbeat is
 * at least 20s old, so replaying requests faster than the 30s client
 * interval cannot inflate active_seconds beyond real elapsed time.
 */
export async function recordDashboardHeartbeat(
  shareCode: string,
  ip: string,
  seconds: number
): Promise<void> {
  const credit = Math.min(Math.max(Math.round(seconds), 0), MAX_HEARTBEAT_SECONDS);
  const visitorHash = createHash('sha256')
    .update(ip + shareCode)
    .digest('hex')
    .slice(0, 32);

  await prisma.$executeRaw`
    INSERT INTO dashboard_views (id, share_code, visitor_hash, viewed_at, last_seen_at, active_seconds)
    VALUES (gen_random_uuid(), ${shareCode}, ${visitorHash}, NOW(), NOW(), ${credit})
    ON CONFLICT (share_code, visitor_hash) DO UPDATE
    SET last_seen_at = NOW(),
        active_seconds = dashboard_views.active_seconds + ${credit}
    WHERE dashboard_views.last_seen_at IS NULL
       OR dashboard_views.last_seen_at < NOW() - INTERVAL '20 seconds'
  `;
}

export interface DashboardEngagement {
  uniqueVisitors: number;
  totalActiveSeconds: number;
  lastActivityAt: Date | null;
}

/**
 * Aggregate engagement (unique visitors, total active seconds, most
 * recent activity) for a set of dashboards in one query. Returns a map
 * keyed by shareCode; codes with no views are absent.
 */
export async function getDashboardEngagement(
  shareCodes: string[]
): Promise<Map<string, DashboardEngagement>> {
  const map = new Map<string, DashboardEngagement>();
  if (shareCodes.length === 0) return map;

  const rows = await prisma.dashboardView.groupBy({
    by: ['shareCode'],
    where: { shareCode: { in: shareCodes } },
    _count: { _all: true },
    _sum: { activeSeconds: true },
    _max: { lastSeenAt: true, viewedAt: true },
  });

  for (const row of rows) {
    const lastSeen = row._max.lastSeenAt;
    const lastViewed = row._max.viewedAt;
    map.set(row.shareCode, {
      uniqueVisitors: row._count._all,
      totalActiveSeconds: row._sum.activeSeconds ?? 0,
      lastActivityAt:
        lastSeen && lastViewed
          ? lastSeen > lastViewed
            ? lastSeen
            : lastViewed
          : (lastSeen ?? lastViewed ?? null),
    });
  }
  return map;
}
