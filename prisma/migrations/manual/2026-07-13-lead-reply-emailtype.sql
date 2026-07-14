-- Lead Flow board — LEAD_REPLY EmailType enum value.
--
-- Deliberately its own file with NO BEGIN/COMMIT: ALTER TYPE ... ADD VALUE
-- cannot share a transaction with statements that use the new value, and the
-- migration runner executes each file as a single query. Keep this file to
-- exactly this one statement. (Precedent: 2026-07-06-followups-emailtype.sql.)
--
-- Companion DDL (leads pipeline columns) lives in 2026-07-13-lead-pipeline.sql.

ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'LEAD_REPLY';
