/**
 * Unified orders view — data layer for GET /api/ops/orders-view.
 *
 * Returns orders grouped the way the warehouse thinks about them: by
 * delivery day, with all orders that share a GroupOrderV2 dashboard
 * (shareCode + deliveryDate + deliveryTime) merged into one "cooler" card.
 *
 * Differences from getWeeklySummary (which it supersedes):
 * - No hardcoded PAID/UNFULFILLED restriction — filters are caller-supplied,
 *   so unpaid and delivered orders are visible when asked for.
 * - Cards carry the FULL admin-route order serialization (items + bundle
 *   components, money breakdown, review status) so selection, bulk fulfill,
 *   pick checklists, and review requests all work from this one payload.
 * - Search mode ("q") drops the date window and spans all time.
 * - A separate "overdue" group surfaces past-window unfulfilled orders.
 */

import { prisma } from '@/lib/database/client';
import { DeliveryType, FulfillmentStatus, OrderStatus, Prisma } from '@prisma/client';
import {
  type BoatScheduleRow,
  type WeeklyManifestMatch,
  type WeeklyShortType,
  coolerKey,
  findManifestMatch,
  isBoatish,
  isPlaceholderName,
  preferredCustomerName,
  resolveCruiseType,
  serializeManifestMatch,
  shortTypeFor,
  todayCT,
} from './cooler-grouping';
import { getOrdersSummaryStats, type OrdersSummaryStats } from './orders-stats';
import { resolveGroupLabel } from './group-label';
import { isBoatAddress } from './boat-address';

/** Per-order shape — matches the admin orders route serialization. */
export interface OrdersViewOrder {
  id: string;
  orderNumber: number;
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  deliveryPhone: string | null;
  deliveryInstructions: string | null;
  customerNote: string | null;
  internalNote: string | null;
  subtotal: number;
  discountCode: string | null;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  deliveryDate: string;
  deliveryTime: string;
  deliveryType: string;
  createdAt: string;
  deliveryAddress: Record<string, string> | null;
  items: Array<{
    quantity: number;
    title: string;
    productId: string;
    bundleComponents: Array<{ title: string; variantTitle: string | null; quantity: number }>;
  }>;
  groupOrderId: string | null;
  groupOrder: { id: string; shareCode: string; name: string; status: string } | null;
  affiliate: { id: string; code: string; businessName: string; contactName: string; phone: string | null } | null;
  dashboardSource: { id: string; shareCode: string; name: string; hostName: string } | null;
  reviewRequestSentAt: string | null;
  /** True when the group label differs from the payer name. */
  payerDiffers: boolean;
}

/** One cooler card: a group dashboard's orders for a date+time, or a solo order. */
export interface OrderCardData {
  key: string;
  isCooler: boolean;
  shareCode: string | null;
  dashboard: { id: string; shareCode: string; name: string; hostName: string } | null;
  deliveryDate: string;
  deliveryTime: string;
  displayName: string;
  groupTitle: string | null;
  address: string;
  deliveryNotes: string;
  source: string;
  partyType: string | null;
  extId: string | null;
  hostPhone: string;
  hostEmail: string;
  manifestMatch: WeeklyManifestMatch | null;
  aggregatedItems: Array<{ title: string; qty: number }>;
  total: number;
  totalItems: number;
  uniqueSkus: number;
  isVeryLarge: boolean;
  shortType: WeeklyShortType;
  isBoatish: boolean;
  /** True when this cooler delivers to the Premier boat marina. */
  isMarina: boolean;
  /** Authoritative cruise type (manifest or operator override); null if unknown. */
  cruiseType: 'DISCO' | 'PRIVATE' | null;
  /** False when a marina delivery has no known cruise type — the pick-sheet gate resolves these. */
  cruiseTypeKnown: boolean;
  orders: OrdersViewOrder[];
}

/** Stats over the cards actually returned (range-scoped, includes unpaid). */
export interface OrdersViewRangeStats {
  coolers: number;
  payments: number;
  totalRevenue: number;
  disco: number;
  privateCruise: number;
  house: number;
  veryLarge: number;
  manifestMatched: number;
  manifestMissing: number;
}

export interface OrdersViewResponse {
  ok: true;
  mode: 'range' | 'search';
  range: { start: string; end: string; days: number };
  truncated: boolean;
  stats: { global: OrdersSummaryStats; range: OrdersViewRangeStats };
  overdue: { cards: OrderCardData[]; total: number } | null;
  days: Array<{ date: string; total: number; cards: OrderCardData[] }>;
  filters: {
    statuses: string[];
    fulfillmentStatuses: string[];
    deliveryTypes: string[];
  };
}

