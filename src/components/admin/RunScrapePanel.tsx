'use client';

/**
 * SEMrush scrape control panel — top of the SEO Intelligence tab.
 *
 * Surfaces:
 *   - Latest run overall (date + ok/fail count) — from Postgres via
 *     /api/admin/seo/latest-snapshot
 *   - One row per surface with last-captured timestamp + ok/fail badge
 *   - "RUN NOW" button → calls /api/admin/seo/trigger-scrape (GitHub
 *     workflow_dispatch). Polls the snapshot endpoint for ~5 min so the
 *     dashboard refreshes as data lands.
 *   - Expandable "cookie refresh runbook" so Brian/Allan can renew the
 *     SEMRUSH_COOKIE_JSON secret when sessions expire (every ~30 days).
 *
 * The legacy "copy the slash command" affordance is kept as a fallback
 * for runs you want to babysit interactively (e.g. while building new
 * surface selectors), in a collapsed details block.
 */
import { useCallback, useEffect, useState } from 'react';

const SLASH_COMMAND = '/scrape-semrush-pod';

const SURFACES: Array<{ key: string; label: string }> = [
  { key: 'position-tracking', label: 'Position Tracking' },
  { key: 'keyword-gap', label: 'Keyword Gap' },
  { key: 'site-audit', label: 'Site Audit' },
  { key: 'organic-research', label: 'Organic Research' },
  { key: 'backlink-analytics', label: 'Backlink Analytics' },
  { key: 'ai-brand-visibility', label: 'AI · Brand Visibility' },
  { key: 'ai-prompt-tracking', label: 'AI · Prompt Tracking' },
  { key: 'keyword-magic', label: 'Keyword Magic' },
];

type LatestRun = {
  runRef: string | null;
  capturedAt: string;
  total: number;
  successes: number;
  failures: number;
};

type SurfaceStatus = {
  surface: string;
  capturedAt: string;
  success: boolean;
  failure: string | null;
  durationMs: number | null;
};

type SnapshotResponse = {
  ok: boolean;
  latestRun: LatestRun | null;
  surfaces: SurfaceStatus[];
};

