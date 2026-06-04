---
description: Drive a signed-in SEMrush session via the Claude in Chrome extension to capture all 8 dashboards for partyondelivery.com. Writes screenshots + raw page text to data/seo/semrush/<YYYY-MM-DD>/. Run this from a Claude Code session with the Chrome extension paired and Allan/Brian already logged into SEMrush.
---

# /scrape-semrush-pod — Party On Delivery SEMrush weekly scrape

You are running an automated SEMrush capture for `partyondelivery.com`.

Your job is to **drive Chrome and dump raw page text** for each dashboard. You do NOT transcribe numbers into JSON yourself — a deterministic parser handles that in step 2 of the postflight.

## Preflight (do these in order, stop if any fail)

1. Call `mcp__Claude_in_Chrome__list_connected_browsers`. If no browsers are returned, tell the user:
   > "The Chrome extension isn't paired. Open Chrome, click the Claude in Chrome extension icon, pair it, and run /scrape-semrush-pod again."
   Then stop.
2. Call `mcp__Claude_in_Chrome__select_browser` with the first device returned.
3. Call `mcp__Claude_in_Chrome__tabs_context_mcp` with `createIfEmpty: true`. Note the tabId.
4. Navigate to `https://www.semrush.com/dashboard/`. If the page redirects to `/login` or shows the sign-in form, tell the user:
   > "SEMrush session expired. Sign into SEMrush in this browser, then run /scrape-semrush-pod again."
   Then stop.
5. Determine today's date in YYYY-MM-DD (use the local clock). Create the output directories:
   ```bash
   mkdir -p "data/seo/semrush/<YYYY-MM-DD>/raw"
   mkdir -p "data/seo/semrush/<YYYY-MM-DD>/ai-brand-visibility"
   mkdir -p "data/seo/semrush/<YYYY-MM-DD>/keyword-magic"
   ```
6. Read `tenants/party-on-delivery.json` if it exists at the repo root (one-line lookup; if missing, discover the project id from the `/projects/` page and write it back at the end).

## What to capture (8 surfaces)

For each surface below:

1. Navigate to the URL with `mcp__Claude_in_Chrome__navigate` (use `browser_batch` to chain when possible).
2. Wait 3–5 seconds for the page to settle.
3. Take a viewport screenshot via `mcp__Claude_in_Chrome__preview_screenshot` (or the appropriate Chrome MCP screenshot tool) to `data/seo/semrush/<date>/<surface>.png`.
4. Extract the page's full `document.body.innerText` via `mcp__Claude_in_Chrome__javascript_tool` (run `return document.body.innerText`).
5. Write the raw text to TWO places:
   - `data/seo/semrush/<date>/raw/<surface>.txt` — operator debugging copy
   - `data/seo/semrush/<date>/<surface>.json` — stub JSON with the schema below, so the parser can find it

Stub JSON shape (this is the ONLY shape you write — the parser fills in the `extracted` block):

```json
{
  "captured_at": "<ISO-8601 timestamp>",
  "dashboard": "<surface-slug>",
  "label": "<human-readable label>",
  "url": "<URL navigated to>",
  "domain": "partyondelivery.com",
  "project_id": "<project id if known>",
  "raw_body_text": "<full innerText dump>"
}
```

**Do NOT populate the `extracted` field yourself. Do NOT invent schema. The parser owns the structured output.**

On per-surface failure, write a short `FAILED-<surface>.md` describing what broke and keep going to the next surface — do NOT abort the run.

Sleep 3–5 seconds between surfaces so SEMrush doesn't throttle.

### 1. Position Tracking — `position-tracking`
- URL: `https://www.semrush.com/projects/{projectId}/tracking/positions/`
- If projectId unknown, navigate to `/projects/`, find the partyondelivery.com card, click into it, click "Position Tracking", capture project id from the resulting URL.

### 2. Keyword Gap Analysis — `keyword-gap`
- URL template:
  `https://www.semrush.com/analytics/keywordgap/?q=partyondelivery.com&q1={competitor1}&q2={competitor2}&q3={competitor3}`
- Default competitors if not in `tenants/party-on-delivery.json`: `drizly.com`, `gopuff.com`, `saucey.com`.
- Just dump the page's innerText — the parser handles the per-tab breakdown.

