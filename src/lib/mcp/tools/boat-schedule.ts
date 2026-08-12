import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { Prisma } from '@prisma/client';
import { listEnvelope } from '../envelopes';
import { logMcpRequest } from '../logging';
import type { McpAuth } from '../auth';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * The operational cruise calendar, synced nightly from the Premier bookings
 * sheet into `boat_schedule`.
 *
 * This is a DIFFERENT question from list_dashboards. `boat_schedule` is the
 * partner's manifest — every cruise they have booked, whether or not the guest
 * ever opened a Party On dashboard. A dashboard's cruise date is our record of
 * a cruise we're delivering to. A cruise on the manifest with no dashboard is
 * precisely the interesting gap, so the two must not be conflated.
 *
 * Rows are marked `is_stale` when they disappear from the sheet (a cancelled or
 * rescheduled booking) rather than deleted, so stale rows are excluded by
 * default — asking "what's on the boat Saturday" should not return cruises that
 * were called off.
 */

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

/** Midnight UTC for a date-only column, so a day filter isn't skewed by local time. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function registerBoatSchedule(server: McpServer, auth: McpAuth) {
  server.registerTool('boat_schedule', {
    description:
      "The partner boat-cruise manifest (synced from the Premier bookings sheet). Use for 'what cruises are on the calendar', 'who is sailing Saturday', or to check a booking against the operator's own schedule. This is the partner's booking list — a cruise here may have no Party On dashboard, which is usually the point of asking. For our dashboards instead, use list_dashboards.",
    inputSchema: {
      dateFrom: z
        .string()
        .optional()
        .describe('Earliest cruise date, ISO (e.g. 2026-08-01). Defaults to today when no date filter is given.'),
      dateTo: z.string().optional().describe('Latest cruise date, ISO'),
      boat: z.string().optional().describe('Filter by boat name, matched case-insensitively'),
      clientName: z
        .string()
        .optional()
        .describe('Filter by client name, partial and case-insensitive'),
      includeStale: z
        .boolean()
        .optional()
        .describe('Include rows that vanished from the sheet (cancelled/rescheduled). Default false.'),
      limit: z.number().optional().describe(`Max results (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT})`),
      offset: z.number().optional().describe('Number of results to skip (default 0)'),
    },
  }, async (args) => {
    const start = Date.now();
    try {
      const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
      const offset = args.offset ?? 0;

      const where: Prisma.BoatScheduleWhereInput = {};

      if (!args.includeStale) where.isStale = false;
      if (args.boat) where.boat = { equals: args.boat, mode: 'insensitive' };
      if (args.clientName) where.clientName = { contains: args.clientName, mode: 'insensitive' };

      // Unbounded, this returns years of history newest-last and buries what the
      // caller almost certainly wants. Default to upcoming.
      if (args.dateFrom || args.dateTo) {
        where.cruiseDate = {};
        if (args.dateFrom) where.cruiseDate.gte = startOfUtcDay(new Date(args.dateFrom));
        if (args.dateTo) where.cruiseDate.lte = startOfUtcDay(new Date(args.dateTo));
      } else {
        where.cruiseDate = { gte: startOfUtcDay(new Date()) };
      }

      const [rows, total] = await Promise.all([
        prisma.boatSchedule.findMany({
          where,
          orderBy: [{ cruiseDate: 'asc' }, { timeSlot: 'asc' }],
          take: limit,
          skip: offset,
        }),
        prisma.boatSchedule.count({ where }),
      ]);

      const items = rows.map((r) => ({
        id: r.id,
        cruiseDate: r.cruiseDate.toISOString().slice(0, 10),
        dayOfWeek: r.dayOfWeek,
        timeSlot: r.timeSlot,
        boat: r.boat,
        clientName: r.clientName,
        clientPhone: r.clientPhone,
        package: r.package,
        addOns: r.addOns,
        occasion: r.occasion,
        headcount: r.headcount,
        // Decimal columns must be converted or they serialize as objects.
        amount: r.amount === null ? null : Number(r.amount),
        tip: r.tip === null ? null : Number(r.tip),
        dj: r.dj,
        photographer: r.photographer,
        captainCrew: r.captainCrew,
        isStale: r.isStale,
        lastSeenAt: r.lastSeenAt.toISOString(),
      }));

      logMcpRequest({
        toolName: 'boat_schedule', authLevel: auth.level, actor: auth.actor,
        params: args as object, durationMs: Date.now() - start, success: true, rowCount: items.length,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(listEnvelope(items, total, limit, offset)),
        }],
      };
    } catch (err) {
      logMcpRequest({
        toolName: 'boat_schedule', authLevel: auth.level, actor: auth.actor,
        params: args as object, durationMs: Date.now() - start, success: false,
        errorMsg: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
}
