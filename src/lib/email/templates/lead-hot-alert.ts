/**
 * Lead Flow hot-lead alert — the digest email the operator gets when leads need
 * a reply. Pure (no Prisma/Resend) so it renders + unit-tests without I/O; the
 * cron service (src/lib/leads/hot-alert.ts) selects the rows and sends it.
 *
 * The board deep link mirrors leadBoardUrl() in crm-mirror.ts — kept inline here
 * so this module stays free of the CRM helper's Prisma imports.
 */
import { daysUntilCT, extractLeadFacts, temperatureFor } from '@/lib/leads/scoring';

/** One row as selected by the alert query — snake_case straight from raw SQL. */
export interface HotAlertRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  lead_score: number | null;
  metadata: unknown;
  /** True when the lead is here because of a new inbound email (vs just hot). */
  fresh_inbound: boolean;
}

/** Flattened, escaped-later display row for one lead. */
export interface AlertItem {
  name: string;
  contact: string;
  /** "hot 82 · emailed you · bachelor party · in 5d" */
  meta: string;
  url: string;
}

export interface HotAlertEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function displayName(r: HotAlertRow): string {
  const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
  return name || r.email || r.phone || 'Unknown lead';
}

/** CT-safe "in 5d" / "today" / "2d ago" for an event date string, or null. */
function countdown(dateStr: string, now: Date): string | null {
  const days = daysUntilCT(dateStr, now);
  if (days == null) return null;
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days}d`;
}

/**
 * Map raw rows → display items. Pure; `baseUrl` builds the board deep link. The
 * meta line leads with why it's flagged (score + "emailed you") then the event
 * facts, so the operator can triage straight from the notification.
 */
export function toAlertItems(rows: HotAlertRow[], now: Date, baseUrl: string): AlertItem[] {
  return rows.map((r) => {
    const facts = extractLeadFacts(r.metadata);
    const parts: string[] = [];
    if (r.lead_score != null) parts.push(`${temperatureFor(r.lead_score) ?? 'score'} ${r.lead_score}`);
    if (r.fresh_inbound) parts.push('emailed you');
    if (facts.occasion) parts.push(facts.occasion.replace(/[-_]+/g, ' '));
    if (facts.eventDate) {
      const when = countdown(facts.eventDate, now);
      if (when) parts.push(when);
    }
    if (facts.headcount != null) parts.push(`${facts.headcount} ppl`);
    return {
      name: displayName(r),
      contact: r.email ?? r.phone ?? '—',
      meta: parts.join(' · '),
      url: `${baseUrl}/admin/leads?lead=${r.id}`,
    };
  });
}

/** Render the digest for N items (caller guarantees N ≥ 1). */
export function buildHotLeadAlertEmail(items: AlertItem[], baseUrl: string): HotAlertEmail {
  const n = items.length;
  const subject = `${n} lead${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} a reply — Party On Delivery`;

  const rowsHtml = items
    .map(
      (it) => `<li style="margin:0 0 12px;padding:0;">
      <strong>${escapeHtml(it.name)}</strong>${
        it.meta ? ` <span style="color:#b91c1c;">${escapeHtml(it.meta)}</span>` : ''
      }<br/>
      <span style="color:#6b7280;">${escapeHtml(it.contact)}</span><br/>
      <a href="${it.url}" style="color:#0B74B8;">Open card →</a>
    </li>`,
    )
    .join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:600px;">
  <h2 style="margin:0 0 8px;">${n} lead${n === 1 ? '' : 's'} waiting on a reply</h2>
  <p style="margin:0 0 16px;color:#6b7280;">Hot leads and inbound emails that need a response.</p>
  <ul style="list-style:none;padding:0;margin:0;">${rowsHtml}</ul>
  <p style="margin:20px 0 0;"><a href="${baseUrl}/admin/leads" style="color:#0B74B8;">Open the Lead Flow board →</a></p>
</div>`;

  const text = [
    `${n} lead${n === 1 ? '' : 's'} waiting on a reply:`,
    '',
    ...items.map((it) => `• ${it.name}${it.meta ? ` — ${it.meta}` : ''}\n  ${it.contact}\n  ${it.url}`),
    '',
    `Board: ${baseUrl}/admin/leads`,
  ].join('\n');

  return { subject, html, text };
}
