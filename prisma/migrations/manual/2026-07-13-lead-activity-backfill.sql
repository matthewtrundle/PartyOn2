-- Lead Flow board — backfill last_activity_at from real event history.
--
-- Companion to 2026-07-13-lead-pipeline.sql (already applied — never edit an
-- applied file, hence this separate migration). Without this, leads that
-- predate the pipeline have last_activity_at NULL and scoring would fall
-- back to updated_at — but the daily rescore itself bumps updated_at (it
-- writes the row), so recency would never decay (code-review finding #2).
-- The code-side fix drops the updated_at fallback entirely (createdAt only);
-- this backfill gives historical leads their honest activity timestamp.
--
-- Idempotent: only touches rows still NULL.

BEGIN;

UPDATE leads
SET last_activity_at = COALESCE(
  (SELECT MAX(e.occurred_at) FROM lead_events e WHERE e.lead_id = leads.id),
  created_at
)
WHERE last_activity_at IS NULL;

COMMIT;
