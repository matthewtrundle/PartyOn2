/**
 * Group Orders V2 - Service Layer
 * Core CRUD + business logic for tab-based group ordering
 */

import { prisma } from '@/lib/database/client';
import { calculateDeliveryFee } from '@/lib/delivery/rates';
import { isLastMinuteDate } from '@/lib/lastMinute/dates';
import { mirrorDashboardHostLead } from '@/lib/leads/dashboard-lead';
import { assertVariantsPurchasable } from '@/lib/products/availability';
import {
  generateShareCode,
  computeOrderDeadline,
  defaultExpiresAt,
  findEarliestDeadline,
  findEarliestDelivery,
  computeCountdownTarget,
} from './utils';
import type {
  GroupOrderV2Full,
  SubOrderFull,
  ParticipantSummary,
  DraftCartItemView,
  PurchasedItemView,
  DeliveryInvoiceView,
  TabTotals,
  TimerInfo,
  CreateGroupOrderV2Input,
  CreateDashboardInput,
  CreateMultiTabDashboardInput,
  CreateTabInput,
  UpdateTabInput,
  JoinGroupOrderInput,
  AddDraftItemInput,
} from './types';

const toNum = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  return typeof val === 'number' ? val : Number(val);
};

// ==========================================
// Full includes for nested queries
// ==========================================

const fullGroupIncludes = {
  tabs: {
    orderBy: { position: 'asc' as const },
    include: {
      draftItems: {
        include: {
          addedBy: true,
          product: { select: { handle: true } },
        },
      },
      purchasedItems: {
        include: {
          participant: true,
          payment: true,
        },
      },
      deliveryInvoice: true,
    },
  },
  participants: {
    orderBy: { joinedAt: 'asc' as const },
  },
  affiliate: {
    select: { id: true, code: true, businessName: true },
  },
};

// ==========================================
// Serialization helpers
// ==========================================

function serializeParticipant(p: {
  id: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone?: string | null;
  isHost: boolean;
  ageVerified: boolean;
  status: string;
  joinedAt: Date;
}): ParticipantSummary {
  return {
    id: p.id,
    name: p.guestName || 'Unknown',
    email: p.guestEmail,
    phone: p.guestPhone ?? null,
    isHost: p.isHost,
    ageVerified: p.ageVerified,
    status: p.status as 'ACTIVE' | 'REMOVED',
    joinedAt: p.joinedAt.toISOString(),
  };
}

