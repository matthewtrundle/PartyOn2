import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAuth } from './auth';
import { registerListOrders } from './tools/list-orders';
import { registerGetOrder } from './tools/get-order';
import { registerGetOrderSummary } from './tools/get-order-summary';
import { registerSearchOrders } from './tools/search-orders';
import { registerGetDashboard } from './tools/get-dashboard';
import { registerListDashboards } from './tools/list-dashboards';
import { registerBoatSchedule } from './tools/boat-schedule';
import { registerPremiereCredits } from './tools/premiere-credits';

export function createMcpServer(auth: McpAuth): McpServer {
  const server = new McpServer({
    name: 'party-on-delivery',
    version: '1.1.0',
  });

  // Orders
  registerListOrders(server, auth);
  registerGetOrder(server, auth);
  registerGetOrderSummary(server, auth);
  registerSearchOrders(server, auth);

  // Group-order dashboards, the boat manifest, and Premiere credits.
  // All read-only, like the order tools above — nothing here mutates, so no
  // tool gates on auth.level (it selects the rate-limit tier and labels the
  // log line). A tool that ever writes must add its own readwrite check;
  // there is no precedent for one here yet.
  registerGetDashboard(server, auth);
  registerListDashboards(server, auth);
  registerBoatSchedule(server, auth);
  registerPremiereCredits(server, auth);

  return server;
}
