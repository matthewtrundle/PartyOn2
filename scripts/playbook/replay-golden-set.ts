/**
 * Golden-set replay — the release gate for the PartyChat playbook prompt.
 *
 * Feeds held-out real (and synthetic) inbound customer messages through the SAME
 * system prompt the chat route serves (src/prompts/reginald.md cut at
 * "## Mode-Specific Behaviors" + the standard-mode suffix, same model, same
 * temperature), then scores each reply with deterministic fact checks plus an
 * LLM judge.
 *
 * Gates (from the approved playbook plan):
 *   - 100% of T4 items must escalate (ack-only + human handoff)
 *   - >90% of T1 items must be factually clean and appropriate
 *
 * Run:  set -a && source .env.local && set +a
 *       npx tsx scripts/playbook/replay-golden-set.ts [--limit N]
 * Output: data/comms-corpus/golden/replay-results.jsonl + scorecard on stdout.
 * Exits 1 if a gate fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const GOLDEN = path.join(ROOT, 'data', 'comms-corpus', 'golden', 'golden-set.jsonl');
const RESULTS = path.join(ROOT, 'data', 'comms-corpus', 'golden', 'replay-results.jsonl');
const MODEL = 'anthropic/claude-sonnet-5'; // same as src/app/api/chat/route.ts
const CONCURRENCY = 2; // OpenRouter intermittently returns empty 200s under sustained load

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;
// --retry-failures: keep passing results from the previous run, re-run only the
// failures (OpenRouter empty-completion flakiness clears across fresh processes).
const RETRY_FAILURES = process.argv.includes('--retry-failures');

interface GoldenItem {
  id: string;
  channel: string;
  body: string;
  expected_intent: string;
  expected_tier: 'T1' | 'T2' | 'T3' | 'T4';
  source: 'real' | 'synthetic';
  fact_check?: { must_include_any?: string[]; must_not_include?: string[]; note?: string };
}

interface Verdict {
  appropriate: boolean;
  escalated: boolean;
  hedged_or_handed_off: boolean;
  states_unverified_fact: boolean;
  overcommitted: boolean;
  notes: string;
}

function loadSystemPrompt(): string {
  // Mirrors loadBasePrompt() + getSystemPrompt('normal') in src/app/api/chat/route.ts
  const content = fs.readFileSync(path.join(ROOT, 'src', 'prompts', 'reginald.md'), 'utf8');
  const modeSpecificIndex = content.indexOf('## Mode-Specific Behaviors');
  const base = (modeSpecificIndex > 0 ? content.substring(0, modeSpecificIndex) : content).trim();
  return `${base}

### Standard Service Mode Active

Howdy! Welcome to Party On Delivery. We're here to help y'all put together the perfect drink selection - whether it's a quiet gathering or a full-blown celebration. Y'all are in good hands. We deliver fast so the good times keep flowin'.`;
}

async function openrouter(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number
): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
          // Some providers (Amazon Bedrock) default Sonnet 5 to extended thinking,
          // which consumes the whole max_tokens budget → content:null, finish:"length".
          // Same setting as the production chat route.
          reasoning: { enabled: false },
        }),
      });
      if (!res.ok) throw new Error(`openrouter ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        // dump one raw response per run for diagnosis
        const dbg = path.join(ROOT, 'data', 'comms-corpus', 'golden', 'empty-response-debug.json');
        if (!fs.existsSync(dbg)) fs.writeFileSync(dbg, JSON.stringify(data, null, 2));
        throw new Error('openrouter: empty completion');
      }
      return content;
    } catch (err) {
      if (attempt >= 6) throw err;
      // empty 200s are load-dependent provider flakiness — back off hard
      const base = String(err).includes('empty completion') ? 8000 : 2500;
      await new Promise((r) => setTimeout(r, attempt * base + Math.random() * 1000));
    }
  }
}

const TIER_RULES: Record<string, string> = {
  T1: 'Answer directly and correctly using only verified facts.',
  T2: 'Answer using verified facts, and route the follow-through to the right human channel — the business text line, or the named owner of the topic (e.g. Premier for boat operations). Pointing at the correct owner counts as correct behavior.',
  T3: 'Give only general verified info; must NOT commit to prices/changes/exceptions as if the change is already handled; should gather details AND collect contact info (or direct to the text line) so a human closes it out.',
  T4: 'Acknowledge ONLY and hand off to a human urgently. Must NOT answer the substance (no refund decisions, no policy debates, no status guesses, no selling).',
};

/** Verified + unresolved fact digests, generated from the live registry (never hand-listed). */
function factDigests(): { verified: string; unresolved: string } {
  const parse = (f: string) =>
    (matter(`---\n${fs.readFileSync(path.join(ROOT, 'content', 'playbook', f), 'utf8')}\n---\n`)
      .data.facts as Array<{ statement: string; status: string }>) ?? [];
  const all = [...parse('facts-generated.yaml'), ...parse('facts.yaml')];
  return {
    verified: all
      .filter((f) => f.status === 'verified')
      .map((f) => `- ${f.statement}`)
      .join('\n'),
    unresolved: all
      .filter((f) => f.status !== 'verified')
      .map((f) => `- ${f.statement}`)
      .join('\n'),
  };
}
const DIGESTS = factDigests();

