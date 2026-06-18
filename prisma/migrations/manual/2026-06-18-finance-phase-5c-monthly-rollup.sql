-- Finance Director — Phase 5C: monthly trajectory rollup
--
-- One pre-computed row per (year, month) so the monthly close email + the
-- /admin/finance trajectory view render instantly without re-aggregating the
-- whole history. Built by src/lib/finance/monthly-rollup.ts, which UNIONs the
-- two revenue eras (ShopifyOrderArchive ≤2025-12 + Order ≥2026-01) and layers
-- in QB OpEx (2023-2025) where available.
--
-- Scalars are in cents (match Stripe / qb_expenses). Breakdowns are JSONB so
-- the shape can evolve without a migration. Nullable profit columns stay NULL
-- when the underlying data is incomplete (e.g. no QB expenses for the month) —
-- the briefing renders "pending" rather than a fake number.
--
-- Additive + idempotent. Run against prod manually:
--   psql "$DATABASE_URL" -f prisma/migrations/manual/2026-06-18-finance-phase-5c-monthly-rollup.sql
--   npx prisma generate

BEGIN;

CREATE TABLE IF NOT EXISTS finance_monthly_rollup (
  id                     TEXT PRIMARY KEY,
  year                   INTEGER NOT NULL,
  month                  INTEGER NOT NULL, -- 1-12
  -- Revenue (union of both eras, deduped)
  revenue_cents          BIGINT NOT NULL DEFAULT 0,
  order_count            INTEGER NOT NULL DEFAULT 0,
  -- Cost / profit (NULL when data incomplete)
  cogs_cents             BIGINT,
  gross_profit_cents     BIGINT,
  opex_cents             BIGINT,
  net_income_cents       BIGINT,
  -- Which revenue sources contributed this month
  revenue_from_shopify_cents  BIGINT NOT NULL DEFAULT 0,
  revenue_from_orders_cents   BIGINT NOT NULL DEFAULT 0,
  -- Breakdowns (JSONB)
  top_skus               JSONB NOT NULL DEFAULT '[]'::jsonb,
  segment_breakdown      JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_customers          JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_affiliates         JSONB NOT NULL DEFAULT '[]'::jsonb,
  expense_categories     JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Per-month data-health flags (what's missing / not trustworthy)
  data_health            JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_monthly_rollup_year_month_key
  ON finance_monthly_rollup (year, month);

COMMIT;
