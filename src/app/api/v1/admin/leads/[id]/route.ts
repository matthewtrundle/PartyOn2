/**
 * /api/v1/admin/leads/[id]
 *
 * GET   — drawer detail: lead, timeline (events + emails + follow-ups),
 *         matched orders/drafts (email or last-10 phone), score breakdown.
 * PATCH — notes / owner / snoozedUntil (board metadata only; stage changes
 *         go through the /stage route so the transition matrix applies).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { phoneLast10 } from '@/lib/leads/phone';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface MatchedOrder {
  id: string;
  orderNumber: number;
  total: number;
  createdAt: string;
  isGroupParticipant: boolean;
}

/** Paid orders matching the lead's identity — group ones flagged "possible". */
async function matchedOrders(lead: {
  email: string | null;
  phone: string | null;
}): Promise<MatchedOrder[]> {
  const last10 = phoneLast10(lead.phone);
  const identity: Prisma.Sql[] = [];
  if (lead.email) identity.push(Prisma.sql`LOWER(customer_email) = LOWER(${lead.email})`);
  if (last10) {
    identity.push(
      Prisma.sql`RIGHT(REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g'), 10) = ${last10}`,
    );
  }
  if (identity.length === 0) return [];
  const rows = await prisma.$queryRaw<
    Array<{ id: string; order_number: number; total: number; created_at: Date; is_group: boolean }>
  >`
    SELECT id, order_number, total::float AS total, created_at,
           (group_order_v2_id IS NOT NULL OR group_order_id IS NOT NULL) AS is_group
    FROM orders
    WHERE financial_status IN ('PAID', 'PARTIALLY_REFUNDED')
      AND (${Prisma.join(identity, ' OR ')})
    ORDER BY created_at DESC
    LIMIT 5
  `;
  return rows.map((r) => ({
    id: r.id,
    orderNumber: r.order_number,
    total: r.total,
    createdAt: r.created_at.toISOString(),
    isGroupParticipant: r.is_group,
  }));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  }

  const [events, followUps, emailLogs, orders, drafts] = await Promise.all([
    prisma.leadEvent.findMany({
      where: { leadId: id },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    }),
    prisma.followUpJob.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        journeyKey: true,
        step: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        cancelReason: true,
      },
    }),
    lead.email
      ? prisma.emailLog.findMany({
          where: { to: { equals: lead.email, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, subject: true, type: true, status: true, createdAt: true },
        })
      : Promise.resolve([]),
    matchedOrders(lead),
    lead.email
      ? prisma.draftOrder.findMany({
          where: { customerEmail: { equals: lead.email, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, status: true, total: true, createdAt: true, token: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    success: true,
    data: { lead, events, followUps, emailLogs, orders, drafts },
  });
}

const patchSchema = z
  .object({
    notes: z.string().max(10_000).nullable().optional(),
    owner: z.string().max(40).nullable().optional(),
    snoozedUntil: z.string().datetime().nullable().optional(),
  })
  .refine(
    (v) => v.notes !== undefined || v.owner !== undefined || v.snoozedUntil !== undefined,
    { message: 'empty_patch' },
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_body' }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        notes: body.notes === undefined ? undefined : body.notes,
        owner: body.owner === undefined ? undefined : body.owner,
        snoozedUntil:
          body.snoozedUntil === undefined
            ? undefined
            : body.snoozedUntil === null
              ? null
              : new Date(body.snoozedUntil),
      },
    });
    return NextResponse.json({ success: true, data: { lead } });
  } catch {
    return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  }
}