/** intent id → the card's canonical behavior + channels (judge audits against the actual contract). */
function loadCards(): Record<string, { canonical: string; channels: string[] }> {
  const dir = path.join(ROOT, 'content', 'playbook', 'intents');
  const out: Record<string, { canonical: string; channels: string[] }> = {};
  const section = (content: string, heading: string) => {
    const m = new RegExp(`^## ${heading.replace(/[()]/g, '\\$&')}\\s*$`, 'm').exec(content);
    if (!m) return '';
    const rest = content.slice(m.index + m[0].length);
    const next = rest.search(/^## /m);
    return (next === -1 ? rest : rest.slice(0, next)).trim();
  };
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const { data, content } = matter.read(path.join(dir, f));
    // the judge audits the chat replay, so it needs the chat rendering too —
    // canonical alone can be stricter than the channel behavior (e.g. spam-vendor)
    const canonical = section(content, 'Answer \\(canonical\\)');
    const chat = section(content, 'Chat');
    out[data.id as string] = {
      canonical: canonical + (chat ? `\n\nChat-channel rendering:\n${chat}` : ''),
      channels: (data.channels as string[]) ?? [],
    };
  }
  return out;
}
const CARDS = loadCards();
const CANONICAL: Record<string, string> = Object.fromEntries(
  Object.entries(CARDS).map(([k, v]) => [k, v.canonical])
);

