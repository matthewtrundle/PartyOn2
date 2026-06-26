-- Finance Director — Phase 5A: Shopify order archive
--
-- Stores a thin financial snapshot of every Shopify order ever processed so
-- the monthly trajectory rollups (Phase 5C) can cover the full history of the
-- business, not just the ~5 months currently in the Order table.
--
-- This is NOT a replacement for the Order table. Order rows are still the
-- system of record for fulfillment / picking / refunds / accounting. This
-- archive holds the minimum financial + attribution fields needed for
-- multi-year trajectory math.
--
-- Run against prod manually:
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-06-12-finance-phase-5a-shopify-archive.sql
--     npx prisma generate

BEGIN;

CREATE TABLE IF NOT EXISTS shopify_order_archive (
  id                       TEXT PRIMARY KEY,
  shopify_order_id         TEXT NOT NULL,
  shopify_order_name       TEXT,
  processed_at             TIMESTAMP(3) NOT NULL,
  shopify_created_at       TIMESTAMP(3) NOT NULL,
  total_price_cents        INTEGER NOT NULL,
  subtotal_price_cents     INTEGER NOT NULL,
  total_tax_cents          INTEGER NOT NULL DEFAULT 0,
  total_shipping_cents     INTEGER NOT NULL DEFAULT 0,
  total_discounts_cents    INTEGER NOT NULL DEFAULT 0,
  total_refunds_cents      INTEGER NOT NULL DEFAULT 0,
  currency                 TEXT NOT NULL DEFAULT 'USD',
  financial_status         TEXT,
  fulfillment_status       TEXT,
  customer_email           TEXT,
  shopify_customer_id      TEXT,
  landing_page             TEXT,
  referring_site           TEXT,
  source_identifier        TEXT,
  source_name              TEXT,
  /// Denormalised line items: [{ sku, title, productId, variantId, quantity, priceCents }].
  /// Kept inline so the monthly rollup builder can compute top-SKUs without
  /// fanning out a per-order join.
  line_items               JSONB NOT NULL DEFAULT '[]'::jsonb,
  /// Shopify-side tag list (e.g. "boat-delivery", "wedding").
  tags                     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  note                     TEXT,
  /// Optional full payload snapshot for debugging. NULL once we trust the sync.
  raw_payload              JSONB,
  synced_at                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS shopify_order_archive_shopify_order_id_key
  ON shopify_order_archive (shopify_order_id);
CREATE INDEX IF NOT EXISTS shopify_order_archive_processed_at_idx
  ON shopify_order_archive (processed_at);
CREATE INDEX IF NOT EXISTS shopify_order_archive_financial_status_idx
  ON shopify_order_archive (financial_status);
CREATE INDEX IF NOT EXISTS shopify_order_archive_customer_email_idx
  ON shopify_order_archive (customer_email);
CREATE INDEX IF NOT EXISTS shopify_order_archive_shopify_customer_id_idx
  ON shopify_order_archive (shopify_customer_id);

-- Operational notes used by the backfill script + safety-net cron to
-- remember the last-seen Shopify updated_at cursor, so the daily cron can
-- pull only what changed since the last successful run.
CREATE TABLE IF NOT EXISTS shopify_archive_sync_state (
  id                       TEXT PRIMARY KEY DEFAULT 'singleton',
  last_full_backfill_at    TIMESTAMP(3),
  last_incremental_at      TIMESTAMP(3),
  last_cursor_updated_at   TIMESTAMP(3),
  last_error               TEXT,
  total_orders_archived    INTEGER NOT NULL DEFAULT 0,
  updated_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO shopify_archive_sync_state (id) VALUES ('singleton')
  ON CONFLICT (id) DO NOTHING;

COMMIT;
