/**
 * Apply pending manual SQL migrations to the database.
 *
 * WHY THIS EXISTS
 * ---------------
 * This repo intentionally keeps `prisma/schema.prisma` drifted from prod (deleted cost columns
 * still hold prod data — see memory `prisma_schema_drift`), so `prisma migrate` / `prisma db push`
 * are unsafe: they would try to "correct" the drift and drop columns. Schema changes therefore ship
 * as hand-written, **idempotent**, **additive** raw-SQL files in `prisma/migrations/manual/`.
 *
 * Until now those files were applied BY HAND (`psql -f ...`). PR #130 added
 * `participant_payments.charged_line_items` + `carts.charged_line_items`, the code shipped, but the
 * SQL was never run against prod — so every group-order checkout 500'd with
 * `column charged_line_items does not exist`. Group checkout was down from that deploy until a
 * manual hot-patch. This runner removes the human step: migrations are applied automatically on
 * deploy (via the `vercel-build` npm script) and recorded in a ledger so they apply exactly once.
 *
 * SCOPE: additive, idempotent migrations ONLY (CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
 * INSERT ... ON CONFLICT DO NOTHING). Never put a destructive change (DROP/ALTER TYPE) in here — the
 * runner applies during the build BEFORE the new code is live, which is correct for additive changes
 * but wrong for destructive ones.
 *
 * MODES
 *   (default)            Apply every file not yet in the `_manual_migrations` ledger, in filename
 *                        order, then record it. Idempotent files make re-runs safe.
 *   --check              Read-only. List pending files; exit 1 if any are pending, else 0.
 *                        Never creates the ledger or runs DDL. Use in CI / as a pre-deploy gate.
 *   --baseline           Record ALL current files as applied WITHOUT running them. Use ONCE to adopt
 *                        the ledger onto a DB that was already hand-migrated (e.g. prod today).
 *   --vercel-prod-only   No-op (exit 0) unless VERCEL_ENV === 'production'. Lets `vercel-build` apply
 *                        migrations on prod deploys only, never on preview/local builds.
 *
 * USAGE
 *   node scripts/db/apply-manual-migrations.mjs              # apply pending (local: reads .env.local)
 *   node scripts/db/apply-manual-migrations.mjs --check      # list pending, non-zero exit if any
 *   node scripts/db/apply-manual-migrations.mjs --baseline   # adopt ledger on an already-migrated DB
 */

import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

// Capture the REAL deploy environment BEFORE loading .env.local. On Vercel, VERCEL_ENV is a
// platform env var (and there is no .env.local). Locally, a developer's pulled .env.local usually
// contains VERCEL_ENV=production — if we read it after dotenv, a local `npm run build` would think
// it is a prod deploy and apply migrations to prod. Reading it first keeps --vercel-prod-only honest.
const REAL_VERCEL_ENV = process.env.VERCEL_ENV;

// Load local env (.env.local then .env). On Vercel/CI these files are absent and DATABASE_URL comes
// from the platform; dotenv silently no-ops and does not override existing vars.
dotenv.config({ path: ['.env.local', '.env'] });

const args = new Set(process.argv.slice(2));
const MODE_CHECK = args.has('--check');
const MODE_BASELINE = args.has('--baseline');
const VERCEL_PROD_ONLY = args.has('--vercel-prod-only');

const MIG_DIR = path.resolve('prisma/migrations/manual');
const LEDGER = '_manual_migrations';

const log = (s = '') => console.log(s);
const tag = '[apply-manual-migrations]';

