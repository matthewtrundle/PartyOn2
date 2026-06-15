-- Charge snapshot — fix the two-snapshot billing race (OrderItems vs Stripe charge)
--
-- Persists the exact PRODUCT line items priced into each Stripe charge at session-creation,
-- so the fulfillment Order's items are built from an immutable snapshot instead of a re-read
-- of the cart/drafts at webhook time. This closes the race where items added/removed between
-- the two reads ship free (undercharge) or stay billed but undelivered (overcharge).
-- See src/lib/stripe/charge-snapshot.ts.
--
-- Per saved memory `prisma_schema_drift.md`, schema.prisma has drift from prod, so
-- `prisma db push` is unsafe. Run this file against prod manually:
--
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-06-15-charge-snapshot.sql
--     npx prisma generate
--
-- All statements are idempotent (`ADD COLUMN IF NOT EXISTS`) so the file is safe to re-run.

BEGIN;

-- Group V2: snapshot of the product lines charged on a participant's Stripe session.
ALTER TABLE participant_payments ADD COLUMN IF NOT EXISTS charged_line_items JSONB;

-- Solo checkout: snapshot of the product lines charged on the cart's Stripe session.
ALTER TABLE carts                ADD COLUMN IF NOT EXISTS charged_line_items JSONB;

COMMIT;
