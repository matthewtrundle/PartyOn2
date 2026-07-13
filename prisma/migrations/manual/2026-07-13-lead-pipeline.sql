-- Lead Flow board — pipeline columns on leads.
--
-- Backs the /admin/leads Kanban (src/lib/leads/pipeline.ts + scoring.ts):
-- every submitted lead enters a sales pipeline (NEW → CONTACTED → QUALIFIED →
-- QUOTE_SENT → WON → LOST) with a rule-based 0–100 temperature score.
--
-- Design rules (from the 2026-07-13 plan risk review):
--   - pipeline_stage is a NEW column; the existing LeadStatus enum is
--     untouched — the follow-ups engine reads Lead.status in shouldCancel
--     and must keep its semantics.
--   - pipeline_stage is TEXT + CHECK, not a Postgres enum (precedent:
--     follow_up_jobs.status) so adding a stage later is a code-only change.
--   - Backfill is selective: 243/263 prod leads are pixel fragments; only
--     SUBMITTED leads with contact info that aren't newsletter-only signups
--     enter the board. Fragments keep pipeline_stage NULL (= off board).
--
-- Per prisma/migrations/manual/README.md: additive + idempotent, applied
-- automatically on prod deploys via the _manual_migrations ledger.
-- The LEAD_REPLY EmailType value lives in its own solo file
-- (2026-07-13-lead-reply-emailtype.sql) — ALTER TYPE can't share a transaction.

BEGIN;

-- =========================================================================
-- Pipeline columns
-- =========================================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_stage    TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_changed_at  TIMESTAMP(3);
-- Fractional ranking within a column: lower sorts first (top). Enroll code
-- writes -epoch-seconds so newest lands on top; drags write midpoints.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS board_sort_order  DOUBLE PRECISION NOT NULL DEFAULT 0;
-- Stored rule-based temperature (0–100), recomputed on pipeline writes +
-- daily cron decay. Hot/warm/cold labels are derived in code from
-- SCORE_THRESHOLDS — never stored.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score        INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_breakdown   JSONB;
-- Stamped when staff reply from the board (email v1; SMS post-CoreLinq).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP(3);
-- Bumped by recordEvent so board reads never scan lead_events.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at  TIMESTAMP(3);
-- Stamped when a WON/LOST lead submits a fresh inquiry and re-enters NEW;
-- the won-order matcher uses max(created_at, reopened_at) as its floor.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reopened_at       TIMESTAMP(3);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner             TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS snoozed_until     TIMESTAMP(3);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason       TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_at            TIMESTAMP(3);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_at           TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_pipeline_stage_check'
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT leads_pipeline_stage_check CHECK (
      pipeline_stage IS NULL OR pipeline_stage IN
        ('NEW','CONTACTED','QUALIFIED','QUOTE_SENT','WON','LOST')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_lead_score_check'
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT leads_lead_score_check CHECK (
      lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100)
    );
  END IF;
END $$;

-- Board column reads: WHERE pipeline_stage = X ORDER BY board_sort_order.
CREATE INDEX IF NOT EXISTS leads_pipeline_stage_sort_idx
  ON leads (pipeline_stage, board_sort_order)
  WHERE pipeline_stage IS NOT NULL;
-- Needs-response / hot-badge queries.
CREATE INDEX IF NOT EXISTS leads_last_contacted_idx
  ON leads (last_contacted_at);

-- =========================================================================
-- Selective backfill (idempotent: only rows still NULL are touched).
-- "Newsletter-only" = EMAIL_SIGNUP widget whose metadata never gained a
-- quiz/quote payload — subscribers, not party inquiries.
-- =========================================================================
UPDATE leads
SET pipeline_stage = 'WON',
    won_at = updated_at,
    stage_changed_at = NOW(),
    board_sort_order = -EXTRACT(EPOCH FROM updated_at)
WHERE pipeline_stage IS NULL AND status = 'CONVERTED';

UPDATE leads
SET pipeline_stage = 'NEW',
    stage_changed_at = NOW(),
    board_sort_order = -EXTRACT(EPOCH FROM updated_at)
WHERE pipeline_stage IS NULL
  AND status = 'SUBMITTED'
  AND (email IS NOT NULL OR phone IS NOT NULL)
  AND updated_at > NOW() - INTERVAL '90 days'
  AND NOT (
    source_widget = 'EMAIL_SIGNUP'
    AND NOT (metadata ?| ARRAY['conciergeQuiz','chatQuiz','eventQuiz','contactForm','unifiedQuote','quote'])
  );

UPDATE leads
SET pipeline_stage = 'LOST',
    lost_at = NOW(),
    lost_reason = 'stale_backfill',
    stage_changed_at = NOW(),
    board_sort_order = -EXTRACT(EPOCH FROM updated_at)
WHERE pipeline_stage IS NULL
  AND status = 'SUBMITTED'
  AND (email IS NOT NULL OR phone IS NOT NULL)
  AND updated_at <= NOW() - INTERVAL '90 days'
  AND NOT (
    source_widget = 'EMAIL_SIGNUP'
    AND NOT (metadata ?| ARRAY['conciergeQuiz','chatQuiz','eventQuiz','contactForm','unifiedQuote','quote'])
  );

COMMIT;