function serializeParticipantInfo(p: {
  id: string;
  guestName: string | null;
  isHost: boolean;
}) {
  return {
    id: p.id,
    name: p.guestName || 'Unknown',
    isHost: p.isHost,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function serializeTab(tab: any): SubOrderFull {
  const draftItems: DraftCartItemView[] = (tab.draftItems || []).map((item: any) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    handle: item.product?.handle || '',
    title: item.title,
    variantTitle: item.variantTitle,
    price: toNum(item.price),
    compareAtPrice: toNum(item.price) === 0 && item.variant ? toNum(item.variant.price) : null,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    addedBy: serializeParticipantInfo(item.addedBy),
  }));

  const purchasedItems: PurchasedItemView[] = (tab.purchasedItems || []).map((item: any) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    title: item.title,
    variantTitle: item.variantTitle,
    price: toNum(item.price),
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    purchaser: serializeParticipantInfo(item.participant),
    paidAt: item.payment?.paidAt?.toISOString() || item.createdAt?.toISOString() || '',
  }));

  const draftSubtotal = draftItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const purchasedSubtotal = purchasedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fee = toNum(tab.deliveryFee);

  const invoice: DeliveryInvoiceView | null = tab.deliveryInvoice
    ? {
        id: tab.deliveryInvoice.id,
        deliveryFee: toNum(tab.deliveryInvoice.deliveryFee),
        discountCode: tab.deliveryInvoice.discountCode,
        discountAmount: toNum(tab.deliveryInvoice.discountAmount),
        total: toNum(tab.deliveryInvoice.total),
        status: tab.deliveryInvoice.status,
        paidAt: tab.deliveryInvoice.paidAt?.toISOString() || null,
      }
    : null;

  const totals: TabTotals = { draftSubtotal, purchasedSubtotal, deliveryFee: fee };

  return {
    id: tab.id,
    name: tab.name,
    position: tab.position,
    status: tab.status,
    orderType: tab.orderType ?? null,
    partyType: tab.partyType ?? null,
    deliveryContextType: tab.deliveryContextType ?? 'HOUSE',
    deliveryDate: tab.deliveryDate ? tab.deliveryDate.toISOString() : null,
    deliveryDateConfirmed: tab.deliveryDateConfirmed ?? false,
    deliveryTime: tab.deliveryTime,
    deliveryAddress: tab.deliveryAddress as any,
    deliveryPhone: tab.deliveryPhone,
    deliveryNotes: tab.deliveryNotes,
    orderDeadline: tab.orderDeadline ? tab.orderDeadline.toISOString() : null,
    deliveryFee: fee,
    deliveryFeeWaived: tab.deliveryFeeWaived,
    draftItems,
    purchasedItems,
    deliveryInvoice: invoice,
    totals,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeGroup(group: Record<string, any>): GroupOrderV2Full {
  const tabs = (group.tabs || []).map(serializeTab);
  const participants = (group.participants || []).map(serializeParticipant);

  const deadlines = tabs
    .filter((t: SubOrderFull) => t.status === 'OPEN')
    .map((t: SubOrderFull) => t.orderDeadline)
    .filter((d: string | null): d is string => !!d)
    .map((d: string) => new Date(d));
  const deliveries = tabs
    .filter((t: SubOrderFull) => t.status !== 'CANCELLED')
    .map((t: SubOrderFull) => t.deliveryDate)
    .filter((d: string | null): d is string => !!d)
    .map((d: string) => new Date(d));

  const earliestDeadline = findEarliestDeadline(deadlines);
  const earliestDelivery = findEarliestDelivery(deliveries);
  const countdownTarget = computeCountdownTarget(earliestDeadline, earliestDelivery);

  const timer: TimerInfo = {
    earliestDeadline: earliestDeadline?.toISOString() || null,
    earliestDelivery: earliestDelivery?.toISOString() || null,
    countdownTarget: countdownTarget?.toISOString() || null,
  };

  return {
    id: group.id,
    name: group.name,
    subtitle: group.subtitle ?? null,
    heroVibeKey: group.heroVibeKey ?? null,
    shareCode: group.shareCode,
    status: group.status,
    hostName: group.hostName,
    hostEmail: group.hostEmail,
    hostPhone: group.hostPhone,
    partyType: group.partyType ?? null,
    affiliateId: group.affiliateId ?? null,
    affiliate: group.affiliate ?? null,
    source: group.source ?? 'DIRECT',
    isLastMinute: group.isLastMinute ?? false,
    expiresAt: group.expiresAt.toISOString(),
    createdAt: group.createdAt.toISOString(),
    tabs,
    participants,
    timer,
  };
}

// ==========================================
// Group Order CRUD
// ==========================================

export async function createGroupOrder(
  input: CreateGroupOrderV2Input
): Promise<GroupOrderV2Full> {
  // Generate unique share code (retry on collision)
  let shareCode = generateShareCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.groupOrderV2.findUnique({
      where: { shareCode },
    });
    if (!existing) break;
    shareCode = generateShareCode();
    attempts++;
  }

  const tabDeliveryDates = input.tabs
    .map(tab => new Date(tab.deliveryDate ?? ''))
    .filter(d => !isNaN(d.getTime()));

  const group = await prisma.groupOrderV2.create({
    data: {
      name: input.name,
      hostName: input.hostName,
      hostEmail: input.hostEmail || null,
      hostPhone: input.hostPhone || null,
      hostCustomerId: input.hostCustomerId || null,
      shareCode,
      expiresAt: defaultExpiresAt(tabDeliveryDates),
      tabs: {
        create: input.tabs.map((tab, idx) => {
          const parsed = tab.deliveryDate ? new Date(tab.deliveryDate) : null;
          const deliveryDate = parsed && !isNaN(parsed.getTime()) ? parsed : null;
          const zip = tab.deliveryAddress?.zip ?? '';
          const feeResult = calculateDeliveryFee(zip, 0, false);
          return {
            name: tab.name,
            position: idx,
            orderType: tab.orderType ?? null,
            deliveryDate,
            deliveryDateConfirmed: !!deliveryDate,
            deliveryTime: tab.deliveryTime ?? '',
            deliveryAddress: tab.deliveryAddress as unknown as Record<string, string>,
            deliveryPhone: tab.deliveryPhone || null,
            deliveryNotes: tab.deliveryNotes || null,
            orderDeadline: deliveryDate ? computeOrderDeadline(deliveryDate) : null,
            deliveryFee: feeResult.originalFee,
          };
        }),
      },
      participants: {
        create: {
          guestName: input.hostName,
          guestEmail: input.hostEmail || null,
          customerId: input.hostCustomerId || null,
          isHost: true,
          ageVerified: true,
          status: 'ACTIVE',
        },
      },
    },
    include: fullGroupIncludes,
  });

  // Lead Flow board: a host with contact info is a sales lead. Never throws.
  await mirrorDashboardHostLead({
    groupOrderId: group.id,
    shareCode: group.shareCode,
    hostName: input.hostName,
    hostEmail: input.hostEmail || null,
    hostPhone: input.hostPhone || null,
    partyType: group.partyType,
    deliveryDate:
      tabDeliveryDates.length > 0
        ? new Date(Math.min(...tabDeliveryDates.map((d) => d.getTime())))
        : null,
    source: group.source,
    affiliateId: group.affiliateId ?? null,
    createdVia: 'group-create',
    // Whatever first-touch the group row stored (utm columns + landing page +
    // referrer) — the mirror fill-blanks it onto the host's Lead.
    attribution: {
      utmSource: group.utmSource,
      utmMedium: group.utmMedium,
      utmCampaign: group.utmCampaign,
      utmTerm: group.utmTerm,
      utmContent: group.utmContent,
      landingPage: group.landingPage,
      referrer: group.referrer,
    },
  });

  return serializeGroup(group);
}

export async function getGroupOrderByCode(
  shareCode: string
): Promise<GroupOrderV2Full | null> {
  const group = await prisma.groupOrderV2.findUnique({
    where: { shareCode },
    include: fullGroupIncludes,
  });
  if (!group) return null;
  return serializeGroup(group);
}

