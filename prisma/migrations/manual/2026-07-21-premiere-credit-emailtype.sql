-- Premiere Credit automation — PREMIERE_CREDIT EmailType enum value.
--
-- Deliberately its own file with NO BEGIN/COMMIT: ALTER TYPE ... ADD VALUE
-- cannot share a transaction with statements that use the new value, and the
-- migration runner executes each file as a single query. Keep this file to
-- exactly this one statement. (Precedent: 2026-07-13-lead-reply-emailtype.sql.)
--
-- Companion DDL (premiere_credit_grants table) lives in
-- 2026-07-21-premiere-credit-grants.sql.

ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'PREMIERE_CREDIT';
