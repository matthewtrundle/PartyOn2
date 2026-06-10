# API reference

## Database — `SeoSnapshot` Prisma model

```prisma
model SeoSnapshot {
  id          String   @id @default(uuid())
  capturedAt  DateTime @default(now()) @map("captured_at")
  surface     String   // 'position-tracking', 'keyword-gap', etc.
  domain      String   // e.g. 'partyondelivery.com'
  payload     Json?    // per-surface schema — see SURFACE_REFERENCE.md
  failure     String?  @db.Text   // null on success
  durationMs  Int?     @map("duration_ms")
  runRef      String?  @map("run_ref")  // 'gh:<run-id>@<sha>' or 'local:<iso>'

  @@index([surface, capturedAt])
  @@index([capturedAt])
  @@map("seo_snapshots")
}
```

### Useful queries

**Most recent per surface (status grid):**

```sql
SELECT DISTINCT ON (surface) surface, captured_at, failure, duration_ms
FROM seo_snapshots
ORDER BY surface, captured_at DESC;
```

**Latest full run (all surfaces from one runRef):**

```sql
WITH latest AS (
  SELECT run_ref, MAX(captured_at) AS captured_at
  FROM seo_snapshots
  GROUP BY run_ref
  ORDER BY captured_at DESC
  LIMIT 1
)
SELECT s.*
FROM seo_snapshots s
JOIN latest l ON s.run_ref = l.run_ref;
```

**Failure rate per surface over last 30 days:**

```sql
SELECT
  surface,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE failure IS NOT NULL) AS failures,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE failure IS NOT NULL) / COUNT(*),
    1
  ) AS failure_pct
FROM seo_snapshots
WHERE captured_at > NOW() - INTERVAL '30 days'
GROUP BY surface
ORDER BY failure_pct DESC;
```

**Position changes week-over-week (from position-tracking payload):**

```sql
SELECT
  payload->>'totalKeywords' AS total_keywords,
  captured_at
FROM seo_snapshots
WHERE surface = 'position-tracking'
  AND failure IS NULL
ORDER BY captured_at DESC
LIMIT 14;
```

For per-keyword detail you'd need to unnest the `rows` array; lift
into a `pg-jsonb`-friendly query:

```sql
SELECT
  kw->>'keyword' AS keyword,
  (kw->>'position')::int AS position,
  (kw->>'previousPosition')::int AS previous_position,
  captured_at
FROM seo_snapshots,
LATERAL jsonb_array_elements(payload->'rows') kw
WHERE surface = 'position-tracking'
  AND failure IS NULL
  AND captured_at = (
    SELECT MAX(captured_at) FROM seo_snapshots
    WHERE surface = 'position-tracking' AND failure IS NULL
  );
```

## REST endpoints

All routes live under `/api/admin/seo/` and are gated by the same
ops-auth middleware as the rest of `/admin/*`.

### `GET /api/admin/seo/latest-snapshot`

Returns the latest run + per-surface status grid.

**Response 200:**

```ts
{
  ok: true,
  latestRun: {
    runRef: string | null;
    capturedAt: string;     // ISO
    total: number;          // surfaces in this run
    successes: number;
    failures: number;
  } | null,
  surfaces: Array<{
    surface: string;        // 'position-tracking', etc.
    capturedAt: string;     // ISO of most recent capture (may differ from latestRun)
    success: boolean;
    failure: string | null;
    durationMs: number | null;
  }>
}
```

`latestRun` is null if no snapshot rows exist yet.

`surfaces` always returns the most recent capture per surface,
independent of `runRef`. This is so the status grid shows correct
"last successful" data even when a partial run replaces a previous
full run.

**Response 500:**

```ts
{ ok: false, error: 'db_error', detail: string }
```

### `POST /api/admin/seo/trigger-scrape`

Fires the GitHub Actions workflow via `workflow_dispatch`.

**Request body (optional):**

```ts
{ surfaces?: string }   // comma-separated, blank = all surfaces
```

**Response 200:**

```ts
{ ok: true, queued: true, repo: string, surfaces: 'all' | string }
```

**Response 500 (token missing):**

```ts
{
  ok: false,
  error: 'token_missing',
  detail: 'Set GH_DISPATCH_TOKEN env var (fine-grained PAT with Actions:Write).'
}
```

**Response 502 (GitHub rejected):**

```ts
{ ok: false, error: 'gh_<status>', detail: '<github error body>' }
```

Common GitHub errors:
- `gh_404` — repo slug wrong, or PAT can't see the repo
- `gh_403` — PAT doesn't have `Actions: Write`
- `gh_422` — workflow file doesn't exist on the target ref

## Webhook events

Fired to `GHL_DASHBOARD_WEBHOOK_URL` (POST, JSON body).

### `seo.scrape.completed`

Fires at the end of every workflow run, success or partial failure.

```json
{
  "event": "seo.scrape.completed",
  "domain": "partyondelivery.com",
  "run_ref": "gh:1234567890@abc1234",
  "captured_at": "2026-05-28T12:05:32.123Z",
  "success_count": 6,
  "failure_count": 2,
  "failed_surfaces": ["ai-brand-visibility", "ai-prompt-tracking"],
  "subject": "⚠️ SEMrush scrape partial — 6 ok, 2 failed",
  "body": "Captured at: …\nDomain: …\nRun: …\n\nSurfaces:\n  ✓ position-tracking (12345ms)\n  ✗ ai-brand-visibility — AI Toolkit not in current plan\n  …"
}
```

### `seo.scrape.cookie_expired`

Fires when the orchestrator detects the SEMrush session cookie is dead.
No surfaces are scraped in this case — the workflow exits 2.

```json
{
  "event": "seo.scrape.cookie_expired",
  "run_ref": "gh:1234567890@abc1234",
  "subject": "🔑 SEMrush cookie expired — refresh required",
  "body": "The daily SEMrush scrape failed authentication. Refresh the SEMRUSH_COOKIE_JSON GitHub secret per the runbook in /admin/brians-stuff?tab=seo, then re-run the workflow."
}
```

## TypeScript types — re-usable in your project

Copy `scripts/seo/lib/types.ts` into your project. The key exports:

```ts
export type SurfaceKey =
  | 'position-tracking'
  | 'keyword-gap'
  | 'site-audit'
  | 'organic-research'
  | 'backlink-analytics'
  | 'ai-brand-visibility'
  | 'ai-prompt-tracking'
  | 'keyword-magic';

export type ScrapeEnvelope<T = unknown> = (
  | { success: true; payload: T }
  | { success: false; payload: null; failure: string }
) & {
  surface: SurfaceKey;
  capturedAt: string;
  domain: string;
  durationMs: number;
};

// Per-surface payload types:
export type PositionTrackingPayload = { ... };
export type KeywordGapPayload = { ... };
export type SiteAuditPayload = { ... };
// (etc — see lib/types.ts for full schemas)
```

If you're consuming the JSON payloads from a different language
(Python, Ruby, etc.), the schemas in [SURFACE_REFERENCE.md](./SURFACE_REFERENCE.md)
are the authoritative spec.