export async function getGroupOrderById(
  id: string
): Promise<GroupOrderV2Full | null> {
  const group = await prisma.groupOrderV2.findUnique({
    where: { id },
    include: fullGroupIncludes,
  });
  if (!group) return null;
  return serializeGroup(group);
}

export async function updateGroupOrderStatus(
  shareCode: string,
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'CANCELLED',
  name?: string
): Promise<void> {
  await prisma.groupOrderV2.update({
    where: { shareCode },
    data: {
      ...(name ? { name } : {}),
      status,
    },
  });
}

export async function cancelGroupOrder(
  shareCode: string,
  hostParticipantId: string
): Promise<void> {
  // Verify host
  const group = await prisma.groupOrderV2.findUnique({
    where: { shareCode },
    include: { participants: { where: { id: hostParticipantId, isHost: true } } },
  });
  if (!group || group.participants.length === 0) {
    throw new Error('Only the host can cancel a group order');
  }
  await prisma.groupOrderV2.update({
    where: { shareCode },
    data: { status: 'CANCELLED' },
  });
}

/**
 * Affiliate-initiated cancellation. Only allowed when:
 *   - the group belongs to this affiliate
 *   - the group isn't already CANCELLED / COMPLETED
 *   - no ParticipantPayment on any tab is PAID
 *
 * Throws sentinel Error messages the route handler maps to HTTP codes:
 *   NOT_FOUND, FORBIDDEN, ALREADY_CLOSED, HAS_PAID_PAYMENT
 */
export async function cancelGroupOrderByAffiliate(
  affiliateId: string,
  groupOrderId: string
): Promise<void> {
  const group = await prisma.groupOrderV2.findUnique({
    where: { id: groupOrderId },
    select: {
      affiliateId: true,
      status: true,
      tabs: { select: { payments: { select: { status: true } } } },
    },
  });

  if (!group) throw new Error('NOT_FOUND');
  if (group.affiliateId !== affiliateId) throw new Error('FORBIDDEN');
  if (group.status === 'CANCELLED' || group.status === 'COMPLETED') {
    throw new Error('ALREADY_CLOSED');
  }
  const hasPaidPayment = group.tabs.some((t) =>
    t.payments.some((p) => p.status === 'PAID')
  );
  if (hasPaidPayment) throw new Error('HAS_PAID_PAYMENT');

  await prisma.groupOrderV2.update({
    where: { id: groupOrderId },
    data: { status: 'CANCELLED' },
  });
}

export async function getMyGroupOrders(
  customerId: string
): Promise<GroupOrderV2Full[]> {
  const participations = await prisma.groupParticipantV2.findMany({
    where: { customerId, status: 'ACTIVE' },
    select: { groupOrderId: true },
  });
  const ids = participations.map((p) => p.groupOrderId);
  if (ids.length === 0) return [];

  const groups = await prisma.groupOrderV2.findMany({
    where: { id: { in: ids } },
    include: fullGroupIncludes,
    orderBy: { createdAt: 'desc' },
  });
  return groups.map(serializeGroup);
}

// ==========================================
// Tab CRUD
// ==========================================

export async function createTab(
  groupOrderId: string,
  input: CreateTabInput
): Promise<SubOrderFull> {
  const maxPos = await prisma.subOrder.aggregate({
    where: { groupOrderId },
    _max: { position: true },
  });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  // No default date: a tab with no caller-supplied date is born dateless and
  // the customer must pick one before checkout (wrong-date fix 2026-08-01).
  let deliveryDate: Date | null = null;
  if (input.deliveryDate) {
    deliveryDate = new Date(input.deliveryDate);
    // Normalize to noon UTC to avoid timezone boundary issues
    deliveryDate.setUTCHours(12, 0, 0, 0);
  }

  const zip = input.deliveryAddress?.zip || '';
  const feeResult = calculateDeliveryFee(zip, 0, false);

  const tab = await prisma.subOrder.create({
    data: {
      groupOrderId,
      name: input.name,
      position: nextPos,
      orderType: input.orderType ?? null,
      partyType: input.partyType ?? null,
      deliveryDate,
      deliveryDateConfirmed: !!deliveryDate,
      deliveryTime: input.deliveryTime || 'TBD',
      deliveryAddress: (input.deliveryAddress || { address1: '', city: '', province: 'TX', zip: '', country: 'US' }) as unknown as Record<string, string>,
      deliveryPhone: input.deliveryPhone || null,
      deliveryNotes: input.deliveryNotes || null,
      orderDeadline: deliveryDate ? computeOrderDeadline(deliveryDate) : null,
      deliveryFee: feeResult.originalFee,
    },
    include: {
      draftItems: { include: { addedBy: true, variant: true } },
      purchasedItems: { include: { participant: true, payment: true } },
      deliveryInvoice: true,
    },
  });

  return serializeTab(tab);
}

