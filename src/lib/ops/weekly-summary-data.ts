/**
 * Weekly delivery summary — shared data layer.
 *
 * Powers both the printable CLI script (scripts/ops/weekly-summary.mjs) and
 * the in-app /ops/weekly-summary tab via /api/ops/weekly-summary.
 *
 * Only PAID orders within the date window are included. Sub-payments that
 * share GroupOrderV2.shareCode + deliveryDate + deliveryTime are merged into
 * a single "cooler" — grouping is sacrosanct: every sub-payer belongs to
 * exactly one cooler card and never appears outside it.
 *
 * Pure grouping/classification helpers live in ./cooler-grouping (shared
 * with the unified orders view).
 */

import { prisma } from '@/lib/database/client';
import { resolveGroupLabel } from './group-label';
import {
  type BoatScheduleRow,
  type WeeklyManifestMatch,
  type WeeklyShortType,
  coolerKey,
  findManifestMatch,
  isBoatish,
  isPlaceholderName,
  preferredCustomerName,
  serializeManifestMatch,
  shortTypeFor,
  todayCT,
} from './cooler-grouping';

export { todayCT };
export type { WeeklyManifestMatch, WeeklyShortType };

export interface WeeklyItem {
  qty: number;
  title: string;
}

export interface WeeklyPayment {
  orderNumber: number;
  payer: string;
  payerDiffers: boolean;
  phone: string;
  email: string;
  items: WeeklyItem[];
  total: number;
}

export interface WeeklyCooler {
  key: string;
  isCooler: boolean;
  shareCode: string | null;
  deliveryDate: string;
  deliveryTime: string;
  primaryName: string;
  groupTitle: string | null;
  address: string;
  deliveryNotes: string;
  isGroup: boolean;
  source: string;
  partyType: string | null;
  extId: string | null;
  hostPhone: string;
  hostEmail: string;
  manifestMatch: WeeklyManifestMatch | null;
  payments: WeeklyPayment[];
  aggregatedItems: Array<{ title: string; qty: number }>;
  total: number;
  totalItems: number;
  uniqueSkus: number;
  isVeryLarge: boolean;
  shortType: WeeklyShortType;
  isBoatish: boolean;
}

