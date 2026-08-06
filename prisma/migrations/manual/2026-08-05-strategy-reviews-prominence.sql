-- Game Plan — add one initiative: surface reviews/testimonials on the landing pages
--
-- Data-only seed for the /admin/strategy Game Plan board (table created by
-- 2026-06-17-strategy-initiatives.sql). Adds a single acquisition-pillar tile
-- under the existing "Fix segmented landing pages" / "Google Ads per segment"
-- items, since it is the same landing-page work stream.
--
-- Idempotent: stable slug id + ON CONFLICT DO NOTHING, so re-runs are safe and a
-- row Allan later edits or deletes in the UI is never resurrected/overwritten.
-- Applied on prod deploy by scripts/db/apply-manual-migrations.mjs.

BEGIN;

INSERT INTO strategy_initiatives
  (id, pillar, title, description, status, priority, owner, next_action, linked_domain, sort_order, subtasks)
VALUES
  ('gp-reviews-prominence', 'acquisition',
   'Make reviews & testimonials prominent on landing pages',
   'Social proof is buried today: on the shared landing template the reviews section renders around line 720 of ~1040 — below the hero, packages, and venue list — so most visitors never scroll to it. Pull star ratings / testimonials up to where the buying decision actually happens (a rating strip under the hero CTA, a quote next to the package cards) and keep the full review wall lower down. Pairs with the Google Ads work: paid traffic is cold and needs proof above the fold.',
   'not_started', 'next', 'Allan',
   'Pick the two highest-traffic segment pages and add a star-rating + testimonial block above the fold.',
   'marketing', 2,
   '[{"id":"st-rp-1","label":"Add a compact rating/social-proof strip under the hero CTA","done":false,"createdAt":"2026-08-05T00:00:00.000Z"},{"id":"st-rp-2","label":"Put a testimonial next to the package cards (mid-page decision point)","done":false,"createdAt":"2026-08-05T00:00:00.000Z"},{"id":"st-rp-3","label":"Roll out across bachelor / bachelorette / wedding / corporate","done":false,"createdAt":"2026-08-05T00:00:00.000Z"},{"id":"st-rp-4","label":"Pull fresh Google reviews so the quotes are current","done":false,"createdAt":"2026-08-05T00:00:00.000Z"},{"id":"st-rp-5","label":"Check conversion lift in the analytics hub after rollout","done":false,"createdAt":"2026-08-05T00:00:00.000Z"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

COMMIT;