export async function updateTab(
  tabId: string,
  input: UpdateTabInput
): Promise<SubOrderFull> {
  const existing = await prisma.subOrder.findUnique({ where: { id: tabId } });
  if (!existing) throw new Error('Tab not found');

  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.orderType !== undefined) data.orderType = input.orderType || null;
  if (input.partyType !== undefined) data.partyType = input.partyType || null;
  if (input.status) data.status = input.status;
  if (input.deliveryTime) data.deliveryTime = input.deliveryTime;
  if (input.deliveryAddress) {
    data.deliveryAddress = input.deliveryAddress as unknown as Record<string, string>;
    if (input.deliveryAddress.isPickup) {
      // In-store pickup — no driver, no fee
      data.deliveryFee = 0;
      data.deliveryFeeWaived = true;
    } else {
      const zip = input.deliveryAddress.zip;
      const feeResult = calculateDeliveryFee(zip, 0, false);
      data.deliveryFee = feeResult.originalFee;
      data.deliveryFeeWaived = false;
    }
  }
  if (input.deliveryPhone !== undefined) data.deliveryPhone = input.deliveryPhone || null;
  if (input.deliveryNotes !== undefined) data.deliveryNotes = input.deliveryNotes || null;
  if (input.deliveryContextType) data.deliveryContextType = input.deliveryContextType;
  // Setting a date is the ONLY way confirmed flips true — it means "a human
  // chose this date." A bare confirmed:true PATCH would bless legacy fake
  // placeholder dates, re-creating the wrong-date bug via the API.
  if (input.deliveryDate) {
    const deliveryDate = new Date(input.deliveryDate);
    deliveryDate.setUTCHours(12, 0, 0, 0);
    data.deliveryDate = deliveryDate;
    data.orderDeadline = computeOrderDeadline(deliveryDate);
    data.deliveryDateConfirmed = true;
  }

  const tab = await prisma.subOrder.update({
    where: { id: tabId },
    data,
    include: {
      draftItems: { include: { addedBy: true, variant: true } },
      purchasedItems: { include: { participant: true, payment: true } },
      deliveryInvoice: true,
    },
  });

  // ─── Bubble the date change up to the parent GroupOrderV2 ──────────
  // If any tab on the order has a today/tomorrow delivery date, the
  // group is flagged as last-minute so the dashboard's catalog
  // restricts to the deep-stock pool. Recomputed after every tab edit
  // so a date change inside the dashboard correctly flips the menu.
  if (input.deliveryDate) {
    await recomputeGroupLastMinute(tab.groupOrderId);
  }

  return serializeTab(tab);
}

/**
 * Recompute `GroupOrderV2.isLastMinute` based on the current set of
 * SubOrder delivery dates. Set true if ANY tab is today/tomorrow.
 *
 * Idempotent — safe to call from anywhere that mutates a tab's date,
 * or as a backfill if the flag drifts.
 */
export async function recomputeGroupLastMinute(groupId: string): Promise<void> {
  const tabs = await prisma.subOrder.findMany({
    where: { groupOrderId: groupId },
    select: { deliveryDate: true },
  });
  const nextFlag = tabs.some((t) => isLastMinuteDate(t.deliveryDate));
  await prisma.groupOrderV2.update({
    where: { id: groupId },
    data: { isLastMinute: nextFlag },
  });
}

export async function deleteTab(tabId: string): Promise<void> {
  await prisma.subOrder.delete({ where: { id: tabId } });
}

// ==========================================
// Participants
// ==========================================

export async function joinGroupOrder(
  shareCode: string,
  input: JoinGroupOrderInput
): Promise<ParticipantSummary> {
  const group = await prisma.groupOrderV2.findUnique({
    where: { shareCode },
  });
  if (!group) throw new Error('Group order not found');
  if (group.status !== 'ACTIVE') throw new Error('Group order is not accepting new participants');

  // Check for existing participant (idempotent join by email, if email provided)
  if (input.guestEmail) {
    const existingByEmail = await prisma.groupParticipantV2.findUnique({
      where: {
        groupOrderId_guestEmail: {
          groupOrderId: group.id,
          guestEmail: input.guestEmail,
        },
      },
    });
    if (existingByEmail) {
      if (existingByEmail.status === 'REMOVED') {
        // Re-activate removed participant
        const reactivated = await prisma.groupParticipantV2.update({
          where: { id: existingByEmail.id },
          data: { status: 'ACTIVE', ageVerified: input.ageVerified },
        });
        return serializeParticipant(reactivated);
      }
      return serializeParticipant(existingByEmail);
    }
  }

  const participant = await prisma.groupParticipantV2.create({
    data: {
      groupOrderId: group.id,
      guestName: input.guestName,
      guestEmail: input.guestEmail || null,
      customerId: input.customerId || null,
      ageVerified: input.ageVerified,
      isHost: false,
      status: 'ACTIVE',
    },
  });

  return serializeParticipant(participant);
}

export async function removeParticipant(
  groupOrderId: string,
  participantId: string
): Promise<void> {
  // Delete their draft items across all tabs
  await prisma.draftCartItem.deleteMany({
    where: { addedByParticipantId: participantId },
  });

  // Set status to REMOVED (purchased items remain)
  await prisma.groupParticipantV2.update({
    where: { id: participantId },
    data: { status: 'REMOVED' },
  });
}

// ==========================================
// Draft Cart Items
// ==========================================

