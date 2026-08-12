import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { Prisma, GroupOrderV2Status, DashboardSource } from '@prisma/client';
import { listEnvelope } from '../envelopes';
import { logMcpRequest } from '../logging';
import { deriveCruiseDate, normalizeCruiseType } from './get-dashboard';
import type { McpAuth } from '../auth';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Browse group-order dashboards. Summary fields only — get_dashboard returns
 * the tabs and full host record.
 *
 * Cruise-date filtering is done in SQL against the BOAT tabs (`tabs: { some: … }`)
 * so paging stays correct: filtering after the fact would return short pages
 * whenever a dashboard on the page had no dated cruise leg. The cruise date
 * shown on each row is still derived per dashboard by deriveCruiseDate, which
 * is the same min-of-dated-BOAT-tabs rule the CRM's boat drip enrolls against.
 */

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export function registerListDashboards(server: McpServer, auth: McpAuth) {
  server.registerTool('list_dashboards', {
    description:
      'List group-order dashboards with optional filters. Use cruiseDateFrom/cruiseDateTo for "which cruises are coming up" questions — those filter on the boat leg\'s delivery date, which is the sail date. Use source=WEBHOOK to see only dashboards created from partner bookings. Returns summary fields; use get_dashboard for tabs and full detail.',
    inputSchema: {
      status: z
        .enum(['ACTIVE', 'CLOSED', 'COMPLETED', 'CANCELLED'])
        .optional()
        .describe('Filter by dashboard lifecycle status'),
      source: z
        .enum(['DIRECT', 'PARTNER_PAGE', 'INTERNAL', 'WEBHOOK'])
        .optional()
        .describe('How the dashboard was created. WEBHOOK = created from a partner booking.'),
      cruiseType: z
        .string()
        .optional()
        .describe("Cruise type override, matched case-insensitively (e.g. 'disco', 'private')"),
      cruiseDateFrom: z
        .string()
        .optional()
        .describe('Earliest sail date, ISO (e.g. 2026-08-01). Filters on the BOAT tab delivery date.'),
      cruiseDateTo: z.string().optional().describe('Latest sail date, ISO. Pair with cruiseDateFrom.'),
      hasPhone: z
        .boolean()
        .optional()
        .describe('Only dashboards with a host phone number (textable hosts)'),
      limit: z.number().optional().describe(`Max results (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT})`),
      offset: z.number().optional().describe('Number of results to skip (default 0)'),
    },
  }, async (args) => {
    const start = Date.now();
    try {
      const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
      const offset = args.offset ?? 0;

      const where: Prisma.GroupOrderV2WhereInput = {};
      if (args.status) where.status = args.status as GroupOrderV2Status;
      if (args.source) where.source = args.source as DashboardSource;

      // Stored free-text, so match case-insensitively rather than exactly.
      if (args.cruiseType) {
        where.cruiseType = { equals: args.cruiseType, mode: 'insensitive' };
      }

      if (args.hasPhone) {
        where.hostPhone = { not: null };
      }

      if (args.cruiseDateFrom || args.cruiseDateTo) {
        const deliveryDate: Prisma.DateTimeFilter = {};
        if (args.cruiseDateFrom) deliveryDate.gte = new Date(args.cruiseDateFrom);
        if (args.cruiseDateTo) deliveryDate.lte = new Date(args.cruiseDateTo);
        where.tabs = {
          some: { deliveryContextType: 'BOAT', deliveryDate },
        };
      }

      const [dashboards, total] = await Promise.all([
        prisma.groupOrderV2.findMany({
          where,
          include: {
            tabs: {
              select: { deliveryDate: true, deliveryContextType: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.groupOrderV2.count({ where }),
      ]);

      const items = dashboards.map((d) => ({
        id: d.id,
        name: d.name,
        shareCode: d.shareCode,
        status: d.status,
        source: d.source,
        partyType: d.partyType,
        cruiseType: normalizeCruiseType(d.cruiseType),
        cruiseDate: deriveCruiseDate(d.tabs),
        externalBookingId: d.externalBookingId,
        hostName: d.hostName,
        hostPhone: d.hostPhone,
        hostEmail: d.hostEmail,
        viewCount: d.viewCount,
        createdAt: d.createdAt.toISOString(),
      }));

      logMcpRequest({
        toolName: 'list_dashboards', authLevel: auth.level, actor: auth.actor,
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
        toolName: 'list_dashboards', authLevel: auth.level, actor: auth.actor,
        params: args as object, durationMs: Date.now() - start, success: false,
        errorMsg: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
}