export interface GetOrdersViewOptions {
  /** YYYY-MM-DD start of the delivery-date window (default: today CT). */
  start?: string;
  /** Window length in days, 1–31 (default 7). */
  days?: number;
  /** Search term — when set, the date window is ignored (all time). */
  search?: string;
  status?: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus;
  deliveryType?: DeliveryType;
  /** Legacy v1 semantics: 'group' = groupOrderId != null. */
  groupType?: 'all' | 'regular' | 'group';
  groupOrderV2Id?: string;
  reviewSent?: 'sent' | 'unsent';
  /** Include the past-60-day unfulfilled overdue section (range mode only). */
  includeOverdue?: boolean;
}

/** Row caps: search spans all time, range mode is bounded by the window. */
const RANGE_CAP = 500;
const SEARCH_CAP = 200;
const OVERDUE_CAP = 100;
const OVERDUE_LOOKBACK_DAYS = 60;

type OrderWithIncludes = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: { select: { id: true; title: true } } } };
    groupOrder: { select: { id: true; shareCode: true; name: true; status: true } };
    groupOrderV2: {
      select: {
        id: true;
        name: true;
        hostName: true;
        hostPhone: true;
        hostEmail: true;
        shareCode: true;
        source: true;
        partyType: true;
        cruiseType: true;
        externalBookingId: true;
      };
    };
    affiliate: {
      select: { id: true; code: true; businessName: true; contactName: true; phone: true };
    };
  };
}>;

const ORDER_INCLUDE = {
  items: { include: { product: { select: { id: true, title: true } } } },
  groupOrder: { select: { id: true, shareCode: true, name: true, status: true } },
  groupOrderV2: {
    select: {
      id: true,
      name: true,
      hostName: true,
      hostPhone: true,
      hostEmail: true,
      shareCode: true,
      source: true,
      partyType: true,
      cruiseType: true,
      externalBookingId: true,
    },
  },
  affiliate: {
    select: { id: true, code: true, businessName: true, contactName: true, phone: true },
  },
} satisfies Prisma.OrderInclude;

/** Build the filter portion of the where clause (ported from the admin route). */
function buildFilterWhere(opts: GetOrdersViewOptions): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (opts.search) {
    const searchNum = parseInt(opts.search);
    where.OR = [
      { customerEmail: { contains: opts.search, mode: 'insensitive' } },
      { customerName: { contains: opts.search, mode: 'insensitive' } },
      ...(isNaN(searchNum) ? [] : [{ orderNumber: searchNum }]),
    ];
  }

  if (opts.status) where.status = opts.status;
  if (opts.fulfillmentStatus) where.fulfillmentStatus = opts.fulfillmentStatus;
  if (opts.deliveryType) where.deliveryType = opts.deliveryType;

  // Review-request filter — "unsent" implies the order must already be DELIVERED
  // (the only orders eligible to receive a review request).
  if (opts.reviewSent === 'unsent') {
    where.reviewRequestSentAt = null;
    where.fulfillmentStatus = FulfillmentStatus.DELIVERED;
  } else if (opts.reviewSent === 'sent') {
    where.reviewRequestSentAt = { not: null };
  }

  // Legacy v1 group filtering (groupOrderId, NOT GroupOrderV2)
  if (opts.groupType === 'regular') {
    where.groupOrderId = null;
  } else if (opts.groupType === 'group') {
    where.groupOrderId = { not: null };
  }
  if (opts.groupOrderV2Id) {
    where.groupOrderV2Id = opts.groupOrderV2Id;
  }

  return where;
}

