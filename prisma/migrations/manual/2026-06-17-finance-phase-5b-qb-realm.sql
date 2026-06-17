-- Finance Director — Phase 5B: stamp QB realm on cached expense/account rows
--
-- Adds a realm_id column to qb_expenses + qb_accounts so we can tell which
-- QuickBooks company a cached row came from. This lets the all-time backfill
-- purge the old SANDBOX rows (realm 9341457195868909, written before this
-- column existed → NULL) without touching real production data
-- (realm 9130357382202626 = Premier Concierge Worldwide).
--
-- Additive + idempotent. Existing rows get realm_id = NULL; the backfill's
-- purge step treats NULL as "not the current production realm" and clears them.
--
-- Run against prod manually (Neon SQL editor or psql):
--     psql "$DATABASE_URL" -f prisma/migrations/manual/2026-06-17-finance-phase-5b-qb-realm.sql
--     npx prisma generate

BEGIN;

ALTER TABLE qb_expenses ADD COLUMN IF NOT EXISTS realm_id TEXT;
ALTER TABLE qb_accounts ADD COLUMN IF NOT EXISTS realm_id TEXT;

CREATE INDEX IF NOT EXISTS qb_expenses_realm_id_idx ON qb_expenses (realm_id);
CREATE INDEX IF NOT EXISTS qb_accounts_realm_id_idx ON qb_accounts (realm_id);

COMMIT;
