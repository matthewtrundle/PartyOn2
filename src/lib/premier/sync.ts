/**
 * Premier boat-schedule sync core.
 *
 * Reads the Premier Google Sheet tabs, upserts rows into `boat_schedule`,
 * marks no-longer-present rows stale, then re-runs order↔booking matching.
 * Shared by the operator-triggered endpoint (`/api/ops/boat-schedule/sync`)
 * and the weekly cron (`/api/cron/boat-schedule-sync`) so both behave
 * identically.
 */

import { prisma } from '@/lib/database/client';
import {
  readGoogleSheet,
  parseSheet,
  type ParsedBooking,
} from '@/lib/premier/sheet-parser';
import { runMatching, insertMatches } from '@/lib/premier/matcher';

export interface BoatSyncResult {
  status: 'success' | 'partial' | 'failed';
  syncId: number;
  rowsParsed: number;
  rowsUpserted: number;
  rowsStale: number;
  autoMatched: number;
  needsReview: number;
  unmatchedBookings: number;
  unmatchedOrders: number;
  errors: Array<Record<string, unknown>>;
}

/**
 * Premier sheet tab names to sync for a given date: the current month plus the
 * next one (so cruises near a month boundary are covered). Tabs are named
 * `MM-PVT` / `MM-DSC` with a zero-padded month, e.g. June → 06-PVT, 06-DSC.
 *
 * Note: in December this also asks for `01-*`, which is next year's tab. The
 * sheet may not have it yet; a missing tab is logged per-tab and skipped, not
 * fatal.
 */
export function scheduleTabsForNow(now: Date): string[] {
  const month = now.getUTCMonth(); // 0-11
  const tabs: string[] = [];
  for (const offset of [0, 1]) {
    const mm = String(((month + offset) % 12) + 1).padStart(2, '0');
    tabs.push(`${mm}-PVT`, `${mm}-DSC`);
  }
  return tabs;
}

/**
 * Run a full sync for the given tabs. Never throws — fatal errors are captured
 * in the returned `errors` with `status: 'failed'` so callers can map to an
 * HTTP status without a try/catch.
 */
export async function runBoatScheduleSync(
  tabs: string[],
  triggeredBy: string,
): Promise<BoatSyncResult> {
  const syncLog = await prisma.syncLog.create({
    data: { triggeredBy, status: 'running' },
  });

  const allBookings: ParsedBooking[] = [];
  const allErrors: Array<Record<string, unknown>> = [];

  try {
    // Read and parse each tab
    for (const tab of tabs) {
      try {
        const sheetData = await readGoogleSheet(tab);
        const { bookings, warnings } = parseSheet(sheetData, tab);
        allBookings.push(...bookings);
        if (warnings.length > 0) allErrors.push({ tab, warnings });
      } catch (err) {
        allErrors.push({ tab, error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Mark existing rows in these tabs as potentially stale
    await prisma.boatSchedule.updateMany({
      where: { sheetTab: { in: tabs } },
      data: { isStale: true },
    });

    // Upsert parsed bookings
    let upserted = 0;
    for (const b of allBookings) {
      try {
        const clientNameKey = b.clientName ?? '';
        await prisma.boatSchedule.upsert({
          where: {
            cruiseDate_timeSlot_boat_clientName: {
              cruiseDate: new Date(b.cruiseDate),
              timeSlot: b.timeSlot,
              boat: b.boat,
              clientName: clientNameKey,
            },
          },
          create: {
            sheetTab: b.sheetTab,
            cruiseDate: new Date(b.cruiseDate),
            dayOfWeek: b.dayOfWeek || null,
            weekType: b.weekType || null,
            timeSlot: b.timeSlot,
            boat: b.boat,
            clientName: clientNameKey,
            clientPhone: b.clientPhone,
            normalizedName: b.normalizedName,
            normalizedPhone: b.normalizedPhone,
            package: b.package,
            addOns: b.addOns,
            occasion: b.occasion,
            avgAge: b.avgAge,
            headcount: b.headcount,
            dj: b.dj,
            photographer: b.photographer,
            tip: b.tip,
            amount: b.amount,
            podFlag: b.podFlag,
            captainCrew: b.captainCrew,
            sheetRow: b.sheetRow,
            rawData: b.rawData,
            isStale: false,
            lastSeenAt: new Date(),
          },
          update: {
            sheetTab: b.sheetTab,
            dayOfWeek: b.dayOfWeek || null,
            weekType: b.weekType || null,
            clientName: clientNameKey,
            clientPhone: b.clientPhone,
            normalizedName: b.normalizedName,
            normalizedPhone: b.normalizedPhone,
            package: b.package,
            addOns: b.addOns,
            occasion: b.occasion,
            avgAge: b.avgAge,
            headcount: b.headcount,
            dj: b.dj,
            photographer: b.photographer,
            tip: b.tip,
            amount: b.amount,
            podFlag: b.podFlag,
            captainCrew: b.captainCrew,
            sheetRow: b.sheetRow,
            rawData: b.rawData,
            isStale: false,
            lastSeenAt: new Date(),
          },
        });
        upserted++;
      } catch (err) {
        allErrors.push({
          row: b.sheetRow,
          booking: `${b.cruiseDate} ${b.boat} ${b.clientName}`,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const staleCount = await prisma.boatSchedule.count({
      where: { isStale: true, sheetTab: { in: tabs } },
    });

    // Run matching
    let autoMatched = 0;
    let needsReview = 0;
    let unmatchedBookings = 0;
    let unmatchedOrders = 0;

    try {
      const matchResult = await runMatching();
      await insertMatches(matchResult.matches);
      autoMatched = matchResult.matches.filter((m) => m.status === 'matched').length;
      needsReview = matchResult.matches.filter((m) => m.status === 'needs_review').length;
      unmatchedBookings = matchResult.unmatched.length;
      unmatchedOrders = matchResult.orphanOrders.length;
    } catch (err) {
      allErrors.push({
        phase: 'matching',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const status = allErrors.length === 0 ? 'success' : 'partial';

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status,
        rowsParsed: allBookings.length,
        rowsUpserted: upserted,
        rowsStale: staleCount,
        autoMatched,
        needsReview,
        unmatchedBookings,
        unmatchedOrders,
        errors: allErrors as object,
      },
    });

    return {
      status,
      syncId: syncLog.id,
      rowsParsed: allBookings.length,
      rowsUpserted: upserted,
      rowsStale: staleCount,
      autoMatched,
      needsReview,
      unmatchedBookings,
      unmatchedOrders,
      errors: allErrors,
    };
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status: 'failed',
        errors: [{ fatal: err instanceof Error ? err.message : String(err) }] as object,
      },
    });
    return {
      status: 'failed',
      syncId: syncLog.id,
      rowsParsed: allBookings.length,
      rowsUpserted: 0,
      rowsStale: 0,
      autoMatched: 0,
      needsReview: 0,
      unmatchedBookings: 0,
      unmatchedOrders: 0,
      errors: [{ fatal: err instanceof Error ? err.message : String(err) }],
    };
  }
}
