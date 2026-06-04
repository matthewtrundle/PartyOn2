import Link from 'next/link';
import RunScrapePanel from './RunScrapePanel';

/**
 * Brian's Stuff → SEO Intelligence Module tab.
 *
 * Handoff documentation for the POD Claude agent. Reads the system prompt
 * + bootstrap instructions inline so any engineer can stand the module up
 * without hunting through external docs.
 *
 * The actual SEO module lives in a separate GitHub repo (link below). This
 * tab is the in-app authoritative source for the handoff process.
 */
const REPO_URL =
  'https://github.com/premieratx/CruiseConcierge/tree/seo-fixes-only/seo-intelligence-module';
const README_URL = `${REPO_URL}/README.md`;
const BRIEF_URL = `${REPO_URL}/AGENT_BRIEF.md`;

export default function SeoIntelligenceView() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* One-click scrape panel — sits above everything else so Allan
          can run the capture without scrolling. */}
      <RunScrapePanel />

      {/* Header */}
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-5">
        <h2 className="text-xl font-bold text-emerald-900 tracking-wide">
          🔭 SEO Intelligence Module — Handoff
        </h2>
        <p className="text-sm text-emerald-900 mt-2 leading-relaxed">
          Multi-tenant SEO intelligence system that scrapes positions,
          synthesizes strategy, and pushes <code>6–12 strategic projects</code>{' '}
          into the <code>seo_projects</code> table within 30 minutes of the
          first run. Lives in the Cruise Concierge repo and is wired into
          Party On Delivery as a tenant.
        </p>
        <p className="text-xs text-emerald-800 mt-2 italic">
          This tab is the canonical handoff doc. Paste the brief into the POD
          Claude agent&apos;s system prompt + drop the repo link, and it can take
          it from there.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-3">
        <ResourceLink
          label="GitHub directory"
          href={REPO_URL}
          sub="seo-intelligence-module/"
        />
        <ResourceLink label="README.md" href={README_URL} sub="Read this first" />
        <ResourceLink label="AGENT_BRIEF.md" href={BRIEF_URL} sub="System prompt" />
      </div>

      {/* Verbatim handoff */}
      <Section title="Handoff message — copy/paste to the POD Claude agent">
        <div className="rounded-md bg-gray-900 text-gray-100 p-5 text-sm leading-relaxed">
          <p className="mb-3">
            <span className="font-bold text-emerald-300">Tell them:</span>{' '}
            &quot;Read <code className="text-amber-300">seo-intelligence-module/README.md</code>,
            then <code className="text-amber-300">AGENT_BRIEF.md</code>. Fill out{' '}
            <code className="text-amber-300">tenants/party-on-delivery.json</code> from
            the template, then run{' '}
            <code className="text-amber-300">scripts/bootstrap-tenant.sh</code>.
            Within 30 minutes of the first scrape you&apos;ll have 6–12 strategic
            projects ready in <code className="text-amber-300">seo_projects</code>.&quot;
          </p>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            For their context window, paste <code className="text-amber-300">AGENT_BRIEF.md</code>{' '}
            verbatim into their system prompt + drop a link to the GitHub directory.
            Everything else can be read on-demand:
          </p>
          <p className="mt-2">
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 underline break-all"
            >
              {REPO_URL}
            </Link>
          </p>
        </div>
      </Section>

      {/* Walkthrough */}
      <Section title="What the agent will do (in order)">
        <ol className="list-decimal pl-6 space-y-2 text-sm text-gray-800">
          <Step n="1" title="Read the docs">
            Opens <code>README.md</code> for architecture overview, then{' '}
            <code>AGENT_BRIEF.md</code> for tenant-onboarding contract.
          </Step>
          <Step n="2" title="Fill tenant config">
            Copies the template, populates{' '}
            <code>tenants/party-on-delivery.json</code> with brand keywords,
            competitor domains, geo focus (Austin), priority pages
            (landing pages, /flyer, blog), and Search Console / SEMrush API
            tokens.
          </Step>
          <Step n="3" title="Bootstrap">
            Runs <code>scripts/bootstrap-tenant.sh</code>. Provisions the
            scraper, scheduling, and downstream synthesis pipeline.
          </Step>
          <Step n="4" title="First scrape ≤ 30 min">
            Pulls rankings, keyword gaps, backlink deltas, technical-audit
            findings. Writes raw data + a synthesized strategy doc.
          </Step>
          <Step n="5" title="Strategic projects ready">
            Inserts 6–12 prioritized <code>seo_projects</code> rows (each
            with hypothesis, target keywords, page targets, expected lift,
            and a one-week execution plan).
          </Step>
        </ol>
      </Section>

      {/* What lives where */}
      <Section title="File map">
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-md p-4 overflow-x-auto">
{`seo-intelligence-module/
├── README.md                   ← start here
├── AGENT_BRIEF.md              ← paste verbatim into system prompt
├── tenants/
│   └── party-on-delivery.json  ← fill this in (template provided)
├── scripts/
│   ├── bootstrap-tenant.sh     ← one-time setup per tenant
│   ├── scrape.sh               ← scheduled position/SERP scrape
│   └── synthesize.sh           ← turns raw scrape into seo_projects
├── lib/                        ← shared TS modules
└── workers/                    ← background workers (Vercel cron)`}
        </pre>
      </Section>

      {/* Where POD plugs in */}
      <Section title="How this connects to Party On Delivery">
        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-800">
          <li>
            <strong>Output table</strong>: <code>seo_projects</code> rows can be
            mirrored into POD&apos;s Postgres (Neon) via a sync worker so they
            show up next to Brian&apos;s Stuff → Operations later.
          </li>
          <li>
            <strong>Inputs</strong>: scraper pulls from Google Search Console
            (already wired in <code>src/lib/analytics/</code>) + SEMrush
            (Cowork skill at <code>seo-semrush-snapshot</code>).
          </li>
          <li>
            <strong>Cadence</strong>: weekly synthesis pass, daily delta
            scrapes. Schedule managed by the module&apos;s own cron — not POD&apos;s
            <code>vercel.json</code>.
          </li>
          <li>
            <strong>Owner</strong>: SEO Director sub-agent
            (<code>.claude/agents/seo-director.md</code> in this repo)
            consumes the synthesized projects + decides which to action.
          </li>
        </ul>
      </Section>

      {/* Already-have context for the POD agent */}
      <Section title="Context the POD agent already has on hand">
        <p className="text-sm text-gray-700 mb-2">
          When you brief the agent, remind it these are already available
          locally — no need to re-collect:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-800">
          <li>
            <code>docs/WEBSITE-ANALYTICS.md</code> — nightly snapshot of GA4,
            Search Console, Vercel, GBP, orders, margins
          </li>
          <li>
            <code>data/seo/semrush/&lt;YYYY-MM-DD&gt;/</code> — weekly SEMrush
            captures (Position, Organic, Backlinks, Site Audit, Keyword
            Magic)
          </li>
          <li>
            <code>scripts/topics.json</code> — 107 published blog topics, used
            for content-gap analysis
          </li>
          <li>
            <code>src/lib/analytics/</code> — GA4 + Search Console admin
            endpoints behind <code>requireOpsAuth</code>
          </li>
          <li>
            <code>prisma/schema.prisma</code> — <code>BlogPost</code>,{' '}
            <code>Product</code>, <code>Order</code>, and the new{' '}
            <code>Lead</code>/<code>VisitorSession</code> tables for
            attribution
          </li>
        </ul>
      </Section>

      {/* TL;DR for sharing */}
      <Section title="One-paragraph TL;DR (for forwarding)">
        <div className="rounded-md p-4 bg-amber-50 border border-amber-200 text-sm text-amber-900 leading-relaxed">
          <strong>SEO Intelligence Module</strong> is a multi-tenant scraper +
          synthesizer that turns Search Console / SEMrush / SERP data into 6–12
          ready-to-execute SEO projects per tenant. To onboard POD: paste{' '}
          <code>AGENT_BRIEF.md</code> from{' '}
          <Link
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="underline font-semibold"
          >
            this repo
          </Link>{' '}
          into the POD Claude agent&apos;s system prompt, point it at the GitHub
          directory, and tell it to fill in{' '}
          <code>tenants/party-on-delivery.json</code> and run{' '}
          <code>scripts/bootstrap-tenant.sh</code>. First strategic-projects
          batch lands in <code>seo_projects</code> within 30 minutes.
        </div>
      </Section>

      {/* ===================================================================
          CHROME-EXTENSION SCRAPE BLUEPRINT — what the Claude in Chrome
          extension will actually do on each SEMrush surface, and which
          surfaces have known extraction friction.
          =================================================================== */}
      <Section title="Chrome-extension scrape blueprint — partyondelivery.com">
        <p className="text-sm text-gray-700 mb-3">
          The agent uses the Claude in Chrome extension to drive a real
          logged-in SEMrush session for <code>partyondelivery.com</code>. Each
          surface below is a separate scrape run with its own URL pattern,
          DOM selectors, output JSON shape, and friction notes. The agent
          starts with the user already signed in (no scripted login) — same
          rule the existing <code>seo-semrush-snapshot</code> skill follows
          when 2FA is in play.
        </p>
        <div className="space-y-3">
          <ScrapeSurface
            num="1"
            tier="ready"
            name="Position Tracking"
            url="https://www.semrush.com/projects/{projectId}/tracking/positions/"
            captures={[
              'Per-keyword rank + WoW delta',
              'Search volume + KD%',
              'Landing URL + tracked-since date',
              'Top competitors share-of-voice',
            ]}
            method="Standard data-grid → JSON row dump"
            friction="Low — rows render server-side, easy to read DOM."
          />
          <ScrapeSurface
            num="2"
            tier="ready"
            name="Keyword Gap Analysis"
            url="https://www.semrush.com/analytics/keywordgap/?q=partyondelivery.com&q1={competitor1}&q2={competitor2}&q3={competitor3}"
            captures={[
              'Untapped + missing + weak keywords',
              'Competitor overlap counts',
              'Volume + KD% + intent per row',
            ]}
            method="Paginated grid — agent clicks through pages, dedupes rows."
            friction="Medium — large keyword counts paginate. Agent caps at 500 rows per gap report by default."
          />
          <ScrapeSurface
            num="3"
            tier="ready"
            name="Site Audit"
            url="https://www.semrush.com/projects/{projectId}/siteaudit/campaign/"
            captures={[
              'Site Health score + total issue count',
              'Errors / Warnings / Notices breakdown',
              'Per-issue page samples',
              'Crawled / blocked / healthy pages',
            ]}
            method="Top-line cards scraped directly; issue drill-downs need a second click per row."
            friction="Medium — only the latest crawl is exposed; agent triggers a fresh re-crawl if last run is >7 days old."
          />
          <ScrapeSurface
            num="4"
            tier="ready"
            name="Organic Research"
            url="https://www.semrush.com/analytics/organic/overview/?q=partyondelivery.com"
            captures={[
              'Total organic traffic estimate',
              'Total ranking keywords',
              'Top organic pages + per-page traffic',
              'Position-bucket distribution (top 3 / 4–10 / 11–20 / 21–50)',
            ]}
            method="Overview cards + Top Pages table"
            friction="Low."
          />
          <ScrapeSurface
            num="5"
            tier="medium"
            name="Backlink Analytics"
            url="https://www.semrush.com/analytics/backlinks/overview/?q=partyondelivery.com"
            captures={[
              'New + lost referring domains',
              'Anchor-text distribution',
              'Top referring pages',
              'Toxicity score',
            ]}
            method="Overview cards + Referring Domains tab"
            friction="Medium — Backlink Audit (toxicity assignments) requires a project to be configured first. Agent falls back to overview if no project exists."
          />
          <ScrapeSurface
            num="6"
            tier="medium"
            name="AI Toolkit · Brand Visibility (4 LLMs)"
            url="https://www.semrush.com/ai-toolkit/projects/{projectId}/brand-visibility/"
            captures={[
              'Per-LLM presence rate: ChatGPT · Gemini · Perplexity · Claude / Copilot',
              'Share-of-voice vs. competitors by LLM',
              'Sentiment per LLM (positive / neutral / negative %)',
              'Cited domains POD shows up alongside',
            ]}
            method="Per-LLM tabbed view. Agent iterates each tab, screenshots the chart, scrapes the data legend."
            friction="HIGH — Most metrics render in canvas/SVG charts, not DOM tables. Agent grabs the chart-legend numbers + screenshots; full per-prompt breakdown lives in Prompt Tracking (next)."
          />
          <ScrapeSurface
            num="7"
            tier="medium"
            name="AI Toolkit · Prompt Tracking"
            url="https://www.semrush.com/ai-toolkit/projects/{projectId}/prompts/"
            captures={[
              'Each tracked prompt + how often POD is cited',
              'Per-LLM response snapshot (the actual LLM text)',
              'Citation rank (where POD appears in the AI answer)',
              'Competitors mentioned in same response',
            ]}
            method="Prompt list table → click prompt → modal with per-LLM tabs (ChatGPT / Gemini / Perplexity / Copilot or Claude)."
            friction="HIGH — Per-LLM response text loads async + is text-heavy. Agent reads the modal DOM per LLM tab and writes one JSON entry per (prompt × LLM) cell."
          />
          <ScrapeSurface
            num="8"
            tier="conditional"
            name="Keyword Magic Tool"
            url="https://www.semrush.com/analytics/keywordmagic/?q={seed_keyword}"
            captures={[
              'Related-keyword expansion',
              'Volume / KD% / Intent / SERP features',
              'Topic-cluster grouping',
            ]}
            method="Only runs when there are queued keywords in `data/seo/semrush/_queue/keyword-magic.txt`. One run per queued keyword."
            friction="Low — but expensive in time, so it's queue-driven instead of every run."
          />
        </div>

        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-900 leading-relaxed">
          <strong>Heads up — friction items you should know about:</strong>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>
              <strong>AI Toolkit tier gate:</strong> Brand Visibility +
              Prompt Tracking sit inside SEMrush&apos;s AI Toolkit, which is a
              separate paid add-on (not all Business plans include it). If
              the POD account doesn&apos;t have it, those two surfaces 404 and
              the agent skips them with a <code>FAILED.md</code>.
            </li>
            <li>
              <strong>Canvas charts:</strong> AI Visibility share-of-voice
              over time renders in <code>&lt;canvas&gt;</code> — the agent
              can&apos;t read it as data, only screenshot it. Legend numbers
              (current presence rate per LLM) are in the DOM and DO extract.
            </li>
            <li>
              <strong>4th LLM identity:</strong> SEMrush labels the slots as
              ChatGPT / Gemini / Perplexity / Copilot. Claude is{' '}
              <strong>not currently a tracked LLM</strong> in SEMrush&apos;s AI
              Toolkit (as of 2026 H1). If they ship a Claude tab, the agent
              auto-picks it up because it iterates whatever tabs exist.
            </li>
            <li>
              <strong>Project ID:</strong> Position Tracking, Site Audit, and
              AI Toolkit URLs all need a SEMrush <code>projectId</code> for
              partyondelivery.com. Agent will discover it from{' '}
              <code>/projects/</code> on the first run and stash it in{' '}
              <code>tenants/party-on-delivery.json</code>.
            </li>
            <li>
              <strong>Rate limits:</strong> SEMrush throttles after ~30 fast
              navigations. Agent sleeps 3–5s between surfaces and longer
              between paginated table reads.
            </li>
            <li>
              <strong>2FA / fresh login:</strong> Agent NEVER drives the
              login form. It assumes you&apos;re already signed in. If the
              session expired, it writes <code>FAILED.md</code> and asks you
              to re-auth.
            </li>
          </ul>
        </div>
      </Section>

      <Section title="Output paths">
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-md p-4 overflow-x-auto">
{`data/seo/semrush/<YYYY-MM-DD>/
├── position-tracking.{png,json}
├── keyword-gap.{png,json}
├── site-audit.{png,json}
├── organic-research.{png,json}
├── backlink-analytics.{png,json}
├── ai-brand-visibility/
│   ├── chatgpt.{png,json}
│   ├── gemini.{png,json}
│   ├── perplexity.{png,json}
│   └── copilot.{png,json}
├── ai-prompt-tracking.{json}        ← rows are (prompt × LLM) pairs
├── keyword-magic/                   ← only when _queue/keyword-magic.txt is non-empty
│   └── <slug-of-seed>.{png,json}
└── FAILED.md                        ← only on failure (per-surface allowed)`}
        </pre>
        <p className="text-xs text-gray-600 mt-2">
          The SEO Director sub-agent reads JSON files directly; screenshots
          are operator-debugging artifacts. The directory is gitignored.
        </p>
      </Section>

      <Section title="Ready-to-go checklist">
        <ul className="space-y-2 text-sm text-gray-800">
          <Check
            ok
            label="Chrome Claude extension installed + signed in"
            detail="Verified — Browser 1 connected from this admin tab."
          />
          <Check
            ok
            label="SEMrush UI accessible from logged-in account"
            detail="Verified — semrush.com/home/ resolves; no credentials needed in scripts."
          />
          <Check
            ok
            label="seo-semrush-snapshot Cowork skill stubbed"
            detail=".claude/skills/seo-semrush-snapshot/SKILL.md defines the Phase 1 contract."
          />
          <Check
            ok
            label="Position Tracking · Keyword Gap · Site Audit · Organic · Backlinks · Keyword Magic"
            detail="All ready — clean DOM tables, no canvas-only blockers."
          />
          <Check
            warn
            label="AI Toolkit (Brand Visibility + Prompt Tracking)"
            detail="Plan-gated. Confirm POD's SEMrush subscription includes AI Toolkit before relying on outputs."
          />
          <Check
            warn
            label="SEMrush projectId for partyondelivery.com"
            detail="Agent auto-discovers on first run and writes back into tenants/party-on-delivery.json."
          />
          <Check
            warn
            label="Cron host"
            detail="Chrome-extension scrapes can't run on Vercel. Choose: (a) workstation cron (b) GitHub Actions with the SEMrush session restored from cookie."
          />
        </ul>
      </Section>
    </div>
  );
}

