#!/usr/bin/env node
/**
 * Integration test for parse-semrush-snapshot.mjs.
 *
 * Runs the parser in --test mode against the committed May 13 fixture in
 * the sibling PartyOn2-seo-snapshots repo. The parser exits non-zero on
 * any field mismatch; this wrapper just propagates that exit code so it
 * can run from `npm test` / CI without needing vitest.
 *
 * Usage:
 *   node scripts/seo/__tests__/parse-semrush-snapshot.test.mjs
 *   node scripts/seo/__tests__/parse-semrush-snapshot.test.mjs --dir <fixture-dir>
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PARSER = path.resolve(__dirname, '../parse-semrush-snapshot.mjs');

const args = process.argv.slice(2);
const parserArgs = ['--test', ...args];

const result = spawnSync('node', [PARSER, ...parserArgs], {
  stdio: 'inherit',
  encoding: 'utf8',
});

process.exit(result.status ?? 1);
