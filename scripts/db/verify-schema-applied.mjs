/**
 * READ-ONLY ground-truth check: verify every table and column declared in
 * `prisma/migrations/manual/*.sql` actually exists in the live database.
 *
 * This is the companion to `apply-manual-migrations.mjs`. The runner's `--check` trusts its ledger
 * ("we recorded this as applied"); this script trusts nothing and inspects `information_schema`
 * directly, so it catches the failure mode that took group checkout down: a migration that the
 * process believed shipped but whose DDL never actually landed in prod.
 *
 * Touches nothing — only SELECTs from information_schema. Exit 0 if everything is present, 1 if
 * anything declared in the migrations is missing.
 *
 * USAGE
 *   node scripts/db/verify-schema-applied.mjs          # local: reads .env.local
 *   npm run db:verify-schema
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: ['.env.local', '.env'] });
if (!process.env.DATABASE_URL) {
  console.error('[verify-schema-applied] DATABASE_URL is not set. Add it to .env.local or the environment.');
  process.exit(1);
}

const MIG_DIR = path.resolve('prisma/migrations/manual');

/** Strip block + line comments so commented-out DDL isn't parsed as expected schema. */
function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
}

/** Extract expected tables and {table,column} pairs declared by a migration file. */
function parse(sql) {
  const clean = stripComments(sql);
  const tables = new Set();
  const columns = [];
  for (const m of clean.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"?(\w+)"?/gi)) {
    tables.add(m[1].toLowerCase());
  }
  // One ALTER TABLE ... ; block can hold several ADD COLUMNs (e.g. finance phase 1A adds three).
  for (const m of clean.matchAll(/ALTER\s+TABLE\s+"?(\w+)"?([\s\S]*?);/gi)) {
    const table = m[1].toLowerCase();
    for (const c of m[2].matchAll(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+"?(\w+)"?/gi)) {
      columns.push({ table, column: c[1].toLowerCase() });
    }
  }
  return { tables, columns };
}

const files = readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql')).sort();
const expectedTables = new Set();
const expectedColumns = [];
for (const f of files) {
  const { tables, columns } = parse(readFileSync(path.join(MIG_DIR, f), 'utf8'));
  tables.forEach((t) => expectedTables.add(t));
  columns.forEach((c) => expectedColumns.push({ ...c, file: f }));
}

const url = process.env.DATABASE_URL;
const isLocal = /@(localhost|127\.0\.0\.1|\[?::1\]?)[:/]/.test(url);
const client = new pg.Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
const out = (s = '') => console.log(s);

await client.connect();
try {
  out(`[verify-schema-applied] host: ${url.replace(/.*@([^/:]+).*/, '$1')}`);
  out(`[verify-schema-applied] scanned ${files.length} migration file(s)`);

  const { rows: tableRows } = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const liveTables = new Set(tableRows.map((r) => r.table_name.toLowerCase()));

  const { rows: colRows } = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
  );
  const liveCols = new Set(colRows.map((r) => `${r.table_name.toLowerCase()}.${r.column_name.toLowerCase()}`));

  const missingTables = [...expectedTables].filter((t) => !liveTables.has(t)).sort();
  const missingCols = expectedColumns.filter((c) => !liveCols.has(`${c.table}.${c.column}`));

  for (const t of missingTables) out(`  MISSING TABLE:  ${t}`);
  for (const c of missingCols) out(`  MISSING COLUMN: ${c.table}.${c.column}   (from ${c.file})`);

  const ok = missingTables.length === 0 && missingCols.length === 0;
  out(
    ok
      ? `[verify-schema-applied] OK — all ${expectedTables.size} table(s) and ${expectedColumns.length} declared column(s) present.`
      : `[verify-schema-applied] DRIFT — ${missingTables.length} missing table(s), ${missingCols.length} missing column(s).`
  );
  process.exitCode = ok ? 0 : 1;
} finally {
  await client.end();
}
