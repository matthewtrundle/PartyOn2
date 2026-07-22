/**
 * Partner Outreach 2.0 — the 10/day send cap.
 *
 * Deliberately tiny volume (Allan's locked decision): at most
 * OUTREACH_DAILY_CAP partner-outreach emails per America/Chicago calendar
 * day, counting ALL touches. The cap gates at CLAIM time in the engine —
 * over-cap jobs are simply not claimed this tick (attempts untouched), a
 * free deferral to the next tick/tomorrow.
 *
 * Counting rule: a send "happened today" when the job is `sent` with
 * sentAt ≥ CT-day-start, OR is currently `processing` with claimedAt ≥
 * CT-day-start (in-flight jobs must count or a crashy tick could overshoot).
 */

import { prisma } from '@/lib/database/client';

const DEFAULT_CAP = 10;
const MIN_CAP = 1;
const MAX_CAP = 50;

/** The capped journey. PR-chain scope: only partner-outreach is capped. */
export const CAPPED_JOURNEY_KEY = 'partner-outreach';

/** OUTREACH_DAILY_CAP env (default 10), clamped to [1, 50]. */
export function outreachDailyCap(): number {
  const rawStr = process.env.OUTREACH_DAILY_CAP?.trim();
  if (!rawStr) return DEFAULT_CAP;
  const raw = Number(rawStr);
  if (!Number.isFinite(raw)) return DEFAULT_CAP;
  return Math.min(MAX_CAP, Math.max(MIN_CAP, Math.floor(raw)));
}

/**
 * Start of the current America/Chicago calendar day, as a UTC Date.
 * DST-safe: derives the CT date + current UTC offset from Intl parts
 * instead of hardcoding -05/-06.
 */
export function chicagoDayStart(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Wall-clock time in CT right now:
  const wall = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  );
  // Offset = UTC now − CT wall clock; midnight CT = midnight wall + offset.
  const offsetMs = now.getTime() - wall;
  const midnightWall = Date.UTC(get('year'), get('month') - 1, get('day'));
  return new Date(midnightWall + offsetMs);
}

/**
 * Partner-outreach sends counted against today's cap (all touches):
 * sent today + currently in flight.
 */
export async function countOutreachSendsToday(now: Date = new Date()): Promise<number> {
  const dayStart = chicagoDayStart(now);
  const [sent, processing] = await Promise.all([
    prisma.followUpJob.count({
      where: { journeyKey: CAPPED_JOURNEY_KEY, status: 'sent', sentAt: { gte: dayStart } },
    }),
    prisma.followUpJob.count({
      where: { journeyKey: CAPPED_JOURNEY_KEY, status: 'processing', claimedAt: { gte: dayStart } },
    }),
  ]);
  return sent + processing;
}

/** Remaining sends allowed today (≥0). */
export async function outreachRemainingToday(now: Date = new Date()): Promise<number> {
  return Math.max(0, outreachDailyCap() - (await countOutreachSendsToday(now)));
}
