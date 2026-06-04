-- Finance Director — Phase 1A: Stripe data deepening
--
-- Adds 3 Stripe net-amount columns to orders + 3 new tables for payouts,
-- balance snapshots, and disputes. All statements are idempotent.
--
-- Run against prod manually after PR merges:
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-05-20-finance-phase-1a.sql
--     npx prisma generate
--
-- Backfill of historical data is a separate one-shot:
--     npx tsx scripts/finance/backfill-stripe-history.ts

BEGIN;

-- =========================================================================
-- orders — Stripe net-amount columns
-- =========================================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_charge_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_fees_cents          INTEGER,
  ADD COLUMN IF NOT EXISTS net_received_cents         INTEGER;

-- =========================================================================
-- stripe_payouts
-- =========================================================================
CREATE TABLE IF NOT EXISTS stripe_payouts (
  id                   TEXT PRIMARY KEY,
  stripe_payout_id     TEXT NOT NULL,
  amount_cents         INTEGER NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'usd',
  status               TEXT NOT NULL,
  arrival_date         DATE NOT NULL,
  method               TEXT,
  destination          TEXT,
  description          TEXT,
  failure_code         TEXT,
  failure_message      TEXT,
  matched_plaid_tx_id  TEXT,
  matched_at           TIMESTAMP(3),
  raw_payload          JSONB NOT NULL,
  created_at           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS stripe_payouts_stripe_payout_id_key
  ON stripe_payouts (stripe_payout_id);
CREATE INDEX IF NOT EXISTS stripe_payouts_arrival_date_idx
  ON stripe_payouts (arrival_date);
CREATE INDEX IF NOT EXISTS stripe_payouts_status_idx
  ON stripe_payouts (status);
CREATE INDEX IF NOT EXISTS stripe_payouts_matched_plaid_tx_id_idx
  ON stripe_payouts (matched_plaid_tx_id);

-- =========================================================================
-- stripe_balances
-- =========================================================================
CREATE TABLE IF NOT EXISTS stripe_balances (
  id                       TEXT PRIMARY KEY,
  captured_at              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  available_cents          INTEGER NOT NULL,
  pending_cents            INTEGER NOT NULL,
  instant_available_cents  INTEGER,
  reserved_cents           INTEGER,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  raw_payload              JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS stripe_balances_captured_at_idx
  ON stripe_balances (captured_at);

-- =========================================================================
-- charge_disputes
-- =========================================================================
CREATE TABLE IF NOT EXISTS charge_disputes (
  id                       TEXT PRIMARY KEY,
  stripe_dispute_id        TEXT NOT NULL,
  stripe_charge_id         TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_cents             INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  reason                   TEXT,
  status                   TEXT NOT NULL,
  evidence_due_by          TIMESTAMP(3),
  is_charge_refundable     BOOLEAN NOT NULL DEFAULT FALSE,
  order_id                 TEXT,
  raw_payload              JSONB NOT NULL,
  created_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS charge_disputes_stripe_dispute_id_key
  ON charge_disputes (stripe_dispute_id);
CREATE INDEX IF NOT EXISTS charge_disputes_status_idx
  ON charge_disputes (status);
CREATE INDEX IF NOT EXISTS charge_disputes_stripe_charge_id_idx
  ON charge_disputes (stripe_charge_id);
CREATE INDEX IF NOT EXISTS charge_disputes_order_id_idx
  ON charge_disputes (order_id);

COMMIT;
