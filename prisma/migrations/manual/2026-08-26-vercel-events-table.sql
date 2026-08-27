-- Vercel Log Drain analytics — vercel_events table.
-- One row per HTTP request to partyondelivery.com, delivered as NDJSON by a
-- Vercel *Log* Drain (team Infinite Burn Rate, scoped to party-on2) and stored
-- by src/app/api/webhooks/vercel-drain/route.ts. This is server-side traffic:
-- unlike the client-side beacon behind analytics_events, it sees requests that
-- never run JS — which is exactly what makes human-vs-bot classification
-- possible (src/lib/analytics/vercel-events.ts derives page views from
-- method/status/path and splits humans from bots on user_agent).
--
-- NOTE: a log drain has no "pageview" event type — that only exists in Vercel's
-- separate Web Analytics drain. Page views are DERIVED here, not delivered.
--
-- No unique constraint on vercel_id on purpose: drains occasionally re-deliver
-- a line, and de-duplication happens at query time via
-- COUNT(DISTINCT COALESCE(vercel_id, id)) rather than risking insert failures
-- on a hot ingest path. project_id is stored so a mis-scoped team-level drain
-- can be filtered out after the fact instead of silently inflating counts.
--
-- Additive + idempotent; id has no DB default (Prisma supplies uuid app-side),
-- matching partner_prospects / inbound_emails.

BEGIN;

CREATE TABLE IF NOT EXISTS "vercel_events" (
  "id"               TEXT PRIMARY KEY,
  -- Vercel's own log-line id (falls back to requestId); used for query-time dedupe.
  "vercel_id"        TEXT,
  "project_id"       TEXT,
  "source"           TEXT NOT NULL,
  "timestamp"        TIMESTAMPTZ NOT NULL,
  "path"             TEXT,
  "referrer"         TEXT,
  "status_code"      INTEGER,
  "method"           TEXT,
  "user_agent"       TEXT,
  "client_ip"        TEXT,
  "cache_status"     TEXT,
  "response_bytes"   INTEGER,
  "execution_region" TEXT,
  "environment"      TEXT,
  "deployment_id"    TEXT,
  "request_id"       TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "vercel_events_timestamp_idx"
  ON "vercel_events" ("timestamp");
CREATE INDEX IF NOT EXISTS "vercel_events_path_idx"
  ON "vercel_events" ("path");
CREATE INDEX IF NOT EXISTS "vercel_events_client_ip_idx"
  ON "vercel_events" ("client_ip");

COMMIT;
