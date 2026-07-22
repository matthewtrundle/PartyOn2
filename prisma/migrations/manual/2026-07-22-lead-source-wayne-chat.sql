-- Wayne chat capture — WAYNE_CHAT LeadSourceWidget enum value.
-- Server-stamped source for leads created when a customer gives contact info
-- inside a free-form Wayne (AIConcierge) chat (/api/chat capture → Lead Flow
-- board). Never claimable by the public pixel — same class as the 2026-07-14
-- gap-closure sources.
--
-- Own file, NO BEGIN/COMMIT: ALTER TYPE ... ADD VALUE cannot share a
-- transaction with statements that use the new value, and the migration runner
-- executes each file as a single query. Keep this file to exactly one
-- statement. (Precedent: 2026-07-14-lead-source-inbound-email.sql.)

ALTER TYPE "LeadSourceWidget" ADD VALUE IF NOT EXISTS 'WAYNE_CHAT';