/** Serialize one Prisma order to the admin-route shape. */
function serializeOrder(
  order: OrderWithIncludes,
  bundleMap: Map<string, Array<{ title: string; variantTitle: string | null; quantity: number }>>,
  payerDiffers: boolean,
): OrdersViewOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone || null,
    deliveryPhone: order.deliveryPhone || null,
    deliveryInstructions: order.deliveryInstructions || null,
    customerNote: order.customerNote || null,
    internalNote: order.internalNote || null,
    subtotal: Number(order.subtotal),
    discountCode: order.discountCode,
    discountAmount: Number(order.discountAmount),
    taxAmount: Number(order.taxAmount),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    itemCount: order.items.length,
    deliveryDate: order.deliveryDate.toISOString(),
    deliveryTime: order.deliveryTime,
    deliveryType: order.deliveryType,
    createdAt: order.createdAt.toISOString(),
    deliveryAddress: order.deliveryAddress as Record<string, string> | null,
    items: order.items.map((i) => ({
      quantity: i.quantity,
      title: i.title || i.product.title,
      productId: i.product.id,
      bundleComponents: bundleMap.get(i.product.id) || [],
    })),
    groupOrderId: order.groupOrderId,
    groupOrder: order.groupOrder
      ? {
          id: order.groupOrder.id,
          shareCode: order.groupOrder.shareCode,
          name: order.groupOrder.name,
          status: order.groupOrder.status,
        }
      : null,
    affiliate: order.affiliate
      ? {
          id: order.affiliate.id,
          code: order.affiliate.code,
          businessName: order.affiliate.businessName,
          contactName: order.affiliate.contactName,
          phone: order.affiliate.phone,
        }
      : null,
    dashboardSource: order.groupOrderV2
      ? {
          id: order.groupOrderV2.id,
          shareCode: order.groupOrderV2.shareCode,
          name: order.groupOrderV2.name,
          hostName: order.groupOrderV2.hostName,
        }
      : null,
    reviewRequestSentAt: order.reviewRequestSentAt?.toISOString() || null,
    payerDiffers,
  };
}

interface CardAccumulator {
  key: string;
  isCooler: boolean;
  shareCode: string | null;
  dashboard: { id: string; shareCode: string; name: string; hostName: string } | null;
  deliveryDate: string;
  deliveryTime: string;
  primaryName: string;
  address: string;
  deliveryNotes: string;
  source: string;
  partyType: string | null;
  extId: string | null;
  hostPhone: string;
  hostEmail: string;
  manifestMatch: BoatScheduleRow | null;
  cruiseType: string | null;
  payments: Array<{ payer: string }>;
  aggregatedItems: Map<string, number>;
  orders: OrdersViewOrder[];
}

