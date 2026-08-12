import { z } from 'zod';
import { listGrants } from '@/lib/premiere-credits/admin';
import { listEnvelope } from '../envelopes';
import { logMcpRequest } from '../logging';
import type { McpAuth } from '../auth';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Premiere credit grants and whether they were redeemed.
 *
 * Deliberately delegates to `listGrants()` — the same service the admin console
 * uses — rather than querying Prisma directly. Redemption is DERIVED, not
 * stored: it comes from the linked discount's usage history, and the invoice
 * totals (granted vs redeemed-granted vs actually-saved) are three different
 * numbers that the service already computes consistently. Re-deriving them here
 * is how the MCP answer and the admin screen would drift apart, and these
 * numbers are what Premiere gets billed on.
 *
 * `listGrants` caps at 1000 rows internally (one row per Premiere refund) and
 * applies status/redeemed/date filters itself, so this tool pages over the
 * already-filtered result rather than re-querying.
 */

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export function registerPremiereCredits(server: McpServer, auth: McpAuth) {
  server.registerTool('premiere_credits', {
    description:
      "Premiere credit grants with redemption status and invoice totals. Use for 'was this customer's credit sent', 'which credits are stuck', or 'what do we bill Premiere this month'. The date filters apply to REDEMPTION date, not when the credit was granted. Returns a summary block with the billing totals alongside the rows.",
    inputSchema: {
      status: z
        .string()
        .optional()
        .describe(
          'Grant status: PENDING, NEEDS_CONTACT, READY, HELD_FOR_APPROVAL, SENDING, SENT, SEND_FAILED, or CANCELED'
        ),
      redeemed: z
        .boolean()
        .optional()
        .describe('true = only redeemed credits, false = only unredeemed'),
      from: z.string().optional().describe('Earliest REDEMPTION date, ISO (e.g. 2026-08-01)'),
      to: z.string().optional().describe('Latest REDEMPTION date, ISO'),
      limit: z.number().optional().describe(`Max rows (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT})`),
      offset: z.number().optional().describe('Number of rows to skip (default 0)'),
    },
  }, async (args) => {
    const start = Date.now();
    try {
      const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
      const offset = args.offset ?? 0;

      // The service takes 'true'/'false' strings, not booleans.
      const { grants, summary } = await listGrants({
        status: args.status ?? null,
        redeemed: args.redeemed === undefined ? null : String(args.redeemed),
        from: args.from ?? null,
        to: args.to ?? null,
      });

      const page = grants.slice(offset, offset + limit);

      // The summary describes the whole filtered set, not this page — say so in
      // the payload so a paged read is never mistaken for the billing total.
      const envelope = {
        ...listEnvelope(page, grants.length, limit, offset),
        summary: { ...summary, scope: 'all rows matching the filters, not just this page' },
      };

      logMcpRequest({
        toolName: 'premiere_credits', authLevel: auth.level, actor: auth.actor,
        params: args as object, durationMs: Date.now() - start, success: true, rowCount: page.length,
      });

      return { content: [{ type: 'text' as const, text: JSON.stringify(envelope) }] };
    } catch (err) {
      logMcpRequest({
        toolName: 'premiere_credits', authLevel: auth.level, actor: auth.actor,
        params: args as object, durationMs: Date.now() - start, success: false,
        errorMsg: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
}
