# Architecture

## System diagram

```
                ┌──────────────────────────┐
                │  GitHub Actions (cron)   │
                │  7am CT daily            │
                │  workflow_dispatch       │
                └────────────┬─────────────┘
                             │
                             │ npx tsx scripts/seo/scrape-semrush.ts
                             ▼
        ┌───────────────────────────────────────────┐
        │  Playwright (headless Chromium)           │
        │                                           │
        │  1. Restore SEMRUSH_COOKIE_JSON           │
        │  2. Verify /dashboard/ (not /login)       │
        │  3. Discover semrushProjectId             │
        │  4. Loop SURFACES[]                       │
        │     ├─ position-tracking                  │
        │     ├─ site-audit                         │
        │     ├─ organic-research                   │
        │     ├─ backlink-analytics                 │
        │     ├─ keyword-gap                        │
        │     ├─ ai-brand-visibility                │
        │     ├─ ai-prompt-tracking                 │
        │     └─ keyword-magic                      │
        └────────┬────────────────────────┬─────────┘
                 │ each surface           │ each surface
                 ▼                        ▼
        ┌──────────────────┐    ┌──────────────────────┐
        │ Postgres         │    │ GHL Dashboard        │
        │ SeoSnapshot      │    │ Webhook (notify)     │
        │ (one row/surf)   │    │                      │
        └────────┬─────────┘    └──────────────────────┘
                 │
                 │ GET /api/admin/seo/latest-snapshot
                 ▼
        ┌──────────────────────────────────────────────┐
        │  Vercel — Next.js admin app                  │
        │                                              │
        │  /admin/brians-stuff?tab=seo                 │
        │  ├─ RunScrapePanel                           │
        │  │   ├─ "RUN NOW" button                     │
        │  │   │   └─ POST /api/admin/seo/trigger-     │
        │  │   │       scrape → GH workflow_dispatch   │
        │  │   ├─ Latest-run badge                     │
        │  │   ├─ Per-surface status grid              │
        │  │   └─ Cookie refresh runbook (accordion)   │
        │  └─ Surface drill-downs (future)             │
        └──────────────────────────────────────────────┘
```

## Component-by-component breakdown

### 1. `scripts/seo/scrape-semrush.ts` — orchestrator

Single Node entry point. Responsibilities:

1. Load tenant config from `tenants/<domain>.json`
2. Launch headless Chromium via Playwright
3. Restore SEMrush session cookies from `SEMRUSH_COOKIE_JSON` env
4. Verify session by navigating to `/dashboard/` and confirming no redirect to `/login`
5. Discover the SEMrush project id (if not cached in tenant file) and persist it back
6. Iterate `SURFACES[]` array — for each:
   - Navigate to the surface URL
   - Call the surface's `scrape(page, ctx)` function
   - Wrap result in a `ScrapeEnvelope` (success/failure + timing)
   - Persist envelope to Postgres via `saveSnapshot()`
   - Sleep ~3.5s before the next surface (rate-limit politeness)
7. Fire completion webhook with success/failure summary
8. Exit code:
   - `0` if at least one surface succeeded
   - `1` if all surfaces failed
   - `2` if cookie expired (no surfaces attempted)

Cookie-expired exit code is special: GitHub Actions auto-emails the repo
owner on any non-zero exit, and the orchestrator additionally fires a
distinct `seo.scrape.cookie_expired` webhook event so external automations
can route it to a different channel.

### 2. `scripts/seo/lib/auth.ts` — session restore

Two-step auth verification:

```ts
async function restoreSession(context: BrowserContext): Promise<void>
async function verifySession(page: Page): Promise<void>
```

`restoreSession` injects the cookies from `SEMRUSH_COOKIE_JSON` (Playwright
shape — see DEPLOYMENT.md for export instructions).

`verifySession` navigates to `https://www.semrush.com/dashboard/` and checks
the resulting URL. If it matches `/login|/signin|/oauth`, throws
`SemrushSessionExpiredError`. The orchestrator catches this specific error
class to distinguish cookie expiry from selector failure.

### 3. `scripts/seo/lib/persist.ts` — Postgres writes

Lazy-initialized `PrismaClient` singleton. One write per surface:

```ts
await prisma.seoSnapshot.create({
  data: {
    capturedAt, surface, domain,
    payload: env.success ? env.payload : Prisma.JsonNull,
    failure: env.success ? null : env.failure,
    durationMs, runRef,
  },
});
```

Also exposes `latestPerSurface()` for the dashboard's status grid — uses
a `DISTINCT ON (surface) … ORDER BY surface, captured_at DESC` query.

### 4. `scripts/seo/lib/notify.ts` — webhooks

Two events:

- `seo.scrape.completed` (always fires) — success/failure counts + per-surface
  durations + GitHub run ref
- `seo.scrape.cookie_expired` (only on auth failure) — distinct event so
  ops automations can route to a different channel / urgency

Webhook target: `GHL_DASHBOARD_WEBHOOK_URL` (same one used elsewhere in
the app). Failure to deliver the webhook is non-fatal — orchestrator
continues.

### 5. `scripts/seo/lib/tenant.ts` — tenant config

Reads `tenants/<your-domain>.json`:

```json
{
  "domain": "partyondelivery.com",
  "semrushProjectId": "12345678",
  "competitors": ["drizly.com", "gopuff.com", "saucey.com"],
  "lastScrape": "2026-05-28"
}
```

