/**
 * Operations Director — weekly briefing email template.
 *
 * Same editorial aesthetic as marketing-briefing.ts (cream paper, hairline
 * rules, gold accents). Ops content is more list-y than marketing's chart
 * content — fewer SVG flourishes, more scannable line-items.
 *
 * Render pipeline:
 *   buildOperationsBriefingPayload() → OpsBriefingPayload
 *   renderOperationsBriefingEmail(payload) → HTML string
 */

import type {
  OpsBriefingPayload,
  OpsBriefingTone,
  OpsBriefingStat,
  OpsBriefingDriftEvent,
} from '@/lib/operations/briefing-payload';
import type { OpsSeverity } from '@/lib/operations/types';

const COLORS = {
  paper: '#FBFAF5',
  ink: '#0a0a0a',
  inkBody: '#1a1a1a',
  inkMute: '#3a3a3a',
  hairline: '#e7e3d6',
  cellHairline: '#f0ebd8',
  ivoryAlt: '#FBF6E0',
  goldAccent: '#7a6a1f',
  gold: '#D4AF37',
  yellow: '#F2D34F',
  blue: '#0B74B8',
  good: '#15803d',
  caution: '#d97706',
  urgent: '#dc2626',
  mute: '#8a8576',
  muteText: '#6b6b6b',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toneColor(t: OpsBriefingTone | undefined): string {
  if (t === 'good') return COLORS.good;
  if (t === 'caution') return COLORS.caution;
  if (t === 'urgent') return COLORS.urgent;
  return COLORS.ink;
}

function severityColor(s: OpsSeverity): string {
  if (s === 'urgent') return COLORS.urgent;
  if (s === 'high') return COLORS.caution;
  return COLORS.muteText;
}

function severityLabel(s: OpsSeverity): string {
  if (s === 'urgent') return 'URGENT';
  if (s === 'high') return 'HIGH';
  return 'NORMAL';
}

function renderSparkline(values: number[], color: string): string {
  if (!values.length) return '';
  const W = 120;
  const H = 28;
  const PAD = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xs = values.map((_, i) => PAD + (i * (W - 2 * PAD)) / (values.length - 1 || 1));
  const ys = values.map((v) => H - PAD - 4 - ((v - min) / range) * (H - 2 * PAD - 8));
  const points = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];
  return `
    <svg width="120" height="28" viewBox="0 0 120 28" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
      <polyline fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.4" fill="${COLORS.gold}"/>
    </svg>
  `;
}

function renderMasthead(d: OpsBriefingPayload): string {
  return `
    <tr>
      <td style="padding:8px 0 24px;text-align:center;">
        <div style="font-family:'Inter',sans-serif;font-size:10px;letter-spacing:3px;color:${COLORS.muteText};text-transform:uppercase;margin-bottom:18px;">Party On Delivery &nbsp;·&nbsp; Austin, Texas</div>
        <div style="font-family:'Barlow Condensed','Helvetica Neue','Arial Narrow',sans-serif;font-size:38px;font-weight:700;letter-spacing:4px;color:${COLORS.ink};text-transform:uppercase;line-height:1;">Operations<br>Weekly Briefing</div>
        <div style="margin-top:18px;font-family:'Inter',sans-serif;font-size:11px;letter-spacing:2px;color:${COLORS.muteText};text-transform:uppercase;">Issue ${d.issueNumber} &nbsp;·&nbsp; ${d.year} &nbsp;·&nbsp; ${escapeHtml(d.generatedDate)}</div>
        <div style="height:2px;background:${COLORS.gold};width:48px;margin:26px auto 0;line-height:2px;font-size:0;">&nbsp;</div>
      </td>
    </tr>
  `;
}

