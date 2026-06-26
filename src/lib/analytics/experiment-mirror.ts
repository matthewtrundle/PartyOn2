/**
 * Experiment mirror — renders a concluded A/B test as Obsidian-shaped markdown
 * (what was tested + per-variant results + winner + why it won) and commits it to
 * docs/marketing/experiments/<period>-<page>-<slug>.md via the shared GitHub helper.
 * `scripts/marketing/sync-obsidian.mjs` then pulls it into the vault's
 * Memory/Marketing/Experiments/ folder.
 *
 * Triggered from the experiments PATCH handler when a test is concluded. Fails soft
 * so an unconfigured GITHUB_REPO_TOKEN never blocks the DB update.
 */

import { putFileToRepo } from '@/lib/github/put-file';
import { slugifyTitle } from './recommendation-mirror';

interface MirrorVariant {
  id: string;
  name: string;
  isControl: boolean;
  weight: number;
  impressions: number;
  clicks: number;
  conversions: number;
  content: unknown;
}

export interface ExperimentForMirror {
  id: string;
  name: string;
  page: string;
  elementId: string;
  goalMetric: string;
  winningVariant: string | null;
  winnerReason: string | null;
  confidence: number | null;
  endDate: Date | null;
  variants: MirrorVariant[];
}

export interface MirrorResult {
  mirrored: boolean;
  path?: string;
  url?: string;
  error?: string;
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function clickRate(v: MirrorVariant): number {
  return v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0;
}

function copyOf(content: unknown): string {
  if (!content || typeof content !== 'object') return '_(page default copy)_';
  const c = content as Record<string, string>;
  const parts = [c.eyebrow, c.headline, c.subhead, c.ctaText].filter(Boolean);
  return parts.length ? parts.map((p) => `“${p}”`).join(' · ') : '_(page default copy)_';
}

/** Render the concluded experiment as a markdown record. */
export function renderExperimentMarkdown(exp: ExperimentForMirror): string {
  const concluded = (exp.endDate ?? new Date()).toISOString().slice(0, 10);
  const pageSlug = exp.page.replace(/^\//, '').replace(/\//g, '-') || 'home';
  const winner = exp.variants.find((v) => v.id === exp.winningVariant);
  const control = exp.variants.find((v) => v.isControl);
  const lift =
    winner && control && clickRate(control) > 0
      ? Math.round(((clickRate(winner) - clickRate(control)) / clickRate(control)) * 1000) / 10
      : null;

  const fm = [
    ['title', JSON.stringify(exp.name)],
    ['page', exp.page],
    ['element', exp.elementId],
    ['goal_metric', exp.goalMetric],
    ['date_concluded', concluded],
    ['status', 'measured'],
    ['winner', winner ? JSON.stringify(winner.name) : 'null'],
    ['confidence', exp.confidence ?? 'null'],
    ['lift_pct', lift ?? 'null'],
    ['db_id', exp.id],
    ['tags', `[experiment, ${pageSlug}, ${exp.goalMetric}]`],
  ];

  const tested = exp.variants
    .map((v) => `- **${v.name}**${v.isControl ? ' (control)' : ''}: ${copyOf(v.content)}`)
    .join('\n');

  const resultsRows = exp.variants
    .map(
      (v) =>
        `| ${v.name}${v.isControl ? ' (control)' : ''} | ${v.impressions} | ${v.clicks} | ${clickRate(v).toFixed(1)}% | ${v.conversions} |`
    )
    .join('\n');

  return `---
${fm.map(([k, v]) => `${k}: ${v}`).join('\n')}
---

# ${exp.name}

## What was tested

${tested}

## Results

| Variant | Views | Clicks | Click rate | Conversions |
|---------|------:|-------:|-----------:|------------:|
${resultsRows}

## Winner

${winner ? `**${winner.name}**${lift != null ? ` — ${lift > 0 ? '+' : ''}${lift}% click rate vs control` : ''}${exp.confidence != null ? ` (${Math.round(exp.confidence)}% confidence)` : ''}` : '_No winner declared._'}

## Why it won

${exp.winnerReason?.trim() || '_(no reason recorded)_'}

---
_Mirror file. Written automatically when the test was concluded in /admin/analytics. Source of truth is the database (id: \`${exp.id}\`)._
`;
}

/** Commit the concluded experiment to docs/marketing/experiments/. Never throws. */
export async function mirrorExperimentToVault(exp: ExperimentForMirror): Promise<MirrorResult> {
  try {
    const period = isoWeek(exp.endDate ?? new Date());
    const pageSlug = exp.page.replace(/^\//, '').replace(/\//g, '-') || 'home';
    const slug = slugifyTitle(exp.name);
    const path = `docs/marketing/experiments/${period}-${pageSlug}-${slug}.md`;
    const result = await putFileToRepo({
      path,
      content: renderExperimentMarkdown(exp),
      message: `chore(experiments): conclude "${exp.name.slice(0, 50)}"`,
    });
    return { mirrored: result.committed, path, url: result.htmlUrl, error: result.error };
  } catch (err) {
    return { mirrored: false, error: err instanceof Error ? err.message : String(err) };
  }
}