On first run, `semrushProjectId` may be missing — the orchestrator
discovers it by navigating to `/projects/` and looking for a link card
matching the configured domain. Discovered id is written back to the
JSON file so subsequent runs skip the discovery step.

`tenants/` directory is committed to git so the value survives across CI
runs. (The orchestrator does NOT commit changes back during a workflow
run — discovery happens once on a local dev run, gets committed by a
human, then CI uses it.)

### 6. `scripts/seo/surfaces/*` — per-surface modules

Each surface exports a `Surface<T>` object:

```ts
interface Surface<T = unknown> {
  key: SurfaceKey;                              // 'position-tracking', etc.
  needsProjectId: boolean;                      // gates the surface
  url: (ctx: ScrapeContext) => string;          // navigation target
  scrape: (page: Page, ctx: ScrapeContext) => Promise<T>; // returns payload, throws on failure
}
```

All registered in `surfaces/index.ts` → `SURFACES` array. Order in the
array dictates run order; the orchestrator iterates linearly.

### 7. `.github/workflows/seo-scrape.yml` — CI job

```yaml
on:
  schedule: [{ cron: '0 12 * * *' }]   # 7am Central (UTC-5/-6)
  workflow_dispatch:
    inputs:
      surfaces:
        description: 'Comma-separated surfaces (blank = all)'
        required: false
```

Steps: checkout → setup-node@20 → `npm ci` → `npx playwright install chromium` →
`npx tsx scripts/seo/scrape-semrush.ts`. 30-minute timeout. Concurrency
group `seo-scrape` prevents double-runs.

### 8. `src/app/api/admin/seo/trigger-scrape/route.ts` — Run Now

`POST` handler that calls the GitHub REST API:

```http
POST https://api.github.com/repos/{owner}/{repo}/actions/workflows/seo-scrape.yml/dispatches
Authorization: Bearer ${GH_DISPATCH_TOKEN}
{ "ref": "main", "inputs": { "surfaces": "" } }
```

`GH_DISPATCH_TOKEN` is a fine-grained PAT with Actions:Write on the repo.

### 9. `src/app/api/admin/seo/latest-snapshot/route.ts` — dashboard data source

`GET` handler that returns:

```ts
{
  ok: true,
  latestRun: { runRef, capturedAt, total, successes, failures } | null,
  surfaces: [{ surface, capturedAt, success, failure, durationMs }]
}
```

Two queries:
1. `findFirst` ordered by `capturedAt desc` → most recent run's `runRef`
2. `findMany where: { runRef }` → counts for that run
3. Raw `DISTINCT ON (surface) … ORDER BY surface, captured_at DESC` → status grid

### 10. `src/components/admin/RunScrapePanel.tsx` — admin UI

Client component. Sections:
- **Latest run badge** — date pill, ok/fail counts
- **RUN NOW button** — calls `/api/admin/seo/trigger-scrape`, then polls
  `/api/admin/seo/latest-snapshot` every 20s for 5 min
- **Per-surface status grid** — color-coded (green OK, yellow STALE > 36h,
  red FAILED, gray NO DATA)
- **Cookie refresh runbook** — `<details>` accordion with 6-step
  procedure for renewing `SEMRUSH_COOKIE_JSON`
- **Interactive fallback** — `<details>` accordion with the Claude in
  Chrome extension slash command for selector-debugging runs

## Data flow narrative

**Nightly:**
1. GH Actions fires at 12:00 UTC
2. Orchestrator boots, restores cookies, hits SEMrush
3. 8 surfaces scraped sequentially with 3.5s spacing
4. Each surface writes one row to `SeoSnapshot`
5. Completion webhook posts summary to GHL
6. Next morning Brian opens the admin tab → sees fresh data

**Manual:**
1. Brian clicks RUN NOW
2. Vercel admin app calls GH dispatch endpoint
3. Action queues within ~10s, runs ~5-8 min
4. Admin panel polls `/api/admin/seo/latest-snapshot` every 20s
5. As surfaces complete, grid lights up live

**Cookie expired:**
1. Orchestrator's `verifySession` throws `SemrushSessionExpiredError`
2. `notifyCookieExpired` fires
3. Exit code 2 → GitHub emails repo owners
4. Brian opens admin tab → cookie runbook expanded → 60-second fix
5. Hits RUN NOW to confirm

## Design choices (and why)

- **One Postgres row per surface (not per run).** Lets the dashboard
  query "what's the freshest data I have for surface X" without joining
  through a parent run table. Trade-off: no clean way to ask "what
  did run #12345 produce" — but we rarely care.
- **JSON payload column over per-surface tables.** Schemas evolve as
  SEMrush iterates. JSON column means a payload schema change doesn't
  require a migration. Trade-off: less queryable. Mitigated by
  per-surface TypeScript types in `lib/types.ts`.
- **Selector fallback chains over single source-of-truth.** Each
  selector helper tries 3-5 candidates (`data-test=…`, `.class`,
  `table tr`) so SEMrush UI iterations only break the most specific
  selector, not the whole surface.
- **Tenant config in committed JSON, not env vars.** Lets you scrape
  multiple domains from one repo by symlinking tenants. Env vars would
  force one repo per domain.
- **`workflow_dispatch` over a self-hosted runner.** GitHub Actions
  free tier easily covers a 5-min daily job. Self-hosted only worth
  it if you hit the 2000 min/mo limit.
