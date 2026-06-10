/**
 * Persistence layer for scrape results — writes one row per surface to
 * the SeoSnapshot Prisma model.
 *
 * Idempotent on (surface × runRef) — if the workflow re-runs the same
 * surface it updates rather than duplicating. We don't dedupe across
 * runs; each daily cron creates a fresh row.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import type { ScrapeEnvelope, SurfaceKey } from './types';

let _prisma: PrismaClient | null = null;
function prisma() {
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}

export async function saveSnapshot(env: ScrapeEnvelope, runRef: string): Promise<void> {
  const p = prisma();
  await p.seoSnapshot.create({
    data: {
      capturedAt: new Date(env.capturedAt),
      surface: env.surface,
      domain: env.domain,
      payload: env.success
        ? (env.payload as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      failure: env.success ? null : env.failure,
      durationMs: env.durationMs,
      runRef,
    },
  });
}

export async function shutdown(): Promise<void> {
  if (_prisma) await _prisma.$disconnect();
  _prisma = null;
}

/**
 * Quick lookup for the most-recent successful capture per surface — used
 * by the admin dashboard "last scrape" badges.
 */
export async function latestPerSurface(): Promise<
  Array<{ surface: SurfaceKey; capturedAt: Date; success: boolean }>
> {
  const p = prisma();
  const rows = await p.$queryRaw<
    Array<{ surface: SurfaceKey; captured_at: Date; failure: string | null }>
  >`
    SELECT DISTINCT ON (surface) surface, captured_at, failure
    FROM seo_snapshots
    ORDER BY surface, captured_at DESC;
  `;
  return rows.map((r) => ({
    surface: r.surface,
    capturedAt: r.captured_at,
    success: r.failure === null,
  }));
}
