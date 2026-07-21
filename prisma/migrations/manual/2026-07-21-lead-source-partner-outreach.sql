-- Partner-prospect CRM — PARTNER_OUTREACH LeadSourceWidget enum value.
-- Server-stamped source for leads created by the partner-prospect sync
-- (STR + bartending outreach databases). Never claimable by the public
-- pixel — same class as the other server-stamped sources.
--
-- Own file, NO BEGIN/COMMIT: ALTER TYPE ... ADD VALUE cannot share a
-- transaction with statements that use the new value, and the migration
-- runner executes each file as a single query. Keep this file to exactly
-- one statement. (Precedent: 2026-07-14-lead-source-inbound-email.sql.)

ALTER TYPE "LeadSourceWidget" ADD VALUE IF NOT EXISTS 'PARTNER_OUTREACH';