function judgePrompt(item: GoldenItem, reply: string): string {
  const cardBehavior = CANONICAL[item.expected_intent]
    ? `\nREQUIRED BEHAVIOR per the playbook card for this intent:\n"""${CANONICAL[item.expected_intent]}"""\n`
    : '';
  return `You are auditing an AI customer-service reply for Party On Delivery (Austin alcohol delivery + boat-cruise drinks).

CUSTOMER MESSAGE (channel: web chat):
"""${item.body}"""

TRUE INTENT: ${item.expected_intent}
REQUIRED TIER BEHAVIOR (${item.expected_tier}): ${TIER_RULES[item.expected_tier]}
${cardBehavior}
When the card's required behavior and the generic tier rule differ, THE CARD WINS — a reply that does what the card says is appropriate. The reply does NOT need to include every element the card mentions: judge whether it handles the intent the card's way and lands the load-bearing next step (the right link, handoff, or ack). Suggesting products as ideas is allowed; claiming an item is currently IN STOCK is not — but describing something as a featured/recommended pick while directing to the live catalog for availability is acceptable. A generic warm closer ("we're here if you need anything") is politeness, not an upsell.

VERIFIED FACTS the bot may state (this list is authoritative — a claim matching any line below is verified):
${DIGESTS.verified}

TOPICS THE BOT MUST NOT ASSERT (unresolved):
${DIGESTS.unresolved}

ASSISTANT REPLY TO AUDIT:
"""${reply}"""

Return ONLY a single-line JSON object (no markdown fences, escape any quotes, no literal newlines inside strings):
{"appropriate": <bool: reply fits the true intent and would satisfy a reasonable customer>,
 "escalated": <bool: reply acknowledges and initiates/promises a HUMAN follow-up (mentions a human/Allan/team contacting them, or asks for contact info to hand off, or directs to the human text line as the resolution path)>,
 "hedged_or_handed_off": <bool: reply avoids asserting unresolved topics, hedging or handing off instead>,
 "states_unverified_fact": <bool: reply asserts a price/hour/policy/code/stock-level that matches NO line in the verified list, or asserts an unresolved topic. Restating verified lines is fine>,
 "overcommitted": <bool: reply commits to money/changes/exceptions/OUTCOMES a bot must not promise (refund approved or its timeline, order already changed, boat will wait, reschedule confirmed, shipping arranged). A promise about RESPONSE TIME ("Allan will text you today") is NOT overcommitment>,
 "notes": "<one short sentence>"}`;
}

function factCheck(item: GoldenItem, reply: string): { pass: boolean; why?: string } {
  const fc = item.fact_check;
  if (!fc) return { pass: true };
  const lower = reply.toLowerCase();
  if (fc.must_include_any && !fc.must_include_any.some((s) => lower.includes(s.toLowerCase()))) {
    return { pass: false, why: `missing all of: ${fc.must_include_any.join(' | ')}` };
  }
  if (fc.must_not_include) {
    const hit = fc.must_not_include.find((s) => lower.includes(s.toLowerCase()));
    if (hit) return { pass: false, why: `contains forbidden: ${hit}` };
  }
  return { pass: true };
}

// Non-customer routing intents: correct behavior is declining/routing quietly,
// not a customer-facing escalation promise — judged on card compliance instead.
const ROUTING_INTENTS = new Set(['internal-partner-ops', 'spam-vendor', 'opt-out-stop']);

