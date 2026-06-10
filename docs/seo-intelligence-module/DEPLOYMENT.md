# Deployment

## Required secrets + env vars

### GitHub repository secrets

Set at `Settings → Secrets and variables → Actions → New repository secret`.

| Name | Required | Source | Purpose |
|---|---|---|---|
| `SEMRUSH_COOKIE_JSON` | ✅ | DevTools export | Authenticate the Playwright scrape |
| `POSTGRES_URL` | ✅ | Your Neon/Postgres connection string | Persist scrape results |
| `GHL_DASHBOARD_WEBHOOK_URL` | optional | Existing ops webhook | Completion + failure notifications |

### Vercel env vars (for the admin app)

Set at `Vercel → your-project → Settings → Environment Variables`.

| Name | Required for | Value |
|---|---|---|
| `POSTGRES_URL` | Reading scrape data in admin | Same as GH secret |
| `GH_DISPATCH_TOKEN` | Run Now button | Fine-grained PAT (see below) |
| `GH_REPO_SLUG` | Run Now button | `<owner>/<repo>` of the scrape repo |

If `GH_DISPATCH_TOKEN` is unset, the Run Now button shows a clear
"token missing" error; daily cron is unaffected.

## Getting the SEMrush session cookie

### Easiest: Cookie-Editor extension

1. Install [Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)
2. Log into SEMrush in Chrome (POD account)
3. Click the extension icon while on any `semrush.com` page
4. Click **Export → "Export as JSON"** at the bottom
5. Paste the JSON array into the `SEMRUSH_COOKIE_JSON` repo secret

### Manual: DevTools

1. Open DevTools on `semrush.com` (logged in)
2. Application tab → Cookies → `.semrush.com`
3. For each row: copy `name`, `value`, `domain`, `path`, `expires`
4. Build the JSON array by hand:
   ```json
   [
     { "name": "smv_token", "value": "...", "domain": ".semrush.com",
       "path": "/", "expires": 1830000000, "httpOnly": true,
       "secure": true, "sameSite": "Lax" },
     ...
   ]
   ```
5. Paste as the secret

### Verifying it works

After setting the secret, dispatch the workflow from GitHub Actions UI.
If you see `[scrape] SEMrush session cookie expired` in the logs, the
cookie didn't take. Possible reasons:

- JSON is malformed (missing comma, etc.) — paste-validate at jsonlint.com first
- Cookie was for `semrush.com` not `.semrush.com` — make sure domains
  start with a dot
- Cookie expired between export and workflow run (rare unless you
  delayed >24h)

## Creating the GitHub PAT for Run Now

