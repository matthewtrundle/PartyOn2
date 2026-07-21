-- 2026-07-21 · Partner-prospect CRM: lead tags
--
-- leads.tags — free-form tag array separating partner leads from
-- consumer leads ('partner-prospect', 'partner-active', 'str',
-- 'bartender'). GIN index for has-tag filtering on the Lead board.
-- (The companion PARTNER_OUTREACH enum value lives in its own file,
-- per the single-statement ALTER TYPE convention.)
--
-- Additive + idempotent. Old code ignores the column.

BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS leads_tags_gin_idx ON leads USING GIN (tags);

COMMIT;
