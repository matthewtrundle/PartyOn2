/**
 * Export GoHighLevel/LeadConnector conversations to JSONL for the Customer
 * Communication Playbook corpus (content/playbook/).
 *
 * Pages the LeadConnector REST API directly (read-only GET) using the same
 * Private Integration Token the ghl MCP server uses — read from
 * ~/.claude.json, never printed. Modeled on the CRM fork's
 * scripts/export-ghl-contacts.mjs.
 *
 * Two levels of depth:
 *  1. /conversations/search — always works with the current token. Yields one
 *     record per conversation incl. lastMessageBody + direction (the partial
 *     corpus: real inbound questions + real outbound replies).
 *  2. /conversations/{id}/messages — full threads. Requires the
 *     conversation-message read scope on the private integration; the script
 *     probes once and marks the run SCOPE-BLOCKED if the token 401s, so the
 *     same command silently upgrades to a full export once the scope is added.
 *
 * Output (gitignored — PII):
 *   data/comms-corpus/ghl/conversations-<YYYY-MM-DD>.jsonl
 *   data/comms-corpus/ghl/messages-<YYYY-MM-DD>.jsonl      (full mode only)
 *   data/comms-corpus/ghl/summary-<YYYY-MM-DD>.json
 *
 * Run: node scripts/playbook/export-ghl-conversations.mjs [--search-only]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOCATION_ID = '8sHw5nhRsBMoBtOH3dp4';
const BASE = 'https://services.leadconnectorhq.com';
const SEARCH_ONLY = process.argv.includes('--search-only');

function readToken() {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8'));
  const auth = cfg?.mcpServers?.ghl?.headers?.Authorization;
  if (!auth) {
    console.error('Could not find mcpServers.ghl.headers.Authorization in ~/.claude.json');
    process.exit(1);
  }
  return auth;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET with retry/backoff. Returns the Response (caller checks .ok) after retries on 429/5xx. */
// The conversations/messages endpoint is versioned 2021-04-15; contacts/search use 2021-07-28.
async function get(auth, url, version = '2021-07-28') {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { Authorization: auth, Version: version } });
    } catch (err) {
      // network blip (ECONNRESET etc.) — retry like a 5xx
      if (attempt >= 5) throw err;
      await sleep(attempt * 1000);
      continue;
    }
    // 401/403 are scope problems — retrying won't help, let the caller decide.
    if (res.ok || res.status === 401 || res.status === 403) return res;
    if (attempt >= 5) return res;
    await sleep(attempt * 1000);
  }
}

