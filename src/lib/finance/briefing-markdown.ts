/**
 * Renders a FinanceBriefingPayload as YAML-frontmatter + markdown
 * (committed to docs/finance/weekly/<weekLabel>.md by the cron).
 */

import type { FinanceBriefingPayload } from './briefing-payload';

function rec(href: string | undefined, title: string): string {
  return href ? `[${title}](${href})` : title;
}

export function renderFinanceBriefingMarkdown(d: FinanceBriefingPayload): string {
  const frontmatter = [
    '---',
    `title: Finance Director — ${d.weekLabel}`,
    `period: weekly`,
    `week: ${d.weekLabel}`,
    `date_generated: ${d.generatedAtIso}`,
    `snapshot_date: ${d.snapshotDate}`,
    `urgent_count: ${d.urgentRecs.length}`,
    `high_count: ${d.highRecs.length}`,
    `normal_count: ${d.normalRecCount}`,
    `qb_connected: ${d.qbConnected}`,
    `plaid_connected: ${d.plaidConnected}`,
    `pending_journals: ${d.pendingJournalCount}`,
    `failed_journals: ${d.failedJournalCount}`,
    `tags: [finance, briefing, weekly]`,
    '---',
    '',
  ].join('\n');

  const sections: string[] = [`# Finance Director — ${d.weekLabel}`, ''];

  if (d.urgentRecs.length > 0) {
    sections.push('## 🚨 Urgent', '');
    for (const r of d.urgentRecs) {
      sections.push(`- ${rec(r.href, r.title)}${r.summary ? ` — _${r.summary}_` : ''}`);
    }
    sections.push('');
  }

  if (d.stats.length > 0) {
    sections.push('## Stats (latest snapshot)', '');
    for (const s of d.stats) {
      const deltaStr = s.delta
        ? ` (${s.delta.direction === 'up' ? '↑' : s.delta.direction === 'down' ? '↓' : '→'} ${s.delta.pct.toFixed(1)}% vs prior wk)`
        : '';
      sections.push(`- **${s.label}**: ${s.value}${deltaStr}${s.sub ? ` _${s.sub}_` : ''}`);
    }
    sections.push('');
  }

  sections.push('## Connection status', '');
  sections.push(`- QuickBooks: ${d.qbConnected ? '✅ connected' : '❌ NOT connected'}`);
  sections.push(
    `- Plaid: ${d.plaidConnected ? '✅' : '❌'} ${d.plaidItemCount} item(s), ${d.unmatchedBankTxnCount} bank transactions unmatched, ${d.unmatchedStripePayoutCount} Stripe payouts unmatched`
  );
  sections.push(
    `- QB sales journals: ${d.failedJournalCount > 0 ? `❌ ${d.failedJournalCount} failed` : '✅ posting cleanly'}${d.pendingJournalCount > 0 ? `, ${d.pendingJournalCount} pending` : ''}`
  );
  sections.push('');

  if (d.highRecs.length > 0) {
    sections.push('## High-priority recommendations', '');
    for (const r of d.highRecs) {
      sections.push(`- ${rec(r.href, r.title)}${r.summary ? ` — _${r.summary}_` : ''}`);
    }
    sections.push('');
  }

  if (d.normalRecCount > 0) {
    sections.push(`## Watching (${d.normalRecCount} normal-severity recs)`, '');
    sections.push(`See [the triage queue](${d.queueUrl}) for the full list.`, '');
  }

  sections.push('## Links', '');
  sections.push(`- [Finance dashboard](${d.dashboardUrl})`);
  sections.push(`- [Triage queue](${d.queueUrl})`);
  sections.push('');

  return frontmatter + sections.join('\n');
}
