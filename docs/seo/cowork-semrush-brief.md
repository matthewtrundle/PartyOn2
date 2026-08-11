# Cowork drop-in brief — build the `seo-semrush-snapshot` skill

> **Paste this entire file into a fresh Cowork session in the partyondelivery Cowork project.** It is self-contained — the session has no memory of the conversation that produced it.

---

## Goal of this session

Build a Cowork skill that captures four SEMrush dashboards for `partyondelivery.com` once a week and writes screenshots + extracted KPI JSON to a stable output location. The SEO Director Claude agent (already deployed in the engineering repo) will consume the output.

**Producer/consumer split:** you only build the producer (Cowork captures SEMrush → writes JSON files). The consumer (a Vercel cron that reads the JSON files into a `SeoSnapshot` DB row) lives in the engineering repo and is a separate PR.

---

## Context (background; don't re-research this)

- Party On Delivery has a paid SEMrush UI subscription at `allan@partyondelivery.com` (no API budget; no Ahrefs).
- The main SEMrush project for `partyondelivery.com` is already configured. **IDs you'll need:**
  - Project ID: `26954798`
  - Folder ID: `8850397`
  - Position Tracking campaign ID: `26954798_3575431`
  - There's also a separate "POD AI" project (ID `27837533`) — **don't use it**, it tracks AI search visibility not classic SEO.
- Phase 0 reconnaissance (done 2026-05-06) confirmed:
  - 2FA doesn't block — Chrome sessions persist cleanly with cookies
  - Cloudflare doesn't gate any authenticated dashboard
  - All four dashboards have **stable `data-testid` attributes** and **stable direct-URL patterns** (no UI state navigation required)
  - The Site Audit campaign is owned by `brian@premierpartycruises.com` — you have **read access only**, you cannot rerun the audit programmatically
  - Plan tier looks like Guru (Site Audit caps at 1,000 pages crawled — fine for now; partyondelivery.com sitemap is ~1,289 URLs)

---

## Auth approach: persistent browser profile (NOT email/password)

Do **not** prompt for `SEMRUSH_EMAIL` / `SEMRUSH_PASSWORD`. The path of least resistance is a persistent Chromium profile:

1. **One-time setup step the operator runs:** open a non-headless browser, navigate to `https://www.semrush.com/login/`, operator logs in manually (handles 2FA themselves), the session cookies persist to a profile directory.
2. **Recurring weekly run:** launch headless against the same profile, navigate the four dashboards, capture screenshots + extract KPIs.
3. **Session expiry recovery:** if any dashboard nav redirects to `/login`, write `FAILED.md` for that dashboard, continue with the others, and the operator re-runs the init step.

This avoids credential handling and 2FA juggling. Phase 0 recon confirmed the existing Chrome session persisted cleanly across days of testing.

---

## Output contract

Each weekly run writes to `data/seo/semrush/<YYYY-MM-DD>/` inside the Cowork project. The whole `data/seo/` tree is gitignored if you're versioning this with git.

```
<date>/
├── manifest.json
├── position-tracking.png + position-tracking.json
├── organic-research.png + organic-research.json
├── backlink-analytics.png + backlink-analytics.json
├── site-audit.png + site-audit.json
└── FAILED.md          # only on top-level fatal
```

**`manifest.json`:**

```json
{
  "captured_at": "2026-05-11T07:00:00Z",
  "domain": "partyondelivery.com",
  "project_id": "26954798",
  "folder_id": "8850397",
  "results": [
    { "id": "position-tracking", "ok": true, "fields": 3 },
    { "id": "organic-research", "ok": true, "fields": 5 },
    { "id": "backlink-analytics", "ok": false, "error": "session expired" },
    { "id": "site-audit", "ok": true, "fields": 7 }
  ],
  "success": false
}
```

**Each `<dashboard>.json`:**

```json
{
  "captured_at": "ISO-8601 timestamp",
  "dashboard": "organic-research",
  "label": "Organic Research — Overview",
  "url": "https://www.semrush.com/analytics/organic/overview/?...",
  "domain": "partyondelivery.com",
  "project_id": "26954798",
  "extracted": { /* dashboard-specific KPIs, schemas below */ },
  "raw_body_text": "the full page innerText — saves debug time when extractors drift"
}
```

