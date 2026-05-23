-- Finance Director — Phase 2B: QuickBooks write sales journals
--
-- Stores per-day sales journal entries drafted by the daily cron and posted
-- to QB only after operator approval. Plus a single-row config table where
-- the operator maps PartyOn revenue/expense concepts to QB account IDs.
--
-- Run against prod manually:
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-05-21-finance-phase-2b.sql
--     npx prisma generate

BEGIN;

CREATE TABLE IF NOT EXISTS qb_journal_entries (
  id                  TEXT PRIMARY KEY,
  entry_date          DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  source_payload      JSONB NOT NULL,
  proposed_payload    JSONB NOT NULL,
  line_summary        JSONB NOT NULL,
  qb_transaction_id   TEXT,
  posted_at           TIMESTAMP(3),
  approved_by         TEXT,
  approved_at         TIMESTAMP(3),
  rejected_reason     TEXT,
  failure_reason      TEXT,
  action_log          JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One active (PENDING_APPROVAL or APPROVED) entry per day at most. POSTED /
-- REJECTED / SUPERSEDED / FAILED rows don't conflict, which lets the cron
-- re-draft after a SUPERSEDED.
CREATE UNIQUE INDEX IF NOT EXISTS qb_journal_entries_active_per_day
  ON qb_journal_entries (entry_date, status);
CREATE INDEX IF NOT EXISTS qb_journal_entries_status_idx
  ON qb_journal_entries (status);
CREATE INDEX IF NOT EXISTS qb_journal_entries_entry_date_idx
  ON qb_journal_entries (entry_date);

CREATE TABLE IF NOT EXISTS qb_journal_config (
  id                            TEXT PRIMARY KEY,
  stripe_clearing_account_id    TEXT,
  stripe_fees_account_id        TEXT,
  sales_revenue_account_id      TEXT,
  sales_tax_payable_account_id  TEXT,
  delivery_revenue_account_id   TEXT,
  tips_payable_account_id       TEXT,
  refunds_account_id            TEXT,
  discounts_account_id          TEXT,
  enabled                       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
