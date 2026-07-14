-- Inbound-email ingestion — inbound_emails table.
-- One row per customer email received at info@partyondelivery.com (pulled by
-- the Gmail poller in src/lib/leads/inbound-email.ts), linked to its Lead so
-- the board drawer can show "what people are emailing us". Additive +
-- idempotent; gmail_message_id is UNIQUE so re-polling never double-inserts.
--
-- id has no DB default: Prisma supplies the uuid app-side (@default(uuid())),
-- matching the leads table. lead_id FK is ON DELETE SET NULL so the message
-- record survives if a lead is ever removed.

BEGIN;

CREATE TABLE IF NOT EXISTS "inbound_emails" (
  "id"               TEXT PRIMARY KEY,
  "gmail_message_id" TEXT NOT NULL UNIQUE,
  "gmail_thread_id"  TEXT,
  "lead_id"          TEXT REFERENCES "leads"("id") ON DELETE SET NULL,
  "from_email"       TEXT NOT NULL,
  "from_name"        TEXT,
  "to_address"       TEXT,
  "subject"          TEXT,
  "snippet"          TEXT,
  "body_text"        TEXT,
  "received_at"      TIMESTAMPTZ NOT NULL,
  "metadata"         JSONB,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "inbound_emails_lead_id_idx" ON "inbound_emails" ("lead_id");
CREATE INDEX IF NOT EXISTS "inbound_emails_received_at_idx" ON "inbound_emails" ("received_at");

COMMIT;
