-- Finance data cleanup — bank-derived expense columns on plaid_transactions
--
-- When QuickBooks has no (material) expenses for a month but the bank does, the bank
-- outflows ARE the real expenses. The monthly rollup uses these two columns to source
-- expenses from the bank feed for QB-dormant months (e.g. all of 2026) instead of
-- showing a falsely-tiny OpEx from the ~$1,700/mo of auto-posted Shopify fees.
--   - bank_derived_category   : the PartyOn CategorySlug (cogs / rent / ... / non_operating)
--                               assigned to the outflow by src/lib/finance/plaid-category-map.ts
--   - is_bank_derived_expense : true only for real business costs (cogs or an operating slug)
--                               on PRODUCTION items with no QB match. Transfers / CC payments /
--                               loan principal / owner draws are non_operating → false.
-- See docs/finance/DATA-CLEANUP-PLAN.md (B0/B2/B4).
--
-- This file auto-applies on the next PRODUCTION deploy via the _manual_migrations ledger
-- (`scripts/db/apply-manual-migrations.mjs --vercel-prod-only`, run from `npm run build`).
-- To apply locally / out of band:
--
--     npm run db:migrate:manual        # applies every pending file in this dir
--     npx prisma generate
--
-- Both statements are idempotent (`ADD COLUMN IF NOT EXISTS`) so the file is safe to re-run.

BEGIN;

ALTER TABLE plaid_transactions
  ADD COLUMN IF NOT EXISTS bank_derived_category TEXT;

ALTER TABLE plaid_transactions
  ADD COLUMN IF NOT EXISTS is_bank_derived_expense BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