export async function addDraftItem(
  subOrderId: string,
  input: AddDraftItemInput
): Promise<DraftCartItemView> {
  // Check tab is open
  const tab = await prisma.subOrder.findUnique({ where: { id: subOrderId } });
  if (!tab) throw new Error('Tab not found');
  if (tab.status !== 'OPEN') throw new Error('Tab is locked or closed');

  // Check deadline (null deadline = no date chosen yet — no deadline to miss;
  // an unguarded compare would coerce null to 0 and reject every add)
  if (tab.orderDeadline && new Date() > tab.orderDeadline) {
    throw new Error('Order deadline has passed');
  }

  // Defense-in-depth: never add a DRAFT/ARCHIVED product (or an off-sale variant) to a tab.
  // This is the shared guard behind both the add-item endpoint and the /quote/start pre-loader.
  // Throws ProductNotPurchasableError.
  await assertVariantsPurchasable(prisma, [
    { productId: input.productId, variantId: input.variantId, title: input.title },
  ]);

  // Upsert: if same variant exists for this participant, increment qty
  const existing = await prisma.draftCartItem.findUnique({
    where: {
      subOrderId_addedByParticipantId_variantId: {
        subOrderId,
        addedByParticipantId: input.participantId,
        variantId: input.variantId,
      },
    },
  });

  let item;
  if (existing) {
    item = await prisma.draftCartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + input.quantity },
      include: { addedBy: true, product: { select: { handle: true } } },
    });
  } else {
    item = await prisma.draftCartItem.create({
      data: {
        subOrderId,
        addedByParticipantId: input.participantId,
        productId: input.productId,
        variantId: input.variantId,
        title: input.title,
        variantTitle: input.variantTitle || null,
        price: input.price,
        imageUrl: input.imageUrl || null,
        quantity: input.quantity,
      },
      include: { addedBy: true, product: { select: { handle: true } } },
    });
  }

  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    handle: item.product?.handle || '',
    title: item.title,
    variantTitle: item.variantTitle,
    price: toNum(item.price),
    compareAtPrice: null,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    addedBy: serializeParticipantInfo(item.addedBy),
  };
}

export async function updateDraftItem(
  itemId: string,
  participantId: string,
  quantity: number,
  isHost: boolean
): Promise<DraftCartItemView> {
  const item = await prisma.draftCartItem.findUnique({
    where: { id: itemId },
    include: { addedBy: true, subOrder: true },
  });
  if (!item) throw new Error('Item not found');
  if (!isHost && item.addedByParticipantId !== participantId) {
    throw new Error('Only the item owner or host can update this item');
  }
  if (item.subOrder.status !== 'OPEN') throw new Error('Tab is locked or closed');

  const updated = await prisma.draftCartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { addedBy: true, variant: true, product: { select: { handle: true } } },
  });

  return {
    id: updated.id,
    productId: updated.productId,
    variantId: updated.variantId,
    handle: updated.product?.handle || '',
    title: updated.title,
    variantTitle: updated.variantTitle,
    price: toNum(updated.price),
    compareAtPrice: toNum(updated.price) === 0 && updated.variant ? toNum(updated.variant.price) : null,
    imageUrl: updated.imageUrl,
    quantity: updated.quantity,
    addedBy: serializeParticipantInfo(updated.addedBy),
  };
}

export async function removeDraftItem(
  itemId: string,
  participantId: string,
  isHost: boolean
): Promise<void> {
  const item = await prisma.draftCartItem.findUnique({
    where: { id: itemId },
    include: { subOrder: true },
  });
  if (!item) throw new Error('Item not found');
  if (!isHost && item.addedByParticipantId !== participantId) {
    throw new Error('Only the item owner or host can remove this item');
  }
  if (item.subOrder.status !== 'OPEN') throw new Error('Tab is locked or closed');

  await prisma.draftCartItem.delete({ where: { id: itemId } });
}

// ==========================================
// Payment Flow
// ==========================================

export async function moveDraftToPurchased(
  subOrderId: string,
  participantId: string,
  paymentId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const draftItems = await tx.draftCartItem.findMany({
      where: { subOrderId, addedByParticipantId: participantId },
    });

    if (draftItems.length === 0) return;

    // Create purchased items from drafts
    await tx.purchasedItem.createMany({
      data: draftItems.map((item) => ({
        subOrderId,
        participantId,
        paymentId,
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        variantTitle: item.variantTitle,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
      })),
    });

    // Delete the draft items
    await tx.draftCartItem.deleteMany({
      where: { subOrderId, addedByParticipantId: participantId },
    });
  });
}

/**
 * Get participant's draft items for a specific tab (used for checkout)
 */
export async function getParticipantDraftItems(
  subOrderId: string,
  participantId: string
) {
  return prisma.draftCartItem.findMany({
    where: { subOrderId, addedByParticipantId: participantId },
  });
}

/**
 * Get host participant for a group order
 */
export async function getHostParticipant(groupOrderId: string) {
  return prisma.groupParticipantV2.findFirst({
    where: { groupOrderId, isHost: true },
  });
}

/**
 * Check if a participant is host of the group
 */
export async function isParticipantHost(
  participantId: string,
  groupOrderId: string
): Promise<boolean> {
  const p = await prisma.groupParticipantV2.findFirst({
    where: { id: participantId, groupOrderId, isHost: true },
  });
  return !!p;
}

/**
 * Get participant by ID
 */
export async function getParticipantById(participantId: string) {
  return prisma.groupParticipantV2.findUnique({
    where: { id: participantId },
  });
}

/**
 * Check if a participant is an active member of the group order
 */
