# Troubleshooting

## Runtime failures, ranked by frequency

### 1. "SEMrush session cookie has expired"

**Symptom:** workflow exits 2, no surfaces scraped, `seo.scrape.cookie_expired`
webhook fires.

**Cause:** SEMrush kills sessions every ~30 days (sometimes faster if
they detect unusual access patterns). The stored cookie is no longer
valid.

**Fix:** Refresh the cookie per the runbook in
[DEPLOYMENT.md → Cookie refresh ritual](./DEPLOYMENT.md#cookie-refresh-ritual-recurring-monthly).

**Prevention:** None practical. SEMrush doesn't expose long-lived API
tokens at the UI subscription tier.

---

### 2. "Selector not found" on a single surface

**Symptom:** one or more surfaces return failures like
`Position Tracking table not found — selector likely changed` in
`SeoSnapshot.failure`. Other surfaces still succeed.

**Cause:** SEMrush updated their UI. The fallback selector chain in
the affected surface module didn't cover the new layout.

**Fix:**

1. Open `scripts/seo/surfaces/<failed-surface>.ts`
2. Look at the `firstVisible([…])` selector list at the top of `scrape()`
3. Visit the SEMrush URL in Chrome → open DevTools
4. Right-click the visible data table → "Inspect"
5. Find a stable selector (prefer `data-test=…`, `data-track=…`,
   or aria-labels over `.class-name-with-hash-abc123`)
6. Add it to the top of the fallback chain
7. Commit + push + dispatch a manual run to verify

**Prevention:** monthly review of all 8 surfaces during the cookie
refresh ritual catches drift early.

---

### 3. "AI Toolkit not in current plan"

**Symptom:** `ai-brand-visibility` and `ai-prompt-tracking` surfaces
always fail with this exact error.

**Cause:** Your SEMrush subscription doesn't include the AI Toolkit
add-on (currently a separate $99/mo line item on top of base plans).

**Fix:** Either:
- Upgrade your SEMrush plan to include AI Toolkit
- Accept the failure — the orchestrator handles this gracefully, the
  rest of the run continues, and the dashboard shows the surfaces as
  "FAILED" with the gate reason

**Prevention:** N/A — this is a billing/access question, not a code
problem.

---

### 4. "GitHub returned gh_404" on Run Now

**Symptom:** clicking Run Now in the admin panel shows
`GitHub returned gh_404`.

**Cause:** the workflow file doesn't exist at the expected path on the
ref the API request specified.

**Fix:**

1. Verify `.github/workflows/seo-scrape.yml` exists on the `main` branch
   (or whichever ref the trigger-scrape route uses — defaults to `main`)
2. Verify `GH_REPO_SLUG` Vercel env var matches the actual repo owner/name
3. Verify the PAT has read access to the repo (404 can be a permissions
   issue masquerading as not-found)

---

### 5. "GitHub returned gh_403" on Run Now

**Symptom:** Run Now shows `GitHub returned gh_403`.

**Cause:** the fine-grained PAT doesn't have `Actions: Write`
permission on the target repo.

**Fix:**

1. Go to https://github.com/settings/personal-access-tokens
2. Find your `GH_DISPATCH_TOKEN`
3. Edit → Repository permissions → Actions → set to "Read and write"
4. Save → no need to re-deploy Vercel (Vercel re-reads the same token)

---

### 6. Workflow times out at 30 minutes

**Symptom:** workflow shows red ❌ in GitHub Actions, runtime ~30 min.

**Cause:** usually `ai-prompt-tracking` with too many tracked prompts.
50 prompts × 4 LLMs × 1.5 sec/cell + retries = bumps the 30-min ceiling.

**Fix:**

- Lower `MAX_PROMPTS` in `scripts/seo/surfaces/ai-prompt-tracking.ts`
- OR bump the workflow timeout in `seo-scrape.yml` (currently
  `timeout-minutes: 30`)
- OR raise SEMrush throttling concerns to SEMrush support — if pages are
  serving slowly under headless, they may have rate-limited the IP

---

### 7. Postgres write fails

**Symptom:** logs show `[scrape] saveSnapshot failed: ...` but scrape
otherwise completes; no rows appear in `SeoSnapshot`.

**Causes + fixes:**

- **`POSTGRES_URL` not set** in workflow env → add both `POSTGRES_URL`
  AND `DATABASE_URL` (Prisma reads `DATABASE_URL` by default)
- **Connection limit exhausted** on Neon → add `?pgbouncer=true&connection_limit=1`
  to the URL, or use Neon's pooled connection string
- **Schema drift** between repo and DB → run `npx prisma db push` locally
  to align, commit the result

---

### 8. Per-surface payload is empty array

**Symptom:** surface succeeds (`failure: null`) but the payload's
data array is `[]`.

**Causes:**

- **Empty SEMrush project** (e.g. zero tracked keywords for Position
  Tracking) — verify in the SEMrush UI, this is not a code bug
- **Selectors found the table but rows didn't render** in time — the
  scraper waited 700ms after scroll, but SEMrush sometimes lazy-loads
  rows over 2-3 sec. Bump the `page.waitForTimeout(700)` to `1500`
  in the affected surface
- **Wrong tab is active** for tab-driven surfaces (Keyword Gap) — the
  click selector matched but the URL is wrong. Verify by manually
  visiting the URL the surface uses

---

### 9. Cookie keeps expiring within hours of refresh

**Symptom:** you refresh the cookie, run completes once, next run
fails auth.

**Causes:**

- **Multiple SEMrush sessions logged in.** SEMrush sometimes invalidates
  older sessions when a new login happens. Make sure no one else is
  logging into the same account during the scrape window.
- **Cookie was exported from the wrong domain.** Verify domains in the
  exported JSON start with `.semrush.com` (with the leading dot).
- **2FA is on.** Cookie-based auth still works, but if SEMrush detects
  an "unusual" location (the GitHub runner's IP), it can force a
  reauth. Add the GitHub Actions IP ranges to SEMrush's allowlist if
  the account supports it.

---

### 10. Run Now polls "RUNNING…" but never updates

**Symptom:** RUN NOW button stays as ⏳ for 5 min, then the spinner
disappears with no fresh data.

**Cause:** the workflow dispatched successfully but didn't actually
complete in 5 min. The poll interval is 20 sec × 15 attempts = 5 min.

**Fix:**

- Check the GitHub Actions UI for the actual run status
- If still running at 5 min, the admin panel just stopped polling.
  Refresh the page to load the latest data when the run actually
  completes.
- If the run failed, check the GitHub Actions logs for the cause.

---

## Debugging workflow

When a scrape produces unexpected data, debug in this order:

1. **Look at the latest `SeoSnapshot` row for the affected surface.**
   `failure` column tells you whether it succeeded or not.
   `durationMs` tells you whether it was fast/slow.

2. **Reproduce locally** with the same cookie:

   ```bash
   # one-off, NOT in CI
   export SEMRUSH_COOKIE_FILE=./cookie.json
   export POSTGRES_URL='postgresql://...'
   npx tsx scripts/seo/scrape-semrush.ts
   ```

3. **Run a single surface with the dispatch override:**

   In GitHub Actions UI → "Run workflow" → fill in `surfaces` with
   the single surface key (e.g. `position-tracking`). *Note: this
   input is wired into the workflow but the orchestrator currently
   ignores it and runs all surfaces. Implement filtering by
   `process.env.SCRAPE_SURFACES.split(',')` if you need this.*

4. **Capture a Playwright trace** for the broken surface:

   Wrap the surface call in `context.tracing.start({ screenshots: true, snapshots: true })` →
   on failure, save the trace zip to `data/seo/semrush/_traces/`.
   The workflow uploads `_traces/` as an artifact on failure → download
   from the run page → open with `npx playwright show-trace`.

5. **Open the failing URL in real Chrome** with the same cookie set:

   ```js
   // DevTools console, on semrush.com:
   document.cookie = 'cookie_name=value; domain=.semrush.com; path=/'
   ```

   See what's actually on the page. Compare to what the surface module
   expects.

## When to update selectors

Update preemptively if:

- SEMrush announces a UI redesign on their changelog
- A surface starts producing partial data (some columns null when they
  used to have values)
- Multiple consecutive runs of the same surface fail with the same
  selector-not-found error

Update reactively if:

- The webhook fires with a specific surface listed in `failed_surfaces`
  three days in a row
- The admin panel shows a surface as STALE (>36h) when other surfaces
  are OK

## When to escalate

If you're spending more than 1 hour/week maintaining this system,
something is wrong. Likely causes:

- SEMrush is iterating their UI aggressively (rare but happens during
  product launches)
- Your account has unusual settings (different language, different
  region) that's causing selectors to miss
- Your SEMrush project setup is in a degraded state (e.g. project was
  deleted, recreated with new id, and `tenants/<domain>.json` still
  has the old id)

If those are ruled out and maintenance is still high, evaluate moving
to the SEMrush API tier (~$200/mo) — it'd be cheaper than the
engineer time.