function ScrapeSurface({
  num,
  tier,
  name,
  url,
  captures,
  method,
  friction,
}: {
  num: string;
  tier: 'ready' | 'medium' | 'conditional';
  name: string;
  url: string;
  captures: string[];
  method: string;
  friction: string;
}) {
  const tierStyle: Record<typeof tier, { bg: string; fg: string; label: string }> = {
    ready: { bg: '#DCFCE7', fg: '#166534', label: 'READY' },
    medium: { bg: '#FEF3C7', fg: '#92400E', label: 'MEDIUM' },
    conditional: { bg: '#DBEAFE', fg: '#1E40AF', label: 'CONDITIONAL' },
  };
  const ts = tierStyle[tier];
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-xs font-bold text-emerald-700">#{num}</span>
        <h4 className="font-bold text-sm text-gray-900">{name}</h4>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: ts.bg, color: ts.fg }}
        >
          {ts.label}
        </span>
      </div>
      <div className="text-[11px] font-mono text-gray-500 mb-2 break-all">{url}</div>
      <div className="text-xs text-gray-800 mb-1">
        <strong>Captures:</strong>
        <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
          {captures.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <div className="text-xs text-gray-700 mt-1">
        <strong>Method:</strong> {method}
      </div>
      <div className="text-xs text-gray-700 mt-0.5">
        <strong>Friction:</strong> {friction}
      </div>
    </div>
  );
}

