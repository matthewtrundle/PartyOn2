-- Vercel log-drain analytics — datacenter-IP flag on vercel_events.
-- Stealth scrapers wear real-browser user-agents, so the UA regex undercounts
-- bots (day one showed /privacy with 86 "human" views — real customers don't
-- do that). The drain webhook now checks each client IP against vendored cloud
-- ranges (src/lib/analytics/datacenter-ip.ts: AWS/GCP/Azure/DO/Oracle/Linode/
-- Vultr) and stamps the verdict here; the traffic queries count TRUE as bot.
--
-- Nullable, no default: rows ingested before this ships stay NULL (treated as
-- not-datacenter, i.e. classification unchanged) until
-- scripts/analytics/backfill-datacenter-flag.ts re-scores them from their
-- stored client_ip. Additive + idempotent; no index — the flag is only ever
-- read alongside the existing timestamp-filtered scans, never as an entry point.

BEGIN;

ALTER TABLE "vercel_events" ADD COLUMN IF NOT EXISTS "is_datacenter" BOOLEAN;

COMMIT;
