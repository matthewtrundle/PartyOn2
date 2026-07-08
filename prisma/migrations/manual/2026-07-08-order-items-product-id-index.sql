-- OrderItem.productId index (Full Moon Party ticket count / guest list)
--
-- The Full Moon Party endpoints filter order_items by product_id:
--   GET /api/v1/full-moon/count  -> SUM(quantity) WHERE product_id = ? AND order PAID
--   GET /api/v1/full-moon/guests -> rows WHERE product_id = ? AND order PAID
-- order_items only had an index on order_id, so both did a full-table scan by
-- product_id. This additive index keeps them fast (and blunts enumeration cost)
-- as order_items grows. Named to match Prisma's default so @@index([productId])
-- and the live index line up.

BEGIN;

CREATE INDEX IF NOT EXISTS "order_items_product_id_idx"
  ON "order_items" ("product_id");

COMMIT;