export async function isActiveParticipant(
  participantId: string,
  groupOrderId: string
): Promise<boolean> {
  const p = await prisma.groupParticipantV2.findFirst({
    where: { id: participantId, groupOrderId, status: 'ACTIVE' },
  });
  return !!p;
}

/**
 * Transfer host role from one participant to another
 */
/**
 * Promote an active participant to host. Additive -- the existing host
 * keeps their role too. Either host can edit the dashboard.
 *
 * Auth: caller must already be a host on this group. The original behavior
 * was an exclusive TRANSFER (demote caller, promote target, rewrite the
 * group's primary host fields). That made "share edit access" feel like
 * "permanently give up your access," which surprised users -- so the
 * semantics changed to additive.
 *
 * GroupOrderV2.hostName/hostEmail/hostPhone represent the ORIGINAL host
 * (used for Premier manifest, billing, etc.) and stay put when co-hosts
 * are added. The added co-host is visible via participants where
 * isHost === true.
 *
 * No-op when the target is already a host.
 */
export async function transferHost(
  shareCode: string,
  currentHostParticipantId: string,
  newHostParticipantId: string
): Promise<void> {
  const group = await prisma.groupOrderV2.findUnique({
    where: { shareCode },
    include: { participants: true },
  });
  if (!group) throw new Error('Group order not found');

  const currentHost = group.participants.find(
    (p) => p.id === currentHostParticipantId && p.isHost
  );
  if (!currentHost) throw new Error('Only an existing host can promote another participant');

  const newHost = group.participants.find(
    (p) => p.id === newHostParticipantId && p.status === 'ACTIVE'
  );
  if (!newHost) throw new Error('Target must be an active participant');

  // Idempotent: target is already a host -> nothing to do.
  if (newHost.isHost) return;

  // Additive promote. Caller stays host; group-level primary host fields
  // are NOT rewritten (they still reflect the original/billing host).
  await prisma.groupParticipantV2.update({
    where: { id: newHostParticipantId },
    data: { isHost: true },
  });
}

/**
 * Generate a one-time host claim token
 */
export async function generateHostClaimToken(
  shareCode: string,
  hostParticipantId: string
): Promise<string> {
  const group = await prisma.groupOrderV2.findUnique({
    where: { shareCode },
    include: { participants: { where: { id: hostParticipantId, isHost: true } } },
  });
  if (!group || group.participants.length === 0) {
    throw new Error('Only the host can generate a claim token');
  }

  const { randomBytes } = await import('crypto');
  const token = randomBytes(24).toString('hex'); // 48 chars

  await prisma.groupOrderV2.update({
    where: { shareCode },
    data: { hostClaimToken: token },
  });

  return token;
}

/**
 * Claim host role using a claim token
 */
export async function claimHost(
  shareCode: string,
  claimToken: string,
  participantId: string
): Promise<void> {
  const group = await prisma.groupOrderV2.findUnique({
    where: { shareCode },
    include: { participants: true },
  });
  if (!group) throw new Error('Group order not found');
  if (!group.hostClaimToken || group.hostClaimToken !== claimToken) {
    throw new Error('Invalid or expired claim token');
  }

  const newHost = group.participants.find(
    (p) => p.id === participantId && p.status === 'ACTIVE'
  );
  if (!newHost) throw new Error('Participant not found or inactive');

  // Already host? No-op.
  if (newHost.isHost) return;

  // Promote participant to host (additive -- existing hosts keep their role).
  // Keep the claim token so it remains reusable for additional hosts.
  await prisma.groupParticipantV2.update({
    where: { id: participantId },
    data: { isHost: true },
  });
}

// ==========================================
// Dashboard Order Creation
// ==========================================

/**
 * Create a dashboard order (simplified flow for universal ordering).
 * Creates a GroupOrderV2 with a single SubOrder with placeholder delivery
 * and a single host participant.
 */
