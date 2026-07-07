/**
 * Label the communication-playbook corpus (data/comms-corpus/inbound-bodies.jsonl)
 * for intent frequency ranking.
 *
 * Pass 1 (this script, default): deterministic heuristics for the mechanical
 * buckets — STOP opt-outs, OTP/verification codes, vendor spam blasts,
 * reaction-echoes (Liked/Loved quoting our own outbound), short acks, Premier
 * drip echoes, bare URLs. Everything else is written to remainder.jsonl for
 * model/human labeling against the taxonomy in content/playbook/00-overview.md.
 *
 * Pass 2 (--aggregate): merges labels-heuristic.jsonl + labels-manual.jsonl
 * and prints the intent frequency table (feeds intent-card freq_rank).
 *
 * Run: node scripts/playbook/label-corpus.mjs [--aggregate]
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data', 'comms-corpus');
const AGGREGATE = process.argv.includes('--aggregate');

const HEURISTICS = [
  {
    intent: 'opt-out-stop',
    test: (b) => /^(stop|unsubscribe|out|remove me|no more)[\s!.]*$/i.test(b.trim()),
  },
  {
    intent: 'reaction-echo',
    test: (b) => /^(liked|loved|laughed at|emphasized|disliked|questioned|le encant|❤|👍|​❤️​|​👍​)/i.test(b.trim()),
  },
  {
    intent: 'spam-vendor',
    test: (b) =>
      /(verification code|is your (amazon |google )?otp|don't share (this|your) code|valid for 5 minutes)/i.test(b) ||
      /(reply (yes|y) (for|now)|pos system|point of sales|custom packaging|payroll|wireless provider|batch:|shop deal>>|rebrand\.ly|free trial|scale your business|per line|health polic|custom-printed|wristbands|reply out to be removed|we have trucks)/i.test(b),
  },
  {
    intent: 'premier-drip-echo',
    test: (b) =>
      /(booking w\/ premier|check out the site and boat ordering page|reply stop to unsubscribe|msg&data rates|text ['"]?stop['"]? to (quit|opt-out)|make sure everyone e-signs|premieratx\.co\/private-waiver)/i.test(b),
  },
  {
    intent: 'url-only',
    test: (b) => /^https?:\/\/\S+$/.test(b.trim()),
  },
  {
    intent: 'short-ack',
    test: (b) =>
      b.trim().length < 30 &&
      /^(ok(ay)?|yes+|yeah|yep|no(pe)?|great|perfect|thanks?( you| u)?( so much)?|ty(sm)?|sounds good|got it|all set|will do|awesome|cool|sure|hi|hello|hey|hellooo|good morning|no worries.*|you('re| are) welcome|anytime)[\s!.:)🙂😊🥰❤️]*$/i.test(
        b.trim()
      ),
  },
];

function heuristicPass() {
  const lines = fs
    .readFileSync(path.join(DIR, 'inbound-bodies.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));

  const labeled = [];
  const remainder = [];
  for (const row of lines) {
    const body = row.body ?? '';
    const hit = HEURISTICS.find((h) => h.test(body));
    if (hit) labeled.push({ id: row.id, intent: hit.intent, method: 'heuristic' });
    else remainder.push(row);
  }

  fs.writeFileSync(
    path.join(DIR, 'labels-heuristic.jsonl'),
    labeled.map((l) => JSON.stringify(l)).join('\n') + '\n'
  );
  fs.writeFileSync(
    path.join(DIR, 'remainder.jsonl'),
    remainder.map((r) => JSON.stringify(r)).join('\n') + '\n'
  );

  const counts = {};
  for (const l of labeled) counts[l.intent] = (counts[l.intent] ?? 0) + 1;
  console.log('heuristic buckets:', JSON.stringify(counts, null, 2));
  console.log(`remainder for model/human labeling: ${remainder.length}`);
}

function aggregate() {
  const read = (f) =>
    fs.existsSync(path.join(DIR, f))
      ? fs
          .readFileSync(path.join(DIR, f), 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((l) => JSON.parse(l))
      : [];
  const all = [...read('labels-heuristic.jsonl'), ...read('labels-manual.jsonl')];
  const counts = {};
  for (const l of all) counts[l.intent] = (counts[l.intent] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log('intent\tcount');
  for (const [intent, n] of sorted) console.log(`${intent}\t${n}`);
  console.log(`total labeled: ${all.length}`);
}

if (AGGREGATE) aggregate();
else heuristicPass();