---

## The four dashboards

### 1. Position Tracking — Landscape view

**URL:** `https://www.semrush.com/tracking/landscape/{projectId}_{campaignId}.html?fid={folderId}`
→ `https://www.semrush.com/tracking/landscape/26954798_3575431.html?fid=8850397`

**Extract fields:**

```json
{
  "visibility_pct": 25.7,
  "visibility_delta": 0.23,
  "top_url": {
    "url": "https://partyondelivery.com/",
    "keywords": 38,
    "avg_position": 5.39,
    "avg_position_change": 1.11,
    "est_traffic": 2.23,
    "est_traffic_change": 0.79
  }
}
```

**Body-text pattern:** `You\n<pct>%\n+/-<delta>` for visibility. URL ranks table renders as `<url>\n<keywords>\n<avg_pos>\n↑/↓\n<change>\n<traffic>\n<traffic_change>`.

### 2. Organic Research — Overview

**URL:** `https://www.semrush.com/analytics/organic/overview/?db=us&q=partyondelivery.com&searchType=domain`

**Extract KPI tiles** (each is `{ value, delta, rawValue, rawDelta }`):

- `keywords`
- `traffic`
- `traffic_cost`
- `branded_traffic`
- `non_branded_traffic`

**Body-text pattern:** `<label>\n<value>\n<delta>`.

**Gotchas:**
- Positive deltas display **without** a `+` sign (e.g. `1.56%`, not `+1.56%`)
- Negative deltas use en-dash `–` or ASCII minus `-`
- Values may have K/M/$ suffixes (e.g. `1.5K`, `$469.0`)

### 3. Backlink Analytics — Overview

**URL:** `https://www.semrush.com/analytics/backlinks/overview/?q=partyondelivery.com&searchType=domain`

**Extract:**

- KPI tiles: `referring_domains`, `backlinks`, `monthly_visits`, `organic_traffic`, `outbound_domains` (same `{ value, delta }` shape as above)
- `category` — auto-detected (e.g. `"Food & Beverages"`)

**Gotcha:** "Backlinks" appears as **both** a section header **and** a KPI label. Your extractor must require the value line to look numeric, otherwise it captures the section header.

### 4. Site Audit — Overview

**URL:** `https://www.semrush.com/siteaudit/campaign/{projectId}/review/overview/`
→ `https://www.semrush.com/siteaudit/campaign/26954798/review/overview/`

**Extract:**

```json
{
  "site_health_pct": 80,
  "pages_crawled": 246,
  "pages_crawl_cap": 1000,
  "status_mix": { "healthy": 3, "broken": 4, "have_issues": 227, "redirects": 12, "blocked": 0 },
  "ai_search_health_pct": 91,
  "ai_search_health_delta": 1,
  "total_issues": 183
}
```

**Gotcha:** between the `Site Health` label and the percentage value, there's an accessibility hint line (`Press "Tab" to enable graphical charts accessibility module.`). Your regex needs to allow 0–2 intermediate lines.

---

## Politeness + failure handling

- Sleep **3 seconds** between dashboard navigations
- Per-dashboard timeouts: **60s** for navigation, **20s** for `networkidle` (bound it — SEMrush long-polls analytics calls that never go idle)
- Per-dashboard failures are **isolated**: capture what you can, mark this one failed in `manifest.json`, continue
- Top-level fatal: write `FAILED.md` with stack + screenshot, exit non-zero

---

## Sanity-check numbers (from Phase 0 recon, 2026-05-06)

Your first run should be in the same ballpark — week-to-week drift is expected but order-of-magnitude differences mean an extractor bug.