export interface WeeklyStats {
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

export interface WeeklySummary {
  stats: WeeklyStats;
  coolersByDate: Array<{ date: string; coolers: WeeklyCooler[]; total: number }>;
  range: { start: string; end: string; days: number };
}

interface CoolerAccumulator {
  key: string;
  isCooler: boolean;
  shareCode: string | null;
  deliveryDate: string;
  deliveryTime: string;
  primaryName: string;
  address: string;
  deliveryNotes: string;
  isGroup: boolean;
  source: string;
  partyType: string | null;
  extId: string | null;
  hostPhone: string;
  hostEmail: string;
  manifestMatch: BoatScheduleRow | null;
  payments: WeeklyPayment[];
  aggregatedItems: Map<string, number>;
}

export interface GetWeeklySummaryOptions {
  startDate?: string;
  days?: number;
}

export async function getWeeklySummary(
  opts: GetWeeklySummaryOptions = {}
): Promise<WeeklySummary> {
  const startStr = opts.startDate || todayCT();
  const days = Math.max(1, Math.min(30, opts.days ?? 7));

  const startDate = new Date(`${startStr}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + days);

  const [confirmed, boatScheduleEntries] = await Promise.all([
    prisma.order.findMany({
      where: {
        deliveryDate: { gte: startDate, lt: endDate },
        status: { in: ['CONFIRMED', 'PENDING'] },
        financialStatus: 'PAID',
        fulfillmentStatus: 'UNFULFILLED',
      },
      include: {
        items: { select: { quantity: true, title: true } },
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
            externalBookingId: true,
          },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    }),
    prisma.boatSchedule.findMany({
      where: {
        cruiseDate: { gte: startDate, lt: endDate },
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
  ]);

  const rows = confirmed.map((o) => {
    const lbl = resolveGroupLabel(o.groupOrderV2, o.customerName);
    const addr = (o.deliveryAddress || {}) as {
      address1?: string;
      city?: string;
      zip?: string;
    };
    const items: WeeklyItem[] = o.items.map((i) => ({
      qty: i.quantity,
      title: i.title,
    }));
    const manifestMatch = lbl.isGroupOrder
      ? findManifestMatch(boatScheduleEntries, {
          manifestName: lbl.manifestName || o.customerName,
          payerPhone: o.customerPhone,
          deliveryDate: o.deliveryDate,
        })
      : null;
    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      deliveryDate: o.deliveryDate.toISOString().slice(0, 10),
      deliveryTime: o.deliveryTime || 'TBD',
      primaryName: lbl.displayLabel,
      payer: o.customerName,
      payerDiffers: lbl.payerDiffers,
      phone: o.customerPhone || '',
      email: o.customerEmail || '',
      address: [addr.address1, addr.city, addr.zip].filter(Boolean).join(', '),
      deliveryNotes: o.deliveryInstructions || '',
      isGroup: lbl.isGroupOrder,
      source: o.groupOrderV2?.source || 'DIRECT',
      partyType: o.groupOrderV2?.partyType || null,
      extId: o.groupOrderV2?.externalBookingId || null,
      shareCode: lbl.shareCode,
      hostPhone: o.groupOrderV2?.hostPhone || '',
      hostEmail: o.groupOrderV2?.hostEmail || '',
      total: Number(o.total),
      items,
      manifestMatch,
    };
  });

  // Grouping invariant: shareCode + date + time => one cooler.
  // Solo orders without a shareCode get a unique key based on orderId.
  const coolerMap = new Map<string, CoolerAccumulator>();
  for (const r of rows) {
    const key = coolerKey({
      shareCode: r.shareCode,
      deliveryDate: r.deliveryDate,
      deliveryTime: r.deliveryTime,
      orderId: r.orderId,
    });
    if (!coolerMap.has(key)) {
      coolerMap.set(key, {
        key,
        isCooler: !!r.shareCode,
        shareCode: r.shareCode,
        deliveryDate: r.deliveryDate,
        deliveryTime: r.deliveryTime,
        primaryName: r.primaryName,
        address: r.address,
        deliveryNotes: r.deliveryNotes,
        isGroup: r.isGroup,
        source: r.source,
        partyType: r.partyType,
        extId: r.extId,
        hostPhone: r.hostPhone || r.phone,
        hostEmail: r.hostEmail || r.email,
        manifestMatch: r.manifestMatch,
        payments: [],
        aggregatedItems: new Map(),
      });
    }
    const c = coolerMap.get(key)!;
    c.payments.push({
      orderNumber: r.orderNumber,
      payer: r.payer,
      payerDiffers: r.payerDiffers,
      phone: r.phone,
      email: r.email,
      items: r.items,
      total: r.total,
    });
    for (const it of r.items) {
      c.aggregatedItems.set(it.title, (c.aggregatedItems.get(it.title) || 0) + it.qty);
    }
    if (!c.deliveryNotes && r.deliveryNotes) c.deliveryNotes = r.deliveryNotes;
  }

  const coolers: WeeklyCooler[] = [...coolerMap.values()].map((c) => {
    const total = c.payments.reduce((s, p) => s + p.total, 0);
    const totalItems = [...c.aggregatedItems.values()].reduce((s, q) => s + q, 0);
    const isVeryLarge = total >= 500 || totalItems >= 15;
    const groupTitle =
      c.primaryName && !isPlaceholderName(c.primaryName) && c.primaryName !== preferredCustomerName(c)
        ? c.primaryName
        : null;
    const displayName = preferredCustomerName(c);
    const aggregatedItems = [...c.aggregatedItems.entries()]
      .map(([title, qty]) => ({ title, qty }))
      .sort((a, b) => b.qty - a.qty || a.title.localeCompare(b.title));

    return {
      key: c.key,
      isCooler: c.isCooler,
      shareCode: c.shareCode,
      deliveryDate: c.deliveryDate,
      deliveryTime: c.deliveryTime,
      primaryName: displayName,
      groupTitle,
      address: c.address,
      deliveryNotes: c.deliveryNotes,
      isGroup: c.isGroup,
      source: c.source,
      partyType: c.partyType,
      extId: c.extId,
      hostPhone: c.hostPhone,
      hostEmail: c.hostEmail,
      manifestMatch: serializeManifestMatch(c.manifestMatch),
      payments: c.payments,
      aggregatedItems,
      total,
      totalItems,
      uniqueSkus: aggregatedItems.length,
      isVeryLarge,
      shortType: shortTypeFor(c),
      isBoatish: isBoatish(c),
    };
  });

  coolers.sort(
    (a, b) =>
      a.deliveryDate.localeCompare(b.deliveryDate) ||
      (a.deliveryTime || '').localeCompare(b.deliveryTime || '')
  );

  const stats: WeeklyStats = {
    coolers: coolers.length,
    payments: coolers.reduce((s, c) => s + c.payments.length, 0),
    totalRevenue: coolers.reduce((s, c) => s + c.total, 0),
    disco: coolers.filter((c) => c.shortType === 'DISCO').length,
    privateCruise: coolers.filter((c) => c.shortType === 'PRIVATE').length,
    house: coolers.filter((c) => c.shortType === 'HOUSE').length,
    veryLarge: coolers.filter((c) => c.isVeryLarge).length,
    manifestMatched: coolers.filter((c) => c.isBoatish && c.manifestMatch).length,
    manifestMissing: coolers.filter((c) => c.isBoatish && !c.manifestMatch).length,
  };

  const byDateMap = new Map<string, WeeklyCooler[]>();
  for (const c of coolers) {
    if (!byDateMap.has(c.deliveryDate)) byDateMap.set(c.deliveryDate, []);
    byDateMap.get(c.deliveryDate)!.push(c);
  }
  const coolersByDate = [...byDateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, list]) => ({
      date,
      coolers: list,
      total: list.reduce((s, c) => s + c.total, 0),
    }));

  return {
    stats,
    coolersByDate,
    range: {
      start: startStr,
      end: new Date(endDate.getTime() - 86_400_000).toISOString().slice(0, 10),
      days,
    },
  };
}
