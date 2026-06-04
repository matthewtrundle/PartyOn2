-- Finance Director — Phase 0 schema
--
-- Per saved memory `prisma_schema_drift.md`: schema.prisma has columns that
-- no longer exist in prod, so `prisma db push` is unsafe. Run this file
-- against prod manually:
--
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-05-20-finance-phase-0.sql
--
-- All statements are idempotent (`IF NOT EXISTS`) so the file is safe to re-run.
-- After running, regenerate the prisma client: `npx prisma generate`.

BEGIN;

-- =========================================================================
-- finance_recommendations — mirror of operations_recommendations
-- =========================================================================
CREATE TABLE IF NOT EXISTS finance_recommendations (
  id                  TEXT PRIMARY KEY,
  signal_kind         TEXT NOT NULL,
  severity            TEXT NOT NULL,
  title               TEXT NOT NULL,
  evidence            JSONB NOT NULL,
  target_entity_type  TEXT NOT NULL,
  target_entity_id    TEXT NOT NULL,
  action_payload      JSONB NOT NULL,
  status              TEXT NOT NULL DEFAULT 'open',
  snooze_until        TIMESTAMP(3),
  dismiss_reason      TEXT,
  action_log          JSONB NOT NULL DEFAULT '[]'::jsonb,
  source              TEXT NOT NULL DEFAULT 'auto-snapshot',
  shipped_at          TIMESTAMP(3),
  measured_at         TIMESTAMP(3),
  measurement_result  JSONB,
  dedupe_key          TEXT NOT NULL,
  created_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_recommendations_dedupe_key_key
  ON finance_recommendations (dedupe_key);
CREATE INDEX IF NOT EXISTS finance_recommendations_status_idx
  ON finance_recommendations (status);
CREATE INDEX IF NOT EXISTS finance_recommendations_severity_status_idx
  ON finance_recommendations (severity, status);
CREATE INDEX IF NOT EXISTS finance_recommendations_signal_kind_status_idx
  ON finance_recommendations (signal_kind, status);

-- =========================================================================
-- finance_snapshots — daily P&L snapshot (populated Phase 1C)
-- =========================================================================
CREATE TABLE IF NOT EXISTS finance_snapshots (
  id            TEXT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_snapshots_snapshot_date_idx
  ON finance_snapshots (snapshot_date);

-- =========================================================================
-- intuit_oauth_state — single-row holder (id = 'singleton')
-- =========================================================================
CREATE TABLE IF NOT EXISTS intuit_oauth_state (
  id                     TEXT PRIMARY KEY,
  realm_id               TEXT NOT NULL,
  access_token           TEXT NOT NULL,
  refresh_token          TEXT NOT NULL,
  access_token_expires   TIMESTAMP(3) NOT NULL,
  refresh_token_expires  TIMESTAMP(3) NOT NULL,
  environment            TEXT NOT NULL DEFAULT 'sandbox',
  last_refreshed_at      TIMESTAMP(3),
  last_error             TEXT,
  created_at             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- plaid_items — one row per linked institution
-- =========================================================================
CREATE TABLE IF NOT EXISTS plaid_items (
  id                TEXT PRIMARY KEY,
  item_id           TEXT NOT NULL,
  access_token      TEXT NOT NULL,
  institution_id    TEXT,
  institution_name  TEXT,
  environment       TEXT NOT NULL DEFAULT 'sandbox',
  status            TEXT NOT NULL DEFAULT 'active',
  last_sync_at      TIMESTAMP(3),
  last_error        TEXT,
  created_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS plaid_items_item_id_key
  ON plaid_items (item_id);

-- =========================================================================
-- plaid_accounts — one row per account inside an item
-- =========================================================================
CREATE TABLE IF NOT EXISTS plaid_accounts (
  id                 TEXT PRIMARY KEY,
  plaid_item_id      TEXT NOT NULL,
  account_id         TEXT NOT NULL,
  name               TEXT NOT NULL,
  official_name      TEXT,
  mask               TEXT,
  type               TEXT NOT NULL,
  subtype            TEXT,
  current_balance    DECIMAL(15, 2),
  available_balance  DECIMAL(15, 2),
  iso_currency_code  TEXT DEFAULT 'USD',
  created_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT plaid_accounts_plaid_item_id_fkey
    FOREIGN KEY (plaid_item_id) REFERENCES plaid_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS plaid_accounts_account_id_key
  ON plaid_accounts (account_id);
CREATE INDEX IF NOT EXISTS plaid_accounts_plaid_item_id_idx
  ON plaid_accounts (plaid_item_id);

-- =========================================================================
-- plaid_transactions — bank transactions (Phase 2C populates)
-- =========================================================================
CREATE TABLE IF NOT EXISTS plaid_transactions (
  id                              TEXT PRIMARY KEY,
  plaid_item_id                   TEXT NOT NULL,
  account_id                      TEXT NOT NULL,
  transaction_id                  TEXT NOT NULL,
  date                            DATE NOT NULL,
  authorized_date                 DATE,
  amount                          DECIMAL(15, 2) NOT NULL,
  iso_currency_code               TEXT DEFAULT 'USD',
  name                            TEXT NOT NULL,
  merchant_name                   TEXT,
  pending                         BOOLEAN NOT NULL DEFAULT FALSE,
  payment_channel                 TEXT,
  category                        TEXT[] NOT NULL DEFAULT '{}',
  pfc_primary                     TEXT,
  pfc_detailed                    TEXT,
  matched_stripe_payout_id        TEXT,
  matched_receiving_invoice_id    TEXT,
  qb_transaction_id               TEXT,
  qb_category_assigned            TEXT,
  reconciled_at                   TIMESTAMP(3),
  created_at                      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT plaid_transactions_plaid_item_id_fkey
    FOREIGN KEY (plaid_item_id) REFERENCES plaid_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS plaid_transactions_transaction_id_key
  ON plaid_transactions (transaction_id);
CREATE INDEX IF NOT EXISTS plaid_transactions_plaid_item_id_idx
  ON plaid_transactions (plaid_item_id);
CREATE INDEX IF NOT EXISTS plaid_transactions_date_idx
  ON plaid_transactions (date);
CREATE INDEX IF NOT EXISTS plaid_transactions_account_id_date_idx
  ON plaid_transactions (account_id, date);
CREATE INDEX IF NOT EXISTS plaid_transactions_reconciled_at_idx
  ON plaid_transactions (reconciled_at);

COMMIT;