export async function createDashboardOrder(
  input: CreateDashboardInput
): Promise<GroupOrderV2Full> {
  let shareCode = generateShareCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.groupOrderV2.findUnique({
      where: { shareCode },
    });
    if (!existing) break;
    shareCode = generateShareCode();
    attempts++;
  }

  // Delivery date: only when the caller supplies one (event presets, quote
  // flow, portal). Self-serve dashboards are born dateless and the customer
  // must pick a date before checkout (wrong-date fix 2026-08-01 — the old
  // "+7 days" default silently became real orders' delivery dates).
  let deliveryDate: Date | null = null;
  if (input.deliveryDate) {
    deliveryDate = new Date(input.deliveryDate);
    // Normalize to noon UTC to avoid timezone boundary issues
    deliveryDate.setUTCHours(12, 0, 0, 0);
  }

  const deliveryAddress = input.deliveryAddress
    ? { ...input.deliveryAddress, province: input.deliveryAddress.province || 'TX', country: input.deliveryAddress.country || 'US' }
    : { address1: '', city: '', province: 'TX', zip: '', country: 'US' };

  const group = await prisma.groupOrderV2.create({
    data: {
      name: input.name || (input.hostName === 'Party Host' ? "Host's Party" : `${input.hostName}'s Party`),
      hostName: input.hostName,
      hostEmail: input.hostEmail || null,
      hostPhone: input.hostPhone || null,
      hostCustomerId: input.hostCustomerId || null,
      shareCode,
      partyType: input.partyType || null,
      affiliateId: input.affiliateId || null,
      source: input.source || 'DIRECT',
      isLastMinute: input.isLastMinute ?? false,
      // Host's first-touch attribution — the webhook stamps these onto every Order
      // created from this group's payments, feeding the per-landing-page analytics hub.
      landingPage: input.attribution?.landingPage || null,
      utmSource: input.attribution?.utmSource || null,
      utmMedium: input.attribution?.utmMedium || null,
      utmCampaign: input.attribution?.utmCampaign || null,
      utmTerm: input.attribution?.utmTerm || null,
      utmContent: input.attribution?.utmContent || null,
      referrer: input.attribution?.referrer || null,
      expiresAt: defaultExpiresAt(deliveryDate ?? undefined),
      tabs: {
        create: {
          name: input.tabName || 'Location 1',
          position: 0,
          deliveryDate,
          deliveryDateConfirmed: !!deliveryDate,
          deliveryTime: input.deliveryTime || (deliveryDate ? '12:00 PM - 2:00 PM' : 'TBD'),
          deliveryAddress: deliveryAddress as unknown as Record<string, string>,
          orderDeadline: deliveryDate ? computeOrderDeadline(deliveryDate) : null,
          deliveryFee: deliveryAddress.zip
            ? calculateDeliveryFee(deliveryAddress.zip, 0, false).originalFee
            : 40,
          deliveryContextType: input.deliveryContextType || 'HOUSE',
        },
      },
      participants: {
        create: {
          guestName: input.hostName,
          guestEmail: input.hostEmail || null,
          guestPhone: input.hostPhone || null,
          isHost: true,
          ageVerified: true,
          status: 'ACTIVE',
        },
      },
    },
    include: fullGroupIncludes,
  });

  // Lead Flow board: a host with contact info is a sales lead. Never throws.
  await mirrorDashboardHostLead({
    groupOrderId: group.id,
    shareCode: group.shareCode,
    hostName: input.hostName,
    hostEmail: input.hostEmail || null,
    hostPhone: input.hostPhone || null,
    partyType: input.partyType || null,
    deliveryDate,
    source: input.source || 'DIRECT',
    affiliateId: group.affiliateId ?? null,
    createdVia: input.isLastMinute ? 'last-minute-order' : 'dashboard-order',
    attribution: input.attribution
      ? {
          utmSource: input.attribution.utmSource ?? null,
          utmMedium: input.attribution.utmMedium ?? null,
          utmCampaign: input.attribution.utmCampaign ?? null,
          utmTerm: input.attribution.utmTerm ?? null,
          utmContent: input.attribution.utmContent ?? null,
          // Click ids + landing/referrer reach only the Lead mirror
          // (metadata.attribution) — GroupOrderV2 columns stay utm-only.
          gclid: input.attribution.gclid ?? null,
          gbraid: input.attribution.gbraid ?? null,
          wbraid: input.attribution.wbraid ?? null,
          fbclid: input.attribution.fbclid ?? null,
          msclkid: input.attribution.msclkid ?? null,
          landingPage: input.attribution.landingPage ?? null,
          referrer: input.attribution.referrer ?? null,
        }
      : null,
  });

  return serializeGroup(group);
}

/**
 * Create a multi-tab dashboard order.
 * Used by affiliate create-dashboard form to create orders with multiple preset tabs.
 */
export async function createMultiTabDashboardOrder(
  input: CreateMultiTabDashboardInput
): Promise<GroupOrderV2Full & { hostClaimToken: string }> {
  let shareCode = generateShareCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.groupOrderV2.findUnique({
      where: { shareCode },
    });
    if (!existing) break;
    shareCode = generateShareCode();
    attempts++;
  }

  const deliveryDate = new Date(input.deliveryDate);
  deliveryDate.setUTCHours(12, 0, 0, 0);

  // Generate host claim token so the affiliate can share a link
  // that automatically makes the client the host on first visit
  const { randomBytes } = await import('crypto');
  const hostClaimToken = randomBytes(24).toString('hex');

  const group = await prisma.groupOrderV2.create({
    data: {
      name: input.dashboardTitle,
      hostName: input.hostName,
      hostEmail: input.hostEmail || null,
      hostPhone: input.hostPhone || null,
      shareCode,
      hostClaimToken,
      partyType: input.partyType || null,
      affiliateId: input.affiliateId,
      source: input.source || 'PARTNER_PAGE',
      expiresAt: defaultExpiresAt(deliveryDate),
      tabs: {
        create: input.tabs.map((tab, idx) => {
          const address = tab.deliveryAddress
            ? { address1: tab.deliveryAddress, city: '', province: 'TX', zip: '', country: 'US' }
            : { address1: '', city: '', province: 'TX', zip: '', country: 'US' };

          return {
            name: tab.name,
            position: idx,
            deliveryDate,
            // Caller-supplied real date (webhook cruise date / portal form) —
            // confirmed at birth so the UI shows it and checkout isn't gated.
            deliveryDateConfirmed: true,
            deliveryTime: tab.deliveryTime || input.deliveryTime,
            deliveryAddress: address as unknown as Record<string, string>,
            orderDeadline: computeOrderDeadline(deliveryDate),
            deliveryFee: address.zip
              ? calculateDeliveryFee(address.zip, 0, false).originalFee
              : 40,
            deliveryContextType: tab.deliveryContextType || 'HOUSE',
          };
        }),
      },
      // No host participant created here -- the client joins via the claim link
      // and becomes host at that point.
    },
    include: fullGroupIncludes,
  });

  // Lead Flow board: affiliate-created dashboards usually have no host
  // contact yet (arrives via claim/send-link/settings, which also mirror) —
  // this covers the ones created WITH contact info. Never throws.
  await mirrorDashboardHostLead({
    groupOrderId: group.id,
    shareCode: group.shareCode,
    hostName: input.hostName,
    hostEmail: input.hostEmail || null,
    hostPhone: input.hostPhone || null,
    partyType: input.partyType || null,
    deliveryDate,
    source: input.source || 'PARTNER_PAGE',
    affiliateId: group.affiliateId ?? null,
    createdVia: 'affiliate-dashboard',
    attribution: {
      utmSource: group.utmSource,
      utmMedium: group.utmMedium,
      utmCampaign: group.utmCampaign,
      utmTerm: group.utmTerm,
      utmContent: group.utmContent,
      landingPage: group.landingPage,
      referrer: group.referrer,
    },
  });

  return { ...serializeGroup(group), hostClaimToken };
}

