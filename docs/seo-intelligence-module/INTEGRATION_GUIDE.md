# Integration guide — port this into a different project

> **Audience:** a coding agent (or engineer) given access to a different
> Next.js + Prisma + Vercel project that needs this same SEMrush scraping
> system. Walk through these steps; the end state is a working daily
> scrape and admin dashboard panel.
>
> **What this won't cover:** porting to Vue / FastAPI / non-Postgres
> backends. The Playwright + selector logic is portable; the DB layer
> and admin UI assume the stack listed in [README.md](./README.md).

## Step 1 — Add the Prisma model

Append to your `prisma/schema.prisma`:

```prisma
model SeoSnapshot {
  id          String   @id @default(uuid())
  capturedAt  DateTime @default(now()) @map("captured_at")
  surface     String
  domain      String
  payload     Json?
  failure     String?  @db.Text
  durationMs  Int?     @map("duration_ms")
  runRef      String?  @map("run_ref")

  @@index([surface, capturedAt])
  @@index([capturedAt])
  @@map("seo_snapshots")
}
```

Then:

```bash
npx prisma db push
npx prisma generate
```

If `db push` complains about data loss in unrelated tables, that's a
pre-existing schema drift in your repo — resolve those before
continuing.

## Step 2 — Install Playwright

```bash
npm install --save-dev @playwright/test
# (this transitively pulls in 'playwright' which is what the scripts import)
```

If your project already has `@playwright/test` for unit tests, skip this.

Also add `tsx` if it's not already there:

```bash
npm install --save-dev tsx
```

## Step 3 — Copy the scrape pipeline

Copy these files verbatim from the source repo:

```
scripts/seo/
├── scrape-semrush.ts
├── lib/
│   ├── auth.ts
│   ├── notify.ts
│   ├── persist.ts
│   ├── tenant.ts
│   └── types.ts
└── surfaces/
    ├── index.ts
    ├── _helpers.ts
    ├── position-tracking.ts
    ├── keyword-gap.ts
    ├── site-audit.ts
    ├── organic-research.ts
    ├── backlink-analytics.ts
    ├── ai-brand-visibility.ts
    ├── ai-prompt-tracking.ts
    └── keyword-magic.ts
```

The only file that needs project-specific adjustment is `lib/persist.ts`:
update the `@prisma/client` import path if your project structures it
differently.

## Step 4 — Create the tenant config

```bash
mkdir -p tenants
cat > tenants/your-domain.json <<EOF
{
  "domain": "your-domain.com",
  "competitors": ["competitor1.com", "competitor2.com", "competitor3.com"]
}
EOF
```

Commit this. `semrushProjectId` is auto-discovered on first run.

If you have a SEMrush project tracking your domain, you can speed up
the first run by manually finding the project id and adding it:

```json
{ "domain": "your-domain.com", "semrushProjectId": "12345678", ... }
```

Find the id by navigating to the project in SEMrush — the URL contains
`/projects/{id}/`.

## Step 5 — Get the SEMrush session cookie

In Chrome, logged into the SEMrush account you want the scraper to use:

1. DevTools → Application → Cookies → `.semrush.com`
2. Select all rows → right-click → Copy all
3. (Easier path) Install the "Cookie-Editor" Chrome extension →
   Export → "Export as JSON"

You should end up with an array like:

```json
[
  {
    "name": "smv_token",
    "value": "eyJ…",
    "domain": ".semrush.com",
    "path": "/",
    "expires": 1830000000,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  },
  // … typically 10-15 more cookies
]
```

Store this entire JSON array as a GitHub repository secret named
`SEMRUSH_COOKIE_JSON`.

## Step 6 — Set the other secrets

In your GitHub repo Settings → Secrets and variables → Actions, add:

- `SEMRUSH_COOKIE_JSON` (from step 5)
- `POSTGRES_URL` (same value as your Vercel `POSTGRES_URL` env var)
- `GHL_DASHBOARD_WEBHOOK_URL` (optional — your ops notification endpoint)

## Step 7 — Add the GitHub Actions workflow

Copy `.github/workflows/seo-scrape.yml` from the source repo. The file
is mostly portable but check the `cron` schedule matches your business
hours.

