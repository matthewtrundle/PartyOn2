/**
 * One-shot Shopify order archive backfill (Finance Director Phase 5A).
 *
 * Walks the Shopify Admin GraphQL `orders` connection from inception to today
 * and upserts every order into the shopify_order_archive table. Idempotent —
 * safe to re-run.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/finance/backfill-shopify-archive.ts [--max-pages=N]
 *
 * Per saved memory `reference_worktree_env_and_github_token.md`, scripts/ is
 * outside the `@/` path alias — but `tsx` honours the root tsconfig paths
 * when traversing into src/, so re-using the service module here works.
 */

import { syncAllOrders } from '../../src/lib/finance/shopify-archive-service';
import { prisma } from '../../src/lib/database/client';

const argv = process.argv.slice(2);
const maxPagesArg = argv.find((a) => a.startsWith('--max-pages='));
const maxPages = maxPagesArg ? Number.parseInt(maxPagesArg.split('=')[1] ?? '', 10) : undefined;

async function main(): Promise<void> {
  console.log(
    `[backfill-shopify-archive] starting full backfill${
      maxPages ? ` (max ${maxPages} pages)` : ''
    }...`
  );
  const started = Date.now();
  const report = await syncAllOrders({ maxPages });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log('[backfill-shopify-archive] done in', seconds, 'seconds');
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('[backfill-shopify-archive] FAILED:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
