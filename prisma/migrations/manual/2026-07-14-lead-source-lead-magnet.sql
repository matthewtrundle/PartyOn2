-- Lead-capture gap closure — LEAD_MAGNET LeadSourceWidget enum value.
-- Server-stamped source for lead-magnet popup submissions that include a
-- phone number (party intent) — boards, unlike email-only EMAIL_SIGNUP
-- captures which stay newsletter-only.
--
-- Deliberately its own file with NO BEGIN/COMMIT: ALTER TYPE ... ADD VALUE
-- cannot share a transaction with statements that use the new value, and the
-- migration runner executes each file as a single query. Keep this file to
-- exactly this one statement. (Precedent: 2026-07-06-followups-emailtype.sql.)

ALTER TYPE "LeadSourceWidget" ADD VALUE IF NOT EXISTS 'LEAD_MAGNET';