The workflow assumes `npm ci` works in your repo. If you use pnpm or
yarn, swap that step accordingly.

## Step 8 — Add the admin API routes

Copy these two routes:

```
src/app/api/admin/seo/latest-snapshot/route.ts
src/app/api/admin/seo/trigger-scrape/route.ts
```

The `latest-snapshot` route assumes you import `prisma` from `@/lib/database/client`.
If your Prisma client lives elsewhere, update the import.

The `trigger-scrape` route uses two env vars:

- `GH_DISPATCH_TOKEN` — fine-grained PAT, `Actions: Write` on the repo
- `GH_REPO_SLUG` — defaults to `allan-cmyk/PartyOn2`; **change this** to
  your repo, e.g. `your-org/your-repo`

Set both as Vercel env vars (Production + Preview).

## Step 9 — Wire the admin panel

Copy `src/components/admin/RunScrapePanel.tsx` and import it into your
admin dashboard wherever you want the SEO control panel to appear:

```tsx
import RunScrapePanel from '@/components/admin/RunScrapePanel';

export default function YourAdminSeoView() {
  return (
    <div>
      <RunScrapePanel />
      {/* ...your other admin content */}
    </div>
  );
}
```

The panel is self-contained — no provider or context needed.

## Step 10 — Smoke test

1. Commit + push everything to `main`
2. Go to GitHub Actions → "SEO · SEMrush daily scrape" → "Run workflow"
3. Watch the run logs for ~5-8 min
4. Open your admin panel — the "LATEST RUN" badge should populate
5. Per-surface grid should show OK for at least Position Tracking,
   Organic Research, Site Audit, Backlink Analytics
6. AI Toolkit surfaces show "AI Toolkit not in current plan" if you
   don't have the add-on (expected, not a real failure)

## Step 11 — Iterate

After the first run, look at the `SeoSnapshot` rows for each surface.
If a payload is empty/null when it shouldn't be:

1. Open the surface module in `scripts/seo/surfaces/<name>.ts`
2. Look at the `firstVisible([…])` selector fallback list
3. Open SEMrush in DevTools, find the actual selectors that work
4. Add them to the top of the fallback list (most-specific-first)
5. Commit + push + manually run again

## Common porting friction (and fixes)

### "Cannot find module 'playwright'"

You installed `@playwright/test` but didn't run `npx playwright install`.
Run:

```bash
npx playwright install chromium
```

### "PrismaClientInitializationError" in the orchestrator

The `POSTGRES_URL` env var isn't visible to the Node process running
the script. In GitHub Actions, double-check the workflow file has:

```yaml
env:
  POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
  DATABASE_URL: ${{ secrets.POSTGRES_URL }}
```

Prisma reads `DATABASE_URL` by default. Some setups use `POSTGRES_URL` —
having both means either works.

### `runNow` button returns `token_missing`

`GH_DISPATCH_TOKEN` isn't set on Vercel. Create the PAT, add as Vercel env
var (Production + Preview), redeploy. See [DEPLOYMENT.md](./DEPLOYMENT.md)
for PAT creation steps.

### Workflow fires but immediately fails on `npm ci`

Your `package-lock.json` is out of sync with `package.json`. Run
`npm install` locally and commit the updated lockfile.

### Scrape runs but every surface returns "selector not found"

The cookie is restoring but SEMrush is serving a different UI than the
selectors expect. Most common causes:

- **A/B test** — SEMrush sometimes ships UI experiments. The fallback
  chain handles this, but if every fallback misses, you're seeing a
  new layout. Time to update selectors.
- **Region/language differs** — selectors expect English UI. If your
  SEMrush account is set to another language, set
  `--lang=en-US` on the Chromium launch args.

## Maintenance budget

Realistic ongoing toil after the initial port:

- **~1 hour/quarter** — SEMrush ships a UI redesign on one surface,
  update selectors
- **~1 minute/month** — SEMrush session cookie expires, refresh the GH
  secret per the runbook in `RunScrapePanel`
- **~5 minutes/month** — review the SEO Director's Monday briefing and
  spot-check the data looks right

If you're spending more than that on maintenance, the system is mis-tuned —
flag it.
