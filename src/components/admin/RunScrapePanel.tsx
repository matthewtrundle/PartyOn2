'use client';

/**
 * "Run SEMrush scrape" panel — sits at the top of the SEO Intelligence
 * tab. Gives Allan (or anyone) a copy-paste-and-go button to kick off
 * the /scrape-semrush-pod slash command.
 *
 * Why not a true one-click on-the-website button?
 *   The Chrome Claude extension is *interactive* — it drives the
 *   operator's own paired browser. It cannot be triggered from a server
 *   endpoint. So the closest we can get to "click and go" is:
 *
 *     1. Click the button in this panel
 *     2. The slash command is copied to your clipboard
 *     3. You paste it into a Claude Code session on this repo
 *     4. Walk away — Claude drives Chrome through all 8 surfaces
 *
 * The button also surfaces the latest-snapshot status from
 * /api/admin/seo/latest-snapshot so you can see at-a-glance whether
 * a recent run happened + how many surfaces succeeded.
 */
import { useEffect, useState } from 'react';

const SLASH_COMMAND = '/scrape-semrush-pod';

type Snapshot = {
  ok: boolean;
  latest: string | null;
  count: number;
  latest_file_count?: number;
  latest_failures?: number;
};

export default function RunScrapePanel() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/admin/seo/latest-snapshot', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSnap(j))
      .catch(() => setSnap(null))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SLASH_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = SLASH_COMMAND;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
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
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-bold tracking-widest mb-1"
            style={{ color: '#D4AF37' }}
          >
            ONE-CLICK SCRAPE · POD
          </div>
          <h3 className="font-heading text-xl md:text-2xl font-bold tracking-wide leading-tight">
            Run the SEMrush capture now
          </h3>
          <p className="text-xs md:text-sm opacity-85 mt-1 max-w-xl">
            Copies the slash command. Paste it into Claude Code in this repo
            with the Chrome extension paired. Claude walks through all 8
            SEMrush surfaces and writes JSON + screenshots to{' '}
            <code className="opacity-90">data/seo/semrush/&lt;today&gt;/</code>.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end shrink-0">
          <button
            onClick={handleCopy}
            className="px-6 py-3 rounded-md font-bold text-sm tracking-widest transition-transform hover:scale-[1.02]"
            style={{ background: '#D4AF37', color: '#0A1F33' }}
          >
            {copied ? '✓ COPIED' : '⤓ COPY SLASH COMMAND'}
          </button>
          <code
            className="text-[11px] px-2 py-0.5 rounded font-mono"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#D4AF37' }}
          >
            {SLASH_COMMAND}
          </code>
        </div>
      </div>

      {/* How to run — three numbered steps Allan can follow */}
      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        <Step
          n="1"
          title="Open Claude Code in the POD repo"
          body={
            <>
              On your Mac, open Terminal:
              <code className="block mt-1 px-2 py-1 rounded bg-black/30 text-xs">
                cd ~/path/to/Party\ On\ Delivery
                <br />
                claude
              </code>
            </>
          }
        />
        <Step
          n="2"
          title="Make sure Chrome extension is paired"
          body={
            <>
              Open Chrome → click the Claude in Chrome extension icon →
              confirm it shows{' '}
              <span style={{ color: '#D4AF37' }}>Connected</span>. You should
              also be signed into SEMrush in the same browser.
            </>
          }
        />
        <Step
          n="3"
          title="Paste the slash command, hit Return"
          body={
            <>
              Paste <code>/scrape-semrush-pod</code>. Walk away for ~10–15
              min. Claude writes the scrape to{' '}
              <code>data/seo/semrush/&lt;today&gt;/</code> and prints a
              per-surface success/failure summary.
            </>
          }
        />
      </div>

      {/* Latest snapshot indicator */}
      <div
        className="mt-5 rounded-md p-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212,175,55,0.35)' }}
      >
        <div className="text-xs">
          <span
            className="font-bold tracking-widest"
            style={{ color: '#D4AF37' }}
          >
            LATEST SCRAPE
          </span>{' '}
          {loading ? (
            <span className="opacity-70">checking…</span>
          ) : snap?.latest ? (
            <>
              <span className="font-bold">{snap.latest}</span>
              <span className="opacity-70">
                {' '}
                · {snap.latest_file_count ?? 0} files
                {(snap.latest_failures ?? 0) > 0 && (
                  <span style={{ color: '#FCA5A5' }}>
                    {' '}
                    · {snap.latest_failures} failed
                  </span>
                )}
                {' '}· {snap.count} total snapshot{snap.count === 1 ? '' : 's'} on disk
              </span>
            </>
          ) : (
            <span className="opacity-80">
              No scrape on disk yet — run the command above to capture the
              first batch.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      className="rounded-md p-3"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className="font-heading font-bold text-lg mb-0.5"
        style={{ color: '#D4AF37' }}
      >
        {n}
      </div>
      <div className="font-bold text-sm mb-1">{title}</div>
      <div className="text-xs leading-relaxed opacity-90">{body}</div>
    </div>
  );
}