/** Group serialized orders into cooler cards (shared invariant with weekly). */
function buildCards(
  rawOrders: Array<OrderWithIncludes & { _serialized: OrdersViewOrder }>,
  boatSchedule: BoatScheduleRow[],
): OrderCardData[] {
  const cardMap = new Map<string, CardAccumulator>();

  for (const o of rawOrders) {
    const lbl = resolveGroupLabel(o.groupOrderV2, o.customerName);
    const addr = (o.deliveryAddress || {}) as { address1?: string; city?: string; zip?: string };
    const dateKey = o.deliveryDate.toISOString().slice(0, 10);
    const timeKey = o.deliveryTime || 'TBD';
    const addrStr = [addr.address1, addr.city, addr.zip].filter(Boolean).join(', ');
    // Match the boat manifest for group orders AND any marina delivery (a solo
    // marina order still needs its cruise type + full manifest name).
    const manifestMatch =
      lbl.isGroupOrder || isBoatAddress(addrStr)
        ? findManifestMatch(boatSchedule, {
            manifestName: lbl.manifestName || o.customerName,
            payerPhone: o.customerPhone,
            deliveryDate: o.deliveryDate,
          })
        : null;
    const key = coolerKey({
      shareCode: lbl.shareCode,
      deliveryDate: dateKey,
      deliveryTime: timeKey,
      orderId: o.id,
    });

    if (!cardMap.has(key)) {
      cardMap.set(key, {
        key,
        isCooler: !!lbl.shareCode,
        shareCode: lbl.shareCode,
        dashboard: o.groupOrderV2
          ? {
              id: o.groupOrderV2.id,
              shareCode: o.groupOrderV2.shareCode,
              name: o.groupOrderV2.name,
              hostName: o.groupOrderV2.hostName,
            }
          : null,
        deliveryDate: dateKey,
        deliveryTime: timeKey,
        primaryName: lbl.displayLabel,
        address: [addr.address1, addr.city, addr.zip].filter(Boolean).join(', '),
        deliveryNotes: o.deliveryInstructions || '',
        source: o.groupOrderV2?.source || 'DIRECT',
        partyType: o.groupOrderV2?.partyType || null,
        extId: o.groupOrderV2?.externalBookingId || null,
        hostPhone: o.groupOrderV2?.hostPhone || o.customerPhone || '',
        hostEmail: o.groupOrderV2?.hostEmail || o.customerEmail || '',
        manifestMatch,
        cruiseType: o.groupOrderV2?.cruiseType || null,
        payments: [],
        aggregatedItems: new Map(),
        orders: [],
      });
    }
    const c = cardMap.get(key)!;
    c.payments.push({ payer: o.customerName });
    c.orders.push({ ...o._serialized, payerDiffers: lbl.payerDiffers });
    // Cancelled orders stay VISIBLE as sub-cards (ops needs to see that the
    // order existed and was refunded) but must not feed the cooler rollup --
    // otherwise the pack list tells the picker to load items nobody paid for.
    // Unpaid-but-live orders DO count: they still have to be packed, which is
    // what the "N unpaid" badge is there to flag.
    if (o.status !== OrderStatus.CANCELLED) {
      for (const it of o._serialized.items) {
        c.aggregatedItems.set(it.title, (c.aggregatedItems.get(it.title) || 0) + it.quantity);
      }
    }
    if (!c.deliveryNotes && o.deliveryInstructions) c.deliveryNotes = o.deliveryInstructions;
  }

  const cards: OrderCardData[] = [...cardMap.values()].map((c) => {
    // Same rule as the item rollup: a cancelled+refunded order contributes no
    // money to the card total, so "order total" matches what was actually kept.
    const total = c.orders.reduce(
      (s, o) => (o.status === OrderStatus.CANCELLED ? s : s + o.total),
      0
    );
    const totalItems = [...c.aggregatedItems.values()].reduce((s, q) => s + q, 0);
    const displayName = preferredCustomerName(c);
    const cruise = resolveCruiseType(c);
    const groupTitle =
      c.primaryName && !isPlaceholderName(c.primaryName) && c.primaryName !== displayName
        ? c.primaryName
        : null;
    const aggregatedItems = [...c.aggregatedItems.entries()]
      .map(([title, qty]) => ({ title, qty }))
      .sort((a, b) => b.qty - a.qty || a.title.localeCompare(b.title));

    return {
      key: c.key,
      isCooler: c.isCooler,
      shareCode: c.shareCode,
      dashboard: c.dashboard,
      deliveryDate: c.deliveryDate,
      deliveryTime: c.deliveryTime,
      displayName,
      groupTitle,
      address: c.address,
      deliveryNotes: c.deliveryNotes,
      source: c.source,
      partyType: c.partyType,
      extId: c.extId,
      hostPhone: c.hostPhone,
      hostEmail: c.hostEmail,
      manifestMatch: serializeManifestMatch(c.manifestMatch),
      aggregatedItems,
      total,
      totalItems,
      uniqueSkus: aggregatedItems.length,
      isVeryLarge: total >= 500 || totalItems >= 15,
      shortType: shortTypeFor(c),
      isBoatish: isBoatish(c),
      isMarina: isBoatAddress(c.address),
      cruiseType: cruise.type,
      cruiseTypeKnown: cruise.known,
      orders: c.orders.sort((a, b) => a.orderNumber - b.orderNumber),
    };
  });

  cards.sort(
    (a, b) =>
      a.deliveryDate.localeCompare(b.deliveryDate) ||
      (a.deliveryTime || '').localeCompare(b.deliveryTime || '')
  );
  return cards;
}

/** Attach serialized payloads to raw orders (shared bundleMap lookup). */
async function serializeAll(
  orders: OrderWithIncludes[],
): Promise<Array<OrderWithIncludes & { _serialized: OrdersViewOrder }>> {
  const uniqueProductIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.product.id)))];
  const allBundleComponents = uniqueProductIds.length
    ? await prisma.bundleComponent.findMany({
        where: { bundleProductId: { in: uniqueProductIds } },
        include: {
          componentProduct: { select: { title: true } },
          componentVariant: { select: { title: true } },
        },
      })
    : [];

  const bundleMap = new Map<string, Array<{ title: string; variantTitle: string | null; quantity: number }>>();
  for (const bc of allBundleComponents) {
    const existing = bundleMap.get(bc.bundleProductId) || [];
    existing.push({
      title: bc.componentProduct.title,
      variantTitle: bc.componentVariant?.title || null,
      quantity: bc.quantity,
    });
    bundleMap.set(bc.bundleProductId, existing);
  }

  return orders.map((o) =>
    Object.assign(o, { _serialized: serializeOrder(o, bundleMap, false) }),
  );
}

