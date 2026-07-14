/**
 * GET /api/v1/admin/partner-dashboards
 *
 * POD-admin roster of ALL client dashboards (GroupOrderV2), searchable
 * and filterable across every partner — the management-side counterpart
 * of each partner's own "active dashboards" list.
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 *
 * Query params:
 *   search    — host name, dashboard name, or share code (insensitive)
 *   affiliateId — only dashboards attributed to this partner
 *   partyType — PartyType enum value
 *   lifecycle — draft | in_progress | paid | completed
 *   page/limit — pagination (limit ≤ 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { getDashboardEngagement } from '@/lib/group-orders-v2/view-tracking';
import { GroupV2PaymentStatus, PartyType, Prisma } from '@prisma/client';

type Lifecycle = 'draft' | 'in_progress' | 'paid' | 'completed';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sp = request.nextUrl.searchParams;
    const search = sp.get('search')?.trim() || undefined;
    const affiliateId = sp.get('affiliateId') || undefined;
    const partyType = sp.get('partyType') || undefined;
    const lifecycle = (sp.get('lifecycle') as Lifecycle) || undefined;
    const page = Math.max(parseInt(sp.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '25'), 1), 100);

    const where: Prisma.GroupOrderV2WhereInput = {};
    if (search) {
      where.OR = [
        { hostName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { shareCode: { contains: search, mode: 'insensitive' } },
        { hostEmail: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (affiliateId) where.affiliateId = affiliateId;
    if (partyType && (Object.values(PartyType) as string[]).includes(partyType)) {
      where.partyType = partyType as PartyType;
    }

    // Lifecycle is derived (payments + views), so filter after mapping.
    // Over-fetch when a lifecycle filter is on so a page still fills up.
    const fetchLimit = lifecycle ? limit * 4 : limit;

    const [total, groups, affiliates] = await Promise.all([
      prisma.groupOrderV2.count({ where }),
      prisma.groupOrderV2.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: fetchLimit,
        include: {
          affiliate: { select: { id: true, businessName: true, partnerSlug: true } },
          tabs: {
            include: {
              draftItems: { select: { quantity: true } },
              purchasedItems: { select: { price: true, quantity: true } },
              payments: { select: { status: true } },
            },
          },
          _count: { select: { participants: true } },
        },
      }),
      // Partner filter dropdown options
      prisma.affiliate.findMany({
        where: { groupOrdersV2: { some: {} } },
        select: { id: true, businessName: true },
        orderBy: { businessName: 'asc' },
      }),
    ]);

    const engagement = await getDashboardEngagement(groups.map((g) => g.shareCode));
    const now = new Date();

    let rows = groups.map((g) => {
      const hasPaidPayment = g.tabs.some((tab) =>
        tab.payments.some((p) => p.status === GroupV2PaymentStatus.PAID)
      );
      const firstTab = [...g.tabs].sort((a, b) => a.position - b.position)[0];
      const deliveryDate = firstTab?.deliveryDate ?? null;

      let lifecycleStatus: Lifecycle;
      if (hasPaidPayment) {
        lifecycleStatus = deliveryDate && deliveryDate < now ? 'completed' : 'paid';
      } else if (g.viewCount > 0) {
        lifecycleStatus = 'in_progress';
      } else {
        lifecycleStatus = 'draft';
      }

      const totalCents = g.tabs.reduce(
        (sum, tab) =>
          sum +
          tab.purchasedItems.reduce(
            (s, item) => s + Math.round(Number(item.price) * item.quantity * 100),
            0
          ),
        0
      );
      const cartItemCount = g.tabs.reduce(
        (sum, tab) => sum + tab.draftItems.reduce((s, item) => s + item.quantity, 0),
        0
      );
      const eng = engagement.get(g.shareCode);

      return {
        id: g.id,
        name: g.name,
        hostName: g.hostName,
        hostEmail: g.hostEmail,
        shareCode: g.shareCode,
        partyType: g.partyType,
        source: g.source,
        partner: g.affiliate
          ? { id: g.affiliate.id, businessName: g.affiliate.businessName, partnerSlug: g.affiliate.partnerSlug }
          : null,
        createdAt: g.createdAt.toISOString(),
        deliveryDate: deliveryDate?.toISOString() ?? null,
        lifecycleStatus,
        totalCents,
        cartItemCount,
        viewCount: eng?.uniqueVisitors ?? g.viewCount,
        activeSeconds: eng?.totalActiveSeconds ?? 0,
        lastActivityAt: eng?.lastActivityAt?.toISOString() ?? null,
        participantCount: g._count.participants,
      };
    });

    if (lifecycle) {
      rows = rows.filter((r) => r.lifecycleStatus === lifecycle).slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        dashboards: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        filters: {
          partners: affiliates,
          partyTypes: Object.values(PartyType),
          lifecycles: ['draft', 'in_progress', 'paid', 'completed'],
        },
      },
    });
  } catch (error) {
    console.error('[Admin Partner Dashboards API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
}
