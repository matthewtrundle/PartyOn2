-- Lead-capture gap closure — GROUP_DASHBOARD LeadSourceWidget enum value.
-- Server-stamped source for GroupOrderV2 dashboard hosts mirrored onto the
-- Lead Flow board (never claimable by the public pixel).
--
-- Deliberately its own file with NO BEGIN/COMMIT: ALTER TYPE ... ADD VALUE
-- cannot share a transaction with statements that use the new value, and the
-- migration runner executes each file as a single query. Keep this file to
-- exactly this one statement. (Precedent: 2026-07-06-followups-emailtype.sql.)

ALTER TYPE "LeadSourceWidget" ADD VALUE IF NOT EXISTS 'GROUP_DASHBOARD';
