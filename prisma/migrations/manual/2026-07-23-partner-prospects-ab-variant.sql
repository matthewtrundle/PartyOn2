-- Partner Outreach 2.0 — A/B test arm label on partner_prospects.
-- Adds a per-prospect copy-variant tag so a first-touch email A/B test
-- (A = short & sweet, B = feature-heavy/detailed) can be run without a
-- second copy slot: each prospect is randomized to one arm and drafted in
-- that one style, so the existing single draft_* column set already holds
-- the style-matched copy. draft_variant just labels which arm it is; the
-- send path (getSendableDraft / partner-outreach journey) is unchanged.
-- experiment_key names the test so results from separate tests stay
-- separable over time. Reply-rate results group by these two columns.
-- Additive + idempotent; both columns nullable (legacy rows carry no arm).

BEGIN;

ALTER TABLE "partner_prospects" ADD COLUMN IF NOT EXISTS "draft_variant" TEXT;
ALTER TABLE "partner_prospects" ADD COLUMN IF NOT EXISTS "experiment_key" TEXT;

CREATE INDEX IF NOT EXISTS "partner_prospects_experiment_key_draft_variant_idx"
  ON "partner_prospects" ("experiment_key", "draft_variant");

COMMIT;
