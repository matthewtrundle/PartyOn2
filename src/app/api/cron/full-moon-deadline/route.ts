/**
 * GET /api/cron/full-moon-deadline
 *
 * Vercel cron. Runs daily. At event−`deadlineDays` (Aug 1 → ~Jul 25), if fewer
 * than the minimum tickets are sold, it:
 *   1. Flips the public threshold widget to "postponed" (sets the
 *      `full_moon_postponed` flag), and
 *   2. Emails the operator an alert with the count + the exact batch-refund
 *      command to run.
 *
 * DELIBERATELY does NOT move money or email buyers. Refunds + buyer comms are
 * an operator action: `npx tsx scripts/full-moon/batch-refund.ts --apply`.
 * Idempotent — once postponed, subsequent runs no-op (no repeat alerts).
 *
 * Auth: requires CRON_SECRET in the Authorization header (Vercel sets this for
 * scheduled jobs).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { EVENT } from '@/components/full-moon/event';
import { getFullMoonRoster } from '@/lib/full-moon/roster';
import { isFullMoonPostponed, setFullMoonPostponed, deadlineWindow } from '@/lib/full-moon/event-state';
import { sendEmail } from '@/lib/email/resend-client';
import { EmailType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const OPS_ALERT_EMAIL = process.env.OPS_ALERT_EMAIL || 'allan@partyondelivery.com';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Fail CLOSED: if CRON_SECRET is unset/misconfigured, reject rather than run
  // unauthenticated (this flips a public state + alerts the operator).
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const window = deadlineWindow(Date.now(), EVENT.isoDate, EVENT.deadlineDays);
  if (window !== 'in-window') {
    return NextResponse.json({ ok: true, action: window === 'not-yet' ? 'before-deadline' : 'past-event' });
  }

  // Already postponed → nothing to do (don't re-alert).
  if (await isFullMoonPostponed()) {
    return NextResponse.json({ ok: true, action: 'already-postponed' });
  }

  const roster = await getFullMoonRoster();
  const sold = roster.totals.ticketsSold;

  // Minimum met — the cruise is a go. No-op.
  if (sold >= EVENT.minimum) {
    return NextResponse.json({ ok: true, action: 'minimum-met', sold, minimum: EVENT.minimum });
  }

  // Short at the deadline → postpone + alert the operator (no money moved here).
  await setFullMoonPostponed(true, 'deadline-cron');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
  let alerted = false;
  try {
    const subject = `[Full Moon] Postponed — ${sold}/${EVENT.minimum} sold. Run the batch refund.`;
    const bodyLines = [
      `The Lake Travis Full Moon Party (${EVENT.dateLabel}) is short of its ${EVENT.minimum}-guest minimum at the deadline.`,
      ``,
      `Tickets sold (incl. comps): ${sold}`,
      `Paying orders: ${roster.totals.payingOrders}`,
      `Collected: $${roster.totals.collected.toFixed(2)}`,
      ``,
      `The public page now shows "Postponed". Money has NOT been touched.`,
      ``,
      `Next step — refund everyone (dry-run first, then apply):`,
      `  npx tsx scripts/full-moon/batch-refund.ts`,
      `  npx tsx scripts/full-moon/batch-refund.ts --apply`,
      ``,
      `Roster: ${baseUrl}/ops/full-moon`,
    ];
    const html = `<pre style="font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.5">${bodyLines
      .join('\n')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</pre>`;

    const resendId = await sendEmail({
      to: OPS_ALERT_EMAIL,
      subject,
      html,
      text: bodyLines.join('\n'),
      type: EmailType.WELCOME, // reuse — internal ops alert, no dedicated type
      metadata: { flow: 'full-moon-deadline-alert', sold, minimum: EVENT.minimum },
      tags: [{ name: 'flow', value: 'full_moon_deadline_alert' }],
    });
    alerted = Boolean(resendId);
  } catch (error) {
    console.error('[FullMoon Deadline] alert email failed:', error instanceof Error ? error.message : error);
  }

  return NextResponse.json({
    ok: true,
    action: 'postponed',
    sold,
    minimum: EVENT.minimum,
    collected: roster.totals.collected,
    payingOrders: roster.totals.payingOrders,
    operatorAlerted: alerted,
    at: new Date().toISOString(),
  });
}
