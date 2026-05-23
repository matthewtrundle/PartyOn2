---
description: Drive a signed-in SEMrush session via the Claude in Chrome extension to capture all 8 dashboards for partyondelivery.com. Writes screenshots + JSON to data/seo/semrush/<YYYY-MM-DD>/. Run this from a Claude Code session with the Chrome extension paired and Allan/Brian already logged into SEMrush.
---

# /scrape-semrush-pod — Party On Delivery SEMrush weekly scrape

You are running an automated SEMrush capture for `partyondelivery.com`.

## Preflight (do these in order, stop if any fail)

1. Call `mcp__Claude_in_Chrome__list_connected_browsers`. If no browsers are returned, tell the user:
   > "The Chrome extension isn't paired. Open Chrome, click the Claude in Chrome extension icon, pair it, and run /scrape-semrush-pod again."
   Then stop.
2. Call `mcp__Claude_in_Chrome__select_browser` with the first device returned.
3. Call `mcp__Claude_in_Chrome__tabs_context_mcp` with `createIfEmpty: true`. Note the tabId.
4. Navigate to `https://www.semrush.com/dashboard/`. If the page redirects to `/login` or shows the sign-in form, tell the user:
   > "SEMrush session expired. Sign into SEMrush in this browser, then run /scrape-semrush-pod again."
   Then stop.
5. Determine today's date in YYYY-MM-DD (use the local clock). Create the output directory:
   ```
   mkdir -p "data/seo/semrush/<YYYY-MM-DD>"
   ```
6. Read `tenants/party-on-delivery.json` if it exists at the repo root (one-line lookup; if missing, that's fine — we'll discover the project id from the `/projects/` page and write it back at the end).

## What to capture (8 surfaces)

For each surface below: navigate, wait briefly, screenshot the visible viewport, then read the page DOM and extract the rows/numbers described. Write both files to today's data directory. On per-surface failure, write a short `FAILED-<surface>.md` describing what broke and keep going to the next surface — do NOT abort the run.

Use `mcp__Claude_in_Chrome__browser_batch` to chain navigation + read_page in one trip whenever possible. Sleep 3–5 seconds between surfaces (use `mcp__computer-use__wait` or a short `Bash` sleep) so SEMrush doesn't throttle.

### 1. Position Tracking — `position-tracking`
- URL: `https://www.semrush.com/projects/{projectId}/tracking/positions/`
- (If projectId unknown, navigate to `/projects/`, find the partyondelivery.com card, click into it, then click "Position Tracking". Capture the project id from the URL after navigation.)
- Capture per-keyword rows: keyword, current rank, previous rank (delta), search volume, KD%, ranking URL, tracked-since date.
- Schema:
  ```json
  {
    "captured_at": "<ISO>",
    "domain": "partyondelivery.com",
    "rows": [
      { "keyword": "...", "position": 14, "previous_position": 18,
        "url": "...", "search_volume": 720, "kd_pct": 38,
        "tracked_since": "2026-04-15" }
    ]
  }
  ```

### 2. Keyword Gap Analysis — `keyword-gap`
- URL template:
  `https://www.semrush.com/analytics/keywordgap/?q=partyondelivery.com&q1={competitor1}&q2={competitor2}&q3={competitor3}`
- Default competitors if not configured in `tenants/party-on-delivery.json`: `drizly.com`, `gopuff.com`, `saucey.com`.
- Capture up to 500 rows across the "Missing" + "Weak" + "Untapped" tabs (paginate if needed; cap at 500 total to bound run time).
- Each row: keyword, volume, KD%, intent, partyondelivery position (if any), competitor positions.

### 3. Site Audit — `site-audit`
- URL: `https://www.semrush.com/projects/{projectId}/siteaudit/campaign/`
- If the latest crawl date shown on the page is older than 7 days, click "Re-run crawl" / "Start audit" — but DO NOT wait for it to finish; just note `audit_in_progress: true` in the JSON.
- Capture: site-health %, total errors / warnings / notices, top 10 issue categories with counts, crawled pages count, blocked pages count.

