import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { detailEnvelope, errorEnvelope } from '../envelopes';
import { logMcpRequest } from '../logging';
import type { McpAuth } from '../auth';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Group-order dashboard lookup for ops questions ("does booking X have a
 * dashboard yet?", "what's the share code for this cruise?").
 *
 * The cruise date is derived, not stored: it is the earliest `delivery_date`
 * among the dashboard's BOAT-context tabs. A boat dashboard is created with two
 * tabs (the cruise leg and a lodging leg), and only the BOAT one carries the
 * sail date — taking the earliest tab overall, as the admin list endpoint does,
 * can return the lodging date instead. `delivery_date` is nullable ("self-serve
 * dashboards are born dateless"), so nulls are excluded rather than sorted to
 * the front. Nothing in the schema prevents two BOAT tabs, hence min() rather
 * than "the BOAT tab".
 *
 * This matches the rule the CRM's boat-drip enrollment already uses, so a
 * cruise date read here equals the one the drip scheduled against.
 */

export interface DashboardTab {
  id: string;
  name: string;
  position: number;
  deliveryDate: string | null;
  deliveryDateConfirmed: boolean;
  deliveryTime: string;
  deliveryContextType: string;
  status: string;
}

/** Earliest dated BOAT tab, or null when the dashboard has no dated cruise leg. */
export function deriveCruiseDate(
  tabs: { deliveryDate: Date | null; deliveryContextType: string }[]
): string | null {
  const boatDates = tabs
    .filter((t) => t.deliveryContextType === 'BOAT' && t.deliveryDate !== null)
    .map((t) => t.deliveryDate!.getTime());

  if (boatDates.length === 0) return null;
  return new Date(Math.min(...boatDates)).toISOString();
}

/**
 * `cruise_type` is a free-text override column, not an enum — operators have
 * written both 'DISCO' and 'disco'. Normalize on read so callers can compare
 * without guessing the casing.
 */
export function normalizeCruiseType(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  return lower.length > 0 ? lower : null;
}

const TAB_SELECT = {
  id: true,
  name: true,
  position: true,
  deliveryDate: true,
  deliveryDateConfirmed: true,
  deliveryTime: true,
  deliveryContextType: true,
  status: true,
} as const;

export function registerGetDashboard(server: McpServer, auth: McpAuth) {
  server.registerTool('get_dashboard', {
    description:
      'Get a group-order dashboard (the shared cart a host sends their guests) by share code or by the external booking id from the partner booking system. Returns host contact details, cruise date, status, and the delivery tabs. Use when you need to know whether a booking has a dashboard, or what a dashboard\'s cruise date and share link are. Pass either shareCode or externalBookingId, not both.',
    inputSchema: {
      shareCode: z.string().optional().describe('Dashboard share code (unique, e.g. MFNF37)'),
      externalBookingId: z
        .string()
        .optional()
        .describe('Booking id from the partner system (Xola). Not unique — the most recent match is returned.'),
    },
  }, async (args) => {
    const start = Date.now();
    try {
      if (!args.shareCode && !args.externalBookingId) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(errorEnvelope(
              'missing_identifier',
              'Provide either shareCode or externalBookingId.',
              'Use list_dashboards to find a dashboard first.'
            )),
          }],
          isError: true,
        };
      }

      // shareCode is @unique; externalBookingId is not (it is stamped on after
      // creation by the booking webhook and nothing enforces one dashboard per
      // booking), so that lookup takes the newest match rather than assuming.
      const dashboard = args.shareCode
        ? await prisma.groupOrderV2.findUnique({
            where: { shareCode: args.shareCode },
            include: { tabs: { select: TAB_SELECT, orderBy: { position: 'asc' } } },
          })
        : await prisma.groupOrderV2.findFirst({
            where: { externalBookingId: args.externalBookingId },
            include: { tabs: { select: TAB_SELECT, orderBy: { position: 'asc' } } },
            orderBy: { createdAt: 'desc' },
          });

      if (!dashboard) {
        logMcpRequest({
          toolName: 'get_dashboard', authLevel: auth.level, actor: auth.actor,
          params: args as object, durationMs: Date.now() - start, success: true, rowCount: 0,
        });
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(errorEnvelope(
              'not_found',
              `Dashboard ${args.shareCode ?? args.externalBookingId} not found.`,
              'Use list_dashboards to browse dashboards by source, status, or cruise date.'
            )),
          }],
          isError: true,
        };
      }

      const result = {
        id: dashboard.id,
        name: dashboard.name,
        shareCode: dashboard.shareCode,
        shareUrl: `https://partyondelivery.com/dashboard/${dashboard.shareCode}`,
        status: dashboard.status,
        source: dashboard.source,
        partyType: dashboard.partyType,
        cruiseType: normalizeCruiseType(dashboard.cruiseType),
        cruiseDate: deriveCruiseDate(dashboard.tabs),
        externalBookingId: dashboard.externalBookingId,
        host: {
          name: dashboard.hostName,
          email: dashboard.hostEmail,
          phone: dashboard.hostPhone,
          customerId: dashboard.hostCustomerId,
        },
        viewCount: dashboard.viewCount,
        isLastMinute: dashboard.isLastMinute,
        affiliateId: dashboard.affiliateId,
        expiresAt: dashboard.expiresAt.toISOString(),
        createdAt: dashboard.createdAt.toISOString(),
        updatedAt: dashboard.updatedAt.toISOString(),
        tabs: dashboard.tabs.map((t) => ({
          id: t.id,
          name: t.name,
          position: t.position,
          deliveryDate: t.deliveryDate?.toISOString() ?? null,
          deliveryDateConfirmed: t.deliveryDateConfirmed,
          deliveryTime: t.deliveryTime,
          deliveryContextType: t.deliveryContextType,
          status: t.status,
        })),
      };

      logMcpRequest({
        toolName: 'get_dashboard', authLevel: auth.level, actor: auth.actor,
        params: args as object, durationMs: Date.now() - start, success: true, rowCount: 1,
      });

      return { content: [{ type: 'text' as const, text: JSON.stringify(detailEnvelope(result)) }] };
    } catch (err) {
      logMcpRequest({
        toolName: 'get_dashboard', authLevel: auth.level, actor: auth.actor,
        params: args as object, durationMs: Date.now() - start, success: false,
        errorMsg: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
}
