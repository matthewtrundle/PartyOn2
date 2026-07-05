-- Site-wide follow-up email system — Phase 0 foundation
--
-- Backs the follow-up engine (/api/cron/follow-up-engine + src/lib/followups/):
-- every email capture on the site gets a planned, automated follow-up
-- (2-touch max, email-only for now, SMS-ready via phone + sms_consent).
--
--   follow_up_jobs     — the send queue. One row per journey step per entity.
--                        dedupe_key ("<journey>:<step>:<entityId>") makes
--                        re-enqueues from route hooks and engine sweeps free.
--   email_suppressions — global do-not-email list (unsubscribe/bounce/
--                        complaint/manual). Checked by the engine before every
--                        follow-up send; transactional emails (invoices,
--                        receipts) intentionally bypass it.
--
-- Per saved memory `prisma_schema_drift`: schema.prisma is intentionally
-- drifted from prod, so `prisma db push` is unsafe. This file is applied
-- automatically on prod deploys by scripts/db/apply-manual-migrations.mjs
-- (recorded once in the _manual_migrations ledger). Apply locally with:
--   npm run db:migrate:manual   (after sourcing .env.local)
-- then regenerate the client:  npx prisma generate
--
-- The FOLLOW_UP EmailType enum value lives in its own migration file
-- (2026-07-06-followups-emailtype.sql) because ALTER TYPE ADD VALUE cannot
-- share a transaction with statements that use the new value.
--
-- All statements are idempotent (IF NOT EXISTS) — safe to re-run.

BEGIN;

-- =========================================================================
-- follow_up_jobs — scheduled follow-up sends
-- =========================================================================
CREATE TABLE IF NOT EXISTS follow_up_jobs (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  journey_key         TEXT NOT NULL,                    -- e.g. abandoned-quote (src/lib/followups/journeys.ts)
  step                INTEGER NOT NULL DEFAULT 1,       -- 1 or 2 (2-touch max)
  email               TEXT NOT NULL,                    -- always lowercased at enqueue
  phone               TEXT,                             -- SMS-ready; unused until CoreLinq bridge exits shadow
  sms_consent         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Entity references (scalar ids, no FKs — entities live in the same DB but
  -- jobs must survive entity deletes for audit).
  lead_id             TEXT,
  draft_order_id      TEXT,
  partner_inquiry_id  TEXT,
  order_id            TEXT,

  payload             JSONB,                            -- render context snapshot at enqueue
  dedupe_key          TEXT NOT NULL UNIQUE,             -- "<journey>:<step>:<entityId>"

  scheduled_for       TIMESTAMPTZ NOT NULL,             -- includes 0-45min jitter from enqueue
  status              TEXT NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','processing','sent','canceled','suppressed','failed')),
  claimed_at          TIMESTAMPTZ,                      -- set when the engine claims the job
  attempts            INTEGER NOT NULL DEFAULT 0,
  sent_at             TIMESTAMPTZ,
  canceled_at         TIMESTAMPTZ,
  cancel_reason       TEXT,                             -- e.g. converted-order, invoice-paid, suppressed
  last_error          TEXT,
  email_log_id        TEXT,                             -- EmailLog.id of the sent email

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Engine tick: claim due jobs.
CREATE INDEX IF NOT EXISTS idx_follow_up_jobs_status_scheduled
  ON follow_up_jobs (status, scheduled_for);

-- Cancel-by-email (Stripe webhook, suppression fan-out).
CREATE INDEX IF NOT EXISTS idx_follow_up_jobs_email
  ON follow_up_jobs (email);

-- Admin dashboard: per-journey queue/sent counts.
CREATE INDEX IF NOT EXISTS idx_follow_up_jobs_journey_status_created
  ON follow_up_jobs (journey_key, status, created_at);

-- Cancel-by-draft (invoice paid) / cancel-by-lead — partial: most rows null.
CREATE INDEX IF NOT EXISTS idx_follow_up_jobs_draft_order
  ON follow_up_jobs (draft_order_id) WHERE draft_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_follow_up_jobs_lead
  ON follow_up_jobs (lead_id) WHERE lead_id IS NOT NULL;

-- =========================================================================
-- email_suppressions — global do-not-email list for follow-ups
-- =========================================================================
CREATE TABLE IF NOT EXISTS email_suppressions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email       TEXT NOT NULL UNIQUE,                     -- always lowercased
  reason      TEXT NOT NULL
              CHECK (reason IN ('unsubscribe','bounce','complaint','manual')),
  source      TEXT,                                     -- e.g. one-click, preferences-page, resend-webhook, admin
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
