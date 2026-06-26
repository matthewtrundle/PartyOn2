# Manual database migrations

Schema changes for this project ship as **hand-written, additive, idempotent raw-SQL files** in this
folder — not via `prisma migrate` or `prisma db push`.

## Why not Prisma migrate / db push

`prisma/schema.prisma` is **intentionally drifted** from the production database: some columns that
still hold production data were removed from the schema. `prisma db push` and `prisma migrate dev`
would try to "reconcile" that drift and **drop those columns** — data loss. So those commands are
**forbidden against prod**.

> ⚠️ **Do not run `npm run db:push` or `npm run db:migrate` against production.** They exist for
> hypothetical local-only use but will damage prod. Use the manual flow below.

## How migrations get applied (the important part)

Every migration here is applied by `scripts/db/apply-manual-migrations.mjs`, which records each file
in a `_manual_migrations` ledger table so it runs **exactly once** per database.

On deploy this happens **automatically** — the production `build` script runs the migration step first:

```jsonc
"build": "node scripts/db/apply-manual-migrations.mjs --vercel-prod-only && prisma generate && … && next build"
```

- Vercel runs the package.json `build` script on **every** deployment (confirmed from the build logs —
  the project's Build Command is the default `npm run build`). This covers both Git-push deploys and
  `vercel --prod`. The migration step is embedded in `build` rather than a separate `vercel-build`
  script *on purpose*: the logs prove `npm run build` runs, so the step cannot be silently skipped.
- `--vercel-prod-only` makes it a **no-op unless the real `VERCEL_ENV` is `production`**, so preview and
  local builds never touch the prod schema. The guard reads the platform `VERCEL_ENV` **before**
  `.env.local` is loaded — a developer's pulled `.env.local` usually contains `VERCEL_ENV=production`,
  and reading it first stops a local `npm run build` from being mistaken for a prod deploy.
- Migrations apply **during the build, before the new code goes live**. That ordering is correct for
  **additive** changes (old code ignores a new nullable column) and is exactly what was missing in the
  incident below. It is **wrong for destructive changes** — see the rules.

> 🔧 **If you set a custom Build Command** in Vercel → Project → Settings → Build & Development, keep the
> `node scripts/db/apply-manual-migrations.mjs --vercel-prod-only &&` step at the front of it, or
> migrations stop running. The step needs `DATABASE_URL` available **at build time** (standard Vercel
> env vars are). As of 2026-06-17 the Build Command is the default — no dashboard change needed.

## Adopting the ledger on an already-migrated database

An already-hand-migrated database needs to be **baselined** once so the runner records the existing
files as applied without re-running them:

```bash
set -a && source .env.local && set +a   # or have DATABASE_URL in your env
npm run db:migrate:baseline
npm run db:migrate:check                 # should now report 0 pending
```

> ✅ **Production was baselined on 2026-06-17** — all 7 files are recorded in `_manual_migrations` and
> `db:migrate:check` reports 0 pending. The steps above are only needed for a *new* environment that
> already has the schema (e.g. a clone of prod). A genuinely empty database needs no baseline — just
> run `npm run db:migrate:manual`.

(If you skip baselining on an already-migrated DB, the first production deploy simply re-runs all files
— safe, because they are all idempotent — and records them. Baselining just avoids the needless re-run.)

## Adding a new migration

1. Create `prisma/migrations/manual/YYYY-MM-DD-short-description.sql`.
2. Make it **additive and idempotent**. Use `CREATE TABLE IF NOT EXISTS`,
   `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `INSERT ... ON CONFLICT DO NOTHING`.
   Wrap the body in `BEGIN; ... COMMIT;`.
3. **Never** put a destructive statement (`DROP`, `ALTER COLUMN ... TYPE`, `NOT NULL` on a populated
   column) in here. The runner applies during the build while the *old* code is still serving, so a
   destructive change would break live traffic. Destructive changes need a separate, hand-run,
   expand/contract plan — not this flow.
4. Update `prisma/schema.prisma` to match (so the Prisma Client types include the change).
5. **Never edit a migration that has already been applied.** The runner checksums each file and will
   warn if an applied file changed instead of re-running it. Add a new dated file for further changes.
6. Run it locally / verify, then merge. The next production deploy applies it automatically.

## Commands

| Command | What it does |
|---|---|
| `npm run db:migrate:manual` | Apply all pending files, record them in the ledger. |
| `npm run db:migrate:check` | Read-only. List pending files; exit 1 if any (CI gate). |
| `npm run db:migrate:baseline` | Record all current files as applied **without running** them. |
| `npm run db:verify-schema` | Read-only ground-truth check: every table/column declared in these files actually exists in the live DB. Exit 1 on drift. |

`db:migrate:check` trusts the ledger; `db:verify-schema` trusts nothing and inspects
`information_schema` directly — run the latter when you need to be *sure* a migration's DDL really
landed (it's the check that would have caught the incident below).

## Postmortem — why this tooling exists (2026-06-15, PR #130)

**What broke.** PR #130 ("build OrderItems from an immutable charge snapshot", commit `14783d99`)
added two columns — `participant_payments.charged_line_items` and `carts.charged_line_items` — and
shipped code that writes them at Stripe-session creation
(`group-v2-payments.ts`, `checkout.ts`). A correct, idempotent migration file
(`2026-06-15-charge-snapshot.sql`) **was** committed in the same PR.

**The gap.** Nothing applied it. These manual files were only ever run by hand (`psql -f ...`), and
that step was skipped on the #130 deploy. The code expected the column; the database didn't have it.
Every GroupOrderV2 checkout then threw `column charged_line_items does not exist` and returned a 500
from `createGroupV2CheckoutSession` — **group checkout was down from that deploy** until a manual
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` hot-patch. (Surfaced when a customer, dashboard `E97WPQ`,
couldn't pay before a cruise.)

**Root cause.** A required manual step with no automation and no detection — not a bad migration file.

**Fixes (this change).**
- Migrations now apply automatically on production deploys via a guarded step at the front of the
  `build` script (which Vercel is confirmed to run), so the human step is gone.
- The `_manual_migrations` ledger makes application idempotent and auditable; prod was baselined.
- `db:verify-schema` gives a ground-truth check that a migration's columns/tables actually exist,
  independent of whether the process *believes* it ran. Verified clean on 2026-06-17 (16 tables,
  6 migration columns, and every `schema.prisma` column for the affected tables present in prod).
