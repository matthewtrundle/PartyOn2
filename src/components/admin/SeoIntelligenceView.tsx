'use client';

import { useState } from 'react';
import Link from 'next/link';
import RunScrapePanel from './RunScrapePanel';

/**
 * Brian's Stuff → SEO Intelligence Module tab.
 *
 * Layout, top → bottom:
 *   1. RunScrapePanel — live status grid + RUN NOW button
 *   2. "Share with other agent" — GitHub docs link + copy-link button
 *   3. The 7 doc files as link cards
 *   4. Surface blueprint reference (collapsed by default)
 *
 * The 7 docs live in /docs/seo-intelligence-module/ in this repo.
 * Sharing that GitHub URL with another coding agent gives them
 * everything needed to port this system into a different project.
 */

const GH_OWNER_REPO = 'allan-cmyk/PartyOn2';
const DOCS_ROOT = `https://github.com/${GH_OWNER_REPO}/tree/main/docs/seo-intelligence-module`;
const DOC_FILES = [
  { name: 'AGENT_BRIEF.md', label: 'Agent Brief', sub: 'Paste this verbatim into the other agent\'s system prompt' },
  { name: 'README.md', label: 'README', sub: 'High-level overview + file map' },
  { name: 'ARCHITECTURE.md', label: 'Architecture', sub: 'Components, data flow, design choices' },
  { name: 'INTEGRATION_GUIDE.md', label: 'Integration Guide', sub: 'Step-by-step rebuild for a fresh Next.js project' },
  { name: 'SURFACE_REFERENCE.md', label: 'Surface Reference', sub: 'Per-surface selectors + payload schemas' },
  { name: 'API_REFERENCE.md', label: 'API Reference', sub: 'Prisma model + REST endpoints + webhook events' },
  { name: 'DEPLOYMENT.md', label: 'Deployment', sub: 'Secrets, env vars, cron, cookie refresh' },
  { name: 'TROUBLESHOOTING.md', label: 'Troubleshooting', sub: 'Ranked failure modes + fixes' },
] as const;

const SOURCE_PATHS = [
  { label: 'scripts/seo/', sub: 'Playwright orchestrator + 8 surface modules', href: `https://github.com/${GH_OWNER_REPO}/tree/main/scripts/seo` },
  { label: '.github/workflows/seo-scrape.yml', sub: 'Daily cron + workflow_dispatch', href: `https://github.com/${GH_OWNER_REPO}/blob/main/.github/workflows/seo-scrape.yml` },
  { label: 'src/app/api/admin/seo/', sub: 'Latest-snapshot + trigger-scrape routes', href: `https://github.com/${GH_OWNER_REPO}/tree/main/src/app/api/admin/seo` },
  { label: 'src/components/admin/RunScrapePanel.tsx', sub: 'Admin UI (this panel)', href: `https://github.com/${GH_OWNER_REPO}/blob/main/src/components/admin/RunScrapePanel.tsx` },
  { label: 'prisma/schema.prisma → SeoSnapshot', sub: 'One-row-per-surface persistence model', href: `https://github.com/${GH_OWNER_REPO}/blob/main/prisma/schema.prisma` },
];