| Dashboard | Field | Recon value |
|---|---|---|
| Position Tracking | visibility_pct / delta | 25.7% / +0.23 |
| Position Tracking | top URL avg_position / change | 5.39 (+1.11) |
| Organic Research | traffic / delta | 638 / -13.78% |
| Organic Research | non_branded_traffic / delta | 525 / -21.41% |
| Organic Research | branded_traffic / delta | 113 / +56.94% |
| Backlink Analytics | referring_domains / delta | 135 / -6% |
| Backlink Analytics | backlinks / delta | 574 / -10% |
| Site Audit | site_health_pct | 80% |
| Site Audit | pages_crawled / cap | 246 / 1000 |
| Site Audit | total_issues | 183 |

---

## Deliverables

Create in the Cowork project:

1. **`.claude/skills/seo-semrush-snapshot/SKILL.md`** — playbook describing what the skill does, inputs, outputs, auth approach, failure modes. (Other Claude agents read this when they invoke the skill.)
2. **The actual scraper** — whatever pattern Cowork uses for browser automation. If Cowork has a native Chrome MCP or browser-skill template, use that. If not, raw Playwright in Node or Python is fine.
3. **A one-time init step** the operator runs to capture the SEMrush session into the persistent profile.
4. **A weekly schedule** — Monday morning UTC, runs the scraper and writes to `data/seo/semrush/<today>/`.
5. **A sync mechanism** to get the output JSONs to the engineering repo so the Vercel-side consumer cron can read them. Options to discuss with the operator:
   - Commit JSONs to a branch in the engineering repo via GitHub API (clean, versioned)
   - Push to a shared blob store (S3 / Vercel Blob)
   - Webhook POST to a Vercel endpoint
   - Whatever Cowork's standard sync pattern is

   For now, just **write to local Cowork filesystem** and surface the sync question back to the operator — that's a Phase 1 PR 3 decision.

---

## First-session steps for the Cowork Claude

1. **Inventory what browser-automation tooling this Cowork project has.** Chrome MCP? Playwright? A "browser skill" template? Report what you find.
2. Read the four dashboards' URL + KPI specs above.
3. **Build `SKILL.md` first** — defines WHAT the skill does. Get the operator's sign-off on the contract before writing scraping code.
4. Then build the runner — implements HOW. Mirror the structure: pure URL builders + pure KPI extractors (testable independent of the browser) + a thin Playwright driver.
5. **Operator must do the one-time SEMrush login** in the browser context before you can test end-to-end.
6. Test against the live SEMrush UI. Verify all four `<dashboard>.json` files extract sensibly.
7. Wire to Cowork's scheduling for a weekly Monday run.
8. **Report back to the operator with:** skill location, runner location, schedule confirmation, sample output JSONs (sanitized — no SEMrush session cookies in any log).

---

## Out of scope for this build

- Keyword Magic Tool — on-demand, deferred to a follow-up skill
- Backlink Audit (toxicity scoring) — needs a separate SEMrush campaign setup by the operator
- Multi-country databases — default `db=us` only for now
- Multi-domain — only `partyondelivery.com` (the "POD AI" project at `27837533` is explicitly out of scope)
- The consumer/reader side — that's an engineering-repo Vercel cron, separate PR
- Anything touching the SEO Director agent's prompt — the agent already exists and consumes the output; you only produce

---

## Open questions to flag (don't block on them; surface at end of session)

1. Should the operator switch the Site Audit campaign ownership from `brian@premierpartycruises.com` to `allan@` so the skill can rerun the audit programmatically?
2. The 246/1000 pages-crawled cap means the audit covers ~25% of the sitemap. Is upgrading the SEMrush plan worth it, or do we accept the sample?
3. What sync mechanism gets the JSONs from Cowork to the engineering repo? Engineering repo's Vercel cron needs read access.

---

## References (in the engineering repo, partyondelivery.com)

- `Memory/SEO/Recon-2026-05-06-semrush.md` (Obsidian vault) — full recon report with screenshots and selector strategy
- `.claude/agents/seo-director.md` (engineering repo) — the agent that consumes this skill's output
- `.claude/skills/seo-semrush-snapshot/SKILL.md` (engineering repo) — the Phase 0 stub of this same skill, with the contract sketch the operator approved

If the Cowork session has git access to `allan-cmyk/PartyOn2`, those files are worth reading. If not, this brief is self-contained.