### 3. Site Audit — `site-audit`
- URL: `https://www.semrush.com/projects/{projectId}/siteaudit/campaign/`
- If the latest crawl date shown on the page is older than 7 days, click "Re-run crawl" / "Start audit" — but DO NOT wait for it to finish.

### 4. Organic Research — `organic-research`
- URL: `https://www.semrush.com/analytics/organic/overview/?db=us&q=partyondelivery.com&searchType=domain`

### 5. Backlink Analytics — `backlink-analytics`
- URL: `https://www.semrush.com/analytics/backlinks/overview/?q=partyondelivery.com&searchType=domain`

### 6. AI Toolkit · Brand Visibility — `ai-brand-visibility/`
- URL: `https://www.semrush.com/ai-toolkit/projects/{projectId}/brand-visibility/`
- If the page 404s or shows an "Upgrade to AI Toolkit" gate, write `FAILED-ai-brand-visibility.md` and skip to surface 7.
- Otherwise iterate every per-LLM tab (typically ChatGPT, Gemini, Perplexity, Copilot — also Claude if present).
- For each LLM tab:
  - Screenshot to `ai-brand-visibility/<llm-slug>.png`
  - Dump innerText to `ai-brand-visibility/<llm-slug>.json` using the stub shape above (`dashboard: "ai-brand-visibility-<llm-slug>"`).

### 7. AI Toolkit · Prompt Tracking — `ai-prompt-tracking`
- URL: `https://www.semrush.com/ai-toolkit/projects/{projectId}/prompts/`
- Same 404/gate handling as surface 6.
- For each tracked prompt, click into it, iterate every per-LLM tab in the modal, and dump the innerText of each tab to its own stub JSON. Hard cap: 50 prompts.

### 8. Keyword Magic — `keyword-magic/`
- Only run if `data/seo/semrush/_queue/keyword-magic.txt` exists and is non-empty.
- For each line in that file (one seed keyword per line):
  - URL: `https://www.semrush.com/analytics/keywordmagic/?q=<url-encoded-seed>`
  - Dump innerText to `keyword-magic/<slug-of-seed>.json` + screenshot to `.png`.

## Postflight

1. **Run the parser to populate the `extracted` field on every stub JSON:**
   ```bash
   node scripts/seo/parse-semrush-snapshot.mjs data/seo/semrush/<YYYY-MM-DD>/
   ```
   The parser reads each `*.json` file (except `manifest.json`), runs a deterministic regex extractor on `raw_body_text`, and writes the structured `extracted` object back to the same file. It also updates `manifest.json` with `re_extracted_at`.

   If the parser prints any `parse_warnings` for a surface, surface them to the operator in the final summary — those are fields the parser couldn't extract confidently and left as `null`.

2. If we discovered a new `projectId`, write it to `tenants/party-on-delivery.json`:
   ```json
   { "domain": "partyondelivery.com", "semrush_project_id": "<id>",
     "competitors": ["drizly.com", "gopuff.com", "saucey.com"],
     "last_scrape": "<YYYY-MM-DD>" }
   ```

3. Write `manifest.json` with the per-surface success/failure list (the parser will then patch in `re_extracted_at`):
   ```json
   {
     "captured_at": "<ISO>",
     "domain": "partyondelivery.com",
     "project_id": "<id>",
     "results": [
       { "id": "position-tracking", "ok": true },
       { "id": "site-audit", "ok": false, "error": "..." }
     ],
     "success": true
   }
   ```

4. Print a one-screen summary to the user with:
   - ✓ surfaces captured successfully (count)
   - ✗ surfaces that failed (with reason from FAILED-*.md)
   - Any parse_warnings the parser reported
   - Path to the output directory
   - "Next: ping the SEO Director sub-agent with /seo-director or similar"

5. Open the output directory so the operator can spot-check screenshots:
   ```bash
   open "data/seo/semrush/<YYYY-MM-DD>"
   ```

## Guardrails

- NEVER touch the SEMrush login form. If you see one, the session expired — tell the user and stop.
- NEVER click "Upgrade plan" or any billing CTA. If a feature is gated, write FAILED-<surface>.md and move on.
- NEVER write to the `extracted` field on a stub JSON. That's the parser's job. If you populate it, the content-integrity hook will reject the file.
- Respect rate limits: 3–5s between surfaces, 1–2s between paginated table reads.
- All file writes go through normal Bash/Write tools — keep the Chrome extension focused on navigation + DOM reads.

End the run with a short summary + the path to the output dir.
