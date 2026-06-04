/**
 * Render the Operations briefing as deterministic markdown — committed to
 * docs/operations/weekly/YYYY-Www.md by the cron and pulled into the
 * Obsidian vault via scripts/operations/sync-obsidian.mjs.
 *
 * Kept separate from the HTML email template so the markdown stays
 * git-diffable and the email stays presentation-only.
 */

import type { OpsBriefingPayload } from './briefing-payload';

function severityIcon(s: 'urgent' | 'high' | 'normal'): string {
  if (s === 'urgent') return '🔴';
  if (s === 'high') return '🟠';
  return '⚪';
}

export function renderBriefingMarkdown(d: OpsBriefingPayload): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push(`title: "Operations weekly briefing — ${d.weekLabel}"`);
  lines.push(`period: ${d.weekLabel}`);
  lines.push(`date_generated: ${d.generatedAtIso.slice(0, 10)}`);
  lines.push(`cost_coverage_pct: ${d.costCoveragePct}`);
  lines.push(`cost_coverage_goal_pct: ${d.costCoverageGoalPct}`);
  lines.push(`drift_events: ${d.driftEvents.length}`);
  lines.push(`cycle_counts_overdue: ${d.cycleCounts.length}`);
  lines.push(`dangling_drafts: ${d.danglingDrafts.length}`);
  lines.push(`tags: [briefing, operations, weekly]`);
  lines.push('---');
  lines.push('');
  lines.push(`# Operations weekly briefing — ${d.weekLabel}`);
  lines.push('');
  lines.push(`_Generated ${d.generatedAtIso} (issue ${d.issueNumber}, ${d.year})._`);
  lines.push('');

  if (d.topUrgentRec) {
    lines.push('## Urgent — act first');
    lines.push('');
    lines.push(`- **${d.topUrgentRec.title}**`);
    lines.push(`  - Signal: \`${d.topUrgentRec.signalKind}\``);
    lines.push(`  - Open: ${d.topUrgentRec.href}`);
    lines.push('');
  }

  lines.push('## Stats');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  for (const stat of d.stats) lines.push(`| ${stat.label} | ${stat.value} |`);
  if (d.receivingLagP50Hours != null || d.receivingLagP90Hours != null) {
    const p50 = d.receivingLagP50Hours == null ? '—' : `${d.receivingLagP50Hours.toFixed(1)}h`;
    const p90 = d.receivingLagP90Hours == null ? '—' : `${d.receivingLagP90Hours.toFixed(1)}h`;
    lines.push(`| Receiving lag p50 | ${p50} |`);
    lines.push(`| Receiving lag p90 | ${p90} |`);
  }
  lines.push('');

  lines.push('## Drift events');
  lines.push('');
  if (d.driftEvents.length === 0) {
    lines.push('_No active drift events this week — ledger is clean._');
  } else {
    lines.push('| Severity | Signal | Title | Age |');
    lines.push('|---|---|---|---:|');
    for (const e of d.driftEvents) {
      lines.push(`| ${severityIcon(e.severity)} ${e.severity} | \`${e.signalKind}\` | ${e.title} | ${e.ageHours}h |`);
    }
  }
  lines.push('');

  lines.push('## Cycle counts due this week');
  lines.push('');
  if (d.cycleCounts.length === 0) {
    lines.push('_No overdue cycle counts — top movers are fresh._');
  } else {
    lines.push('| Variant | Units (14d) |');
    lines.push('|---|---:|');
    for (const c of d.cycleCounts) lines.push(`| ${c.title} | ${c.unitsLast14d} |`);
  }
  lines.push('');

  lines.push('## Dangling drafts');
  lines.push('');
  if (d.danglingDrafts.length === 0) {
    lines.push('_No dangling invoices — every sent draft is either paid or fresh._');
  } else {
    lines.push('| Customer | Status | Age | Total |');
    lines.push('|---|---|---:|---:|');
    for (const dd of d.danglingDrafts) {
      lines.push(`| ${dd.customerName} | ${dd.status} | ${dd.ageDays}d | ${dd.total} |`);
    }
  }
  lines.push('');

  lines.push('## Cost coverage');
  lines.push('');
  lines.push(`Current: **${d.costCoveragePct}%** · Phase-1 goal: **${d.costCoverageGoalPct}%**`);
  lines.push('');
  lines.push('Margin attribution accuracy depends on this. Until it climbs to goal, Marketing\'s margin-derived recs gate at directionally-uncertain. The cycle-count + cost-coverage recs in the queue feed it.');
  lines.push('');

  if (d.whatsLacking.length) {
    lines.push('## What this brief lacks');
    lines.push('');
    for (const item of d.whatsLacking) lines.push(`- ${item}`);
    lines.push('');
  }

  lines.push('## Links');
  lines.push('');
  lines.push(`- Triage queue: ${d.links.queueUrl}`);
  lines.push(`- Ops dashboard: ${d.links.dashboardUrl}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`_Filed by the Operations Director. Phase 1 never auto-mutates inventory — every action requires an operator click on a rec card._`);
  lines.push('');

  return lines.join('\n');
}
