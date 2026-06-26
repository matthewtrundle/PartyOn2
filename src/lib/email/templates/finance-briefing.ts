/**
 * Finance Director — weekly briefing email template.
 *
 * Same cream-paper / gold-accent aesthetic as marketing-briefing and
 * operations-briefing. Heavier on numbers, lighter on prose.
 */

import type {
  FinanceBriefingPayload,
  FinanceBriefingRec,
  FinanceBriefingStat,
} from '@/lib/finance/briefing-payload';

const COLORS = {
  paper: '#FBFAF5',
  ink: '#0a0a0a',
  inkBody: '#1a1a1a',
  inkMute: '#3a3a3a',
  hairline: '#e7e3d6',
  goldAccent: '#7a6a1f',
  gold: '#D4AF37',
  blue: '#0B74B8',
  good: '#15803d',
  caution: '#d97706',
  urgent: '#dc2626',
  muteText: '#6b6b6b',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function severityColor(s: string): string {
  if (s === 'urgent') return COLORS.urgent;
  if (s === 'high') return COLORS.caution;
  return COLORS.muteText;
}

function renderStat(stat: FinanceBriefingStat): string {
  const delta = stat.delta
    ? `<div style="font-size:11px;color:${
        stat.delta.direction === 'up'
          ? COLORS.good
          : stat.delta.direction === 'down'
            ? COLORS.urgent
            : COLORS.muteText
      };">${stat.delta.direction === 'up' ? '↑' : stat.delta.direction === 'down' ? '↓' : '→'} ${stat.delta.pct.toFixed(1)}% vs prior wk</div>`
    : '';
  const sub = stat.sub
    ? `<div style="font-size:11px;color:${COLORS.muteText};margin-top:2px;">${esc(stat.sub)}</div>`
    : '';
  return `
    <td valign="top" style="padding:14px 16px;border-bottom:1px solid ${COLORS.hairline};">
      <div style="font-size:11px;color:${COLORS.muteText};text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">${esc(stat.label)}</div>
      <div style="font-size:24px;color:${COLORS.ink};font-weight:700;margin-top:4px;line-height:1.1;">${esc(stat.value)}</div>
      ${delta}
      ${sub}
    </td>`;
}

function renderRecRow(r: FinanceBriefingRec): string {
  const sev = severityColor(r.severity);
  const linkOpen = r.href
    ? `<a href="${esc(r.href)}" style="color:${COLORS.blue};text-decoration:none;">`
    : '';
  const linkClose = r.href ? '</a>' : '';
  const summary = r.summary
    ? `<div style="font-size:12px;color:${COLORS.muteText};margin-top:3px;">${esc(r.summary)}</div>`
    : '';
  return `
    <tr>
      <td valign="top" style="padding:10px 0;border-bottom:1px solid ${COLORS.hairline};">
        <span style="display:inline-block;font-size:10px;color:${sev};text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-right:8px;">${esc(r.severity)}</span>
        ${linkOpen}<span style="font-size:14px;color:${COLORS.inkBody};">${esc(r.title)}</span>${linkClose}
        ${summary}
      </td>
    </tr>`;
}

export function renderFinanceBriefingEmail(d: FinanceBriefingPayload): string {
  const statRows: string[] = [];
  for (let i = 0; i < d.stats.length; i += 2) {
    const pair = d.stats.slice(i, i + 2);
    statRows.push(`<tr>${pair.map(renderStat).join('')}${pair.length < 2 ? '<td></td>' : ''}</tr>`);
  }

  const urgentBlock =
    d.urgentRecs.length > 0
      ? `
    <div style="background:${COLORS.paper};border-left:3px solid ${COLORS.urgent};padding:12px 16px;margin:0 0 24px 0;">
      <div style="font-size:11px;color:${COLORS.urgent};text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:8px;">Urgent (${d.urgentRecs.length})</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${d.urgentRecs.map(renderRecRow).join('')}
      </table>
    </div>`
      : '';

  const highBlock =
    d.highRecs.length > 0
      ? `
    <div style="margin:0 0 24px 0;">
      <h2 style="font-size:14px;color:${COLORS.ink};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px 0;">High priority (${d.highRecs.length})</h2>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${d.highRecs.map(renderRecRow).join('')}
      </table>
    </div>`
      : '';

  const okState =
    d.urgentRecs.length === 0 && d.highRecs.length === 0
      ? `
    <div style="background:${COLORS.paper};border-left:3px solid ${COLORS.good};padding:12px 16px;margin:0 0 24px 0;">
      <div style="font-size:13px;color:${COLORS.good};">✓ No urgent or high-priority issues. ${d.normalRecCount > 0 ? `${d.normalRecCount} watch items in the queue.` : 'All clean.'}</div>
    </div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Finance Director — ${esc(d.weekLabel)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f3ea;padding:32px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background:#ffffff;border:1px solid ${COLORS.hairline};">
          <!-- header -->
          <tr>
            <td style="padding:28px 32px 8px 32px;border-bottom:1px solid ${COLORS.hairline};">
              <div style="font-size:11px;color:${COLORS.goldAccent};text-transform:uppercase;letter-spacing:0.15em;font-weight:600;">Finance Director · weekly briefing</div>
              <h1 style="font-size:22px;color:${COLORS.ink};margin:8px 0 4px 0;font-weight:700;">${esc(d.weekLabel)}</h1>
              <div style="font-size:12px;color:${COLORS.muteText};">Snapshot: ${esc(d.snapshotDate)} · generated ${esc(new Date(d.generatedAtIso).toUTCString())}</div>
            </td>
          </tr>

          <!-- stats grid -->
          ${
            d.stats.length > 0
              ? `<tr><td><table cellpadding="0" cellspacing="0" border="0" width="100%">${statRows.join('')}</table></td></tr>`
              : ''
          }

          <!-- body -->
          <tr>
            <td style="padding:24px 32px;">
              ${okState}
              ${urgentBlock}
              ${highBlock}

              <div style="background:${COLORS.paper};padding:14px 16px;margin:0 0 16px 0;border:1px solid ${COLORS.hairline};">
                <div style="font-size:11px;color:${COLORS.muteText};text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:6px;">Connection status</div>
                <div style="font-size:13px;color:${COLORS.inkBody};line-height:1.6;">
                  QuickBooks ${d.qbConnected ? '✅' : '<span style="color:' + COLORS.urgent + ';">❌ NOT CONNECTED</span>'} ·
                  Plaid ${d.plaidConnected ? `✅ (${d.plaidItemCount} item${d.plaidItemCount === 1 ? '' : 's'})` : '<span style="color:' + COLORS.urgent + ';">❌</span>'}<br>
                  ${d.unmatchedBankTxnCount} unmatched bank txns · ${d.unmatchedStripePayoutCount} unmatched Stripe payouts<br>
                  ${
                    d.failedJournalCount > 0
                      ? `<span style="color:${COLORS.urgent};">${d.failedJournalCount} QB sales journal${d.failedJournalCount === 1 ? '' : 's'} FAILED</span> (review on dashboard)`
                      : '✅ QB sales journals posting cleanly'
                  }
                </div>
              </div>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
                <tr>
                  <td align="center">
                    <a href="${esc(d.dashboardUrl)}" style="display:inline-block;background:${COLORS.blue};color:#ffffff;text-decoration:none;padding:12px 20px;font-size:13px;font-weight:600;margin-right:8px;">Open dashboard</a>
                    <a href="${esc(d.queueUrl)}" style="display:inline-block;background:${COLORS.gold};color:${COLORS.ink};text-decoration:none;padding:12px 20px;font-size:13px;font-weight:600;">Triage queue</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid ${COLORS.hairline};">
              <div style="font-size:11px;color:${COLORS.muteText};line-height:1.5;">
                Party On Delivery · Finance Director (Phase 5)<br>
                Generated automatically each Monday at 14:00 UTC.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderFinanceBriefingText(d: FinanceBriefingPayload): string {
  const lines: string[] = [];
  lines.push(`Finance Director — ${d.weekLabel}`);
  lines.push(`Snapshot: ${d.snapshotDate}`);
  lines.push('');
  for (const s of d.stats) {
    lines.push(`  ${s.label}: ${s.value}${s.sub ? ` (${s.sub})` : ''}`);
  }
  lines.push('');
  if (d.urgentRecs.length > 0) {
    lines.push(`URGENT (${d.urgentRecs.length}):`);
    for (const r of d.urgentRecs) lines.push(`  - ${r.title}`);
    lines.push('');
  }
  if (d.highRecs.length > 0) {
    lines.push(`HIGH (${d.highRecs.length}):`);
    for (const r of d.highRecs) lines.push(`  - ${r.title}`);
    lines.push('');
  }
  if (d.normalRecCount > 0) {
    lines.push(`Watching: ${d.normalRecCount} normal-severity items`);
    lines.push('');
  }
  lines.push(`QuickBooks: ${d.qbConnected ? 'connected' : 'NOT CONNECTED'}`);
  lines.push(`Plaid: ${d.plaidConnected ? `connected (${d.plaidItemCount} items)` : 'NOT CONNECTED'}`);
  lines.push(`Unmatched bank txns: ${d.unmatchedBankTxnCount}`);
  lines.push(`Unmatched Stripe payouts: ${d.unmatchedStripePayoutCount}`);
  if (d.failedJournalCount > 0) lines.push(`QB sales journals FAILED: ${d.failedJournalCount}`);
  lines.push('');
  lines.push(`Dashboard: ${d.dashboardUrl}`);
  lines.push(`Triage queue: ${d.queueUrl}`);
  return lines.join('\n');
}