export default function RunScrapePanel() {
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState<{
    state: 'idle' | 'queueing' | 'queued' | 'error';
    detail?: string;
  }>({ state: 'idle' });
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/seo/latest-snapshot', { credentials: 'same-origin' });
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      /* swallow */
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Light polling for ~5 min after Run Now so the page reflects fresh
  // rows landing in the DB.
  useEffect(() => {
    if (trigger.state !== 'queued') return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - startedAt > 5 * 60_000) {
        window.clearInterval(id);
        setTrigger({ state: 'idle' });
        return;
      }
      void refresh();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [trigger.state, refresh]);

  const runNow = async () => {
    setTrigger({ state: 'queueing' });
    try {
      const res = await fetch('/api/admin/seo/trigger-scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setTrigger({ state: 'queued' });
      } else {
        const j = await res.json().catch(() => ({}));
        setTrigger({
          state: 'error',
          detail:
            j.error === 'token_missing'
              ? 'GH_DISPATCH_TOKEN not set on Vercel — see runbook below'
              : `GitHub returned ${j.error}${j.detail ? ' — ' + j.detail.slice(0, 200) : ''}`,
        });
      }
    } catch (err) {
      setTrigger({ state: 'error', detail: (err as Error).message });
    }
  };

  const copySlash = async () => {
    try {
      await navigator.clipboard.writeText(SLASH_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* swallow */
    }
  };

  return (
    <div
      className="rounded-md p-5 mb-2"
      style={{
        background: 'linear-gradient(135deg, #0A1F33 0%, #1A2F47 100%)',
        color: '#FFFFFF',
      }}
    >
      <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-bold tracking-widest mb-1"
            style={{ color: '#D4AF37' }}
          >
            DAILY · AUTOMATED · POD
          </div>
          <h3 className="font-heading text-xl md:text-2xl font-bold tracking-wide leading-tight">
            SEMrush capture
          </h3>
          <p className="text-xs md:text-sm opacity-85 mt-1 max-w-xl">
            Runs nightly at 7:00 AM Central via GitHub Actions. Pulls all 8
            surfaces (position tracking, keyword gap, site audit, organic,
            backlinks, AI brand visibility, AI prompt tracking, keyword
            magic) and writes to <code className="opacity-90">SeoSnapshot</code>.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end shrink-0">
          <button
            onClick={runNow}
            disabled={trigger.state === 'queueing' || trigger.state === 'queued'}
            className="px-6 py-3 rounded-md font-bold text-sm tracking-widest transition-transform hover:scale-[1.02] disabled:opacity-50"
            style={{ background: '#D4AF37', color: '#0A1F33' }}
          >
            {trigger.state === 'queueing'
              ? 'QUEUEING…'
              : trigger.state === 'queued'
                ? '⏳ RUNNING…'
                : '⤓ RUN NOW'}
          </button>
          {trigger.state === 'error' && (
            <div
              className="text-[11px] max-w-[20rem] text-right rounded-md p-2"
              style={{ background: 'rgba(220, 38, 38, 0.25)', color: '#FCA5A5' }}
            >
              {trigger.detail ?? 'GitHub rejected the dispatch'}
            </div>
          )}
        </div>
      </div>

      {/* Latest run summary */}
      <div
        className="mt-5 rounded-md p-3 flex flex-wrap items-center gap-x-4 gap-y-1"
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(212,175,55,0.35)',
        }}
      >
        <span className="text-[10px] font-bold tracking-widest" style={{ color: '#D4AF37' }}>
          LATEST RUN
        </span>
        {loading ? (
          <span className="text-xs opacity-70">checking…</span>
        ) : data?.latestRun ? (
          <>
            <span className="text-sm font-bold">{prettyDate(data.latestRun.capturedAt)}</span>
            <span className="text-xs opacity-80">
              {data.latestRun.successes} ok
              {data.latestRun.failures > 0 && (
                <span style={{ color: '#FCA5A5' }}> · {data.latestRun.failures} failed</span>
              )}
              {data.latestRun.runRef && (
                <span className="opacity-60"> · {data.latestRun.runRef}</span>
              )}
            </span>
          </>
        ) : (
          <span className="text-xs opacity-80">
            No scrape on file yet — hit RUN NOW, or wait for tonight&apos;s 7am cron.
          </span>
        )}
      </div>

      {/* Per-surface status grid */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        {SURFACES.map((s) => {
          const status = data?.surfaces.find((x) => x.surface === s.key);
          const stale =
            status && Date.now() - new Date(status.capturedAt).getTime() > 36 * 60 * 60 * 1000;
          const color = !status
            ? '#6B7280'
            : status.success && !stale
              ? '#86EFAC'
              : status.success && stale
                ? '#FCD34D'
                : '#FCA5A5';
          return (
            <div
              key={s.key}
              className="rounded-md p-2.5"
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${color}`,
              }}
              title={status?.failure ?? ''}
            >
              <div className="text-[10px] font-bold tracking-widest opacity-80" style={{ color }}>
                {!status ? 'NO DATA' : status.success ? (stale ? 'STALE' : 'OK') : 'FAILED'}
              </div>
              <div className="text-xs font-bold mt-0.5">{s.label}</div>
              {status && (
                <div className="text-[10px] opacity-70 mt-0.5">
                  {prettyDate(status.capturedAt)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cookie refresh runbook */}
      <details
        className="mt-4 rounded-md p-3"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212,175,55,0.25)' }}
      >
        <summary className="cursor-pointer text-xs font-bold tracking-widest" style={{ color: '#D4AF37' }}>
          🔑 COOKIE REFRESH RUNBOOK (when scrapes start failing auth)
        </summary>
        <div className="mt-2 text-xs leading-relaxed opacity-90 space-y-2">
          <p>SEMrush sessions expire every ~30 days. When the scrape fails with a cookie-expired error:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open <code>semrush.com</code> in Chrome with the POD account signed in.</li>
            <li>DevTools → Application → Cookies → <code>.semrush.com</code>.</li>
            <li>Select all rows → right-click → copy as JSON (or use the &quot;EditThisCookie&quot; extension &quot;Export&quot;).</li>
            <li>
              Open the GitHub repo settings: <a
                href="https://github.com/allan-cmyk/PartyOn2/settings/secrets/actions"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#D4AF37', textDecoration: 'underline' }}
              >
                allan-cmyk/PartyOn2 → Settings → Secrets → Actions
              </a>
            </li>
            <li>Update the <code>SEMRUSH_COOKIE_JSON</code> secret. Paste the JSON array.</li>
            <li>Come back here and hit RUN NOW to confirm.</li>
          </ol>
          <p className="opacity-80">
            Takes ~60 seconds, ~once a month. If you skip it, the cron job will keep firing the
            &quot;cookie expired&quot; webhook to the GHL dashboard each morning.
          </p>
        </div>
      </details>

      {/* Manual / interactive fallback */}
      <details
        className="mt-2 rounded-md p-3"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212,175,55,0.25)' }}
      >
        <summary className="cursor-pointer text-xs font-bold tracking-widest" style={{ color: '#D4AF37' }}>
          🪛 INTERACTIVE FALLBACK (drive your own Chrome via Claude Code)
        </summary>
        <div className="mt-2 text-xs leading-relaxed opacity-90 space-y-2">
          <p>
            Use the Playwright path above for daily automated runs. Use this only when you want to
            <em> watch </em> the scrape happen (selector debugging, new surface verification).
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <code>cd ~/path/to/Party\ On\ Delivery</code> &amp; <code>claude</code>
            </li>
            <li>Pair the Claude in Chrome extension on a logged-in SEMrush Chrome.</li>
            <li>
              <button
                onClick={copySlash}
                className="px-3 py-1 rounded font-bold text-xs"
                style={{ background: '#D4AF37', color: '#0A1F33' }}
              >
                {copied ? '✓ COPIED' : `Copy ${SLASH_COMMAND}`}
              </button>{' '}
              and paste in Claude Code. Walk away ~10–15 min.
            </li>
          </ol>
        </div>
      </details>
    </div>
  );
}

function prettyDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const ageMs = now - d.getTime();
    const hours = Math.round(ageMs / (60 * 60 * 1000));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
