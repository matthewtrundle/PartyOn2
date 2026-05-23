/**
 * GET /api/admin/seo/latest-snapshot
 *
 * Server-side filesystem read of data/seo/semrush/ to surface the most
 * recent scrape date in the admin UI. Drives the "Last scrape" badge in
 * Brian's Stuff → SEO tab.
 *
 * Read-only; safe to leave un-authed because the path is admin-only
 * routing anyway and the only output is a directory name.
 */
import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'seo', 'semrush');

export async function GET() {
  try {
    const entries = await fs.readdir(SNAPSHOT_DIR, { withFileTypes: true });
    const dateDirs = entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
      .map((e) => e.name)
      .sort()
      .reverse();
    if (dateDirs.length === 0) {
      return NextResponse.json({ ok: true, latest: null, count: 0 });
    }
    const latest = dateDirs[0];
    // Quick file-count to show what landed in the latest run.
    const latestFiles = await fs.readdir(path.join(SNAPSHOT_DIR, latest)).catch(() => []);
    const failures = latestFiles.filter((f) => f.startsWith('FAILED-')).length;
    return NextResponse.json({
      ok: true,
      latest,
      count: dateDirs.length,
      latest_file_count: latestFiles.length,
      latest_failures: failures,
    });
  } catch (err) {
    // Directory doesn't exist yet — totally fine, just means no scrape has run.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ ok: true, latest: null, count: 0 });
    }
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
