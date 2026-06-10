---
name: seo-semrush-snapshot
description: Cowork browser-automation skill (now driven by the Claude in Chrome extension on a logged-in SEMrush session) that captures the 8 dashboards relevant to partyondelivery.com — Position Tracking, Keyword Gap Analysis, Site Audit, Organic Research, Backlink Analytics, AI Toolkit Brand Visibility (ChatGPT/Gemini/Perplexity/Copilot), AI Prompt Tracking, and Keyword Magic — writing screenshots + scraped JSON to data/seo/semrush/<YYYY-MM-DD>/ for the SEO Director agent to consume.
---

## V2 mode — Claude in Chrome extension (preferred)

The original Phase 1 contract below assumed Playwright. As of 2026-05 we run the same captures through the **Claude in Chrome extension** instead — the user is signed into SEMrush in their normal browser, so:

- No env vars for SEMRUSH_EMAIL/PASSWORD/COOKIE
- No 2FA detection branch (operator handles it interactively before kickoff)
- Per-surface scrape blueprint lives in the admin UI at `/admin/brians-stuff?tab=seo` ("Chrome-extension scrape blueprint" section)

### Parser pipeline (added 2026-05)

The Chrome capture step is now strictly "drive the browser + dump raw text". Structured JSON is produced by a **separate deterministic parser**, not by the model. This eliminates the LLM-transcription brittleness that the content-integrity hook used to reject:

- Capture: `/scrape-semrush-pod` writes one stub JSON per surface containing `raw_body_text` (the `document.body.innerText` from the dashboard).
- Parse: `node scripts/seo/parse-semrush-snapshot.mjs data/seo/semrush/<date>/` runs deterministic regex extractors and fills in the `extracted` field on each stub. Parser source: `scripts/seo/parse-semrush-snapshot.mjs`.
- Test: `node scripts/seo/parse-semrush-snapshot.mjs --test` diffs the parser output against the committed May 13 fixture in the sibling `PartyOn2-seo-snapshots` repo. Must pass before any parser changes ship.

The parser owns the per-dashboard schema — do NOT duplicate schema definitions in this skill or the slash command. If you need to add a new captured field, add it to the parser's sub-parser for that dashboard, add a fixture for it, and update the test.

### Eight surfaces (was five)

| # | Surface | Tier | Notes |
|---|---|---|---|
| 1 | Position Tracking | ready | Per-keyword rank + WoW delta. |
| 2 | **Keyword Gap Analysis** | ready | NEW — vs. 3 named competitors; agent picks top 3 by topical overlap. |
| 3 | Site Audit | ready | Triggers a fresh crawl if last run > 7 days old. |
| 4 | Organic Research | ready | Top pages + position buckets. |
| 5 | Backlink Analytics | medium | Backlink Audit (toxicity) requires a project; falls back to overview. |
| 6 | **AI Toolkit · Brand Visibility (4 LLMs)** | medium | NEW — ChatGPT / Gemini / Perplexity / Copilot. Canvas charts → screenshot + scrape legend numbers only. Claude NOT yet a tracked LLM in SEMrush as of 2026 H1. |
| 7 | **AI Toolkit · Prompt Tracking** | medium | NEW — per-prompt × per-LLM response text, citation rank, competitors mentioned. Plan-gated (AI Toolkit add-on). |
| 8 | Keyword Magic | conditional | Queue-driven via `_queue/keyword-magic.txt`. |

### Output paths (V2)

```
data/seo/semrush/<YYYY-MM-DD>/
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
├── ai-prompt-tracking.json   ← rows are (prompt × LLM) pairs
├── keyword-magic/
└── FAILED.md                 ← only on failure, per-surface allowed
```

### Known friction (read before kickoff)

- **AI Toolkit tier gate.** Brand Visibility + Prompt Tracking require SEMrush's paid AI Toolkit add-on. Confirm POD's plan covers it. If not, both surfaces 404 and are skipped with a per-surface `FAILED.md`.
- **Canvas charts.** AI Visibility share-of-voice over time is rendered to `<canvas>` — we capture screenshots + the DOM-readable legend numbers, not full series data.
- **Project ID discovery.** Position Tracking / Site Audit / AI Toolkit URLs need a SEMrush `projectId`. Agent auto-discovers from `/projects/` on first run and writes it back into `tenants/party-on-delivery.json`.
- **Rate limits.** Sleep 3–5s between surfaces, longer between paginated table reads.
- **No scripted login.** Extension assumes you're already signed in. Expired session → `FAILED.md` + ask operator to re-auth.

---

## Original Phase 1 contract (Playwright path — kept for reference)


# seo-semrush-snapshot

> **Status: Phase 0 stub.** This file documents the Phase 1 contract and surfaces the reconnaissance the operator must complete before implementation begins. There is no `script.ts` or `selectors.ts` yet — those land in Phase 1 after the reconnaissance below confirms the approach is viable.