1. Go to https://github.com/settings/personal-access-tokens/new
2. Token name: `pod-seo-scrape-dispatch` (or similar)
3. Expiration: choose what your security policy allows (1 year max)
4. Repository access: "Only select repositories" → pick this repo
5. Repository permissions: `Actions` → `Read and write`
6. (Default permissions are fine for everything else)
7. Generate token → copy it (you can't see it again)
8. Add as Vercel env var `GH_DISPATCH_TOKEN` (Production + Preview)
9. Redeploy Vercel (or wait for next push)

## Cron schedule

In `seo-scrape.yml`:

```yaml
on:
  schedule:
    - cron: '0 12 * * *'   # 7am Central (UTC-5/-6)
```

Change to your business hours. Note: GitHub Actions cron runs in UTC.
Daylight savings will drift your local time ±1 hour twice a year —
acceptable for SEO daily report cadence.

If you need exact local-time accuracy, use a two-cron strategy:

```yaml
- cron: '0 12 * * *'   # Mar 12 – Nov 5 (DST in US Central)
- cron: '0 13 * * *'   # Nov 6 – Mar 11 (standard time in US Central)
```

Both will fire; the orchestrator has a `concurrency: group: seo-scrape`
that ensures only one runs at a time. The result: the right one fires
for the current TZ rules.

## Cookie refresh ritual (recurring, ~monthly)

SEMrush kills sessions every ~30 days, sometimes sooner if the cookie
sees suspicious activity. When the daily run fails with a cookie-expired
error:

1. You'll get a GitHub email "SEO · SEMrush daily scrape failed"
2. And/or a webhook event `seo.scrape.cookie_expired` in your GHL/Slack
3. Open SEMrush in Chrome (any tab that's logged in)
4. Cookie-Editor extension → Export as JSON
5. Update the `SEMRUSH_COOKIE_JSON` repo secret
6. Hit Run Now from the admin panel to confirm

Total time: ~60 seconds.

## Monitoring + alerting

### What sends notifications

| Trigger | Event | Channel |
|---|---|---|
| Workflow completes (success or partial failure) | `seo.scrape.completed` | GHL webhook |
| Cookie expired (no surfaces run) | `seo.scrape.cookie_expired` | GHL webhook + GH email |
| Workflow exits non-zero | (GitHub default) | GH email to repo owners |
| Workflow fails to start (YAML error) | (GitHub default) | GH email to repo owners |

### What the webhook payload looks like

```json
{
  "event": "seo.scrape.completed",
  "domain": "your-domain.com",
  "run_ref": "gh:1234567890@abc1234",
  "captured_at": "2026-05-28T12:05:32.123Z",
  "success_count": 6,
  "failure_count": 2,
  "failed_surfaces": ["ai-brand-visibility", "ai-prompt-tracking"],
  "subject": "⚠️ SEMrush scrape partial — 6 ok, 2 failed",
  "body": "Captured at: …\nDomain: …\nRun: …\n\nSurfaces:\n  ✓ ..."
}
```

Route the `subject` + `body` to your alerting channel of choice.

### What the admin panel shows

- **Latest run badge** — date + ok/fail count + GH run ref
- **Per-surface grid** — color-coded:
  - 🟢 OK — captured within the last 36 hours
  - 🟡 STALE — captured >36 hours ago (cron likely broken)
  - 🔴 FAILED — last attempt failed
  - ⚪ NO DATA — surface has never returned data

## Cost ceiling

GitHub Actions free tier: 2000 minutes/month for private repos.

This job uses ~6 minutes per run × 30 runs/month = **180 minutes/month**.
Comfortably under the free tier even with daily `workflow_dispatch`
testing on top.

Postgres storage: each `SeoSnapshot` row is ~2-20 KB depending on
surface. 8 surfaces × 30 days × 12 months = 2,880 rows/year × ~10 KB
average = **~30 MB/year**. Negligible on any Postgres plan.

Webhook calls: 2-3 per day. Negligible.

## Multi-domain support

If you need to scrape multiple domains from one repo:

1. Add `tenants/<domain-2>.json` for the second domain
2. Add a `--tenant <name>` CLI flag to `scrape-semrush.ts` (currently
   hardcoded to `party-on-delivery.json`)
3. Duplicate the workflow file as `seo-scrape-domain-2.yml` and pass
   the tenant via workflow env
4. Each tenant gets its own snapshot rows (filter by `domain` column)

Not currently implemented — flag if you need it.

## Disabling temporarily

To pause the daily cron without deleting the workflow:

1. Comment out the `schedule:` block in `seo-scrape.yml`
2. Push
3. `workflow_dispatch` still works for manual runs

To pause everything:

1. GitHub → Actions → "SEO · SEMrush daily scrape" → "..." menu →
   "Disable workflow"
2. Re-enable from the same menu when ready

## Decommissioning

If you ever want to remove the system entirely:

1. Disable the workflow first (above)
2. Drop the GH secrets
3. Remove the Vercel env vars
4. Delete the `SeoSnapshot` table:
   ```sql
   DROP TABLE seo_snapshots CASCADE;
   ```
5. Remove the source: `scripts/seo/`, `.github/workflows/seo-scrape.yml`,
   `src/app/api/admin/seo/`, `src/components/admin/RunScrapePanel.tsx`,
   `tenants/*.json`
6. `npx prisma db push` to sync the schema
