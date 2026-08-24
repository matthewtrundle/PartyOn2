/**
 * Premiere Credit automation — partner + operator notifications.
 *
 * Replaces sheet write-back (access is read-only): after codes are delivered to
 * customers, email Premiere a summary so their VA can paste codes into the
 * sheet's own POD Code column. Separately, alert the operator whenever a tick
 * produces something that needs a human — a held grant, a missing contact, a
 * failed send, or a row error.
 */

import { createHash } from 'crypto';
import { prisma } from '@/lib/database/client';
import { sendEmail } from '@/lib/email/resend-client';
import { formatCurrency } from '@/lib/email/resend-client';

/**
 * Partner summary recipients. Accepts a comma-separated list so more than one
 * person at Premiere can receive the "codes issued" email — the first address
 * is the To, any others become Cc.
 */
const PARTNER_NOTIFY_LIST = (process.env.PREMIERE_PARTNER_NOTIFY_EMAIL || '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);
const PARTNER_NOTIFY_EMAIL = PARTNER_NOTIFY_LIST[0];
const OPS_ALERT_EMAIL = process.env.OPS_ALERT_EMAIL || 'allan@partyondelivery.com';
const ADMIN_URL = 'https://partyondelivery.com/admin/premiere-credits';

/** Minimal HTML escape for interpolated text. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A code that was delivered to a customer this tick. */
export interface DeliveredCode {
  clientName: string;
  amount: number;
  code: string;
  expiresAt: Date;
}

function longDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago',
  }).format(date);
}

/**
 * Email Premiere the codes delivered this tick so they can update their sheet.
 * No-ops (returns false) when there are no codes or no recipient configured.
 * Cc's the operator when that address differs from the partner recipient.
 */
