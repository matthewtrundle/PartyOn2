/**
 * Board batch joins — dashboard-cart + affiliate context for /admin/leads.
 *
 * Exactly two bounded queries for the whole board (never per-card): the
 * GroupOrderV2 rows referenced by boarded leads' `metadata.groupDashboard`,
 * then the Affiliate rows referenced by either the lead rows or those groups.
 * Lead has no Prisma relation to Affiliate (scalar column only, by design —
 * ADR-0008 keeps the schema additive), so this joins in memory.
 */

import type { Lead } from '@prisma/client';
import { prisma } from '@/lib/database/client';

/** Card cart chip: money currently sitting in the lead's dashboard. */
export interface BoardCartRef {
  shareCode: string;
  /** Σ draft (unpaid) line totals across all tabs. */
  total: number;
  itemCount: number;
}

/** Card affiliate badge: the partner this lead came through. */
export interface BoardAffiliateRef {
  name: string;
  code: string;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** `metadata.groupDashboard.groupOrderId` — the lead → dashboard reference. */
export function dashboardGroupId(metadata: unknown): string | null {
  const gd = asRecord(asRecord(metadata)?.groupDashboard);
  const id = gd?.groupOrderId;
  return typeof id === 'string' && id ? id : null;
}

/**
 * Cart math over a group's tabs (draft = still-unpaid lines; paid lines move
 * to purchasedItems). Prisma Decimals arrive as unknown — Number() them.
 */
export function summarizeCartTabs(
  tabs: Array<{ draftItems: Array<{ price: unknown; quantity: number }> }>,
): { total: number; itemCount: number } {
  let total = 0;
  let itemCount = 0;
  for (const tab of tabs) {
    for (const item of tab.draftItems) {
      const price = Number(item.price);
      if (!Number.isFinite(price)) continue;
      total += price * item.quantity;
      itemCount += item.quantity;
    }
  }
  return { total: Math.round(total * 100) / 100, itemCount };
}

/**
 * Batch-load cart + affiliate refs for a board's leads. A lead gets a cart
 * ref whenever its dashboard still exists (even with 0 items — the card's
 * dashboard link must always render); the affiliate resolves from the lead's
 * own stamped `affiliateId` first, else its dashboard's.
 */
export async function loadBoardJoins(leads: Lead[]): Promise<{
  cartByLeadId: Map<string, BoardCartRef>;
  affiliateByLeadId: Map<string, BoardAffiliateRef>;
}> {
  const cartByLeadId = new Map<string, BoardCartRef>();
  const affiliateByLeadId = new Map<string, BoardAffiliateRef>();

  const groupIdByLead = new Map<string, string>();
  for (const lead of leads) {
    const gid = dashboardGroupId(lead.metadata);
    if (gid) groupIdByLead.set(lead.id, gid);
  }

  const groupIds = [...new Set(groupIdByLead.values())];
  const groups = groupIds.length
    ? await prisma.groupOrderV2.findMany({
        where: { id: { in: groupIds } },
        select: {
          id: true,
          shareCode: true,
          affiliateId: true,
          tabs: { select: { draftItems: { select: { price: true, quantity: true } } } },
        },
      })
    : [];
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const affiliateIds = new Set<string>();
  for (const lead of leads) if (lead.affiliateId) affiliateIds.add(lead.affiliateId);
  for (const g of groups) if (g.affiliateId) affiliateIds.add(g.affiliateId);
  const affiliates = affiliateIds.size
    ? await prisma.affiliate.findMany({
        where: { id: { in: [...affiliateIds] } },
        select: { id: true, businessName: true, code: true },
      })
    : [];
  const affiliateById = new Map(affiliates.map((a) => [a.id, a]));

  for (const lead of leads) {
    const group = groupById.get(groupIdByLead.get(lead.id) ?? '');
    if (group) {
      cartByLeadId.set(lead.id, { shareCode: group.shareCode, ...summarizeCartTabs(group.tabs) });
    }
    const affiliate = affiliateById.get(lead.affiliateId ?? '') ??
      affiliateById.get(group?.affiliateId ?? '');
    if (affiliate) {
      affiliateByLeadId.set(lead.id, { name: affiliate.businessName, code: affiliate.code });
    }
  }
  return { cartByLeadId, affiliateByLeadId };
}
