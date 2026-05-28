# SEO Intelligence Module — Playwright + GitHub Actions

> **Audience:** an engineer or AI coding agent porting this system into a different
> Next.js + Prisma + Vercel project. Everything you need to rebuild — schema, code,
> CI workflow, admin UI — is in this directory.
>
> **What this is:** an unattended daily SEMrush scraper that captures 8 dashboards
> for one domain, persists the results to Postgres, and surfaces them in an admin
> dashboard. Designed for projects without a paid SEMrush API subscription that
> still need fresh ranking + competitor + AI-visibility data on a schedule.

## What it captures

| # | Surface | URL pattern | Why |
|---|---|---|---|
| 1 | **Position Tracking** | `/projects/{id}/tracking/positions/` | Per-keyword rank + WoW delta |
| 2 | **Keyword Gap** | `/analytics/keywordgap/?q=…` | Missing / Weak / Untapped keywords vs. competitors |
| 3 | **Site Audit** | `/projects/{id}/siteaudit/campaign/` | Technical SEO health |
| 4 | **Organic Research** | `/analytics/organic/overview/?q=…` | Traffic estimate, top pages |
| 5 | **Backlink Analytics** | `/analytics/backlinks/overview/?q=…` | Link profile snapshot |
| 6 | **AI Brand Visibility** | `/ai-toolkit/projects/{id}/brand-visibility/` | Per-LLM presence (ChatGPT / Gemini / Perplexity / Copilot) |
| 7 | **AI Prompt Tracking** | `/ai-toolkit/projects/{id}/prompts/` | Per-prompt × per-LLM responses + citations |
| 8 | **Keyword Magic** *(conditional)* | `/analytics/keywordmagic/?q=…` | Related keywords for queued seed terms |

## Output

One row per (surface × run) in the `SeoSnapshot` Postgres table:

```ts
{
  id: string;
  capturedAt: Date;
  surface: 'position-tracking' | 'keyword-gap' | ...;
  domain: string;          // e.g. 'partyondelivery.com'
  payload: Json;           // per-surface schema — see SURFACE_REFERENCE.md
  failure: string | null;  // null on success
  durationMs: number;
  runRef: string;          // GH Actions run id or 'local-<timestamp>'
}
```

Read it from the admin dashboard, from a sub-agent's Monday briefing, or via raw SQL.

## Why this design

- **No SEMrush API.** Most agencies/SMBs only have the SEMrush UI subscription.
  Driving the UI with Playwright is the cheapest reliable path.
- **Unattended.** GitHub Actions cron runs nightly with no human in the loop.
  Sessions auth via a stored cookie that refreshes ~monthly.
- **Per-surface failure isolation.** One bad selector doesn't take down the rest
  of the run. Every surface gets its own try/catch in the orchestrator.
- **Database, not files.** Snapshots live in Postgres so the dashboard can read
  them from the same Vercel app that hosts the rest of the product. No
  blob-storage round-trip.
- **One-click manual re-runs.** `workflow_dispatch` API → button in the admin UI
  → fresh data whenever you need it.

## Read these in order

1. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — components + data flow
2. [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md) — step-by-step rebuild for a fresh project
3. [`SURFACE_REFERENCE.md`](./SURFACE_REFERENCE.md) — per-surface specs (selectors, payload schemas, gotchas)
4. [`DEPLOYMENT.md`](./DEPLOYMENT.md) — GitHub secrets, env vars, cookie refresh, monitoring
5. [`API_REFERENCE.md`](./API_REFERENCE.md) — Prisma model + REST endpoints
6. [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — when things break

## Where the source lives (this repo)

```
scripts/seo/
├── scrape-semrush.ts            # orchestrator (entry point)
├── lib/
│   ├── auth.ts                  # SEMrush session cookie restore
│   ├── notify.ts                # GHL/Slack webhooks
│   ├── persist.ts               # Prisma writes
│   ├── tenant.ts                # per-tenant config loader
│   └── types.ts                 # shared TS interfaces
└── surfaces/
    ├── index.ts                 # surface registry
    ├── _helpers.ts              # shared selector helpers
    ├── position-tracking.ts
    ├── keyword-gap.ts
    ├── site-audit.ts
    ├── organic-research.ts
    ├── backlink-analytics.ts
    ├── ai-brand-visibility.ts
    ├── ai-prompt-tracking.ts
    └── keyword-magic.ts

.github/workflows/
└── seo-scrape.yml               # daily cron + workflow_dispatch

src/app/api/admin/seo/
├── latest-snapshot/route.ts     # GET: latest run + per-surface status
└── trigger-scrape/route.ts      # POST: fires workflow_dispatch via GH API

src/components/admin/
└── RunScrapePanel.tsx           # Run Now button + status grid + runbook

prisma/schema.prisma              # SeoSnapshot model (see API_REFERENCE.md)
tenants/<your-domain>.json       # tenant config (created on first run)
```

## Stack assumptions

- **Next.js 15 App Router** (server components + route handlers)
- **Prisma 6** + Postgres (Neon recommended)
- **Playwright 1.56+** (already a transitive dep of `@playwright/test`)
- **TypeScript** strict mode
- **Vercel** (admin app) + **GitHub Actions** (cron job)
- **Tailwind 3** (admin UI styling)

If your stack differs (Vue, FastAPI, Postgres → MySQL, etc.) you can still
reuse the Playwright surface modules — they're framework-agnostic. The DB
schema + API routes + admin UI are the bits that'd need porting.

## One-time setup checklist

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full detail. Quick summary:

- [ ] Run `prisma db push` after copying the `SeoSnapshot` model
- [ ] Get a SEMrush session cookie from a logged-in Chrome → store as
      `SEMRUSH_COOKIE_JSON` repository secret
- [ ] Set `POSTGRES_URL` repository secret
- [ ] Set `GHL_DASHBOARD_WEBHOOK_URL` repository secret (optional — notifications)
- [ ] Create a fine-grained GitHub PAT with `Actions: Write` →
      store as `GH_DISPATCH_TOKEN` Vercel env var
- [ ] Commit `tenants/<your-domain>.json` with `{ "domain": "your-domain.com" }`
- [ ] Push the workflow file → it picks up the cron schedule automatically
- [ ] Smoke test: GitHub Actions UI → "Run workflow" button

## License + attribution

Built for Party On Delivery (partyondelivery.com). Adapt freely for your project —
no warranty, no support guarantee. SEMrush is a third-party service whose ToS
you should review before deploying any automated scraping.