## Why this skill exists

Party On Delivery has a paid SEMrush UI subscription but no API budget and no Ahrefs subscription. The SEO Director agent needs weekly position-tracking, organic-research, backlink, site-audit, and keyword-magic data to produce its Monday briefings. Until/unless the operator buys API access, the only path is **driving the SEMrush UI with a real browser** (Playwright) on a weekly schedule, screenshotting each dashboard, scraping the visible data tables, and writing structured JSON the SEO Director can read from disk.

The runner cannot live on Vercel — serverless functions don't ship browser binaries. Phase 1 chooses between **GitHub Actions** (cloud cron, requires SEMrush credentials in GH secrets) and **local cron** on a workstation.

## Phase 1 contract (what the skill will do)

### Inputs

- `SEMRUSH_EMAIL` — env var
- `SEMRUSH_PASSWORD` — env var
- (optional) `SEMRUSH_SESSION_COOKIE` — long-lived session token if 2FA forces interactive login

### Behavior

1. Launch headless Chromium via Playwright (`@playwright/test` v1.56.1, already in package.json).
2. Authenticate. If `SEMRUSH_SESSION_COOKIE` is set, restore the session; else email/password login. On 2FA prompt, fail loudly with a `FAILED.md` and surface to the operator — do not attempt to bypass.
3. Navigate to and capture each of the five dashboards listed below. For each:
   - Wait for `networkidle` (per the `webapp-testing` skill convention).
   - Take a full-page screenshot to `data/seo/semrush/<YYYY-MM-DD>/<dashboard>.png`.
   - Scrape the visible data table(s) into structured JSON at `data/seo/semrush/<YYYY-MM-DD>/<dashboard>.json` matching the schema in "Output JSON schema" below.
4. Respect SEMrush UI rate limits — sleep 3–5 seconds between dashboard navigations, longer between paginated table reads.
5. On **any** failure (login broken, layout changed, captcha, rate-limit, missing element):
   - Write `data/seo/semrush/<YYYY-MM-DD>/FAILED.md` with the error, the URL where it failed, and a screenshot of the failure point.
   - Exit non-zero so the runner surfaces the failure.
   - The SEO Director's Monday briefing flags any failed snapshot.

### Output paths

```
data/seo/semrush/<YYYY-MM-DD>/
├── position-tracking.png
├── position-tracking.json
├── organic-research.png
├── organic-research.json
├── backlink-analytics.png
├── backlink-analytics.json
├── site-audit.png
├── site-audit.json
├── keyword-magic.png        # only if there are queued keywords to research
├── keyword-magic.json
└── FAILED.md                # only on failure
```

The whole `data/seo/semrush/` tree is gitignored in Phase 1. The SEO Director reads JSON files directly from disk; screenshots are operator-debugging artifacts.

## Dashboards to capture

### 1. Position Tracking
Per-keyword rank and week-over-week deltas for the keywords the operator has set up in the SEMrush project for `partyondelivery.com`. This is the SEO Director's single most important input — every position-derived recommendation depends on it.

### 2. Organic Research
Site-level summary: total organic traffic estimate, total ranking keywords, top organic pages, distribution across position buckets (top 3, 4–10, 11–20, 21–50). Used for trend monitoring and for spotting pages that lost rankings between snapshots.

### 3. Backlink Analytics
New + lost referring domains since the last snapshot, anchor-text distribution, top referring pages. Feeds the Phase 3 link-building work.

### 4. Site Audit
Technical issue count and severity breakdown. Crawl errors, broken canonicals, missing schema, slow pages. Joined with the Vercel Web Vitals data already in the analytics-snapshot pipeline.

### 5. Keyword Magic Tool
**Conditional capture.** Only run when the SEO Director has queued specific keywords for research (file at `data/seo/semrush/_queue/keyword-magic.txt`, one keyword per line). Outputs related-keywords + volume + difficulty data per queued keyword.

## Output JSON schema (sketch — finalize in Phase 1)

Each dashboard's JSON file is an array of rows that mirror the visible table, plus a small header block.

```jsonc
// position-tracking.json
{
  "captured_at": "2026-05-04T12:34:56Z",
  "domain": "partyondelivery.com",
  "rows": [
    {
      "keyword": "austin alcohol delivery",
      "position": 14,
      "previous_position": 18,
      "url": "https://partyondelivery.com/",
      "search_volume": 720,
      "kd_pct": 38,
      "tracked_since": "2026-04-15"
    }
  ]
}
```

```jsonc
// organic-research.json
{
  "captured_at": "...",
  "domain": "partyondelivery.com",
  "summary": {
    "organic_traffic_estimate": 1240,
    "total_ranking_keywords": 380,
    "authority_score": 18,
    "top_3_count": 4,
    "top_10_count": 22,
    "top_20_count": 71
  },
  "top_pages": [
    { "url": "...", "traffic": 420, "keywords": 28 }
  ]
}
```

