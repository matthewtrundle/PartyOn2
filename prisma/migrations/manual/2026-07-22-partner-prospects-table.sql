-- Partner Outreach 2.0 — partner_prospects table.
-- Moves the prospect pipeline out of the static JSON files
-- (src/data/str-partner-prospects.json / bartending-partner-prospects.json)
-- into Postgres so discovery/enrichment/drafting/verification/approval can
-- happen without a deploy. One row per company, deduped globally by
-- website_key (host+path, matching websiteKey() in src/lib/partners).
-- The dossier lives in "enrichment" JSONB (same shape the UI already renders);
-- the 3-touch drafts (subject / alt-subject resend branch / body / +5d bump /
-- +12d close) live in draft_* columns read fresh at send time by the
-- partner-outreach journey. Email deliverability gating lives in
-- email_verify_* (ZeroBounce). Additive + idempotent; id has no DB default
-- (Prisma supplies uuid app-side); lead_id FK is ON DELETE SET NULL, matching
-- 2026-07-22-wayne-chat-conversations-table.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS "partner_prospects" (
  "id"                         TEXT PRIMARY KEY,
  "vertical"                   TEXT NOT NULL,
  "city"                       TEXT NOT NULL DEFAULT 'Austin',
  "name"                       TEXT NOT NULL,
  "website"                    TEXT NOT NULL,
  "website_key"                TEXT NOT NULL UNIQUE,
  "properties_estimate"        TEXT,
  "contact_name"               TEXT,
  "email"                      TEXT,
  "phone"                      TEXT,
  "socials"                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  "logo_url"                   TEXT,
  "description"                TEXT NOT NULL DEFAULT '',
  "partner_slug"               TEXT,
  "lead_id"                    TEXT REFERENCES "leads"("id") ON DELETE SET NULL,

  -- discovery provenance
  "source"                     TEXT NOT NULL DEFAULT 'manual',
  "discovered_at"              TIMESTAMPTZ,
  "discovery_query"            TEXT,

  -- web research (dossier)
  "research_status"            TEXT NOT NULL DEFAULT 'PENDING'
    CHECK ("research_status" IN ('PENDING','RUNNING','ENRICHED','FAILED')),
  "research_started_at"        TIMESTAMPTZ,
  "enrichment"                 JSONB,
  "enriched_at"                TIMESTAMPTZ,
  "research_error"             TEXT,
  "research_model"             TEXT,
  "research_usage"             JSONB,

  -- outreach draft (3 touches; bodies are signature-free plain text)
  "draft_status"               TEXT NOT NULL DEFAULT 'NONE'
    CHECK ("draft_status" IN ('NONE','DRAFTING','DRAFTED','APPROVED','FAILED')),
  "draft_subject"              TEXT,
  "draft_alt_subject"          TEXT,
  "draft_body"                 TEXT,
  "draft_follow_up_body"       TEXT,
  "draft_touch3_body"          TEXT,
  "draft_hook"                 JSONB,
  "draft_model"                TEXT,
  "draft_generated_at"         TIMESTAMPTZ,
  "draft_approved_at"          TIMESTAMPTZ,
  "draft_approved_by"          TEXT,
  "draft_error"                TEXT,
  "draft_redo_guidance"        TEXT,

  -- email deliverability verification (ZeroBounce)
  "email_verify_status"        TEXT NOT NULL DEFAULT 'UNVERIFIED'
    CHECK ("email_verify_status" IN ('UNVERIFIED','VALID','INVALID','CATCH_ALL','UNKNOWN','ROLE')),
  "email_verified_at"          TIMESTAMPTZ,
  "email_verify_raw"           JSONB,
  "email_verify_override"      BOOLEAN NOT NULL DEFAULT false,
  "email_verify_overridden_by" TEXT,

  "created_at"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "partner_prospects_vertical_city_idx"
  ON "partner_prospects" ("vertical", "city");
CREATE INDEX IF NOT EXISTS "partner_prospects_research_status_idx"
  ON "partner_prospects" ("research_status");
CREATE INDEX IF NOT EXISTS "partner_prospects_draft_status_idx"
  ON "partner_prospects" ("draft_status");
CREATE INDEX IF NOT EXISTS "partner_prospects_lead_id_idx"
  ON "partner_prospects" ("lead_id");
CREATE INDEX IF NOT EXISTS "partner_prospects_email_idx"
  ON "partner_prospects" ("email");

COMMIT;
