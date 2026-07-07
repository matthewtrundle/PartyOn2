/**
 * Playbook lint — CI guard for content/playbook/.
 *
 * Enforces the contracts the downstream consumers rely on:
 *   - card frontmatter schema + registry consistency with playbook.yaml
 *   - every T4 card maps to a valid escalation reason
 *   - `## SMS` blocks fit 2 SMS segments (≤320 chars) — they ARE the sms_templates
 *   - {{variables}} used in renderings are declared in frontmatter
 *   - unknown/conflicting facts reference an open-questions.md entry
 *   - the generated block in src/prompts/reginald.md is not stale
 *
 * The fork-side `partyon-crm/scripts/ingest-playbook.ts --lint` repeats these checks
 * plus the cross-repo escalation keyword-mirror comparison (that file lives there).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { buildBlock } from '../../scripts/playbook/build-chat-prompt';

const PLAYBOOK = path.join(process.cwd(), 'content', 'playbook');
const INTENTS = path.join(PLAYBOOK, 'intents');

const TIERS = ['T1', 'T2', 'T3', 'T4'] as const;
const CHANNELS = ['sms', 'email', 'chat', 'voice'] as const;
const KNOWN_TOOLS = ['search_products', 'lookup_order', 'check_shipping', 'get_business_info'];

function parseYamlFile(file: string): Record<string, unknown> {
  const raw = fs.readFileSync(file, 'utf8');
  return matter(`---\n${raw}\n---\n`).data as Record<string, unknown>;
}

const manifest = parseYamlFile(path.join(PLAYBOOK, 'playbook.yaml'));
const escalationReasons = manifest.escalation_reasons as string[];
const registry = manifest.intents as string[];

const cardFiles = fs.readdirSync(INTENTS).filter((f) => f.endsWith('.md'));
const cards = cardFiles.map((f) => {
  const parsed = matter.read(path.join(INTENTS, f));
  return { file: f, data: parsed.data, content: parsed.content };
});

function section(content: string, heading: string): string | null {
  const re = new RegExp(`^## ${heading}\\s*$`, 'm');
  const m = re.exec(content);
  if (!m) return null;
  const rest = content.slice(m.index + m[0].length);
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

describe('playbook manifest', () => {
  it('registry matches the card files exactly', () => {
    const ids = cards.map((c) => c.data.id).sort();
    expect(ids).toEqual([...registry].sort());
  });

  it('escalation reasons are the known engine enum', () => {
    expect(escalationReasons).toContain('low_confidence');
    expect(escalationReasons).toContain('refund_keyword');
  });
});

describe.each(cards.map((c) => [c.file, c] as const))('card %s', (_file, card) => {
  it('has a valid frontmatter schema', () => {
    expect(card.data.id).toBe(card.file.replace(/\.md$/, ''));
    expect(TIERS).toContain(card.data.tier);
    expect(typeof card.data.freq_rank).toBe('number');
    expect(Array.isArray(card.data.channels)).toBe(true);
    for (const ch of card.data.channels) expect(CHANNELS).toContain(ch);
    for (const tool of card.data.tools ?? []) expect(KNOWN_TOOLS).toContain(tool);
    expect((card.data.match_examples ?? []).length).toBeGreaterThan(0);
  });

  it('T4 cards map to a valid escalation reason', () => {
    if (card.data.tier === 'T4') {
      expect(escalationReasons).toContain(card.data.escalation_reason);
    }
  });

  it('has a canonical answer section', () => {
    expect(section(card.content, 'Answer \\(canonical\\)')).toBeTruthy();
  });

  it('SMS rendering exists for sms cards and fits 320 chars', () => {
    if (!(card.data.channels as string[]).includes('sms')) return;
    const sms = section(card.content, 'SMS');
    expect(sms).toBeTruthy();
    if (sms && !sms.startsWith('(no')) {
      // template length measured with variables at realistic expansion
      const expanded = sms
        .replace(/\{\{first_name_prefixed\}\}/g, ' Christopher')
        .replace(/\{\{first_name\}\}/g, 'Christopher')
        .replace(/\{\{order_number\}\}/g, '10428')
        .replace(/\{\{delivery_date\}\}/g, 'Saturday June 27')
        .replace(/\{\{delivery_time\}\}/g, '3:30 PM - 4:00 PM')
        .replace(/\{\{dashboard_url\}\}/g, 'partyondelivery.com/dashboard/AB12CD34')
        .replace(/\{\{cart_url\}\}/g, 'partyondelivery.com/?sharedCart=AB12CD34');
      expect(expanded.length).toBeLessThanOrEqual(320);
    }
  });

  it('uses only declared {{variables}}', () => {
    const declared = new Set<string>(card.data.variables ?? []);
    const used = new Set<string>();
    for (const m of card.content.matchAll(/\{\{(\w+)\}\}/g)) used.add(m[1]);
    for (const v of used) expect(declared, `undeclared variable {{${v}}}`).toContain(v);
  });
});

describe('facts registry', () => {
  const curated = parseYamlFile(path.join(PLAYBOOK, 'facts.yaml')).facts as Array<
    Record<string, unknown>
  >;
  const generated = parseYamlFile(path.join(PLAYBOOK, 'facts-generated.yaml')).facts as Array<
    Record<string, unknown>
  >;
  const openQuestions = fs.readFileSync(path.join(PLAYBOOK, 'open-questions.md'), 'utf8');

  it('every fact has a valid status', () => {
    for (const f of [...curated, ...generated]) {
      expect(['verified', 'conflicting', 'unknown']).toContain(f.status);
    }
  });

  it('every unresolved fact points at an existing open question', () => {
    for (const f of curated) {
      if (f.status === 'verified') continue;
      expect(f.open_question, `${f.id} needs open_question`).toBeTruthy();
      expect(openQuestions).toContain(`**${f.open_question}**`);
    }
  });

  it('fact ids are unique across both registries', () => {
    const ids = [...curated, ...generated].map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('compliance + escalation docs', () => {
  it('compliance.md carries the fenced prompt block', () => {
    const md = fs.readFileSync(path.join(PLAYBOOK, 'compliance.md'), 'utf8');
    expect(/## Prompt block[^\n]*\n+```\n[\s\S]*?```/m.test(md)).toBe(true);
  });

  it('escalation.md mirrors all four keyword groups', () => {
    const md = fs.readFileSync(path.join(PLAYBOOK, 'escalation.md'), 'utf8');
    for (const group of ['refund_keyword', 'complaint_keyword', 'legal_keyword', 'repeat_phrase']) {
      expect(md).toContain(`### ${group}`);
    }
  });
});

describe('generated chat prompt block', () => {
  it('reginald.md contains the current playbook block (run build-chat-prompt after edits)', () => {
    const prompt = fs.readFileSync(path.join(process.cwd(), 'src', 'prompts', 'reginald.md'), 'utf8');
    expect(prompt).toContain(buildBlock());
  });
});
