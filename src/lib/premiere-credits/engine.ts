/**
 * Premiere Credit automation — cron engine.
 *
 * One tick: read the POD Credits sheet, mint codes for new rows (each row
 * isolated so one bad row can't stop the rest), send READY grants (only when
 * the send flag is on), then notify the partner of delivered codes and alert
 * the operator about anything needing a human. All work is gated behind two
 * feature flags; with both absent the tick is a fast no-op.
 */

import { prisma } from '@/lib/database/client';
import { FEATURE_FLAGS, isFeatureEnabled } from '@/lib/features/feature-flags';
import { readCreditSheet, isPremiereCreditsSheetConfigured } from './sheet';
import { ingestRow, sendGrant, type DeliveredInfo } from './grant-service';
import { PER_RUN_CAP } from './planner';
import {
  sendPartnerCodeSummary,
  sendOpsAttentionAlert,
  type AttentionItem,
  type DeliveredCode,
} from './notify';
import type { ParsedCreditRow, TickResult } from './types';

/** Ingest new rows, bounded by PER_RUN_CAP new grants per tick. */
async function ingestPhase(
  rows: ParsedCreditRow[],
): Promise<{ minted: number; held: number; needsContact: number; attention: AttentionItem[]; errors: TickResult['rowErrors'] }> {
  let minted = 0;
  let held = 0;
  let needsContact = 0;
  let created = 0;
  const attention: AttentionItem[] = [];
  const errors: TickResult['rowErrors'] = [];

  for (const row of rows) {
    if (created >= PER_RUN_CAP) {
      errors.push({ sheetRow: row.sheetRow, error: `deferred — per-run cap (${PER_RUN_CAP}) reached` });
      continue;
    }
    try {
      const { grant, outcome } = await ingestRow(row);
      if (outcome === 'exists') continue;
      created += 1;
      if (outcome === 'minted') minted += 1;
      if (outcome === 'held') {
        held += 1;
        attention.push({ clientName: grant.clientName, amount: Number(grant.amount), status: 'HELD_FOR_APPROVAL', reason: grant.holdReason || 'over-threshold' });
      }
      if (outcome === 'needs-contact') {
        needsContact += 1;
        attention.push({ clientName: grant.clientName, amount: Number(grant.amount), status: 'NEEDS_CONTACT', reason: 'no email on sheet row' });
      }
    } catch (err) {
      errors.push({ sheetRow: row.sheetRow, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { minted, held, needsContact, attention, errors };
}

/** Milliseconds after which a grant stuck in SENDING is treated as crashed. */
const SENDING_STUCK_MS = 15 * 60 * 1000;

/**
 * Recover grants stuck in SENDING from a crashed prior send (cron OR a manual
 * admin approve/resend, which run regardless of the send flag). The send claim
 * excludes SENDING, so a real in-flight send (seconds) is never reset here —
 * only rows older than the stuck threshold, which then re-enter the queue.
 * Runs every tick, independent of the send flag.
 */
async function recoverStuckSending(): Promise<void> {
  await prisma.premiereCreditGrant.updateMany({
    where: { status: 'SENDING', updatedAt: { lt: new Date(Date.now() - SENDING_STUCK_MS) } },
    data: { status: 'READY' },
  });
}

/** Send every READY grant, isolating failures. */
async function sendPhase(): Promise<{ sent: number; sendFailed: number; delivered: DeliveredInfo[]; attention: AttentionItem[] }> {
  const ready = await prisma.premiereCreditGrant.findMany({ where: { status: 'READY' }, select: { id: true } });
  let sent = 0;
  let sendFailed = 0;
  const delivered: DeliveredInfo[] = [];
  const attention: AttentionItem[] = [];

  for (const { id } of ready) {
    try {
      const result = await sendGrant(id);
      if (result.status === 'SENT' && result.delivered) {
        sent += 1;
        delivered.push(result.delivered);
      } else if (result.status === 'SEND_FAILED') {
        sendFailed += 1;
        const g = await prisma.premiereCreditGrant.findUnique({ where: { id }, select: { clientName: true, amount: true } });
        if (g) attention.push({ clientName: g.clientName, amount: Number(g.amount), status: 'SEND_FAILED', reason: result.error });
      }
    } catch (err) {
      sendFailed += 1;
      console.error(`[premiere-credits] sendGrant ${id} threw:`, err);
    }
  }

  return { sent, sendFailed, delivered, attention };
}

/** Run one full tick. Never throws — returns a structured result. */
export async function runPremiereCreditsTick(): Promise<TickResult> {
  const empty: TickResult = { ok: true, scanned: 0, minted: 0, held: 0, needsContact: 0, sent: 0, sendFailed: 0, rowErrors: [] };

  if (!(await isFeatureEnabled(FEATURE_FLAGS.PREMIERE_CREDITS_MASTER))) {
    return { ...empty, paused: true };
  }
  if (!isPremiereCreditsSheetConfigured()) {
    return { ...empty, ok: false, rowErrors: [{ sheetRow: 0, error: 'sheet env not configured' }] };
  }

  let scanned = 0;
  const attention: AttentionItem[] = [];
  const rowErrors: TickResult['rowErrors'] = [];
  let minted = 0;
  let held = 0;
  let needsContact = 0;
  let sent = 0;
  let sendFailed = 0;
  const delivered: DeliveredInfo[] = [];

  try {
    // Runs every tick, before the send-flag branch, so a crash mid-send (cron
    // OR a manual admin approve/resend) always gets recovered.
    await recoverStuckSending();

    const { rows, warnings } = await readCreditSheet();
    scanned = rows.length;
    if (warnings.length) console.log('[premiere-credits] sheet warnings:', warnings);

    const ingest = await ingestPhase(rows);
    minted = ingest.minted;
    held = ingest.held;
    needsContact = ingest.needsContact;
    attention.push(...ingest.attention);
    rowErrors.push(...ingest.errors);

    if (await isFeatureEnabled(FEATURE_FLAGS.PREMIERE_CREDITS_SEND)) {
      const send = await sendPhase();
      sent = send.sent;
      sendFailed = send.sendFailed;
      delivered.push(...send.delivered);
      attention.push(...send.attention);
    }
  } catch (err) {
    // Log only .message — a googleapis GaxiosError can carry the signed JWT in
    // its config/response objects (CWE-532).
    const message = err instanceof Error ? err.message : String(err);
    console.error('[premiere-credits] tick failed:', message);
    rowErrors.push({ sheetRow: 0, error: message });
  }

  // Notify partner + operator (best-effort; never fail the tick over these).
  try {
    const deliveredCodes: DeliveredCode[] = delivered.map((d) => ({ clientName: d.clientName, amount: d.amount, code: d.code, expiresAt: d.expiresAt }));
    if (await sendPartnerCodeSummary(deliveredCodes)) await stampPartnerNotified(delivered);
    await sendOpsAttentionAlert(attention, rowErrors);
  } catch (err) {
    console.error('[premiere-credits] notification failed:', err);
  }

  return { ok: rowErrors.length === 0, scanned, minted, held, needsContact, sent, sendFailed, rowErrors };
}

/** Stamp partner_notified_at on the grants whose codes were summarized. */
async function stampPartnerNotified(delivered: DeliveredInfo[]): Promise<void> {
  if (delivered.length === 0) return;
  const codes = delivered.map((d) => d.code);
  await prisma.premiereCreditGrant.updateMany({
    where: { code: { in: codes } },
    data: { partnerNotifiedAt: new Date() },
  });
}
