/**
 * POST /api/v1/landing/visitor-pixel
 *
 * Lightweight page-view beacon. Called from the root layout pixel on every
 * navigation. Sets the `pod_vsid` cookie on first visit, bumps the session
 * row's page-view counter, and records a PAGE_VIEW LeadEvent.
 *
 * Kept separate from /lead-event so we can downgrade this endpoint to a
 * cheaper code path later (e.g. queue → batch insert) without affecting
 * form-capture latency.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { ensureVisitorCookie, COOKIE_NAME } from '@/lib/leads/cookie';
import { getOrCreateSession, recordEvent } from '@/lib/leads/leadCapture';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  page: z.string().max(500),
  referrer: z.string().max(2000).optional().nullable(),
  utm: z
    .object({
      utmSource: z.string().max(200).optional().nullable(),
      utmMedium: z.string().max(200).optional().nullable(),
      utmCampaign: z.string().max(200).optional().nullable(),
      utmContent: z.string().max(200).optional().nullable(),
      utmTerm: z.string().max(200).optional().nullable(),
      // Ad-platform click ids — persisted to VisitorSession metadata on create.
      gclid: z.string().max(200).optional().nullable(),
      gbraid: z.string().max(200).optional().nullable(),
      wbraid: z.string().max(200).optional().nullable(),
      fbclid: z.string().max(200).optional().nullable(),
      msclkid: z.string().max(200).optional().nullable(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', detail: String(err) },
      { status: 400 },
    );
  }

  const { cookieId, isNew } = ensureVisitorCookie(req);
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;

  const session = await getOrCreateSession({
    cookieId,
    landingPage: body.page,
    referrer: body.referrer ?? null,
    ipAddress,
    userAgent: req.headers.get('user-agent'),
    utm: body.utm ?? {},
  });

  await prisma.visitorSession.update({
    where: { id: session.id },
    data: { pageViewCount: { increment: 1 } },
  });

  await recordEvent({
    type: 'PAGE_VIEW',
    sessionId: session.id,
    leadId: session.leadId ?? null,
    page: body.page,
  });

  const res = NextResponse.json({
    ok: true,
    sessionId: session.id,
    leadId: session.leadId,
    // If we already have a lead attached and they previously had cart data,
    // surface a hint so the chat bubble (later) can offer "finish your order".
    returning: !isNew && (session.pageViewCount ?? 0) > 0,
  });
  if (isNew) {
    res.cookies.set(COOKIE_NAME, cookieId, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return res;
}
