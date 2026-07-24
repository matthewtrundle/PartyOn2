/**
 * GET /api/v1/admin/leads/[id]/email/[emailId] — the body of an email sent to
 * this lead. Used by the drawer timeline's expandable email rows.
 *
 * EmailLog stores no body, so it's fetched on demand from Resend via resendId.
 * Three guards (security review 2026-07-24):
 *   1. requireAdminRole — admin-only.
 *   2. Lead-scoped — the email's recipient must equal THIS lead's address, so
 *      the route can't be used as a bare "read any EmailLog by id" oracle.
 *   3. Type allow-list — never serve credential-bearing mail (PASSWORD_RESET,
 *      affiliate magic-link/payout) even if it landed at the lead's address
 *      (a lead is often also a customer).
 * The body is our own template content, rendered client-side in a sandboxed
 * iframe.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/database/client';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { resend } from '@/lib/email/resend-client';
import { isLeadViewableEmailType } from '@/lib/leads/email-visibility';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id, emailId } = await params;

  const [lead, log] = await Promise.all([
    prisma.lead.findUnique({ where: { id }, select: { email: true } }),
    prisma.emailLog.findUnique({
      where: { id: emailId },
      select: {
        subject: true,
        type: true,
        status: true,
        to: true,
        resendId: true,
        errorMessage: true,
        bouncedAt: true,
        createdAt: true,
      },
    }),
  ]);
  if (!lead || !log) {
    return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  }
  // Scope: the email must have been sent to THIS lead's address.
  if (!lead.email || log.to.toLowerCase() !== lead.email.toLowerCase()) {
    return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  }

  const meta = {
    subject: log.subject,
    type: log.type,
    status: log.status,
    to: log.to,
    errorMessage: log.errorMessage,
    bouncedAt: log.bouncedAt?.toISOString() ?? null,
    createdAt: log.createdAt.toISOString(),
  };

  // Never fetch the body for credential-bearing types; the metadata (bounce
  // reason etc.) is still safe to show.
  if (!isLeadViewableEmailType(log.type)) {
    return NextResponse.json({
      success: true,
      data: { ...meta, html: null, text: null, bodyRestricted: true },
    });
  }

  // Audit: record who viewed which email body (metadata only — never the body).
  console.info(
    `[leads/email] admin viewed body emailLogId=${emailId} type=${log.type} lead=${id}`,
  );

  // Body lives at Resend, keyed by resendId. No id (older/failed sends) or no
  // client configured → metadata only.
  if (!log.resendId || !resend) {
    return NextResponse.json({ success: true, data: { ...meta, html: null, text: null } });
  }

  try {
    const res = await resend.emails.get(log.resendId);
    const email = res.data;
    return NextResponse.json({
      success: true,
      data: { ...meta, html: email?.html ?? null, text: email?.text ?? null },
    });
  } catch {
    // Never surface the raw Resend error (avoid leaking request internals).
    return NextResponse.json({
      success: true,
      data: { ...meta, html: null, text: null, bodyError: 'unavailable' },
    });
  }
}
