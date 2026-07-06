---
name: db-migration
description: Make any Postgres schema change (new table, column, index, enum, backfill) via the ADR-0008 manual additive SQL pipeline. Use whenever a task requires modifying the database schema or prisma/schema.prisma, or when checking whether a migration has been applied to prod. NEVER use `prisma db push` or `prisma migrate dev` — the schema is intentionally drifted and they would DROP production columns that still hold data.
---

# DB migration — the manual additive SQL pipeline

Schema changes here do NOT go through Prisma's migration tooling. `prisma/schema.prisma` is **intentionally drifted** from prod (columns removed from the schema still hold production data — memory: `prisma_schema_drift.md`), so `prisma db push` / `prisma migrate dev` would drop real data. A PreToolUse hook blocks those commands and direct `schema.prisma` edits; the sanctioned path is below.

## Read first (canonical — do not work from memory)

1. `prisma/migrations/manual/README.md` — the full mechanism, rules, and the PR #130 postmortem that created it.
2. Vault ADR: `/Users/allan/Projects/Obsidian/Obsidian/PartyOn2/Memory/Decisions/0008-manual-migrations-autoapply-ledger.md`.

## Recipe

1. **Write the SQL** at `prisma/migrations/manual/YYYY-MM-DD-short-description.sql`:
   - Additive + idempotent only: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `INSERT ... ON CONFLICT DO NOTHING`; wrap in `BEGIN; ... COMMIT;`.
   - Never edit an already-applied file (the runner checksums them) — add a new dated file.
2. **Update `prisma/schema.prisma` to match** so Prisma Client types include the change. The edit hook blocks schema.prisma by default; arm the one-shot bypass first:
   ```bash
   touch .claude/.allow-schema-edit
   ```
   Only add what your SQL adds — never "clean up" drifted models you didn't touch.
3. `npx prisma generate`
4. **Apply + verify locally** (against the DB in `.env.local`):
   ```bash
   set -a && source .env.local && set +a
   npm run db:migrate:manual
   npm run db:verify-schema
   ```
5. **Ship via the `ship` skill.** The production deploy applies the file automatically (guarded step at the front of `npm run build`, `_manual_migrations` ledger, exactly-once).
6. **Post-deploy proof** (this is the check that would have caught #130):
   ```bash
   npm run db:migrate:check    # must report 0 pending
   npm run db:verify-schema    # ground truth vs information_schema
   ```

## Out of scope — stop and ask

Destructive changes (`DROP`, `ALTER COLUMN ... TYPE`, `NOT NULL` on a populated column) must NOT go in this pipeline — it runs during the build while old code still serves traffic. They need a separate hand-run expand/contract plan agreed with Allan first.
