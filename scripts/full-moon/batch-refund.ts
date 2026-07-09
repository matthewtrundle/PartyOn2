/**
 * Operator-gated BATCH REFUND for the Lake Travis Full Moon Party.
 *
 * Refunds EVERY paying PAID ticket order in full — used when the cruise is
 * postponed for not reaching the 32-guest minimum ("<32 → refund everyone").
 *
 * Usage:
 *   npx tsx scripts/full-moon/batch-refund.ts             # DRY RUN (default)
 *   npx tsx scripts/full-moon/batch-refund.ts --apply     # execute refunds + email buyers
 *   npx tsx scripts/full-moon/batch-refund.ts --apply --no-email
 *
 * Safety:
 *   - Dry-run by default; only --apply moves money.
 *   - Refuses a non-live Stripe key under --apply (this event runs on LIVE keys).
 *   - Idempotent: reuses getMaxRefundable + a deterministic idempotency key, so a
 *     re-run never double-refunds (already-refunded orders are skipped).
 *   - Skips $0 comps. Marks orders REFUNDED. Emails each buyer the roll-forward
 *     notice (unless --no-email).
 *
 * Env: source .env.local first (DATABASE_URL + STRIPE_SECRET_KEY + RESEND_API_KEY).
 *
 * NOTE: dotenv is loaded BEFORE the app modules are dynamically imported so the
 * Stripe/Prisma singletons initialize with the sourced env.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const APPLY = process.argv.includes('--apply');
const NO_EMAIL = process.argv.includes('--no-email');

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Source .env.local first.');
    process.exit(1);
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const isLiveKey = stripeKey.startsWith('sk_live_');
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY not set. Source .env.local first.');
    process.exit(1);
  }
  if (APPLY && !isLiveKey) {
    console.error(
      `Refusing --apply: STRIPE_SECRET_KEY is not a live key (starts with "${stripeKey.slice(0, 8)}…"). ` +
        'This event runs on live Stripe keys.',
    );
    process.exit(1);
  }
  if (!isLiveKey) {
    console.warn('⚠️  STRIPE_SECRET_KEY is not a live key — dry-run figures reflect TEST-mode Stripe data.\n');
  }

  const tag = APPLY ? '[APPLY]' : '[DRY RUN]';

  const { getFullMoonRoster } = await import('../../src/lib/full-moon/roster');
  const { refundFullMoonOrder } = await import('../../src/lib/full-moon/refund');
  const { prisma } = await import('../../src/lib/database/client');

  try {
    const roster = await getFullMoonRoster();
    if (!roster.productFound) {
      console.error('Ticket product not found — nothing to refund.');
      process.exit(1);
    }

    const paying = roster.orders.filter((o) => !o.isComp);
    console.log(`${tag} Full Moon Party — batch refund`);
    console.log(`  Tickets sold (incl comps): ${roster.totals.ticketsSold}`);
    console.log(
      `  Paying orders: ${paying.length} · Comps skipped: ${roster.totals.compOrders} · Collected: ${money(roster.totals.collected)}`,
    );
    console.log(`  Email buyers: ${APPLY && !NO_EMAIL ? 'yes' : 'no'}\n`);

    const counts: Record<string, number> = {};
    let plannedOrMoved = 0;

    for (const o of paying) {
      const outcome = await refundFullMoonOrder(o.orderId, {
        apply: APPLY,
        sendEmail: APPLY && !NO_EMAIL,
      });
      counts[outcome.status] = (counts[outcome.status] ?? 0) + 1;
      if (outcome.status === 'refunded' || outcome.status === 'would-refund') {
        plannedOrMoved += outcome.amount;
      }

      const parts = [
        `  ${tag} #${outcome.orderNumber} ${outcome.name} <${outcome.email}> — ${outcome.status}`,
      ];
      if (outcome.amount) parts.push(money(outcome.amount));
      if (outcome.stripeRefundId) parts.push(`(${outcome.stripeRefundId})`);
      if (outcome.emailSent) parts.push('✉');
      if (outcome.error) parts.push(`ERROR: ${outcome.error}`);
      console.log(parts.join(' '));
    }

    console.log('\nSummary:');
    for (const [status, n] of Object.entries(counts).sort()) {
      console.log(`  ${status}: ${n}`);
    }
    console.log(`\n${APPLY ? 'Total refunded' : 'Total that WOULD be refunded'}: ${money(plannedOrMoved)}`);

    const errors = counts['error'] ?? 0;
    if (!APPLY) {
      console.log('\nDRY RUN — re-run with --apply to move money. This refunds EVERY paying ticket in full.');
    } else if (errors > 0) {
      console.log(`\n⚠️  ${errors} order(s) errored — re-run --apply to retry (idempotent; already-refunded orders are skipped).`);
    } else {
      console.log('\n✅ Done.');
    }

    process.exitCode = errors > 0 ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
