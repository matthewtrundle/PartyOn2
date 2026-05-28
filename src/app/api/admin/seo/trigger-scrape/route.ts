/**
 * POST /api/admin/seo/trigger-scrape
 *
 * Fires the SEMrush scrape GitHub Actions workflow on demand. Powered
 * by GitHub's `workflow_dispatch` API.
 *
 * Auth: this is mounted under /api/admin which is gated by the existing
 * ops-auth middleware. No extra auth check needed.
 *
 * Env needed (set on Vercel + locally):
 *   GH_DISPATCH_TOKEN  — fine-grained PAT with Actions:Write on the repo
 *   GH_REPO_SLUG       — defaults to 'allan-cmyk/PartyOn2'
 *
 * Returns:
 *   { ok: true, queued: true }                          → workflow accepted
 *   { ok: false, error: 'token_missing' }               → env not set
 *   { ok: false, error: 'gh_<status>', detail: '...' }  → GitHub rejected
 */
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WORKFLOW_FILE = 'seo-scrape.yml';
const DEFAULT_REPO = 'allan-cmyk/PartyOn2';

export async function POST(req: NextRequest) {
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'token_missing', detail: 'Set GH_DISPATCH_TOKEN env var (fine-grained PAT with Actions:Write).' },
      { status: 500 },
    );
  }
  const repo = process.env.GH_REPO_SLUG ?? DEFAULT_REPO;

  // Optional body { surfaces: 'position-tracking,keyword-gap' } to scope
  // the run. Forwarded as the workflow's `surfaces` input.
  const body = await req.json().catch(() => ({}));
  const surfaces = typeof body.surfaces === 'string' ? body.surfaces : '';

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { surfaces },
      }),
    },
  );

  if (res.status === 204) {
    return NextResponse.json({ ok: true, queued: true, repo, surfaces: surfaces || 'all' });
  }
  let detail = '';
  try {
    detail = await res.text();
  } catch {
    /* swallow */
  }
  return NextResponse.json(
    { ok: false, error: `gh_${res.status}`, detail },
    { status: res.status === 404 ? 404 : 502 },
  );
}