```jsonc
// backlink-analytics.json
{
  "captured_at": "...",
  "domain": "partyondelivery.com",
  "summary": { "referring_domains": 84, "new_since_last": 3, "lost_since_last": 1 },
  "new_refdomains": [{ "domain": "...", "first_seen": "...", "anchor": "...", "page": "..." }],
  "lost_refdomains": [{ "domain": "...", "last_seen": "...", "page": "..." }]
}
```

```jsonc
// site-audit.json
{
  "captured_at": "...",
  "domain": "partyondelivery.com",
  "summary": { "errors": 4, "warnings": 31, "notices": 92 },
  "issues": [
    { "severity": "error", "issue": "Missing canonical", "count": 1, "examples": ["/blog/foo"] }
  ]
}
```

The exact field names are tentative — the Phase 1 implementation pins them once the actual SEMrush DOM is inspected.

## Phase 0 reconnaissance checklist

Before Phase 1 implementation begins, the **operator must manually log into SEMrush in Chrome** and confirm each of these. The answers determine whether Playwright is viable, what runner placement is right, and how brittle the selectors will be.

- [ ] **2FA status.** Is 2FA enabled on the SEMrush account? If yes, document which type (TOTP, email, SMS). 2FA forces a long-lived-session-cookie strategy or a one-time interactive setup.
- [ ] **Cloudflare/Captcha gating on headless Playwright.** Use the `webapp-testing` skill (or the `mcp__Claude_in_Chrome__*` MCP tools) to navigate the SEMrush login page in a headless browser and confirm whether Cloudflare's bot detection trips. If it does, the runner must use a residential IP or persistent cookie.
- [ ] **Stable selectors.** For each of the five dashboards, capture the DOM structure of the primary data table. Confirm whether it has `data-testid`, semantic class names, or only generated/hashed class names. Generated names mean Phase 1 selectors will need text-content matching or DOM traversal heuristics that break frequently.
- [ ] **Direct-URL navigation.** Are dashboard URLs stable for direct navigation (e.g. `https://www.semrush.com/analytics/positions/?db=us&q=partyondelivery.com`) or does the UI route through stateful in-app navigation that doesn't survive cold loads?
- [ ] **Pagination strategy.** For Position Tracking and Backlink Analytics, the visible table may be a partial view of all data. Document whether full data is reachable via "show all", URL params, or only by clicking through pages.
- [ ] **SEMrush plan tier and quotas.** Confirm which plan the operator is on. The skill must respect any per-day query/export limits or get rate-limited mid-snapshot.
- [ ] **Existing project setup.** SEMrush projects (Position Tracking, Site Audit) require keywords + domain configured in the UI. Confirm the `partyondelivery.com` project is set up and includes the keywords the operator wants tracked. If not, that's a one-time UI task before the skill works.

## Runner placement (Phase 1 decision)

| Option | Pros | Cons |
|---|---|---|
| **GitHub Actions** | Cloud-resident, runs on schedule without operator's machine being on, secrets in GH Settings | SEMrush may flag GitHub IP ranges as bot traffic; harder to debug interactively |
| **Local cron on a workstation** | Residential IP looks like normal user, easy to debug, matches the "Cowork session" framing in the source brief | Requires the workstation to be on at scheduled time; one fewer failure-resilience layer |
| **Both (failover)** | Highest resilience | More setup; redundant snapshots if both succeed |

Phase 1 picks one based on the reconnaissance findings — specifically, whether SEMrush flags GitHub IPs.

## How the SEO Director consumes this output

The agent reads JSON files directly via `Read`/`Bash` (`cat data/seo/semrush/<latest-date>/<dashboard>.json`). It does **not** call this skill at runtime — the skill is a scheduled producer, the agent is a consumer. If the most recent snapshot is more than 14 days old, the agent's freshness gate kicks in and refuses competitive-keyword recommendations until a fresh snapshot lands.

## Out of scope for this skill

- Running on Vercel serverless (no browser binaries)
- Real-time queries from the agent (the skill is weekly batch only)
- Keyword research outside the queued list (the agent doesn't trigger ad-hoc Keyword Magic queries; it queues them in `_queue/keyword-magic.txt` for the next run)
- Anything beyond the 5 listed dashboards — Phase 3 may extend (e.g. competitor-site analysis), not Phase 1

## See also

- `.claude/skills/webapp-testing/SKILL.md` — closest existing skill pattern; review its server lifecycle and selector-discovery approach before implementing
- `.claude/agents/seo-director.md` — the consumer of this skill's output
- Vault: `Programs/SEO-Director.md` — full data-pipeline diagram