// --vercel-prod-only: skip entirely on preview/development/local builds. This is how the production
// `build` script keeps schema changes confined to production deploys (uses the REAL env, not .env.local).
if (VERCEL_PROD_ONLY && REAL_VERCEL_ENV !== 'production') {
  log(`${tag} skipping — VERCEL_ENV=${REAL_VERCEL_ENV ?? '(unset)'} (only runs on production)`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error(`${tag} DATABASE_URL is not set. Add it to .env.local or the deploy environment.`);
  process.exit(1);
}

/** All migration files, oldest first (filenames are date-prefixed). */
function migrationFiles() {
  return readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((filename) => {
      const sql = readFileSync(path.join(MIG_DIR, filename), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      return { filename, sql, checksum };
    });
}

function makeClient() {
  const url = process.env.DATABASE_URL;
  const isLocal = /@(localhost|127\.0\.0\.1|\[?::1\]?)[:/]/.test(url);
  return new pg.Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
}

/** Read the ledger as a Map<filename, checksum>. In --check, a missing ledger means "nothing applied". */
async function readLedger(client, { allowMissing }) {
  try {
    const { rows } = await client.query(`SELECT filename, checksum FROM ${LEDGER}`);
    return new Map(rows.map((r) => [r.filename, r.checksum]));
  } catch (err) {
    if (allowMissing && err.code === '42P01') return new Map(); // undefined_table
    throw err;
  }
}

async function ensureLedger(client) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${LEDGER} (
       filename   text PRIMARY KEY,
       checksum   text NOT NULL,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`
  );
}

async function main() {
  const files = migrationFiles();
  const client = makeClient();
  await client.connect();
  try {
    // ---- check (read-only) ------------------------------------------------
    if (MODE_CHECK) {
      const applied = await readLedger(client, { allowMissing: true });
      const pending = files.filter((f) => !applied.has(f.filename));
      if (pending.length === 0) {
        log(`${tag} up to date — ${files.length} migration(s) all applied.`);
        return 0;
      }
      log(`${tag} ${pending.length} pending migration(s):`);
      for (const f of pending) log(`  - ${f.filename}`);
      return 1; // non-zero so CI / a pre-deploy gate fails
    }

    // ---- baseline (record only, no DDL) -----------------------------------
    if (MODE_BASELINE) {
      await ensureLedger(client);
      const applied = await readLedger(client, { allowMissing: false });
      let recorded = 0;
      for (const f of files) {
        if (applied.has(f.filename)) continue;
        await client.query(
          `INSERT INTO ${LEDGER} (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING`,
          [f.filename, f.checksum]
        );
        recorded++;
        log(`${tag} baselined (not run): ${f.filename}`);
      }
      log(`${tag} baseline complete — ${recorded} newly recorded, ${files.length} total.`);
      return 0;
    }

    // ---- apply ------------------------------------------------------------
    await ensureLedger(client);
    const applied = await readLedger(client, { allowMissing: false });
    let count = 0;
    for (const f of files) {
      const priorChecksum = applied.get(f.filename);
      if (priorChecksum !== undefined) {
        if (priorChecksum !== f.checksum) {
          // An already-applied migration was edited. Don't silently re-run — that hides drift.
          // Policy: never edit an applied migration; add a new dated file instead.
          console.warn(
            `${tag} WARNING: ${f.filename} was already applied but its contents changed ` +
              `(ledger ${priorChecksum.slice(0, 12)} vs file ${f.checksum.slice(0, 12)}). ` +
              `Not re-running. Add a new migration file for the change.`
          );
        }
        continue;
      }
      log(`${tag} applying: ${f.filename}`);
      // Each file is idempotent and wraps itself in BEGIN/COMMIT, so a single simple query runs it
      // as one transaction (a mid-file error rolls the whole file back).
      await client.query(f.sql);
      await client.query(
        `INSERT INTO ${LEDGER} (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING`,
        [f.filename, f.checksum]
      );
      count++;
    }
    log(
      count === 0
        ? `${tag} up to date — ${files.length} migration(s) already applied.`
        : `${tag} applied ${count} migration(s); ${files.length} total recorded.`
    );
    return 0;
  } finally {
    await client.end();
  }
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((err) => {
    console.error(`${tag} FAILED:`, err.message || err);
    process.exit(1);
  });