### 4. Organic Research — `organic-research`
- URL: `https://www.semrush.com/analytics/organic/overview/?q=partyondelivery.com`
- Capture: organic traffic estimate, total ranking keywords, authority score, top-3 / top-10 / top-20 counts. Top 20 organic pages (URL + traffic + keyword count).

### 5. Backlink Analytics — `backlink-analytics`
- URL: `https://www.semrush.com/analytics/backlinks/overview/?q=partyondelivery.com`
- Capture: total backlinks, referring domains, top anchors (anchor + share of total), 20 most recent referring domains.

### 6. AI Toolkit · Brand Visibility — `ai-brand-visibility/`
- URL: `https://www.semrush.com/ai-toolkit/projects/{projectId}/brand-visibility/`
- If the page returns 404 or shows an "Upgrade to AI Toolkit" gate, write `FAILED-ai-brand-visibility.md` with the reason and skip to surface 7.
- Otherwise iterate every per-LLM tab present in the UI (typically ChatGPT, Gemini, Perplexity, Copilot — but also pick up Claude if it appears).
- For each LLM tab:
  - Screenshot it to `ai-brand-visibility/<llm-slug>.png`
  - Scrape DOM-readable legend numbers (presence rate %, sentiment % split, top cited domains) → `ai-brand-visibility/<llm-slug>.json`
  - Note: the time-series share-of-voice chart renders in `<canvas>`; you cannot extract the series — only the legend totals.

### 7. AI Toolkit · Prompt Tracking — `ai-prompt-tracking`
- URL: `https://www.semrush.com/ai-toolkit/projects/{projectId}/prompts/`
- Same 404/gate handling as surface 6.
- For each tracked prompt:
  - Click the prompt row → modal opens
  - Iterate every per-LLM tab in the modal
  - Capture for each (prompt × LLM) cell: full LLM response text (truncate at 4000 chars), whether POD is cited, citation rank, competitors mentioned in the response
- Output is one flat array of `{ prompt, llm, response_text, cited: bool, rank: int|null, competitors: [...] }` rows.
- Hard cap: 50 prompts × however many LLMs. If there are more prompts, capture the first 50 alphabetically and note `truncated: true` in the JSON header.

### 8. Keyword Magic — `keyword-magic/`
- Only run if `data/seo/semrush/_queue/keyword-magic.txt` exists and is non-empty.
- For each line in that file (one seed keyword per line):
  - URL: `https://www.semrush.com/analytics/keywordmagic/?q=<url-encoded-seed>`
  - Capture top 100 related keywords with volume / KD% / intent / SERP features
  - Write to `keyword-magic/<slug-of-seed>.json` + `.png`

## Postflight

1. If we discovered a new `projectId`, write it to `tenants/party-on-delivery.json`:
   ```json
   { "domain": "partyondelivery.com", "semrush_project_id": "<id>",
     "competitors": ["drizly.com", "gopuff.com", "saucey.com"],
     "last_scrape": "<YYYY-MM-DD>" }
   ```
2. Print a one-screen summary to the user with:
   - ✓ surfaces captured successfully (count)
   - ✗ surfaces that failed (with reason from FAILED-*.md)
   - Path to the output directory
   - "Next: ping the SEO Director sub-agent with /seo-director or similar"

3. Open `data/seo/semrush/<YYYY-MM-DD>/` in a Finder window so the operator can spot-check screenshots:
   ```bash
   open "data/seo/semrush/<YYYY-MM-DD>"
   ```

## Guardrails

- NEVER touch the SEMrush login form. If you see one, the session expired — tell the user and stop.
- NEVER click "Upgrade plan" or any billing CTA. If a feature is gated, write FAILED-<surface>.md and move on.
- Respect rate limits: 3–5s between surfaces, 1–2s between paginated table reads.
- If any surface produces zero rows when it clearly shouldn't (e.g. position tracking with a known-tracked project), write FAILED-<surface>.md flagging the selector likely changed.
- All file writes go through normal Bash/Write tools — keep the Chrome extension focused on navigation + DOM reads.

End the run with a short summary + the path to the output dir.
