-- A/B hero-copy testing (analytics hub Phase 2)
--
-- Adds:
--   variants.content      JSONB  — per-variant hero copy { eyebrow, headline, subhead, ctaText }
--   experiments.winner_reason TEXT — plain-language "why it won", logged to Obsidian on conclude
--
-- Per saved memory `prisma_schema_drift.md`, `prisma db push` is unsafe on this DB,
-- so apply additive DDL manually. All statements are idempotent (IF NOT EXISTS) and
-- nullable, so this file is safe to re-run and safe on existing rows.
--
--     npx prisma db execute --url "$DATABASE_URL" --file prisma/migrations/manual/2026-06-24-experiment-hero-content.sql

ALTER TABLE variants ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS winner_reason TEXT;
