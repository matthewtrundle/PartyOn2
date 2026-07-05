/**
 * POST /api/email/unsubscribe — RFC 8058 one-click unsubscribe + the
 * /email/preferences form target.
 * GET  /api/email/unsubscribe — humans clicking the link → preferences page.
 *
 * Every request is authenticated by the HMAC token minted alongside the
 * email (see src/lib/followups/suppression.ts) — nobody can unsubscribe an
 * address they don't have an email for. Applies to FOLLOW-UP email only;
 * transactional email (invoices, receipts) never consults the list.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import {
  normalizeEmail,
  suppress,
  unsuppress,
  verifyUnsubscribeToken,
} from '@/lib/followups/suppression';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  email: z.string().email().max(320),
  token: z.string().min(16).max(128),
});

/** Keep Customer.acceptsMarketing in step with the suppression list. */
async function syncCustomerMarketing(email: string, accepts: boolean): Promise<void> {
  await prisma.customer.updateMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    data: { acceptsMarketing: accepts },
  });
}

function preferencesRedirect(request: NextRequest, email: string, token: string, done: string): NextResponse {
  const url = new URL('/email/preferences', request.nextUrl.origin);
  url.searchParams.set('email', email);
  url.searchParams.set('token', token);
  url.searchParams.set('done', done);
  // 303: turn the form POST into a GET.
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = querySchema.safeParse({
    email: request.nextUrl.searchParams.get('email'),
    token: request.nextUrl.searchParams.get('token'),
  });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!verifyUnsubscribeToken(email, parsed.data.token)) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 403 });
  }

  // Browser form submissions carry an action + redirect flag in the form
  // body; RFC 8058 one-click posts carry `List-Unsubscribe=One-Click`.
  let action = 'unsubscribe';
  let wantsRedirect = false;
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('form')) {
    try {
      const form = await request.formData();
      const rawAction = form.get('action');
      if (rawAction === 'resubscribe') action = 'resubscribe';
      wantsRedirect = form.get('redirect') === '1';
    } catch {
      // No parseable body (some one-click senders) — default unsubscribe.
    }
  }

  if (action === 'resubscribe') {
    // Public path never clears bounce/complaint rows.
    const removed = await unsuppress(email);
    if (removed) await syncCustomerMarketing(email, true);
    if (wantsRedirect) {
      return preferencesRedirect(request, email, parsed.data.token, removed ? 'resubscribed' : 'blocked');
    }
    return NextResponse.json({ success: true, resubscribed: removed });
  }

  await suppress(email, 'unsubscribe', wantsRedirect ? 'preferences-page' : 'one-click');
  await syncCustomerMarketing(email, false);
  if (wantsRedirect) {
    return preferencesRedirect(request, email, parsed.data.token, 'unsubscribed');
  }
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const email = request.nextUrl.searchParams.get('email') ?? '';
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const url = new URL('/email/preferences', request.nextUrl.origin);
  if (email) url.searchParams.set('email', email);
  if (token) url.searchParams.set('token', token);
  return NextResponse.redirect(url, 302);
}
