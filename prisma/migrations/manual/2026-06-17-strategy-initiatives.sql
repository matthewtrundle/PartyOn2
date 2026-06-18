-- Game Plan — strategy_initiatives table + seed
--
-- Backs the internal "Game Plan" living-document page at /admin/strategy where Allan + Brian
-- track the company's bottom-line strategy and its execution. Human-authored strategic
-- initiatives (owners, priority, sub-tasks, progress log) — distinct from the machine-detected
-- /admin/recommendations queue.
--
-- Per saved memory `prisma_schema_drift.md`: schema.prisma is intentionally drifted from prod,
-- so `prisma db push` is unsafe. This file is applied automatically on prod deploys by
-- scripts/db/apply-manual-migrations.mjs (recorded once in the _manual_migrations ledger).
-- Apply locally with:  npm run db:migrate:manual   (after sourcing .env.local)
-- After applying, regenerate the prisma client:  npx prisma generate
--
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING) so the file is safe
-- to re-run. The seed uses stable slug ids, so a row a user later deletes is NOT resurrected.

BEGIN;

-- =========================================================================
-- strategy_initiatives — one row per strategic initiative
-- =========================================================================
CREATE TABLE IF NOT EXISTS strategy_initiatives (
  id            TEXT PRIMARY KEY,
  pillar        TEXT NOT NULL,                                   -- finance | operations | acquisition | partnerships
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'not_started',            -- not_started | in_progress | blocked | done
  priority      TEXT NOT NULL DEFAULT 'later',                  -- now | next | later
  owner         TEXT,                                           -- freeform: Allan | Brian | Vic | Gus | ...
  next_action   TEXT,
  target_date   DATE,
  linked_domain TEXT,                                           -- finance | operations | marketing | seo
  sort_order    INTEGER NOT NULL DEFAULT 0,
  subtasks      JSONB NOT NULL DEFAULT '[]'::jsonb,             -- [{ id, label, done, createdAt }]
  updates       JSONB NOT NULL DEFAULT '[]'::jsonb,             -- [{ id, author, body, createdAt }] append-only
  archived_at   TIMESTAMP(3),
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS strategy_initiatives_pillar_idx
  ON strategy_initiatives (pillar);
CREATE INDEX IF NOT EXISTS strategy_initiatives_status_idx
  ON strategy_initiatives (status);
CREATE INDEX IF NOT EXISTS strategy_initiatives_pillar_priority_sort_idx
  ON strategy_initiatives (pillar, priority, sort_order);

-- =========================================================================
-- Seed — the 10 kickoff initiatives, prioritized Now / Next / Later.
-- Editable in-app after seeding; ON CONFLICT keeps re-runs/edits safe.
-- =========================================================================
INSERT INTO strategy_initiatives
  (id, pillar, title, description, status, priority, owner, next_action, linked_domain, sort_order, subtasks)
VALUES
  -- ---- Finances ----------------------------------------------------------
  ('seed-finance-integrations', 'finance',
   'Finish financial integrations → accurate snapshots',
   'Foundation for everything else: until the daily snapshot is accurate we cannot measure whether any initiative is actually moving the bottom line. Already in flight via the Finance Director phases (QuickBooks production connect, Plaid bank feed, Stripe reconciliation).',
   'not_started', 'now', 'Allan',
   'Confirm the QuickBooks production connection, then verify the daily P&L snapshot reconciles.',
   'finance', 0,
   '[{"id":"st-fi-1","label":"Connect production QuickBooks","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-fi-2","label":"Verify daily P&L snapshot accuracy","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-fi-3","label":"Reconcile bank transactions via Plaid","done":false,"createdAt":"2026-06-17T00:00:00.000Z"}]'::jsonb),

  -- ---- Operations & Delegation ------------------------------------------
  ('seed-vic-ops', 'operations',
   'Vic owns ordering, inventory & fulfillment',
   'Highest time-leverage move — handing the daily ordering / inventory / fulfillment grind to Vic frees both owners to run the growth plays below.',
   'not_started', 'now', 'Brian',
   'Document the daily workflow and give Vic access to the ops + inventory tools.',
   'operations', 0,
   '[{"id":"st-vic-1","label":"Document the daily ordering + fulfillment workflow","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-vic-2","label":"Grant Vic ops + inventory access","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-vic-3","label":"Shadow for one week","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-vic-4","label":"Full hand-off","done":false,"createdAt":"2026-06-17T00:00:00.000Z"}]'::jsonb),

  ('seed-centex-workflow', 'operations',
   'Finalize automated workflow with Centex',
   'Supplier / ordering automation that supports Vic owning ordering. (Confirm exactly what Centex covers — assumed supplier automation.)',
   'not_started', 'next', 'Brian',
   'Confirm what Centex covers, then define the automated hand-off.',
   'operations', 1, '[]'::jsonb),

  ('seed-driver-shifts', 'operations',
   'Gus / another driver on semi-recurring shifts',
   'Delivery capacity for the volume that ads + the short-term-rental channel will drive.',
   'not_started', 'next', 'Brian',
   'Lock Gus into a recurring weekly slot, or recruit a backup driver.',
   NULL, 2, '[]'::jsonb),

  -- ---- Paid Acquisition --------------------------------------------------
  ('seed-landing-pages', 'acquisition',
   'Fix segmented landing pages (bachelorette, wedding, corporate)',
   'Blocks Google Ads — do not pay for traffic to broken or mismatched pages. The bachelor page is already overhauled; replicate that quality across the bachelorette, wedding, and corporate pages.',
   'not_started', 'now', 'Allan',
   'Audit each segment page against the finished bachelor page.',
   'marketing', 0,
   '[{"id":"st-lp-1","label":"Bachelorette page","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-lp-2","label":"Wedding page","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-lp-3","label":"Corporate page","done":false,"createdAt":"2026-06-17T00:00:00.000Z"}]'::jsonb),

  ('seed-google-ads', 'acquisition',
   'Google Ads per segment (bachelor / bachelorette / wedding / corporate)',
   'Depends on the landing pages being fixed first. The bachelor campaign is already serving — replicate per segment. Respect the delivery footprint: do NOT geo-target Round Rock, Pflugerville, Leander, Dripping Springs, Buda, or Kyle.',
   'not_started', 'next', 'Allan',
   'Replicate the live bachelor campaign for the next segment once its page is fixed.',
   'marketing', 1,
   '[{"id":"st-ga-1","label":"Bachelorette campaign","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-ga-2","label":"Wedding campaign","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-ga-3","label":"Corporate campaign","done":false,"createdAt":"2026-06-17T00:00:00.000Z"}]'::jsonb),

  -- ---- Rental Partnerships ----------------------------------------------
  ('seed-five-star', 'partnerships',
   'Re-engage Lucas → Five-Star Rentals workflow',
   'Relationship re-engagement that unlocks the whole short-term-rental (STR) channel — the onboarding email campaign and the fridge magnets both hang off this.',
   'not_started', 'now', 'Allan',
   'Reach back out to Lucas and his friend to restart the conversation.',
   NULL, 0,
   '[{"id":"st-fs-1","label":"Reach out to Lucas","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-fs-2","label":"Agree the referral / ordering workflow","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-fs-3","label":"Pilot with a few properties","done":false,"createdAt":"2026-06-17T00:00:00.000Z"}]'::jsonb),

  ('seed-str-email', 'partnerships',
   'STR customer onboarding email campaign',
   'Part of the Five-Star integration — an onboarding email sequence for short-term-rental guests and hosts. Build once that workflow is agreed.',
   'not_started', 'next', 'Allan',
   'Draft the onboarding sequence once the Five-Star workflow is agreed.',
   'marketing', 1, '[]'::jsonb),

  ('seed-neal-rentals', 'partnerships',
   'Workflow with Neal & his rentals',
   'Second STR partner — roll out the same partner workflow after Five-Star proves the playbook.',
   'not_started', 'next', 'Brian',
   'Set up the partner workflow with Neal.',
   NULL, 2, '[]'::jsonb),

  ('seed-fridge-magnets', 'partnerships',
   'Fridge magnets at Airbnbs around town',
   'Cheap, delegable channel-builder. Do this once a partner workflow exists so the magnets point somewhere (QR to the right landing page / offer).',
   'not_started', 'later', 'Brian',
   'Design + order a first batch of magnets with a QR code.',
   NULL, 3,
   '[{"id":"st-fm-1","label":"Design magnet + QR","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-fm-2","label":"Order first batch","done":false,"createdAt":"2026-06-17T00:00:00.000Z"},{"id":"st-fm-3","label":"Distribute to partner properties","done":false,"createdAt":"2026-06-17T00:00:00.000Z"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

COMMIT;
