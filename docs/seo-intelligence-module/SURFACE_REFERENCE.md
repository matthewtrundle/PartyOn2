# Surface reference

> One section per SEMrush dashboard. For each: URL pattern, payload TS
> schema, primary selectors tried, run-time cost, and known gotchas.

## 1. Position Tracking

**Key:** `position-tracking`
**URL:** `https://www.semrush.com/projects/{projectId}/tracking/positions/`
**Needs project id:** yes
**Estimated runtime:** 20-40 sec

### Payload

```ts
{
  rows: Array<{
    keyword: string;
    position: number | null;
    previousPosition: number | null;
    url: string | null;
    searchVolume: number | null;
    kdPct: number | null;
    trackedSince: string | null;
  }>;
  totalKeywords: number;
}
```

### Scraping strategy

Table is virtualized — only renders rows currently in the viewport. We
scroll the inner container 600px at a time and accumulate visible rows
into a Set keyed by keyword. Stops after 3 scrolls with no new rows
(end of list) or after capturing `MAX_ROWS = 500`.

Selector fallback chain:

1. `[data-test="position-tracking-table"]`
2. `table[data-track="position-tracking"]`
3. `.s-position-tracking__table`
4. `div[role="grid"]`
5. `table`

### Gotchas

- **Total-keywords count** comes from the toolbar above the table.
  Fallback chain handles `data-test="total-keywords"` and
  `.s-position-tracking__total`. If neither exists, defaults to 0
  (rows count is the real signal anyway).
- **Tracked-since date** is currently unreliable — SEMrush hides it
  behind a column toggle. Defaults to null. Future improvement: click
  the column-picker first to expose it.
- **Empty project** — if the SEMrush project has zero keywords set up,
  this surface succeeds with `rows: []`. Verify the project has
  keywords before complaining.

---

## 2. Keyword Gap Analysis

**Key:** `keyword-gap`
**URL:** `https://www.semrush.com/analytics/keywordgap/?q={domain}&q1={comp1}&q2={comp2}&q3={comp3}`
**Needs project id:** no
**Estimated runtime:** 60-90 sec

### Payload

```ts
{
  competitors: string[];
  missing: GapRow[];
  weak: GapRow[];
  untapped: GapRow[];
}
type GapRow = {
  keyword: string;
  volume: number | null;
  kdPct: number | null;
  intent: string | null;
  ourPosition: number | null;
  competitorPositions: Record<string, number | null>;
};
```

### Scraping strategy

Three tabs (Missing, Weak, Untapped). For each:

1. Click the tab via `page.getByRole('tab', { name: /^Missing$/i })`
2. Wait 900ms for table to repopulate
3. Scrape up to `MAX_PER_TAB = 167` rows (≈500 total across all 3)

Column indices vary based on how many competitor domains are loaded:
positions are at columns 5+, so we slice `cells.slice(5)` to grab them.

### Gotchas

- **First load may have no competitors selected.** If the page shows
  empty results across all 3 tabs, double-check the URL has q1/q2/q3
  set correctly.
- **Tab labels vary by SEMrush UI version** — sometimes "Missing" is
  rendered as "Untapped opportunities" or similar. We try multiple
  case variations; if a label changes meaningfully, update the loop.
- **Intent column** — SEMrush sometimes renders intent as colored
  badges with no text content. If your `intent` field is always null,
  scrape from `el.getAttribute('aria-label')` instead.

---

## 3. Site Audit

**Key:** `site-audit`
**URL:** `https://www.semrush.com/projects/{projectId}/siteaudit/campaign/`
**Needs project id:** yes
**Estimated runtime:** 10-20 sec

### Payload

```ts
{
  healthPct: number | null;
  errors: number;
  warnings: number;
  notices: number;
  topIssues: Array<{ name: string; severity: string; count: number }>;
  pagesCrawled: number | null;
  pagesBlocked: number | null;
  lastCrawlAt: string | null;
}
```

### Scraping strategy

Pure overview-page scrape — no scrolling, no clicks. All values come
from the static cards/list shown on first paint.

### Gotchas

- **We don't trigger a re-crawl.** If `lastCrawlAt` is older than 7
  days, the orchestrator records the staleness via this field. The
  SEO Director sub-agent should flag it to the operator. Triggering
  a re-crawl costs SEMrush quota and should be a deliberate human
  decision.
- **Top issues** rendered as list-items with severity badges. If the
  badge text is empty, we default `severity` to `'unknown'`.

---

## 4. Organic Research

**Key:** `organic-research`
**URL:** `https://www.semrush.com/analytics/organic/overview/?q={domain}`
**Needs project id:** no
**Estimated runtime:** 10-20 sec

### Payload

```ts
{
  trafficEstimate: number | null;
  rankingKeywords: number | null;
  authorityScore: number | null;
  topCount: { top3: number; top10: number; top20: number };
  topPages: Array<{ url: string; traffic: number; keywords: number }>;
}
```

### Scraping strategy

Overview page — stat cards + top-pages table. We pull up to 20 top
pages.

### Gotchas

- **Traffic estimate** is SEMrush's modeled estimate, NOT actual GA
  data. Treat as directional.
- **Authority score** is a 0-100 metric proprietary to SEMrush. It
  changes slowly; don't read too much into day-over-day deltas.

---

## 5. Backlink Analytics

**Key:** `backlink-analytics`
**URL:** `https://www.semrush.com/analytics/backlinks/overview/?q={domain}`
**Needs project id:** no
**Estimated runtime:** 10-20 sec

### Payload

```ts
{
  totalBacklinks: number | null;
  referringDomains: number | null;
  topAnchors: Array<{ anchor: string; sharePct: number }>;
  recentDomains: Array<{ domain: string; firstSeen: string | null; pageScore: number | null }>;
}
```

