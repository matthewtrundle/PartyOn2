-- Add operator-set cruise-type override to group_orders_v2.
--
-- Stores 'DISCO' | 'PRIVATE' for boat / marina-delivery dashboards where the
-- Premier boat-manifest match is missing, so the ops pick sheet can print the
-- cruise type. Set from the pre-print gate on the Ops/Orders page.
--
-- Additive, nullable, idempotent. No backfill (null = fall back to manifest /
-- unknown, resolved at print time).
BEGIN;

ALTER TABLE group_orders_v2 ADD COLUMN IF NOT EXISTS cruise_type TEXT;

COMMIT;
