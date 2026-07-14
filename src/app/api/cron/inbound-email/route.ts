/**
 * GET /api/cron/inbound-email
 *
 * Polls the info@ Gmail INBOX every 15 min (vercel.json) and turns
 * likely-inquiry mail into Lead Flow board cards + stored messages
 * (src/lib/leads/inbound-email.ts). No-ops (configured:false) until the Gmail
 * service account + domain-wide delegation are set up — see
 * docs/inbound-email-setup.md.
 *
 * Auth: CRON_SECRET bearer, fail-CLOSED when unset (same as lead-pipeline):
 * this route reads a mailbox and writes leads, so a misconfigured environment
 * must not leave it publicly triggerable.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { pollInboundEmails } from '@/lib/leads/inbound-email';
import { safeErrorMessage } from '@/lib/email/gmail-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await pollInboundEmails();
    console.log('[inbound-email cron]', JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (err) {
    // Message only — the raw Google error carries the signed JWT assertion.
    console.error('[inbound-email cron] poll failed', safeErrorMessage(err));
    return NextResponse.json({ ok: false, error: 'poll-failed' }, { status: 500 });
  }
}
