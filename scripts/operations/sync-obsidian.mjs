#!/usr/bin/env node
/**
 * Sync the GitHub operations-mirror into the local Obsidian vault.
 *
 * Mirrors three folders:
 *   docs/operations/weekly/             → <vault>/Memory/Operations/Briefings/
 *   docs/operations/recommendations/    → <vault>/Memory/Operations/Recommendations/
 *   docs/operations/decisions/          → <vault>/Memory/Operations/Decisions/   (when present)
 *
 * Idempotent: compares the remote SHA against a local cache file
 * (Memory/Operations/.sync-state.json) and only writes when something changed.
 *
 * Usage:
 *   node scripts/operations/sync-obsidian.mjs                    # one-shot
 *   node scripts/operations/sync-obsidian.mjs --watch             # poll every 5 min
 *   node scripts/operations/sync-obsidian.mjs --dry-run           # show what would change
 *
 * Env (in .env.local):
 *   GITHUB_REPO_TOKEN            required — repo:contents:read scope
 *   OBSIDIAN_VAULT_OPERATIONS    optional — defaults to
 *                                 /Users/allan/Projects/Obsidian/Obsidian/PartyOn2/Memory/Operations
 *   GITHUB_REPO_OWNER            defaults to allan-cmyk
 *   GITHUB_REPO_NAME             defaults to PartyOn2
 *   GITHUB_REPO_BRANCH           defaults to main
 *
 * Same pattern as scripts/marketing/sync-obsidian.mjs — copy-and-paramaterise
 * was preferred over abstraction in Phase 1E so each director's sync stays
 * legible on its own. Pull these together if a third director ships.
 */

import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { execSync } from 'child_process';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

async function loadEnv() {
  const envPath = path.join(REPO_ROOT, '.env.local');
  try {
    const content = await fs.readFile(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // no .env.local → rely on real env
  }
}

await loadEnv();

function resolveToken() {
  if (process.env.GITHUB_REPO_TOKEN) return process.env.GITHUB_REPO_TOKEN;
  try {
    return execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const TOKEN = resolveToken();
const OWNER = process.env.GITHUB_REPO_OWNER ?? 'allan-cmyk';
const REPO = process.env.GITHUB_REPO_NAME ?? 'PartyOn2';
const BRANCH = process.env.GITHUB_REPO_BRANCH ?? 'main';
const VAULT = process.env.OBSIDIAN_VAULT_OPERATIONS
  ?? '/Users/allan/Projects/Obsidian/Obsidian/PartyOn2/Memory/Operations';

const args = process.argv.slice(2);
const WATCH = args.includes('--watch');
const DRY_RUN = args.includes('--dry-run');
const POLL_MS = 5 * 60 * 1000;

if (!TOKEN) {
  console.error(
    'No GitHub auth available. Either set GITHUB_REPO_TOKEN in .env.local or run `gh auth login`.'
  );
  process.exit(1);
}

const FOLDER_MAP = [
  { remote: 'docs/operations/weekly', local: path.join(VAULT, 'Briefings') },
  { remote: 'docs/operations/recommendations', local: path.join(VAULT, 'Recommendations') },
  { remote: 'docs/operations/decisions', local: path.join(VAULT, 'Decisions') },
];

const SYNC_STATE_PATH = path.join(VAULT, '.sync-state.json');

async function readSyncState() {
  try {
    const raw = await fs.readFile(SYNC_STATE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeSyncState(state) {
  await fs.mkdir(VAULT, { recursive: true });
  await fs.writeFile(SYNC_STATE_PATH, JSON.stringify(state, null, 2));
}

async function listRemoteDir(remotePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${remotePath}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub list ${remotePath}: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

async function fetchRemoteFile(downloadUrl) {
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Download ${downloadUrl}: ${res.status}`);
  return await res.text();
}

async function syncOnce() {
  const state = await readSyncState();
  const newState = { ...state };
  const summary = { written: [], unchanged: [], skipped: [], errors: [] };

  for (const { remote, local } of FOLDER_MAP) {
    let entries;
    try {
      entries = await listRemoteDir(remote);
    } catch (err) {
      summary.errors.push({ folder: remote, error: err.message });
      continue;
    }

    if (!DRY_RUN) await fs.mkdir(local, { recursive: true });

    for (const entry of entries) {
      if (entry.type !== 'file') continue;
      if (!entry.name.endsWith('.md')) continue;

      const key = `${remote}/${entry.name}`;
      const localPath = path.join(local, entry.name);
      const cachedSha = state[key];

      if (cachedSha === entry.sha) {
        summary.unchanged.push(key);
        continue;
      }

      if (DRY_RUN) {
        summary.written.push({ key, action: cachedSha ? 'update' : 'create', local: localPath });
        newState[key] = entry.sha;
        continue;
      }

      try {
        const content = await fetchRemoteFile(entry.download_url);
        await fs.writeFile(localPath, content);
        newState[key] = entry.sha;
        summary.written.push({ key, action: cachedSha ? 'update' : 'create', local: localPath });
      } catch (err) {
        summary.errors.push({ key, error: err.message });
      }
    }
  }

  if (!DRY_RUN) await writeSyncState(newState);
  return summary;
}

function reportSummary(s) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const lines = [];
  lines.push(`[${stamp}] sync: ${s.written.length} written, ${s.unchanged.length} unchanged, ${s.errors.length} errors`);
  for (const w of s.written) lines.push(`  ${w.action === 'create' ? '+' : '~'} ${w.local}`);
  for (const e of s.errors) lines.push(`  ! ${e.key ?? e.folder}: ${e.error}`);
  console.log(lines.join('\n'));
}

if (WATCH) {
  console.log(`Watching ${OWNER}/${REPO}@${BRANCH} → ${VAULT} (poll every ${POLL_MS / 1000}s, ctrl-c to stop)`);
  for (;;) {
    try {
      const s = await syncOnce();
      if (s.written.length > 0 || s.errors.length > 0) reportSummary(s);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] sync error:`, err.message);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
} else {
  const s = await syncOnce();
  reportSummary(s);
  if (s.errors.length > 0) process.exit(2);
}
