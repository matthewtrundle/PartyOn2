-- Variant B of the outreach draft: the original enrichment-based
-- personalized email (legacy-manual, from the prospect JSON files),
-- preserved alongside the Hormozi 3-touch draft so re-drafting variant A
-- never loses Brian's originals. Populated by
-- scripts/restore-legacy-draft-b.ts; read-only in the send path for now.
BEGIN;

ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS draft_b_subject TEXT;
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS draft_b_body TEXT;
-- Where variant B came from, e.g. 'legacy-manual-json'.
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS draft_b_source TEXT;

COMMIT;
