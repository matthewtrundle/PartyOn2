-- Group-order first-touch attribution — fix the analytics hub's ≈0 conversion/revenue per page.
--
-- ~95% of orders flow through the group-order dashboard, which never stamped
-- Order.landingPage / Order.utm*. Only the DIRECT Stripe-checkout path did, so the
-- per-landing-page hub (getLandingPageRollupForPaths / getConversionSummary) read ≈0 for
-- every page. We now capture the HOST's first-touch attribution on the GroupOrderV2 at
-- create time; the group-payment webhook reads it back from the group row and stamps it
-- (plus the derived segment) onto every Order created from that group's SubOrder payments.
--
-- These columns are written once at group-create and only ever read by primary key in the
-- webhook (src/lib/stripe/group-v2-payments.ts) — never filtered or grouped — so NO index is
-- needed. The analytics rollups read Order.landingPage (already indexed), not these.
--
-- Per saved memory `prisma_schema_drift`, schema.prisma is intentionally drifted from prod, so
-- `prisma db push` is unsafe. This file is additive + idempotent (ADD COLUMN IF NOT EXISTS) and
-- is applied automatically on prod deploys by scripts/db/apply-manual-migrations.mjs (recorded
-- once in the _manual_migrations ledger). To run by hand:
--
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-06-26-group-order-attribution.sql
--     npx prisma generate

BEGIN;

ALTER TABLE group_orders_v2 ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE group_orders_v2 ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE group_orders_v2 ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE group_orders_v2 ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE group_orders_v2 ADD COLUMN IF NOT EXISTS utm_term     TEXT;
ALTER TABLE group_orders_v2 ADD COLUMN IF NOT EXISTS utm_content  TEXT;
ALTER TABLE group_orders_v2 ADD COLUMN IF NOT EXISTS referrer     TEXT;

COMMIT;
