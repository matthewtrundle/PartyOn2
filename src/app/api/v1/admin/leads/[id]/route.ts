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
import { dashboardGroupId } from '@/lib/leads/board-joins';
import { getGroupOrderById } from '@/lib/group-orders-v2/service';
import type { GroupOrderV2Full } from '@/lib/group-orders-v2/types';

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

/** Drawer cart section: the lead's dashboard, its draft lines, and status. */
interface DrawerCartDto {
  shareCode: string;
  /** First tab OPEN = guests can still join/order; LOCKED = host closed it. */
  status: string | null;
  total: number;
  items: Array<{ title: string; variantTitle: string | null; quantity: number; price: number }>;
  participantCount: number;
  deliveryDate: string | null;
  affiliateName: string | null;
}

function toDrawerCart(group: GroupOrderV2Full): DrawerCartDto {
  const items = group.tabs.flatMap((t) =>
    t.draftItems.map((i) => ({
      title: i.title,
      variantTitle: i.variantTitle,
      quantity: i.quantity,
      price: i.price,
    })),
  );
  return {
    shareCode: group.shareCode,
    status: group.tabs[0]?.status ?? null,
    total:
      Math.round(group.tabs.reduce((sum, t) => sum + t.totals.draftSubtotal, 0) * 100) / 100,
    items,
    participantCount: group.participants.length,
    deliveryDate: group.tabs[0]?.deliveryDate ?? null,
    affiliateName: group.affiliate?.businessName ?? null,
  };
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

  const groupId = dashboardGroupId(lead.metadata);
  const [
    events,
    followUps,
    emailLogs,
    orders,
    drafts,
    inboundEmails,
    chatConversations,
    group,
    affiliateRow,
  ] = await Promise.all([
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
    prisma.inboundEmail.findMany({
      where: { leadId: id },
      orderBy: { receivedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        fromEmail: true,
        fromName: true,
        subject: true,
        snippet: true,
        bodyText: true,
        receivedAt: true,
      },
    }),
    // Wayne chat transcripts captured for this lead (contact given mid-chat).
    prisma.chatConversation.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        conversationId: true,
        messages: true,
        firstPage: true,
        escalated: true,
        escalationReason: true,
        contactCapturedAt: true,
        createdAt: true,
      },
    }),
    // Dashboard cart preview — one existing service call (never the public
    // /api/v2 route; this stays behind requireAdminRole).
    groupId ? getGroupOrderById(groupId) : Promise.resolve(null),
    // Lead.affiliateId is SELF-REPORTED, UNVERIFIED attribution (ref_code
    // cookie / partner slug / dashboard host — see affiliate-resolve.ts). It's
    // display-only here. Do NOT build any payout/commission logic on this
    // field without re-deriving trust — commissions run off Order.affiliateId.
    lead.affiliateId
      ? prisma.affiliate.findUnique({
          where: { id: lead.affiliateId },
          select: { businessName: true, code: true },
        })
      : Promise.resolve(null),
  ]);

  const affiliate = affiliateRow
    ? { name: affiliateRow.businessName, code: affiliateRow.code }
    : group?.affiliate
      ? { name: group.affiliate.businessName, code: group.affiliate.code }
      : null;

  return NextResponse.json({
    success: true,
    data: {
      lead,
      events,
      followUps,
      emailLogs,
      orders,
      drafts,
      inboundEmails,
      chatConversations,
      cart: group ? toDrawerCart(group) : null,
      affiliate,
    },
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
