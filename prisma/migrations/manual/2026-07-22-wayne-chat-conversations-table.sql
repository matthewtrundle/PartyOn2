-- Wayne chat capture — chat_conversations table.
-- One row per free-form Wayne (AIConcierge) conversation, keyed by a
-- client-generated conversation_id (UNIQUE) that the /api/chat route upserts the
-- full message history into each turn. Linked to its Lead when contact is
-- captured, so the Lead Flow board drawer can show the conversation. Additive +
-- idempotent. Mirrors the inbound_emails table (2026-07-14-inbound-emails-table.sql):
-- id has no DB default (Prisma supplies uuid app-side); lead_id FK is
-- ON DELETE SET NULL so the transcript survives if a lead is ever removed.

BEGIN;

CREATE TABLE IF NOT EXISTS "chat_conversations" (
  "id"                     TEXT PRIMARY KEY,
  "conversation_id"        TEXT NOT NULL UNIQUE,
  "messages"               JSONB NOT NULL DEFAULT '[]'::jsonb,
  "lead_id"                TEXT REFERENCES "leads"("id") ON DELETE SET NULL,
  "first_page"             TEXT,
  "utm_source"             TEXT,
  "utm_medium"             TEXT,
  "utm_campaign"           TEXT,
  "escalated"              BOOLEAN NOT NULL DEFAULT false,
  "escalation_reason"      TEXT,
  "escalation_notified_at" TIMESTAMPTZ,
  "contact_captured_at"    TIMESTAMPTZ,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "chat_conversations_lead_id_idx" ON "chat_conversations" ("lead_id");
CREATE INDEX IF NOT EXISTS "chat_conversations_created_at_idx" ON "chat_conversations" ("created_at");

COMMIT;
