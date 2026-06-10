# Agent brief — copy this into your context

> Paste this entire file into your coding agent's system prompt or first
> user message. Then have it read the linked docs below on demand.

---

You are about to port a working SEMrush scraping system from another
Next.js + Prisma project (`partyondelivery.com`) into a target project
that needs the same capability. The source system is documented in this
directory.

## What you're rebuilding

A daily automated SEMrush scrape that:

1. Runs every morning via GitHub Actions cron (no human in the loop)
2. Captures 8 SEMrush dashboards via Playwright (no SEMrush API needed)
3. Persists results to Postgres (one row per surface × run)
4. Surfaces the results in an admin dashboard panel (Run Now button +
   status grid + cookie refresh runbook)
5. Notifies a webhook on completion + on cookie expiry

## Your starting point

The target project (the one you're going to modify) is likely:

- Next.js 15+ with App Router
- Prisma 6 + Postgres
- Vercel hosting
- Tailwind 3
- TypeScript strict mode

If those don't match, read [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md)
for portability notes.

## Read these in order

1. [`README.md`](./README.md) — high-level overview
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — components + data flow
3. [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md) — your step-by-step playbook
4. [`SURFACE_REFERENCE.md`](./SURFACE_REFERENCE.md) — per-surface selectors + payloads
5. [`API_REFERENCE.md`](./API_REFERENCE.md) — Prisma model + REST endpoints
6. [`DEPLOYMENT.md`](./DEPLOYMENT.md) — secrets, env vars, cookie refresh
7. [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — when things break

## Source files to copy verbatim (or adapt)

All paths below are relative to the source repo root. Copy these into
the equivalent paths in the target repo:

```
scripts/seo/                       # entire dir, copy verbatim
.github/workflows/seo-scrape.yml   # check the cron + repo permissions
src/app/api/admin/seo/             # entire dir
  ├── latest-snapshot/route.ts
  └── trigger-scrape/route.ts
src/components/admin/RunScrapePanel.tsx
```

And add this to `prisma/schema.prisma` (see API_REFERENCE.md for the
exact model definition).

## What you should ask the human before starting

- "What's the target domain you want to scrape?" → goes into
  `tenants/<your-domain>.json`
- "Do you already have a SEMrush project tracking this domain?" → if yes,
  ask for the project id (URL: `/projects/{id}/`) to skip the discovery
  step
- "Who are the 3 main competitors?" → goes into the tenant config
- "What time of day should the cron fire?" → defaults to 7am Central
- "Do you have an existing webhook for ops alerts?" → if yes, ask for
  the URL → goes into `GHL_DASHBOARD_WEBHOOK_URL`
- "Does this SEMrush account have the AI Toolkit add-on?" → if no, the
  AI surfaces will fail with a known graceful error — set expectations

## What you should NOT change without asking

- The `SeoSnapshot` model field names — downstream queries depend on them
- The `SurfaceKey` union — adding a new key requires updating the
  dashboard + surfaces registry; removing one will break old data
- The webhook event names (`seo.scrape.completed`,
  `seo.scrape.cookie_expired`) — external automations may already
  subscribe

## Smoke-test sequence after porting

1. `npx prisma db push` succeeds
2. Local dry-run: `SEMRUSH_COOKIE_FILE=./cookie.json npx tsx scripts/seo/scrape-semrush.ts`
   completes with at least 4 surfaces returning data
3. Push to GitHub
4. Set all secrets per DEPLOYMENT.md
5. Manually dispatch the workflow → completes successfully
6. Admin panel loads + shows the run + per-surface grid populates
7. Click Run Now from the admin panel → new run appears within ~5 min

## Bound your work

This should take roughly:

- **0.5-1 day** for a fresh Next.js + Prisma + Vercel project (good
  starting state)
- **1-2 days** if the target project needs schema reconciliation, new
  env wiring, or a different admin layout
- **2-4 days** if you're porting to a non-Next stack (Vue, FastAPI, etc.)

If you find yourself spending more than a day on selector debugging,
stop and ask the human to verify their SEMrush account is in the same
state as the source (English UI, same plan tier, same project layout).

## Done criteria

- [ ] `npx tsc --noEmit` passes on the modified target project
- [ ] `npx next lint` shows no new errors in the SEO module files
- [ ] First successful workflow run produces 6+ surfaces with data
      (assuming an AI Toolkit subscription; 4+ if not)
- [ ] Admin panel renders Run Now + status grid + cookie runbook
- [ ] At least one manual Run Now dispatch completes end-to-end
- [ ] Webhook fires with completion event payload matching API_REFERENCE.md

If all 6 boxes are checked, the port is done. Hand back to the human.