/** Fetch + group the unified orders view. */
export async function getOrdersView(opts: GetOrdersViewOptions = {}): Promise<OrdersViewResponse> {
  const startStr = opts.start || todayCT();
  const days = Math.max(1, Math.min(31, opts.days ?? 7));
  const startDate = new Date(`${startStr}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + days);

  const searchMode = !!opts.search?.trim();
  const filterWhere = buildFilterWhere(opts);

  const where: Prisma.OrderWhereInput = searchMode
    ? filterWhere
    : { ...filterWhere, deliveryDate: { gte: startDate, lt: endDate } };

  const cap = searchMode ? SEARCH_CAP : RANGE_CAP;

  // Boat manifest window must cover overdue lookback too.
  const manifestStart = new Date(startDate);
  manifestStart.setUTCDate(manifestStart.getUTCDate() - OVERDUE_LOOKBACK_DAYS);

  const includeOverdue = (opts.includeOverdue ?? true) && !searchMode;
  const overdueStart = new Date(startDate);
  overdueStart.setUTCDate(overdueStart.getUTCDate() - OVERDUE_LOOKBACK_DAYS);

  const [mainOrders, overdueOrders, boatSchedule, globalStats] = await Promise.all([
    prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: searchMode ? { deliveryDate: 'desc' } : { deliveryDate: 'asc' },
      take: cap + 1,
    }),
    includeOverdue
      ? prisma.order.findMany({
          where: {
            ...buildFilterWhere({ ...opts, fulfillmentStatus: undefined, reviewSent: opts.reviewSent }),
            deliveryDate: { gte: overdueStart, lt: startDate },
            fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
            status: { not: OrderStatus.CANCELLED },
          },
          include: ORDER_INCLUDE,
          orderBy: { deliveryDate: 'asc' },
          take: OVERDUE_CAP,
        })
      : Promise.resolve([] as OrderWithIncludes[]),
    searchMode
      ? Promise.resolve([] as BoatScheduleRow[])
      : prisma.boatSchedule.findMany({
          where: {
            cruiseDate: { gte: manifestStart, lt: endDate },
            isStale: false,
            clientName: { not: '' },
          },
          select: {
            cruiseDate: true,
            timeSlot: true,
            boat: true,
            clientName: true,
            normalizedName: true,
            normalizedPhone: true,
            package: true,
            headcount: true,
            sheetTab: true,
            occasion: true,
          },
        }),
    getOrdersSummaryStats(),
  ]);

  const truncated = mainOrders.length > cap;
  const mainTrimmed = truncated ? mainOrders.slice(0, cap) : mainOrders;

  const mainSerialized = await serializeAll(mainTrimmed);
  const overdueSerialized = await serializeAll(overdueOrders);

  const mainCards = buildCards(mainSerialized, boatSchedule);
  const overdueCards = buildCards(overdueSerialized, boatSchedule);

  // Range stats: over the visible main cards (unpaid included, badged client-side)
  const rangeStats: OrdersViewRangeStats = {
    coolers: mainCards.length,
    payments: mainCards.reduce((s, c) => s + c.orders.length, 0),
    totalRevenue: mainCards.reduce((s, c) => s + c.total, 0),
    disco: mainCards.filter((c) => c.shortType === 'DISCO').length,
    privateCruise: mainCards.filter((c) => c.shortType === 'PRIVATE').length,
    house: mainCards.filter((c) => c.shortType === 'HOUSE').length,
    veryLarge: mainCards.filter((c) => c.isVeryLarge).length,
    manifestMatched: mainCards.filter((c) => c.isBoatish && c.manifestMatch).length,
    manifestMissing: mainCards.filter((c) => c.isBoatish && !c.manifestMatch).length,
  };

  // Day bucketing: search mode shows newest day first.
  const byDate = new Map<string, OrderCardData[]>();
  for (const c of mainCards) {
    if (!byDate.has(c.deliveryDate)) byDate.set(c.deliveryDate, []);
    byDate.get(c.deliveryDate)!.push(c);
  }
  const daysOut = [...byDate.entries()]
    .sort((a, b) => (searchMode ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])))
    .map(([date, cards]) => ({
      date,
      cards,
      total: cards.reduce((s, c) => s + c.total, 0),
    }));

  return {
    ok: true,
    mode: searchMode ? 'search' : 'range',
    range: {
      start: startStr,
      end: new Date(endDate.getTime() - 86_400_000).toISOString().slice(0, 10),
      days,
    },
    truncated,
    stats: { global: globalStats, range: rangeStats },
    overdue:
      includeOverdue && overdueCards.length
        ? { cards: overdueCards, total: overdueCards.reduce((s, c) => s + c.total, 0) }
        : null,
    days: daysOut,
    filters: {
      statuses: Object.values(OrderStatus),
      fulfillmentStatuses: Object.values(FulfillmentStatus),
      deliveryTypes: Object.values(DeliveryType),
    },
  };
}
