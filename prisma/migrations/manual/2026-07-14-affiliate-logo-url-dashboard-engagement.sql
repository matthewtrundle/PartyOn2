-- 2026-07-14 · Bulk partner pages + dashboard engagement analytics
--
-- (1) affiliates.logo_url — remote logo URL for bulk-created partners.
--     Committed-to-repo logos (public/images/partners/<slug>-logo.png)
--     still win when present; this is the runtime fallback so CSV bulk
--     creation never needs a code deploy.
--
-- (2) dashboard_views.last_seen_at + active_seconds — powers
--     time-on-dashboard analytics. A heartbeat endpoint bumps
--     last_seen_at and increments active_seconds per (share_code,
--     visitor_hash) row while the customer has the dashboard open.
--
-- Additive + idempotent. Old code ignores all three columns.

BEGIN;

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE dashboard_views
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE dashboard_views
  ADD COLUMN IF NOT EXISTS active_seconds INTEGER NOT NULL DEFAULT 0;

COMMIT;
