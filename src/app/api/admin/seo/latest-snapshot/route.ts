/**
 * GET /api/admin/seo/latest-snapshot
 *
 * Reads the most recent SEMrush scrape state out of Postgres
 * (SeoSnapshot model). Drives the "LATEST SCRAPE" badge + per-surface
 * status grid in Brian's Stuff → SEO tab.
 *
 * Returns:
 *   {
 *     ok: true,
 *     latestRun: { runRef, capturedAt, total, successes, failures } | null,
 *     surfaces: [{ surface, capturedAt, success, failure, durationMs }]
 *   }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    // Latest run: derived from MAX(capturedAt) and its runRef.
    const newest = await prisma.seoSnapshot.findFirst({
      orderBy: { capturedAt: 'desc' },
      select: { runRef: true, capturedAt: true },
    });

    if (!newest) {
      return NextResponse.json({
        ok: true,
        latestRun: null,
        surfaces: [],
      });
    }

    // Pull every snapshot from the most-recent runRef (or, if runRef is
    // null, fall back to the most-recent capture per surface).
    const rowsInRun = newest.runRef
      ? await prisma.seoSnapshot.findMany({
          where: { runRef: newest.runRef },
          orderBy: { surface: 'asc' },
          select: {
            surface: true,
            capturedAt: true,
            failure: true,
            durationMs: true,
            domain: true,
          },
        })
      : [];

    // Most-recent-per-surface (independent of runRef) so even partial
    // runs surface old data clearly.
    const latestPerSurface = await prisma.$queryRaw<
      Array<{
        surface: string;
        captured_at: Date;
        failure: string | null;
        duration_ms: number | null;
      }>
    >`
      SELECT DISTINCT ON (surface) surface, captured_at, failure, duration_ms
      FROM seo_snapshots
      ORDER BY surface, captured_at DESC;
    `;

    const successes = rowsInRun.filter((r) => r.failure === null).length;
    const failures = rowsInRun.filter((r) => r.failure !== null).length;

    return NextResponse.json({
      ok: true,
      latestRun: {
        runRef: newest.runRef,
        capturedAt: newest.capturedAt.toISOString(),
        total: rowsInRun.length,
        successes,
        failures,
      },
      // Always return every surface's most recent snapshot regardless of
      // which run it came from — the dashboard renders one row per
      // surface with its own captured-at timestamp.
      surfaces: latestPerSurface.map((r) => ({
        surface: r.surface,
        capturedAt: r.captured_at.toISOString(),
        success: r.failure === null,
        failure: r.failure,
        durationMs: r.duration_ms,
      })),
    });
  } catch (err) {
    console.error('[latest-snapshot] db error', err);
    return NextResponse.json(
      { ok: false, error: 'db_error', detail: String(err) },
      { status: 500 },
    );
  }
}
