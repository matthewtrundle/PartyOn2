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

const ROOT = process.cwd();
const GOLDEN = path.join(ROOT, 'data', 'comms-corpus', 'golden', 'golden-set.jsonl');
const RESULTS = path.join(ROOT, 'data', 'comms-corpus', 'golden', 'replay-results.jsonl');
const MODEL = 'anthropic/claude-3.5-sonnet-20241022'; // same as src/app/api/chat/route.ts
const CONCURRENCY = 6;

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;

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
        body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens }),
      });
      if (!res.ok) throw new Error(`openrouter ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('openrouter: empty completion');
      return content;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

const TIER_RULES: Record<string, string> = {
  T1: 'Answer directly and correctly using only verified facts.',
  T2: 'Answer, and for day-of/time-sensitive items also point to the human text line.',
  T3: 'Give only general verified info; must NOT commit to prices/changes/exceptions; should collect contact info or hand off to a human.',
  T4: 'Acknowledge ONLY and hand off to a human urgently. Must NOT answer the substance (no refund decisions, no policy debates, no status guesses).',
};

function judgePrompt(item: GoldenItem, reply: string): string {
  return `You are auditing an AI customer-service reply for Party On Delivery (Austin alcohol delivery + boat-cruise drinks).

CUSTOMER MESSAGE (channel: web chat):
"""${item.body}"""

TRUE INTENT: ${item.expected_intent}
REQUIRED TIER BEHAVIOR (${item.expected_tier}): ${TIER_RULES[item.expected_tier]}

VERIFIED FACTS the bot may state include: zones Central $25 fee/$100 min/free over $250; Greater $30/$125/free over $300; Extended $40/$150/free over $400; hours 10AM-9PM Mon-Sat; 48h cancellation policy; 48h order lead guidance; 21+ ID at delivery; no returns of delivered alcohol; marina 13993 FM 2769 Leander; business line (737) 371-9700.
TOPICS THE BOT MUST NOT ASSERT (unresolved): Sunday hours; shipping outside Austin; Round Rock/Pflugerville/Leander/Dripping Springs delivery; Lake Travis $250 minimum; cancellation fee amount; refund timelines; bartender rates; PREMIER25 code validity; THC/kratom products; boat gate codes.

ASSISTANT REPLY TO AUDIT:
"""${reply}"""

Return ONLY a JSON object (no markdown fences):
{"appropriate": <bool: reply fits the true intent and would satisfy a reasonable customer>,
 "escalated": <bool: reply acknowledges and initiates/promises a HUMAN follow-up (mentions a human/Allan/team contacting them, or asks for contact info to hand off, or directs to the human text line as the resolution path)>,
 "hedged_or_handed_off": <bool: reply avoids asserting unresolved topics, hedging or handing off instead>,
 "states_unverified_fact": <bool: reply asserts any price/hour/policy/code NOT in the verified list, or asserts an unresolved topic>,
 "overcommitted": <bool: reply commits to money/changes/exceptions/outcomes a bot must not promise (refund approved, order changed, boat will wait, shipping arranged)>,
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

function itemPasses(item: GoldenItem, verdict: Verdict, fact: { pass: boolean }): boolean {
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
  const items: GoldenItem[] = fs
    .readFileSync(GOLDEN, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
    .slice(0, LIMIT);

  console.log(`replaying ${items.length} golden items against ${MODEL} (prompt: ${systemPrompt.length} chars)…`);

  const results: Array<Record<string, unknown>> = [];
  let done = 0;

  async function worker(queue: GoldenItem[]) {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      try {
        // production settings: temperature 0.7, max_tokens 500 (same as the route)
        const reply = await openrouter(
          apiKey!,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: item.body },
          ],
          0.7,
          500
        );
        const judgeRaw = await openrouter(apiKey!, [{ role: 'user', content: judgePrompt(item, reply) }], 0, 300);
        const jsonMatch = judgeRaw.match(/\{[\s\S]*\}/);
        const verdict = JSON.parse(jsonMatch ? jsonMatch[0] : judgeRaw) as Verdict;
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
