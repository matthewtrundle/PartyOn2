/**
 * GET /api/v1/admin/leads/email/[id] — the actual body of a sent email.
 *
 * EmailLog stores metadata (subject/status/bounce reason) but not the body,
 * so the body is fetched on demand from Resend via the stored resendId. Used
 * by the drawer timeline's expandable email entries. Admin-only; the body is
 * our own template content and is rendered client-side inside a sandboxed
 * iframe.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/database/client';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { resend } from '@/lib/email/resend-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const log = await prisma.emailLog.findUnique({
    where: { id },
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
  });
  if (!log) {
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

  // Body lives at Resend, keyed by resendId. No id (older/failed sends) or no
  // client configured → return the metadata with a null body so the drawer can
  // still show the bounce reason.
  if (!log.resendId || !resend) {
    return NextResponse.json({ success: true, data: { ...meta, html: null, text: null } });
  }

  try {
    const res = await resend.emails.get(log.resendId);
    const email = res.data;
    return NextResponse.json({
      success: true,
      data: {
        ...meta,
        html: email?.html ?? null,
        text: email?.text ?? null,
      },
    });
  } catch {
    // Never surface the raw Resend error (avoid leaking request internals);
    // the timeline just shows "body unavailable" alongside the metadata.
    return NextResponse.json({
      success: true,
      data: { ...meta, html: null, text: null, bodyError: 'unavailable' },
    });
  }
}