function renderTopUrgent(d: OpsBriefingPayload): string {
  if (!d.topUrgentRec) return '';
  return `
    <tr>
      <td style="padding:8px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${COLORS.ink}" style="background:${COLORS.ink};border-radius:2px;">
          <tr>
            <td width="4" bgcolor="${COLORS.urgent}" style="background:${COLORS.urgent};width:4px;line-height:1px;font-size:0;">&nbsp;</td>
            <td style="padding:34px 36px 36px;">
              <div style="font-family:'Inter',sans-serif;font-size:10px;letter-spacing:3px;color:${COLORS.urgent};text-transform:uppercase;font-weight:600;margin-bottom:14px;">Urgent — Act Now</div>
              <div style="font-family:'Barlow Condensed','Helvetica Neue','Arial Narrow',sans-serif;font-size:24px;font-weight:600;line-height:1.2;color:#ffffff;letter-spacing:0.5px;">${escapeHtml(d.topUrgentRec.title)}</div>
              <div style="margin-top:14px;font-family:'SFMono-Regular','Menlo',monospace;font-size:11px;color:#d8d8d8;letter-spacing:1px;">${escapeHtml(d.topUrgentRec.signalKind)}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                <tr>
                  <td bgcolor="${COLORS.yellow}" style="background:${COLORS.yellow};padding:8px 14px;border-radius:2px;">
                    <a href="${escapeHtml(d.topUrgentRec.href)}" style="font-family:'Inter',sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;color:${COLORS.ink};text-transform:uppercase;text-decoration:none;">Open in queue →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderStatStrip(stats: OpsBriefingStat[]): string {
  const cells = stats
    .map((s, i) => {
      const isLast = i === stats.length - 1;
      const valColor = toneColor(s.tone);
      const sparkColor =
        s.tone === 'urgent' ? COLORS.urgent :
        s.tone === 'caution' ? COLORS.caution :
        s.tone === 'good' ? COLORS.good : COLORS.ink;
      const spark = s.spark ? renderSparkline(s.spark, sparkColor) : '';
      return `
        <td width="${100 / stats.length}%" valign="top" style="padding:22px 10px 18px;text-align:center;${isLast ? '' : `border-right:1px solid ${COLORS.hairline};`}">
          <div style="font-family:'Inter',sans-serif;font-size:9px;letter-spacing:2px;color:${COLORS.mute};text-transform:uppercase;margin-bottom:8px;">${escapeHtml(s.label)}</div>
          <div style="font-family:'Barlow Condensed','Helvetica Neue',sans-serif;font-size:34px;font-weight:600;color:${valColor};line-height:1;">${escapeHtml(s.value)}</div>
          ${spark ? `<div style="margin-top:10px;line-height:0;">${spark}</div>` : ''}
        </td>
      `;
    })
    .join('');
  return `
    <tr>
      <td style="padding:36px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${COLORS.hairline};border-bottom:1px solid ${COLORS.hairline};">
          <tr>${cells}</tr>
        </table>
      </td>
    </tr>
  `;
}

function renderSectionHeader(eyebrow: string, title: string): string {
  return `
    <tr>
      <td style="padding:48px 0 0;">
        <div style="font-family:'Inter',sans-serif;font-size:10px;letter-spacing:3px;color:${COLORS.muteText};text-transform:uppercase;font-weight:600;text-align:center;margin-bottom:8px;">${escapeHtml(eyebrow)}</div>
        <div style="font-family:'Barlow Condensed','Helvetica Neue',sans-serif;font-size:24px;font-weight:600;color:${COLORS.ink};text-align:center;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(title)}</div>
        <div style="height:1px;background:${COLORS.hairline};margin:24px auto 0;line-height:1px;font-size:0;">&nbsp;</div>
      </td>
    </tr>
  `;
}

function renderDriftEvents(events: OpsBriefingDriftEvent[]): string {
  if (!events.length) {
    return `
      <tr>
        <td style="padding:24px 0 0;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:${COLORS.muteText};text-align:center;">No active drift events this week — ledger is clean.</div>
        </td>
      </tr>
    `;
  }
  const rows = events
    .map((e) => `
      <tr>
        <td valign="top" style="padding:18px 0 18px 0;border-bottom:1px solid ${COLORS.hairline};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="top" width="90" style="padding-right:14px;">
                <span style="display:inline-block;font-family:'Inter',sans-serif;font-size:9px;letter-spacing:1.5px;color:#ffffff;text-transform:uppercase;font-weight:700;background:${severityColor(e.severity)};padding:4px 8px;border-radius:2px;">${severityLabel(e.severity)}</span>
              </td>
              <td valign="top">
                <div style="font-family:'Inter',sans-serif;font-size:14px;color:${COLORS.ink};line-height:1.5;font-weight:600;">${escapeHtml(e.title)}</div>
                <div style="margin-top:4px;font-family:'SFMono-Regular','Menlo',monospace;font-size:10px;color:${COLORS.muteText};letter-spacing:0.5px;">${escapeHtml(e.signalKind)} · ${e.ageHours}h old</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `)
    .join('');
  return `<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table></td></tr>`;
}

function renderCycleCounts(cc: OpsBriefingPayload['cycleCounts']): string {
  if (!cc.length) {
    return `
      <tr>
        <td style="padding:24px 0 0;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:${COLORS.muteText};text-align:center;">No overdue cycle counts — top movers are fresh.</div>
        </td>
      </tr>
    `;
  }
  const rows = cc
    .map((c) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${COLORS.cellHairline};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td><span style="font-family:'Inter',sans-serif;font-size:13px;color:${COLORS.ink};font-weight:500;">${escapeHtml(c.title)}</span></td>
              <td align="right" width="100"><span style="font-family:'SFMono-Regular','Menlo',monospace;font-size:11px;color:${COLORS.muteText};">${c.unitsLast14d} u / 14d</span></td>
            </tr>
          </table>
        </td>
      </tr>
    `)
    .join('');
  return `<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table></td></tr>`;
}