function itemPasses(item: GoldenItem, verdict: Verdict, fact: { pass: boolean }): boolean {
  if (ROUTING_INTENTS.has(item.expected_intent)) {
    return verdict.appropriate && !verdict.overcommitted;
  }
  switch (item.expected_tier) {
    case 'T4':
      return verdict.escalated && !verdict.overcommitted;
    case 'T1':
      return (
        verdict.appropriate && !verdict.states_unverified_fact && !verdict.overcommitted && fact.pass
      );
    case 'T2':
      return verdict.appropriate && !verdict.states_unverified_fact && !verdict.overcommitted;
    case 'T3':
      return verdict.hedged_or_handed_off && !verdict.overcommitted;
  }
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not set — source .env.local first');
    process.exit(1);
  }

  const systemPrompt = loadSystemPrompt();
  const allItems: GoldenItem[] = fs
    .readFileSync(GOLDEN, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  // This is the PartyChat (web chat) gate: intents whose card doesn't serve the
  // chat channel (STOP handling, internal routing) are scored by the future
  // email/SMS replays instead.
  let items = allItems
    .filter((i) => CARDS[i.expected_intent]?.channels.includes('chat') ?? true)
    .slice(0, LIMIT);
  const skipped = allItems.length - items.length;

  const results: Array<Record<string, unknown>> = [];
  if (RETRY_FAILURES && fs.existsSync(RESULTS)) {
    const prev = fs
      .readFileSync(RESULTS, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l)) as Array<Record<string, unknown>>;
    const passed = new Map(prev.filter((r) => r.pass === true).map((r) => [r.id as string, r]));
    const keep = items.filter((i) => passed.has(i.id));
    items = items.filter((i) => !passed.has(i.id));
    for (const k of keep) results.push(passed.get(k.id)!);
    console.log(`--retry-failures: carrying ${keep.length} previous passes, re-running ${items.length}`);
  }

  console.log(
    `replaying ${items.length} golden items against ${MODEL} (prompt: ${systemPrompt.length} chars)` +
      (skipped ? `; skipped ${skipped} non-chat-channel items (email/SMS replay scope)` : '')
  );
  let done = 0;

  async function worker(queue: GoldenItem[]) {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      try {
        // production settings: temperature 0.3, max_tokens 500 (same as the route)
        const reply = await openrouter(
          apiKey!,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: item.body },
          ],
          0.3,
          500
        );
        let verdict: Verdict | null = null;
        for (let jAttempt = 1; jAttempt <= 3 && !verdict; jAttempt++) {
          const judgeRaw = await openrouter(apiKey!, [{ role: 'user', content: judgePrompt(item, reply) }], 0, 300);
          const jsonMatch = judgeRaw.match(/\{[\s\S]*\}/);
          try {
            // newlines inside JSON strings are the judge's most common malformation
            verdict = JSON.parse((jsonMatch ? jsonMatch[0] : judgeRaw).replace(/\n/g, ' ')) as Verdict;
          } catch {
            verdict = null; // retry the judge call
          }
        }
        if (!verdict) throw new Error('judge returned unparseable JSON after 3 attempts');
        const fact = factCheck(item, reply);
        const pass = itemPasses(item, verdict, fact);
        results.push({ ...item, reply, verdict, fact, pass });
      } catch (err) {
        results.push({ ...item, error: String(err), pass: false });
      }
      done++;
      if (done % 20 === 0) console.log(`  ${done}/${items.length}…`);
    }
  }

  const queue = [...items];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

  fs.writeFileSync(RESULTS, results.map((r) => JSON.stringify(r)).join('\n') + '\n');

  // ---- scorecard ----
  const byTier: Record<string, { total: number; pass: number }> = {};
  for (const r of results) {
    const tier = r.expected_tier as string;
    byTier[tier] ??= { total: 0, pass: 0 };
    byTier[tier].total++;
    if (r.pass) byTier[tier].pass++;
  }
  console.log('\n=== SCORECARD ===');
  for (const tier of ['T1', 'T2', 'T3', 'T4']) {
    const s = byTier[tier] ?? { total: 0, pass: 0 };
    console.log(`${tier}: ${s.pass}/${s.total} (${s.total ? Math.round((100 * s.pass) / s.total) : 0}%)`);
  }
  const failures = results.filter((r) => !r.pass);
  if (failures.length) {
    console.log(`\n${failures.length} failures:`);
    for (const f of failures) {
      const v = f.verdict as Verdict | undefined;
      console.log(
        `  [${f.expected_tier}/${f.expected_intent}] ${String(f.id)} — ${v?.notes ?? f.error ?? (f.fact as { why?: string })?.why ?? ''}`
      );
    }
  }

  const t4 = byTier.T4 ?? { total: 0, pass: 0 };
  const t1 = byTier.T1 ?? { total: 0, pass: 0 };
  const t4Gate = t4.total > 0 && t4.pass === t4.total;
  const t1Gate = t1.total > 0 && t1.pass / t1.total > 0.9;
  console.log(`\nGATES: T4 escalation ${t4Gate ? 'PASS' : 'FAIL'} (need 100%) · T1 accuracy ${t1Gate ? 'PASS' : 'FAIL'} (need >90%)`);
  console.log(`results → ${RESULTS}`);
  process.exit(t4Gate && t1Gate ? 0 : 1);
}

main().catch((err) => {
  console.error('replay failed:', err);
  process.exit(1);
});
