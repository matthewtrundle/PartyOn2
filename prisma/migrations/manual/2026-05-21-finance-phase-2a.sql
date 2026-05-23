-- Finance Director — Phase 2A: QuickBooks read OpEx
--
-- Caches QB Chart of Accounts + Purchase/Bill expense transactions inside
-- PartyOn so the dashboard renders OpEx-by-category without re-querying QB.
--
-- Run against prod manually:
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-05-21-finance-phase-2a.sql
--     npx prisma generate

BEGIN;

CREATE TABLE IF NOT EXISTS qb_accounts (
  id                   TEXT PRIMARY KEY,
  qb_account_id        TEXT NOT NULL,
  name                 TEXT NOT NULL,
  fully_qualified_name TEXT,
  account_type         TEXT,
  account_sub_type     TEXT,
  currency             TEXT NOT NULL DEFAULT 'USD',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS qb_accounts_qb_account_id_key
  ON qb_accounts (qb_account_id);
CREATE INDEX IF NOT EXISTS qb_accounts_account_type_idx
  ON qb_accounts (account_type);

CREATE TABLE IF NOT EXISTS qb_expenses (
  id                  TEXT PRIMARY KEY,
  qb_transaction_id   TEXT NOT NULL,
  txn_type            TEXT NOT NULL,
  txn_date            DATE NOT NULL,
  amount_cents        INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'USD',
  vendor_name         TEXT,
  qb_account_id       TEXT,
  category_slug       TEXT,
  memo                TEXT,
  raw_payload         JSONB NOT NULL,
  created_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS qb_expenses_qb_transaction_id_key
  ON qb_expenses (qb_transaction_id);
CREATE INDEX IF NOT EXISTS qb_expenses_txn_date_idx
  ON qb_expenses (txn_date);
CREATE INDEX IF NOT EXISTS qb_expenses_category_slug_txn_date_idx
  ON qb_expenses (category_slug, txn_date);
CREATE INDEX IF NOT EXISTS qb_expenses_qb_account_id_idx
  ON qb_expenses (qb_account_id);

-- Foreign-key relation (deferred to avoid blocking insert when QbAccount
-- hasn't been synced yet — qb_account_id is just a string reference).

COMMIT;