function renderDanglingDrafts(dd: OpsBriefingPayload['danglingDrafts']): string {
  if (!dd.length) {
    return `
      <tr>
        <td style="padding:24px 0 0;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:${COLORS.muteText};text-align:center;">No dangling invoices — every sent draft is either paid or fresh.</div>
        </td>
      </tr>
    `;
  }
  const rows = dd
    .map((d) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${COLORS.cellHairline};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td>
                <div style="font-family:'Inter',sans-serif;font-size:13px;color:${COLORS.ink};font-weight:600;">${escapeHtml(d.customerName)}</div>
                <div style="font-family:'SFMono-Regular','Menlo',monospace;font-size:10px;color:${COLORS.muteText};margin-top:2px;">${escapeHtml(d.status)} · ${d.ageDays}d old</div>
              </td>
              <td align="right" width="100"><span style="font-family:'SFMono-Regular','Menlo',monospace;font-size:12px;color:${COLORS.ink};font-weight:700;">${escapeHtml(d.total)}</span></td>
            </tr>
          </table>
        </td>
      </tr>
    `)
    .join('');
  return `<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table></td></tr>`;
}

function renderCostCoverage(d: OpsBriefingPayload): string {
  const spark = d.costCoverageSpark.length >= 2
    ? renderSparkline(d.costCoverageSpark, COLORS.gold)
    : '';
  return `
    <tr>
      <td style="padding:24px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${COLORS.ivoryAlt}" style="background:${COLORS.ivoryAlt};">
          <tr>
            <td width="4" bgcolor="${COLORS.yellow}" style="background:${COLORS.yellow};width:4px;line-height:1px;font-size:0;">&nbsp;</td>
            <td style="padding:22px 26px;">
              <div style="font-family:'Inter',sans-serif;font-size:10px;letter-spacing:3px;color:${COLORS.goldAccent};text-transform:uppercase;font-weight:600;margin-bottom:8px;">Cost Coverage — Progress to Goal</div>
              <div style="font-family:'Barlow Condensed','Helvetica Neue',sans-serif;font-size:32px;font-weight:600;color:${COLORS.ink};line-height:1;">${d.costCoveragePct}% <span style="font-size:14px;color:${COLORS.muteText};">/ ${d.costCoverageGoalPct}% goal</span></div>
              ${spark ? `<div style="margin-top:12px;text-align:left;">${spark}</div>` : ''}
              <div style="margin-top:10px;font-family:'Inter',sans-serif;font-size:12px;color:${COLORS.inkMute};line-height:1.55;">
                Margin attribution accuracy depends on this number. The cycle-count + cost-coverage recs in the queue feed it.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderWhatsLacking(items: string[]): string {
  if (!items.length) return '';
  return `
    <tr>
      <td style="padding:48px 0 0;">
        <div style="font-family:'Inter',sans-serif;font-size:10px;letter-spacing:3px;color:${COLORS.muteText};text-transform:uppercase;font-weight:600;margin-bottom:10px;">What this brief lacks</div>
        <ul style="margin:0;padding:0 0 0 18px;font-family:'Inter',sans-serif;font-size:14px;line-height:1.7;color:${COLORS.inkMute};">
          ${items.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      </td>
    </tr>
  `;
}

function renderButtons(d: OpsBriefingPayload): string {
  return `
    <tr>
      <td style="padding:48px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 6px;"><a href="${escapeHtml(d.links.queueUrl)}" style="display:inline-block;padding:13px 22px;background:${COLORS.blue};color:#ffffff;text-decoration:none;font-family:'Inter',sans-serif;font-size:12px;letter-spacing:1.5px;font-weight:600;text-transform:uppercase;border-radius:2px;">Triage Queue</a></td>
                  <td style="padding:0 6px;"><a href="${escapeHtml(d.links.dashboardUrl)}" style="display:inline-block;padding:13px 22px;background:#ffffff;color:${COLORS.ink};text-decoration:none;font-family:'Inter',sans-serif;font-size:12px;letter-spacing:1.5px;font-weight:600;text-transform:uppercase;border:1px solid ${COLORS.ink};border-radius:2px;">Ops Dashboard</a></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderFooter(d: OpsBriefingPayload): string {
  const lagBits: string[] = [];
  if (d.receivingLagP50Hours != null) lagBits.push(`p50 ${d.receivingLagP50Hours.toFixed(1)}h`);
  if (d.receivingLagP90Hours != null) lagBits.push(`p90 ${d.receivingLagP90Hours.toFixed(1)}h`);
  const lagLine = lagBits.length ? `Receiving lag: ${lagBits.join(' · ')}` : 'Receiving lag: not enough data yet.';
  return `
    <tr>
      <td style="padding:56px 0 24px;">
        <div style="height:1px;background:${COLORS.ink};width:48px;margin:0 auto 22px;line-height:1px;font-size:0;">&nbsp;</div>
        <div style="text-align:center;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:${COLORS.inkMute};line-height:1.5;">Filed by the Operations Director</div>
        <div style="text-align:center;margin-top:6px;font-family:'Inter',sans-serif;font-size:11px;letter-spacing:2px;color:${COLORS.mute};text-transform:uppercase;">Party On Delivery · Austin</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 0 0;border-top:1px solid ${COLORS.hairline};">
        <div style="font-family:'Inter',sans-serif;font-size:11px;line-height:1.6;color:${COLORS.mute};text-align:center;">
          Generated ${escapeHtml(d.generatedAtIso.slice(0, 10))} · ${escapeHtml(lagLine)}<br>
          Phase 1 never auto-mutates inventory — every action requires an operator click on a rec card.
        </div>
      </td>
    </tr>
  `;
}

export function renderOperationsBriefingEmail(d: OpsBriefingPayload): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Operations Weekly Briefing — ${escapeHtml(d.weekLabel)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.paper};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.ink};-webkit-font-smoothing:antialiased;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${COLORS.paper}" style="background:${COLORS.paper};">
  <tr>
    <td align="center" style="padding:40px 16px 56px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="width:100%;max-width:640px;">
        ${renderMasthead(d)}
        ${renderTopUrgent(d)}
        ${renderStatStrip(d.stats)}
        ${renderSectionHeader('The Drift', 'Top urgent + high events')}
        ${renderDriftEvents(d.driftEvents)}
        ${renderSectionHeader('The Counts', 'Cycle counts due this week')}
        ${renderCycleCounts(d.cycleCounts)}
        ${renderSectionHeader('Dangling Drafts', 'Sent invoices sitting unpaid')}
        ${renderDanglingDrafts(d.danglingDrafts)}
        ${renderCostCoverage(d)}
        ${renderWhatsLacking(d.whatsLacking)}
        ${renderButtons(d)}
        ${renderFooter(d)}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Render a plain-text fallback for the briefing — used by Resend so email
 * clients with HTML disabled still see something useful.
 */
export function renderOperationsBriefingText(d: OpsBriefingPayload): string {
  const lines: string[] = [];
  lines.push(`Operations weekly briefing — ${d.weekLabel}`);
  lines.push(`Generated ${d.generatedDate} (issue ${d.issueNumber}, ${d.year}).`);
  lines.push('');
  if (d.topUrgentRec) {
    lines.push(`URGENT — ${d.topUrgentRec.title}`);
    lines.push(`Open: ${d.topUrgentRec.href}`);
    lines.push('');
  }
  for (const s of d.stats) lines.push(`${s.label}: ${s.value}`);
  lines.push('');
  if (d.driftEvents.length) {
    lines.push('Drift events:');
    for (const e of d.driftEvents) {
      lines.push(`  - [${severityLabel(e.severity)}] ${e.title} (${e.signalKind}, ${e.ageHours}h)`);
    }
    lines.push('');
  }
  if (d.cycleCounts.length) {
    lines.push('Cycle counts overdue:');
    for (const c of d.cycleCounts) lines.push(`  - ${c.title} (${c.unitsLast14d} u / 14d)`);
    lines.push('');
  }
  if (d.danglingDrafts.length) {
    lines.push('Dangling invoices:');
    for (const dd of d.danglingDrafts) lines.push(`  - ${dd.customerName} · ${dd.total} · ${dd.status} · ${dd.ageDays}d`);
    lines.push('');
  }
  lines.push(`Cost coverage: ${d.costCoveragePct}% / ${d.costCoverageGoalPct}% goal.`);
  lines.push('');
  lines.push(`Triage queue: ${d.links.queueUrl}`);
  lines.push(`Ops dashboard: ${d.links.dashboardUrl}`);
  return lines.join('\n');
}