function Check({
  ok,
  warn,
  label,
  detail,
}: {
  ok?: boolean;
  warn?: boolean;
  label: string;
  detail?: string;
}) {
  const palette = ok
    ? { bg: '#DCFCE7', fg: '#166534', icon: '✓' }
    : warn
      ? { bg: '#FEF3C7', fg: '#92400E', icon: '!' }
      : { bg: '#FEE2E2', fg: '#991B1B', icon: '✗' };
  return (
    <li className="flex items-start gap-2">
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold flex-shrink-0 mt-0.5"
        style={{ background: palette.bg, color: palette.fg }}
      >
        {palette.icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        {detail && <div className="text-xs text-gray-600">{detail}</div>}
      </div>
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5">
      <h2 className="text-lg font-bold tracking-wide text-gray-900 mb-3">
        {title}
      </h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

function ResourceLink({
  label,
  href,
  sub,
}: {
  label: string;
  href: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-md border border-gray-200 bg-white p-4 hover:border-emerald-400 hover:bg-emerald-50 transition-colors block"
    >
      <div className="text-[10px] font-bold tracking-widest text-emerald-700">
        OPEN →
      </div>
      <div className="font-bold text-sm text-gray-900 mt-1 break-words">
        {label}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </Link>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="leading-relaxed">
      <span className="font-bold text-emerald-700">#{n} {title}.</span>{' '}
      <span className="text-gray-700">{children}</span>
    </li>
  );
}
