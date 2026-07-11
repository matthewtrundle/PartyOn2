/**
 * GET /api/cron/finance-monthly-close
 *
 * Finance Director Phase 5 — the recurring monthly-close P&L email. On the 1st
 * of each month it closes the PRIOR month: reads that month's
 * `finance_monthly_rollup`, renders a P&L (Revenue → COGS → Gross Profit → OpEx
 * → Net) and reconciliation status, and emails it via Resend.
 *
 * Net income is rendered ONLY when the rollup's `dataHealth.netIncomeReliable`
 * is true (the honesty gate); otherwise the email shows "Pending" + the flags.
 * Bank-sourced figures are labelled cash-basis.
 *
 * Schedule: 1st of month, 14:00 UTC (after the nightly rollup keeps the trailing
 * months fresh). Bearer auth: `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Optional `?month=YYYY-MM` closes a specific month instead of last month —
 * handy for manual re-sends / testing (e.g. `?month=2026-04`).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/email/resend-client';
import { buildMonthlyClosePayload } from '@/lib/finance/monthly-close-payload';
import {
  renderFinanceMonthlyCloseEmail,
  renderFinanceMonthlyCloseText,
} from '@/lib/email/templates/finance-monthly-close';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Translate a `?month=YYYY-MM` override into the `now` the payload builder
 * expects — the builder closes the month BEFORE `now`, so to close month M we
 * pass the 1st of M+1. Returns null on a malformed value.
 */
function nowForMonthParam(monthParam: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthParam);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  if (month < 1 || month > 12) return null;
  // Guard the 2-digit-year footgun: Date.UTC(26, …) resolves to 1926, not 2026.
  if (year < 2000 || year > 2100) return null;
  // 1st of the following month (UTC) → resolveCloseMonth() maps back to (year, month).
  return new Date(Date.UTC(year, month, 1));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  // Guard against an unset secret so `Bearer undefined` can never authenticate.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const monthParam = request.nextUrl.searchParams.get('month');
  let now = new Date();
  if (monthParam) {
    const overridden = nowForMonthParam(monthParam);
    if (!overridden) {
      return NextResponse.json({ error: 'Invalid month — use YYYY-MM' }, { status: 400 });
    }
    now = overridden;
  }

  let payload;
  try {
    payload = await buildMonthlyClosePayload(now);
  } catch (err) {
    // Fail soft (matches the email-send path) — a DB error returns a clean 500
    // rather than an unhandled rejection; Vercel logs it for retry.
    console.error('[finance-monthly-close] payload build failed:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
  if (!payload) {
    // No rollup for the closed month yet — skip rather than invent numbers.
    return NextResponse.json({
      ok: true,
      skipped: 'no finance_monthly_rollup row for the closed month',
    });
  }

  const recipient =
    process.env.FINANCE_BRIEFING_TO ||
    process.env.OPS_BRIEFING_TO ||
    process.env.MARKETING_BRIEFING_TO ||
    'allan@partyondelivery.com';

  // Deliver email — fails soft so the cron stays green and can be retried.
  let email: { sent: boolean; error?: string } = { sent: false, error: 'not attempted' };
  if (!resend) {
    email = { sent: false, error: 'RESEND_API_KEY not configured' };
  } else {
    try {
      const html = renderFinanceMonthlyCloseEmail(payload);
      const text = renderFinanceMonthlyCloseText(payload);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@partyondelivery.com';
      const netTag = payload.netIncomeReliable ? '' : ' (net income pending)';
      await resend.emails.send({
        from: `Party On Delivery — Finance Director <${fromEmail}>`,
        to: recipient,
        subject: `Finance monthly close — ${payload.monthLabel}${netTag}`,
        html,
        text,
      });
      email = { sent: true };
    } catch (err) {
      email = { sent: false, error: err instanceof Error ? err.message : String(err) };
      console.error('[finance-monthly-close] email send failed:', err);
    }
  }

  return NextResponse.json({
    ok: true,
    period: payload.period,
    month: payload.monthLabel,
    netIncomeReliable: payload.netIncomeReliable,
    expenseSource: payload.expenseSource,
    revenueCents: payload.revenueCents,
    delivery: { email, recipient },
  });
}
