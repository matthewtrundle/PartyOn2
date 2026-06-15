/**
 * Shopify order archive service (Finance Director Phase 5A).
 *
 * Pulls a thin financial snapshot of every Shopify order — paginated via the
 * Admin GraphQL API — into the shopify_order_archive table so the monthly
 * rollup builder (Phase 5C) has access to the full history of the business.
 *
 * Two entry points:
 *   - syncAllOrders()          — full backfill from inception, no upper bound
 *   - syncOrdersSince(date)    — incremental, used by the daily safety-net cron
 *
 * Both share the same upsert path so they stay idempotent. Rate-limited via
 * the existing paginatedAdminQuery 500 ms inter-page sleep.
 */

import { prisma } from '@/lib/database/client';
import { adminGraphQL } from '@/lib/shopify/sync/admin-client';

const PAGE_SIZE = 50;
const INTER_PAGE_SLEEP_MS = 500;

interface ShopifyMoney {
  shopMoney: { amount: string; currencyCode: string };
}

interface ShopifyAdminOrderNode {
  id: string;
  name: string | null;
  createdAt: string;
  processedAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  currentTotalPriceSet: ShopifyMoney;
  currentSubtotalPriceSet: ShopifyMoney;
  currentTotalTaxSet: ShopifyMoney;
  totalShippingPriceSet: ShopifyMoney;
  currentTotalDiscountsSet: ShopifyMoney;
  totalRefundedSet: ShopifyMoney;
  sourceIdentifier: string | null;
  sourceName: string | null;
  tags: string[];
  note: string | null;
  lineItems: {
    edges: {
      node: {
        sku: string | null;
        title: string | null;
        quantity: number;
        product: { id: string | null } | null;
        variant: { id: string | null } | null;
        originalUnitPriceSet: ShopifyMoney;
      };
    }[];
  };
}