### Scraping strategy

Overview page — totals + two lists (top anchors, 20 most recent
referring domains).

### Gotchas

- **Recent referring domains** sometimes shows "first seen" as
  relative time ("3 days ago") instead of absolute date. We store
  whatever's in the cell; downstream consumers should parse
  defensively.
- **Page score / Authority Score** for individual referring domains
  is rendered as a small badge — if SEMrush renders it as an SVG
  instead of text, we'll get null.

---

## 6. AI Toolkit · Brand Visibility

**Key:** `ai-brand-visibility`
**URL:** `https://www.semrush.com/ai-toolkit/projects/{projectId}/brand-visibility/`
**Needs project id:** yes
**Estimated runtime:** 30-60 sec (depending on number of LLM tabs)

### Payload

```ts
{
  llms: Array<{
    llm: string;                              // 'ChatGPT', 'Gemini', etc.
    presencePct: number | null;
    sentiment: { positive: number; neutral: number; negative: number } | null;
    topCitedDomains: Array<{ domain: string; sharePct: number | null }>;
  }>;
}
```

### Scraping strategy

1. Detect upgrade gate — if the page contains "Upgrade to AI Toolkit"
   text, throw `AiToolkitGatedError` (orchestrator records as
   "AI Toolkit not in current plan").
2. Find all LLM tabs on the page.
3. For each tab: click → wait 800ms → scrape presence%, sentiment
   split (3-number regex match), top cited domains list.

### Gotchas

- **Time-series chart** on this page is a `<canvas>`. We CANNOT
  extract the historical series from the DOM. Only legend totals
  are captured. Live with it or sign up for SEMrush's actual API.
- **Number of LLMs varies** based on SEMrush's product. As of writing:
  ChatGPT, Gemini, Perplexity, Copilot. Claude tab is sometimes
  present, sometimes hidden behind a beta flag. We capture whatever
  tabs are visible.
- **Hard cap** of 8 LLMs scraped to prevent runaway loops.

---

## 7. AI Toolkit · Prompt Tracking

**Key:** `ai-prompt-tracking`
**URL:** `https://www.semrush.com/ai-toolkit/projects/{projectId}/prompts/`
**Needs project id:** yes
**Estimated runtime:** 5-15 min (slowest surface)

### Payload

```ts
{
  truncated: boolean;
  cells: Array<{
    prompt: string;
    llm: string;
    responseText: string;             // truncated to 4000 chars
    cited: boolean;
    rank: number | null;
    competitorsMentioned: string[];
  }>;
}
```

### Scraping strategy

1. Detect upgrade gate (same as brand visibility)
2. List all prompt rows, sort alphabetically, take first 50 (`MAX_PROMPTS`)
3. For each prompt:
   - Click row → modal opens
   - Iterate per-LLM tabs inside modal
   - For each: scrape response text (cap 4000 chars), citation badge,
     rank, competitors-mentioned list
   - Close modal (ESC if no close button)

### Gotchas

- **Slowest surface by far.** 50 prompts × 4 LLMs × ~1.5 sec per cell
  ≈ 5 min. If your SEMrush has 200+ tracked prompts, the truncation
  cap kicks in. Bump `MAX_PROMPTS` only if you also bump the workflow
  timeout (currently 30 min).
- **Modal selector is fragile.** SEMrush sometimes A/B-tests different
  modal shells (`role="dialog"` vs `.s-prompt-modal` vs a sheet UI).
  We try multiple selectors; if all miss, the cell is skipped silently.
- **Response text formatting** — SEMrush sometimes renders responses
  as markdown that gets converted to HTML. We grab `textContent`,
  which strips formatting. Downstream consumers that need preserved
  markdown should switch to `innerHTML` parsing.

---

## 8. Keyword Magic (conditional)

**Key:** `keyword-magic`
**URL:** `https://www.semrush.com/analytics/keywordmagic/?q={seedKeyword}`
**Needs project id:** no
**Estimated runtime:** 15-30 sec per seed

### Payload

```ts
{
  seeds: Array<{
    seed: string;
    related: Array<{
      keyword: string;
      volume: number | null;
      kdPct: number | null;
      intent: string | null;
      serpFeatures: string[];
    }>;
  }>;
}
```

### Scraping strategy

Queue-driven. Reads seeds from `data/seo/semrush/_queue/keyword-magic.txt`
(one per line, blank lines and `#` comments ignored). For each seed:
navigate, wait, scrape top 100 related keywords.

If the queue file is missing or empty, the surface succeeds with
`{ seeds: [] }` — NOT a failure.

### Gotchas

- **Queue file is committed to the repo.** Add/remove seeds via PRs.
  This makes the keyword-research process auditable.
- **Per-seed runtime adds up fast.** 5 seeds × 30 sec = 2.5 min on
  top of all other surfaces. Don't queue more than 10 at a time.
- **SERP features** — SEMrush renders these as inline icons with
  tooltips. We grab the comma-separated text after splitting. If the
  text is empty, `serpFeatures` is `[]`.

---

## Adding a new surface

1. Create `scripts/seo/surfaces/<name>.ts` exporting a `Surface<T>`
   object with `key`, `needsProjectId`, `url`, and `scrape`
2. Add the payload TS interface to `lib/types.ts` and the surface key
   to `SurfaceKey` union
3. Import + register in `surfaces/index.ts` `SURFACES` array
4. Update the dashboard's `SURFACES` constant in
   `src/components/admin/RunScrapePanel.tsx` so the new surface
   appears in the status grid
5. Document the surface in this file
6. Smoke-test via `workflow_dispatch` with the new surface as input

That's it. The orchestrator + persistence + admin UI all pick up the
new surface automatically because they iterate `SURFACES[]`.
