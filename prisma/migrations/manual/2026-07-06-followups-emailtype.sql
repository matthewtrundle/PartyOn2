-- Site-wide follow-up email system — FOLLOW_UP EmailType enum value.
--
-- Deliberately its own file with NO BEGIN/COMMIT: ALTER TYPE ... ADD VALUE
-- cannot share a transaction with statements that use the new value, and the
-- migration runner executes each file as a single query. Keep this file to
-- exactly this one statement.
--
-- Companion DDL (follow_up_jobs, email_suppressions) lives in
-- 2026-07-06-followups-phase-0.sql.

ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'FOLLOW_UP';
