-- Finance Director — Phase 2C: Plaid sync + auto-reconciliation
--
-- Adds:
--   - plaid_transactions.matched_qb_expense_id (FK-by-string to QbExpense.qb_transaction_id)
--   - plaid_sync_cursors (one row per PlaidItem; stores Plaid /transactions/sync cursor)
--
-- Run against prod manually:
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-05-21-finance-phase-2c.sql
--     npx prisma generate

BEGIN;

ALTER TABLE plaid_transactions
  ADD COLUMN IF NOT EXISTS matched_qb_expense_id TEXT;

CREATE INDEX IF NOT EXISTS plaid_transactions_matched_qb_expense_id_idx
  ON plaid_transactions (matched_qb_expense_id);

CREATE TABLE IF NOT EXISTS plaid_sync_cursors (
  id              TEXT PRIMARY KEY,
  plaid_item_id   TEXT NOT NULL,
  cursor          TEXT,
  last_synced_at  TIMESTAMP(3),
  last_error      TEXT,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS plaid_sync_cursors_plaid_item_id_key
  ON plaid_sync_cursors (plaid_item_id);

COMMIT;