export async function sendPartnerCodeSummary(delivered: DeliveredCode[]): Promise<boolean> {
  if (delivered.length === 0 || !PARTNER_NOTIFY_EMAIL) return false;

  const rows = delivered
    .map(
      (d) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(d.clientName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-weight:700;">${escapeHtml(d.code)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(d.amount)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${longDate(d.expiresAt)}</td>
        </tr>`,
    )
    .join('');

  // Cc any additional partner recipients plus the operator, deduped
  // case-insensitively and minus the To address (so the same mailbox in
  // different casing can't land in both To and Cc).
  const seen = new Set<string>([PARTNER_NOTIFY_EMAIL.toLowerCase()]);
  const cc: string[] = [];
  for (const addr of [...PARTNER_NOTIFY_LIST.slice(1), OPS_ALERT_EMAIL]) {
    if (!addr) continue;
    const key = addr.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cc.push(addr);
  }

  await sendEmail({
    to: PARTNER_NOTIFY_EMAIL,
    cc: cc.length > 0 ? cc : undefined,
    subject: `POD credit codes issued (${delivered.length}) — please update the sheet`,
    type: 'PREMIERE_CREDIT',
    metadata: { kind: 'partner-summary', count: delivered.length },
    html: `
      <h2 style="font-family:Arial,sans-serif;">POD credit codes issued</h2>
      <p style="font-family:Arial,sans-serif;color:#4b5563;">Party On Delivery just sent these credit codes to your customers by email and text. Please paste each code into the <strong>POD Code</strong> column of the POD Credits tab.</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 12px;text-align:left;">Client</th>
          <th style="padding:8px 12px;text-align:left;">Code</th>
          <th style="padding:8px 12px;text-align:right;">Amount</th>
          <th style="padding:8px 12px;text-align:left;">Expires</th>
        </tr>
        ${rows}
      </table>
      <p style="font-family:Arial,sans-serif;color:#9ca3af;font-size:13px;">Full history: ${ADMIN_URL}</p>
    `,
  });
  return true;
}

/** A grant needing operator attention. */
export interface AttentionItem {
  clientName: string;
  amount: number;
  status: string;
  reason?: string;
}

/**
 * How long an IDENTICAL operator alert stays suppressed. A tick runs every 15
 * minutes, so an unattended failure used to send 96 identical emails a day —
 * which trains the operator to ignore the alert entirely (this happened: the
 * 2026-08-18 sheet-permission outage). Novel content always sends immediately;
 * only an exact repeat inside the window is dropped.
 */
const ALERT_REPEAT_COOLDOWN_MS = 60 * 60 * 1000;

/** Sentinel sheetRow used for failures that killed the whole tick, not one row. */
const WHOLE_SHEET_ROW = 0;

/**
 * Content fingerprint for an alert. Two alerts match only when they describe
 * the same set of problems — a new held grant or a different error message
 * changes the hash and sends right away. Sorted so ordering can't matter.
 */
function alertFingerprint(
  items: AttentionItem[],
  rowErrors: Array<{ sheetRow: number; error: string }>,
): string {
  const parts = [
    ...items.map((i) => `item|${i.clientName}|${i.amount}|${i.status}|${i.reason ?? ''}`),
    ...rowErrors.map((e) => `err|${e.sheetRow}|${e.error}`),
  ].sort();
  return createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 32);
}

/**
 * True when an identical alert already went out inside the cooldown window.
 * Reads EmailLog rather than a new table — the send path already writes one
 * row per alert with our metadata on it.
 *
 * Fails OPEN: if the lookup errors we send the alert. A missed alert is worse
 * than a duplicate one.
 */
async function alreadyAlerted(fingerprint: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - ALERT_REPEAT_COOLDOWN_MS);
    const recent = await prisma.emailLog.findMany({
      where: { type: 'PREMIERE_CREDIT', createdAt: { gte: since } },
      select: { metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    return recent.some((log) => {
      const meta = log.metadata as { kind?: string; fingerprint?: string } | null;
      return meta?.kind === 'ops-alert' && meta?.fingerprint === fingerprint;
    });
  } catch (err) {
    console.error('[premiere-credits] alert dedupe lookup failed, sending anyway:', err);
    return false;
  }
}

/**
 * Alert the operator about grants that need a human (held, needs-contact,
 * send-failed) plus any row-level errors. No-ops when there is nothing to
 * report.
 */
export async function sendOpsAttentionAlert(
  items: AttentionItem[],
  rowErrors: Array<{ sheetRow: number; error: string }>,
): Promise<void> {
  if (items.length === 0 && rowErrors.length === 0) return;

  const fingerprint = alertFingerprint(items, rowErrors);
  if (await alreadyAlerted(fingerprint)) {
    console.log(`[premiere-credits] alert suppressed (identical within ${ALERT_REPEAT_COOLDOWN_MS / 60000}m): ${fingerprint}`);
    return;
  }

  // A sheetRow-0 error means the sheet read itself failed, so nothing was
  // processed at all. Say what to actually do instead of leaving the operator
  // to decode a raw Google error.
  const wholeSheetErrors = rowErrors.filter((e) => e.sheetRow === WHOLE_SHEET_ROW);
  const remediation = wholeSheetErrors.length
    ? `<div style="font-family:Arial,sans-serif;background:#fef2f2;border-left:4px solid #b91c1c;padding:12px 16px;margin:16px 0;">
         <p style="margin:0 0 8px;font-weight:700;color:#b91c1c;">The whole sheet read failed — no credits were processed this run.</p>
         <p style="margin:0 0 8px;">Most common cause: Premiere's Booking Masterlist is no longer shared with our service account.</p>
         <p style="margin:0;">Fix: share the sheet as <strong>Viewer</strong> with<br>
           <code>${escapeHtml(process.env.PREMIER_SHEET_SERVICE_ACCOUNT_EMAIL || 'the Premier sheet service account')}</code></p>
       </div>`
    : '';

  const itemRows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.clientName)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(it.amount)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.status)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.reason || '')}</td>
        </tr>`,
    )
    .join('');

  const errorRows = rowErrors
    .map((e) => `<li>Row ${e.sheetRow}: ${escapeHtml(e.error)}</li>`)
    .join('');

  await sendEmail({
    to: OPS_ALERT_EMAIL,
    subject: `Premiere credits need attention (${items.length + rowErrors.length})`,
    type: 'PREMIERE_CREDIT',
    metadata: { kind: 'ops-alert', fingerprint, items: items.length, errors: rowErrors.length },
    html: `
      <h2 style="font-family:Arial,sans-serif;">Premiere credits need a look</h2>
      ${remediation}
      ${
        items.length
          ? `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
              <tr style="background:#f3f4f6;"><th style="padding:6px 12px;text-align:left;">Client</th><th style="padding:6px 12px;text-align:right;">Amount</th><th style="padding:6px 12px;text-align:left;">Status</th><th style="padding:6px 12px;text-align:left;">Reason</th></tr>
              ${itemRows}
            </table>`
          : ''
      }
      ${errorRows ? `<p style="font-family:Arial,sans-serif;font-weight:700;margin-top:16px;">Row errors</p><ul style="font-family:Arial,sans-serif;color:#b91c1c;">${errorRows}</ul>` : ''}
      <p style="font-family:Arial,sans-serif;">Review and act: ${ADMIN_URL}</p>
    `,
  });
}