export default function SeoIntelligenceView() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const copyDocsUrl = async () => {
    try {
      await navigator.clipboard.writeText(DOCS_ROOT);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* 1. Live status + Run Now */}
      <RunScrapePanel />

      {/* 2. Header — what this system is in one sentence */}
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-5">
        <h2 className="text-xl font-bold text-emerald-900 tracking-wide">
          🔭 SEO Intelligence Module
        </h2>
        <p className="text-sm text-emerald-900 mt-2 leading-relaxed">
          Daily automated SEMrush capture for <code>partyondelivery.com</code>:{' '}
          Playwright in GitHub Actions → 8 surfaces → Postgres
          (<code>SeoSnapshot</code> table) → this dashboard. No SEMrush API
          subscription required.
        </p>
        <p className="text-xs text-emerald-800 mt-2 italic">
          Runs nightly at 7am Central. Manual re-runs via the &quot;RUN NOW&quot;
          button above. SEMrush session cookie refreshes ~once a month
          (runbook in the panel above).
        </p>
      </div>

      {/* 3. Share with another coding agent */}
      <Section title="📖 Port this to another project">
        <p className="text-sm text-gray-700 mb-3">
          The full system is documented in <code>/docs/seo-intelligence-module/</code>.
          Share this GitHub URL with another coding agent — it has everything
          they need to rebuild the same setup in a different project:
        </p>
        <div className="flex gap-2 mb-4">
          <input
            readOnly
            value={DOCS_ROOT}
            className="flex-1 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-xs font-mono"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={copyDocsUrl}
            className="px-4 py-2 rounded-md font-bold text-xs tracking-widest"
            style={{ background: '#0B74B8', color: '#FFFFFF' }}
          >
            {copiedUrl ? '✓ COPIED' : 'COPY URL'}
          </button>
          <Link
            href={DOCS_ROOT}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-md font-bold text-xs tracking-widest border-2"
            style={{ borderColor: '#0B74B8', color: '#0B74B8' }}
          >
            OPEN ↗
          </Link>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>What to tell the other agent:</strong>{' '}
          &quot;Read <code>AGENT_BRIEF.md</code> in this directory first, then
          <code> README.md</code> and <code>INTEGRATION_GUIDE.md</code>. You&apos;re
          porting this system into [their project]. The source files to copy
          verbatim are in <code>scripts/seo/</code>, <code>.github/workflows/seo-scrape.yml</code>,
          <code> src/app/api/admin/seo/</code>, and the <code>SeoSnapshot</code> Prisma
          model. Ask me for the target SEMrush account&apos;s domain + competitors
          before you start.&quot;
        </p>
      </Section>

      {/* 4. Documentation file cards */}
      <Section title="Documentation files">
        <p className="text-xs text-gray-500 mb-3">
          All 8 files live at <code>{DOCS_ROOT}/</code>. Click any to open
          on GitHub.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {DOC_FILES.map((f) => (
            <Link
              key={f.name}
              href={`${DOCS_ROOT.replace('/tree/main/', '/blob/main/')}/${f.name}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 p-3 rounded-md border border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
            >
              <span className="font-mono text-xs text-emerald-700 shrink-0">📄</span>
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-900">{f.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{f.sub}</div>
                <div className="text-[10px] font-mono text-gray-400 mt-1">{f.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* 5. Source code map */}
      <Section title="Source code locations">
        <p className="text-xs text-gray-500 mb-3">
          The other agent will copy these into the equivalent paths in
          their project. Each is browsable on GitHub:
        </p>
        <div className="space-y-2">
          {SOURCE_PATHS.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-md border border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
            >
              <code className="text-xs font-bold text-gray-900 flex-1 truncate">
                {p.label}
              </code>
              <span className="text-[11px] text-gray-500 hidden sm:inline">{p.sub}</span>
              <span className="text-emerald-700 text-xs font-bold whitespace-nowrap">
                OPEN →
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* 6. Reference: the 8 surfaces, collapsed */}
      <details className="bg-white border border-gray-200 rounded-md p-5">
        <summary className="text-lg font-bold tracking-wide text-gray-900 cursor-pointer">
          Surface reference (8 SEMrush dashboards)
        </summary>
        <p className="text-xs text-gray-500 mt-3 mb-3">
          Quick reference of what each surface captures. Full schemas + selectors
          in <code>SURFACE_REFERENCE.md</code>.
        </p>
        <div className="space-y-2 text-sm">
          <SurfaceLine n="1" name="Position Tracking" path="/projects/{id}/tracking/positions/" gist="Per-keyword rank + WoW delta" />
          <SurfaceLine n="2" name="Keyword Gap" path="/analytics/keywordgap/" gist="Missing / Weak / Untapped vs. competitors" />
          <SurfaceLine n="3" name="Site Audit" path="/projects/{id}/siteaudit/campaign/" gist="Site health + technical issues" />
          <SurfaceLine n="4" name="Organic Research" path="/analytics/organic/overview/" gist="Traffic + top pages + authority score" />
          <SurfaceLine n="5" name="Backlink Analytics" path="/analytics/backlinks/overview/" gist="Total backlinks + referring domains + anchors" />
          <SurfaceLine n="6" name="AI · Brand Visibility" path="/ai-toolkit/projects/{id}/brand-visibility/" gist="Per-LLM presence + sentiment + citations" gated />
          <SurfaceLine n="7" name="AI · Prompt Tracking" path="/ai-toolkit/projects/{id}/prompts/" gist="Per-prompt × per-LLM response text + citations" gated />
          <SurfaceLine n="8" name="Keyword Magic" path="/analytics/keywordmagic/" gist="Related keywords for queued seeds (conditional)" conditional />
        </div>
      </details>

      {/* 7. Reference: stack assumptions */}
      <details className="bg-white border border-gray-200 rounded-md p-5">
        <summary className="text-lg font-bold tracking-wide text-gray-900 cursor-pointer">
          Stack assumptions for the port
        </summary>
        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mt-3">
          <li>Next.js 15+ App Router</li>
          <li>Prisma 6 + Postgres (Neon recommended)</li>
          <li>Playwright 1.56+ (transitive dep of <code>@playwright/test</code>)</li>
          <li>TypeScript strict mode</li>
          <li>Vercel hosting for the admin app, GitHub Actions for the cron</li>
          <li>Tailwind 3 for the admin UI</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          If the target stack differs, the Playwright modules in
          <code> scripts/seo/surfaces/</code> are framework-agnostic and
          portable as-is. The DB schema + admin UI would need adapting.
        </p>
      </details>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5">
      <h2 className="text-lg font-bold tracking-wide text-gray-900 mb-3">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function SurfaceLine({
  n,
  name,
  path,
  gist,
  gated,
  conditional,
}: {
  n: string;
  name: string;
  path: string;
  gist: string;
  gated?: boolean;
  conditional?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-xs font-bold text-emerald-700 w-5">#{n}</span>
      <span className="font-bold text-gray-900">{name}</span>
      <code className="text-[11px] text-gray-500">{path}</code>
      <span className="text-[11px] text-gray-700">— {gist}</span>
      {gated && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: '#FEF3C7', color: '#92400E' }}
        >
          AI TOOLKIT
        </span>
      )}
      {conditional && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: '#DBEAFE', color: '#1E40AF' }}
        >
          QUEUE-DRIVEN
        </span>
      )}
    </div>
  );
}
