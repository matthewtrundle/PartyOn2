-- Lead-capture gap closure — OPS_INVOICE LeadSourceWidget enum value.
-- Server-stamped source for leads mirrored from ops-created draft invoices
-- to brand-new contacts (so sweepQuoteSent has a card to move to QUOTE_SENT).
--
-- Deliberately its own file with NO BEGIN/COMMIT: ALTER TYPE ... ADD VALUE
-- cannot share a transaction with statements that use the new value, and the
-- migration runner executes each file as a single query. Keep this file to
-- exactly this one statement. (Precedent: 2026-07-06-followups-emailtype.sql.)

ALTER TYPE "LeadSourceWidget" ADD VALUE IF NOT EXISTS 'OPS_INVOICE';