/**
 * Move ALL remaining draft items on a sub-order to purchased.
 * Used by "Pay for Everything / Pay for Remaining" checkout.
 */
export async function moveAllDraftsToPurchased(
  subOrderId: string,
  payerParticipantId: string,
  paymentId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const draftItems = await tx.draftCartItem.findMany({
      where: { subOrderId },
    });

    if (draftItems.length === 0) return;

    // Create purchased items -- all owned by the payer
    await tx.purchasedItem.createMany({
      data: draftItems.map((item) => ({
        subOrderId,
        participantId: payerParticipantId,
        paymentId,
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        variantTitle: item.variantTitle,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
      })),
    });

    // Delete all draft items
    await tx.draftCartItem.deleteMany({
      where: { subOrderId },
    });
  });
}

/**
 * Update group order fields (partyType, name, subtitle, heroVibeKey, etc.).
 *
 * Auth: requires `participantId` of an ACTIVE host on the group. Throws
 * NotHostError on mismatch -- the route maps that to a 403. The data
 * model supports multiple hosts (claimHost is additive), so any co-host
 * granted access via "Add Another Host" can update too.
 *
 * Null-vs-undefined rule: `undefined` means "don't touch", `null` means
 * "clear it". Subtitle and heroVibeKey both honor this so the customer can
 * reset to defaults by saving an empty string (the caller maps "" -> null).
 */
export class NotHostError extends Error {
  constructor(message = 'Only hosts can update this dashboard') {
    super(message);
    this.name = 'NotHostError';
  }
}

export async function updateGroupOrderFields(
  shareCode: string,
  participantId: string,
  data: {
    name?: string;
    status?: string;
    partyType?: string | null;
    subtitle?: string | null;
    heroVibeKey?: string | null;
    hostEmail?: string;
    hostPhone?: string;
  }
): Promise<void> {
  // Host check -- one query, indexed by shareCode.
  const participant = await prisma.groupParticipantV2.findFirst({
    where: {
      id: participantId,
      isHost: true,
      status: 'ACTIVE',
      groupOrder: { shareCode },
    },
    select: { id: true },
  });
  if (!participant) throw new NotHostError();
  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.status) updateData.status = data.status;
  if (data.partyType !== undefined) updateData.partyType = data.partyType || null;
  if (data.subtitle !== undefined) updateData.subtitle = data.subtitle ? data.subtitle : null;
  if (data.heroVibeKey !== undefined) updateData.heroVibeKey = data.heroVibeKey ? data.heroVibeKey : null;
  if (data.hostEmail !== undefined) updateData.hostEmail = data.hostEmail || null;
  if (data.hostPhone !== undefined) updateData.hostPhone = data.hostPhone || null;

  await prisma.groupOrderV2.update({
    where: { shareCode },
    data: updateData,
  });

  // Lead Flow board: host contact typed into dashboard settings is exactly
  // the "invisible host" gap (/dashboard/* is a form-watcher skip path).
  if (updateData.hostEmail || updateData.hostPhone) {
    const fresh = await prisma.groupOrderV2.findUnique({
      where: { shareCode },
      select: {
        id: true,
        shareCode: true,
        hostName: true,
        hostEmail: true,
        hostPhone: true,
        partyType: true,
        source: true,
        affiliateId: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmTerm: true,
        utmContent: true,
        landingPage: true,
        referrer: true,
      },
    });
    if (fresh) {
      await mirrorDashboardHostLead({
        groupOrderId: fresh.id,
        shareCode: fresh.shareCode,
        hostName: fresh.hostName,
        hostEmail: fresh.hostEmail,
        hostPhone: fresh.hostPhone,
        partyType: fresh.partyType,
        source: fresh.source,
        affiliateId: fresh.affiliateId,
        createdVia: 'dashboard-settings',
        attribution: {
          utmSource: fresh.utmSource,
          utmMedium: fresh.utmMedium,
          utmCampaign: fresh.utmCampaign,
          utmTerm: fresh.utmTerm,
          utmContent: fresh.utmContent,
          landingPage: fresh.landingPage,
          referrer: fresh.referrer,
        },
      });
    }
  }
}