interface OrdersPageResponse {
  orders: {
    edges: { node: ShopifyAdminOrderNode }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const ORDERS_QUERY = `
  query archiveOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: PROCESSED_AT) {
      edges {
        node {
          id
          name
          createdAt
          processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          currentSubtotalPriceSet { shopMoney { amount currencyCode } }
          currentTotalTaxSet { shopMoney { amount currencyCode } }
          totalShippingPriceSet { shopMoney { amount currencyCode } }
          currentTotalDiscountsSet { shopMoney { amount currencyCode } }
          totalRefundedSet { shopMoney { amount currencyCode } }
          sourceIdentifier
          sourceName
          tags
          note
          lineItems(first: 100) {
            edges {
              node {
                sku
                title
                quantity
                product { id }
                variant { id }
                originalUnitPriceSet { shopMoney { amount currencyCode } }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function dollarsToCents(amount: string | null | undefined): number {
  if (!amount) return 0;
  const f = Number.parseFloat(amount);
  if (!Number.isFinite(f)) return 0;
  return Math.round(f * 100);
}

interface ArchiveLineItem {
  sku: string | null;
  title: string | null;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  unitPriceCents: number;
}

function flattenLineItems(node: ShopifyAdminOrderNode): ArchiveLineItem[] {
  return node.lineItems.edges.map((e) => ({
    sku: e.node.sku,
    title: e.node.title,
    productId: e.node.product?.id ?? null,
    variantId: e.node.variant?.id ?? null,
    quantity: e.node.quantity,
    unitPriceCents: dollarsToCents(e.node.originalUnitPriceSet?.shopMoney.amount),
  }));
}

async function upsertOrder(node: ShopifyAdminOrderNode): Promise<void> {
  const processedAtIso = node.processedAt ?? node.createdAt;
  const currency = node.currentTotalPriceSet.shopMoney.currencyCode || 'USD';
  const data = {
    shopifyOrderId: node.id,
    shopifyOrderName: node.name,
    processedAt: new Date(processedAtIso),
    shopifyCreatedAt: new Date(node.createdAt),
    totalPriceCents: dollarsToCents(node.currentTotalPriceSet.shopMoney.amount),
    subtotalPriceCents: dollarsToCents(node.currentSubtotalPriceSet.shopMoney.amount),
    totalTaxCents: dollarsToCents(node.currentTotalTaxSet?.shopMoney.amount),
    totalShippingCents: dollarsToCents(node.totalShippingPriceSet?.shopMoney.amount),
    totalDiscountsCents: dollarsToCents(node.currentTotalDiscountsSet?.shopMoney.amount),
    totalRefundsCents: dollarsToCents(node.totalRefundedSet?.shopMoney.amount),
    currency,
    financialStatus: node.displayFinancialStatus,
    fulfillmentStatus: node.displayFulfillmentStatus,
    // Customer object + landingPage/referringSite are gated behind the
    // Customer PII scope, which this store's Shopify plan does not grant
    // (premier-concierge is below the Shopify/Advanced/Plus tier). Left null
    // here; Phase 5C sources top-customer attribution from the Order table
    // (Stripe-populated) for the recent period, and classifies segments from
    // tags / source_name / group order name instead.
    customerEmail: null,
    shopifyCustomerId: null,
    landingPage: null,
    referringSite: null,
    sourceIdentifier: node.sourceIdentifier,
    sourceName: node.sourceName,
    lineItems: flattenLineItems(node) as unknown as object,
    tags: node.tags,
    note: node.note,
    syncedAt: new Date(),
  };

  await prisma.shopifyOrderArchive.upsert({
    where: { shopifyOrderId: node.id },
    create: data,
    update: data,
  });
}

export interface ArchiveSyncReport {
  pagesFetched: number;
  ordersUpserted: number;
  lastProcessedAt: string | null;
  durationMs: number;
  errors: string[];
}

interface RunPaginatedOptions {
  /** Optional Shopify search query (e.g. "updated_at:>=2026-06-01"). */
  query?: string;
  /** Hard cap on pages — defensive guard for runaway loops. */
  maxPages?: number;
}

async function runPaginatedSync(
  options: RunPaginatedOptions
): Promise<ArchiveSyncReport> {
  const startedAt = Date.now();
  const report: ArchiveSyncReport = {
    pagesFetched: 0,
    ordersUpserted: 0,
    lastProcessedAt: null,
    durationMs: 0,
    errors: [],
  };

  const maxPages = options.maxPages ?? 10_000;
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage && report.pagesFetched < maxPages) {
    let data: OrdersPageResponse;
    try {
      data = await adminGraphQL<OrdersPageResponse>(ORDERS_QUERY, {
        first: PAGE_SIZE,
        after: cursor,
        query: options.query ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push(`page ${report.pagesFetched + 1}: ${msg}`);
      break;
    }

    report.pagesFetched += 1;
    const nodes = data.orders.edges.map((e) => e.node);
    for (const node of nodes) {
      try {
        await upsertOrder(node);
        report.ordersUpserted += 1;
        const processedAt = node.processedAt ?? node.createdAt;
        if (processedAt && (!report.lastProcessedAt || processedAt > report.lastProcessedAt)) {
          report.lastProcessedAt = processedAt;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report.errors.push(`order ${node.id}: ${msg}`);
      }
    }

    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;

    if (hasNextPage) {
      await new Promise((resolve) => setTimeout(resolve, INTER_PAGE_SLEEP_MS));
    }
  }

  report.durationMs = Date.now() - startedAt;
  return report;
}

/**
 * Pull every Shopify order from inception. Idempotent — re-running just
 * refreshes financial totals + refund totals on existing rows.
 *
 * `maxPages` is a defensive cap for partial backfills + smoke tests; omit it
 * for a real full backfill.
 */
export async function syncAllOrders(
  options: { maxPages?: number } = {}
): Promise<ArchiveSyncReport> {
  const report = await runPaginatedSync({ maxPages: options.maxPages });
  await updateSyncState({
    fullBackfill: true,
    cursorUpdatedAt: report.lastProcessedAt,
    ordersUpserted: report.ordersUpserted,
    error: report.errors[0] ?? null,
  });
  return report;
}

/**
 * Pull orders updated since a given timestamp. Used by the daily safety-net
 * cron to backfill anything created or refunded after the last sync.
 */
export async function syncOrdersSince(since: Date): Promise<ArchiveSyncReport> {
  const iso = since.toISOString();
  const report = await runPaginatedSync({
    query: `updated_at:>=${iso}`,
  });
  await updateSyncState({
    fullBackfill: false,
    cursorUpdatedAt: report.lastProcessedAt,
    ordersUpserted: report.ordersUpserted,
    error: report.errors[0] ?? null,
  });
  return report;
}

interface UpdateStateInput {
  fullBackfill: boolean;
  cursorUpdatedAt: string | null;
  ordersUpserted: number;
  error: string | null;
}

async function updateSyncState(input: UpdateStateInput): Promise<void> {
  const now = new Date();
  const existing = await prisma.shopifyArchiveSyncState.findUnique({
    where: { id: 'singleton' },
  });
  const totalOrdersArchived = (existing?.totalOrdersArchived ?? 0) + input.ordersUpserted;
  const data = {
    lastFullBackfillAt: input.fullBackfill ? now : existing?.lastFullBackfillAt ?? null,
    lastIncrementalAt: input.fullBackfill ? existing?.lastIncrementalAt ?? null : now,
    lastCursorUpdatedAt: input.cursorUpdatedAt ? new Date(input.cursorUpdatedAt) : existing?.lastCursorUpdatedAt ?? null,
    lastError: input.error,
    totalOrdersArchived,
  };
  await prisma.shopifyArchiveSyncState.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data,
  });
}

export async function getSyncState() {
  return prisma.shopifyArchiveSyncState.findUnique({ where: { id: 'singleton' } });
}