async function exportConversations(auth, outDir, stamp) {
  const outFile = path.join(outDir, `conversations-${stamp}.jsonl`);
  const out = fs.createWriteStream(outFile);
  const seen = new Set();
  const conversations = [];
  let startAfterDate = null;
  let page = 0;

  for (;;) {
    const params = new URLSearchParams({
      locationId: LOCATION_ID,
      limit: '100',
      sortBy: 'last_message_date',
      sort: 'desc',
      status: 'all',
    });
    if (startAfterDate) params.set('startAfterDate', String(startAfterDate));

    const res = await get(auth, `${BASE}/conversations/search?${params}`);
    if (!res.ok) {
      console.error(`conversations/search page ${page} failed: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const data = await res.json();
    const batch = data.conversations ?? [];
    let fresh = 0;
    for (const c of batch) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      fresh++;
      const slim = {
        id: c.id,
        contactId: c.contactId ?? null,
        contactName: c.fullName || c.contactName || null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        tags: c.tags ?? [],
        type: c.type ?? null,
        lastMessageType: c.lastMessageType ?? null,
        lastMessageDirection: c.lastMessageDirection ?? null,
        lastOutboundMessageAction: c.lastOutboundMessageAction ?? null,
        lastMessageBody: c.lastMessageBody ?? null,
        lastMessageDate: c.lastMessageDate ?? null,
        lastManualMessageDate: c.lastManualMessageDate ?? null,
        dateAdded: c.dateAdded ?? null,
        unreadCount: c.unreadCount ?? 0,
        assignedTo: c.assignedTo ?? null,
      };
      out.write(JSON.stringify(slim) + '\n');
      conversations.push(slim);
    }

    page++;
    const last = batch[batch.length - 1];
    const cursor = Array.isArray(last?.sort) ? last.sort[0] : last?.lastMessageDate;
    if (batch.length === 0 || fresh === 0 || !cursor) break;
    startAfterDate = cursor;
    await sleep(150);
  }

  out.end();
  console.log(`conversations: ${conversations.length} → ${outFile}`);
  return conversations;
}

async function exportMessages(auth, outDir, stamp, conversations) {
  // Probe the message scope on the first conversation before committing to 800+ calls.
  const probe = await get(
    auth,
    `${BASE}/conversations/${conversations[0].id}/messages?limit=1`,
    '2021-04-15'
  );
  if (probe.status === 401 || probe.status === 403) {
    console.log(
      'SCOPE-BLOCKED: token lacks the conversation-message read scope ' +
        `(${probe.status}). Re-run after adding it to the GHL private integration ` +
        'to upgrade this export to full threads.'
    );
    return { scopeBlocked: true, messageCount: 0 };
  }

  const outFile = path.join(outDir, `messages-${stamp}.jsonl`);
  const out = fs.createWriteStream(outFile);
  let messageCount = 0;
  let done = 0;

  for (const convo of conversations) {
    let lastMessageId = null;
    for (;;) {
      const params = new URLSearchParams({ limit: '100' });
      if (lastMessageId) params.set('lastMessageId', lastMessageId);
      const res = await get(
        auth,
        `${BASE}/conversations/${convo.id}/messages?${params}`,
        '2021-04-15'
      );
      if (!res.ok) {
        console.error(`  messages for ${convo.id} failed: ${res.status} — skipping conversation`);
        break;
      }
      const data = await res.json();
      // API shape: { messages: { lastMessageId, nextPage, messages: [...] } }
      const inner = data.messages?.messages ? data.messages : data;
      const msgs = inner.messages ?? [];
      for (const m of msgs) {
        out.write(
          JSON.stringify({
            conversationId: convo.id,
            contactId: convo.contactId,
            id: m.id,
            type: m.messageType ?? m.type ?? null,
            direction: m.direction ?? null,
            status: m.status ?? null,
            body: m.body ?? null,
            source: m.source ?? null,
            userId: m.userId ?? null,
            dateAdded: m.dateAdded ?? null,
          }) + '\n'
        );
        messageCount++;
      }
      if (!inner.nextPage || msgs.length === 0) break;
      lastMessageId = inner.lastMessageId ?? msgs[msgs.length - 1]?.id;
      if (!lastMessageId) break;
      await sleep(120);
    }
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${conversations.length} conversations…`);
    await sleep(120);
  }

  out.end();
  console.log(`messages: ${messageCount} → ${outFile}`);
  return { scopeBlocked: false, messageCount };
}

async function main() {
  const auth = readToken();
  const outDir = path.join(process.cwd(), 'data', 'comms-corpus', 'ghl');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);

  const conversations = await exportConversations(auth, outDir, stamp);

  let messages = { scopeBlocked: null, messageCount: 0 };
  if (!SEARCH_ONLY && conversations.length > 0) {
    // Full threads only for conversations with real dialogue: an inbound last
    // message or a manually-typed outbound. Skips ~12k pure-campaign threads.
    const targets = conversations.filter(
      (c) => c.lastMessageDirection === 'inbound' || c.lastOutboundMessageAction === 'manual'
    );
    console.log(`fetching full threads for ${targets.length}/${conversations.length} conversations…`);
    messages = await exportMessages(auth, outDir, stamp, targets);
  }

  const byDirection = {};
  const byType = {};
  for (const c of conversations) {
    byDirection[c.lastMessageDirection ?? 'unknown'] =
      (byDirection[c.lastMessageDirection ?? 'unknown'] ?? 0) + 1;
    byType[c.lastMessageType ?? 'unknown'] = (byType[c.lastMessageType ?? 'unknown'] ?? 0) + 1;
  }
  const summary = {
    exportedAt: new Date().toISOString(),
    conversationCount: conversations.length,
    lastMessageDirection: byDirection,
    lastMessageType: byType,
    fullThreads: messages.scopeBlocked === false,
    scopeBlocked: messages.scopeBlocked,
    messageCount: messages.messageCount,
  };
  fs.writeFileSync(
    path.join(outDir, `summary-${stamp}.json`),
    JSON.stringify(summary, null, 2)
  );
  console.log('summary:', JSON.stringify(summary));
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
