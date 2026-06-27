/**
 * Reconcile duplicate Refund rows against Stripe (authoritative).
 *
 * Bug being repaired (see src/lib/stripe/webhooks.ts handleChargeRefunded):
 * the charge.refunded webhook used to UNCONDITIONALLY create a Refund row, on
 * top of the row the admin cancel/refund route had already written for the same
 * Stripe refund. Result: every admin-initiated refund left TWO rows for ONE real
 * Stripe refund —
 *     row A: stripeRefundId set, processedBy='admin'  (the route's row, keep)
 *     row B: stripeRefundId=NULL, reason='Stripe refund', processedBy=NULL (dupe)
 * which double-counts refund totals in the DB and can drive getMaxRefundable
 * negative.
 *
 * This script reconciles each order's DB Refund rows against the refunds Stripe
 * ACTUALLY has for that order's PaymentIntent, then proposes the minimal change
 * that makes the DB match Stripe exactly:
 *
 *   - MERGE: a real Stripe refund that has NO stamped row but DOES have a
 *     matching-amount orphan → stamp the orphan with the Stripe refund id
 *     (claim it) rather than deleting + re-creating.
 *   - DELETE: an orphan row (stripeRefundId=NULL AND reason='Stripe refund')
 *     whose amount is already covered by a stamped, Stripe-verified row → the
 *     webhook duplicate. Deleted.
 *
 * SAFETY — it will only APPLY changes to an order when, AFTER the planned
 * changes, the order's remaining DB refund rows map 1:1 onto Stripe's live
 * refunds (same ids, same total within a cent). Any order that does not reconcile
 * cleanly (stamped id missing from Stripe, DB total != Stripe total, orphan an
 * amendment points to, manual DB-only refund with no Stripe record, etc.) is left
 * UNTOUCHED and reported as NEEDS-MANUAL. It never deletes a row by reason alone
 * and never touches a row an OrderAmendment.refundId points at.
 *
 * Dry-run is the DEFAULT. Nothing is written without --apply.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/ops/reconcile-duplicate-refunds.mjs                 # dry run, all orders
 *   node scripts/ops/reconcile-duplicate-refunds.mjs --order=365     # dry run, one order #
 *   node scripts/ops/reconcile-duplicate-refunds.mjs --json          # machine-readable plan
 *   node scripts/ops/reconcile-duplicate-refunds.mjs --apply         # WRITE the reconciliation
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

// Hard guard: without a LIVE Stripe key, refunds.list() silently returns empty
// for every order and the script would "reconcile" against nothing — flagging
// every order needs-manual while looking like it ran. Fail loudly instead.
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  console.error('ERROR: STRIPE_SECRET_KEY is not set. Run: set -a && source .env.local && set +a');
  process.exit(1);
}
if (STRIPE_KEY.startsWith('sk_test_') || STRIPE_KEY.startsWith('rk_test_')) {
  console.error('ERROR: STRIPE_SECRET_KEY is a TEST key. This reconciles LIVE refund data — refusing to run.');
  process.exit(1);
}

const prisma = new PrismaClient();
const stripe = new Stripe(STRIPE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const OUT_JSON = args.includes('--json');
const ONLY_ORDER = num(flag('--order'), 0);
const CENT_TOLERANCE = 1; // 1 cent of slack on total comparisons

function flag(name) {
  const a = args.find((x) => x.startsWith(`${name}=`));
  return a ? a.split('=').slice(1).join('=') : undefined;
}
function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function cents(decimalLike) {
  return Math.round(Number(decimalLike) * 100);
}
function usd(c) {
  return `$${(c / 100).toFixed(2)}`;
}
function log(...a) {
  if (OUT_JSON) console.error(...a);
  else console.log(...a);
}

/** Live (money-moving) refunds Stripe has for a PaymentIntent. */
async function liveStripeRefunds(paymentIntentId) {
  const out = [];
  for await (const r of stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })) {
    if (r.status === 'failed' || r.status === 'canceled') continue;
    out.push({ id: r.id, amountCents: r.amount, status: r.status });
  }
  return out;
}

/**
 * Plan the reconciliation for one order. Pure: returns the plan, writes nothing.
 * plan.ok === true means the post-change DB state matches Stripe exactly and is
 * safe to apply.
 */
function planOrder(order, dbRows, stripeRefunds, amendmentRefundIds) {
  const merges = []; // { rowId, stripeRefundId, amountCents }
  const deletes = []; // { rowId, amountCents, reason }
  const notes = [];

  const stripeById = new Map(stripeRefunds.map((r) => [r.id, r]));
  const stripeTotalCents = stripeRefunds.reduce((s, r) => s + r.amountCents, 0);

  const stamped = dbRows.filter((r) => r.stripeRefundId);
  const orphans = dbRows.filter((r) => !r.stripeRefundId);

  // Anomaly: a stamped row whose id Stripe doesn't recognize. Don't touch the order.
  const ghostStamped = stamped.filter((r) => !stripeById.has(r.stripeRefundId));
  if (ghostStamped.length > 0) {
    notes.push(
      `stamped row(s) reference refunds Stripe does not list: ${ghostStamped
        .map((r) => `${r.id.slice(0, 8)}→${r.stripeRefundId}`)
        .join(', ')}`
    );
    return { ok: false, merges, deletes, notes, stripeTotalCents };
  }

  // Which Stripe refunds already have a stamped row?
  const stampedIds = new Set(stamped.map((r) => r.stripeRefundId));

  // Working pool of orphans we can still claim/delete.
  const pool = orphans.map((r) => ({ ...r, claimed: false }));

  // Pass 1 — MERGE: a real Stripe refund with no stamped row but a matching-amount orphan.
  for (const r of stripeRefunds) {
    if (stampedIds.has(r.id)) continue;
    const cand = pool.find((o) => !o.claimed && cents(o.amount) === r.amountCents);
    if (cand) {
      cand.claimed = true;
      stampedIds.add(r.id);
      merges.push({ rowId: cand.id, stripeRefundId: r.id, amountCents: r.amountCents });
    } else {
      notes.push(`Stripe refund ${r.id} (${usd(r.amountCents)}) has no DB row to claim — missing record`);
    }
  }

  // Pass 2 — DELETE: leftover orphan duplicates. Strict signature: webhook-created
  // ('Stripe refund'), null id, amount already covered by a stamped real refund.
  const stampedAmountCounts = new Map(); // amountCents -> count of stamped rows of that amount
  for (const r of stamped) {
    const k = cents(r.amount);
    stampedAmountCounts.set(k, (stampedAmountCounts.get(k) || 0) + 1);
  }
  for (const m of merges) {
    stampedAmountCounts.set(m.amountCents, (stampedAmountCounts.get(m.amountCents) || 0) + 1);
  }

  for (const o of pool) {
    if (o.claimed) continue;
    const amt = cents(o.amount);
    const isWebhookOrphan = o.reason === 'Stripe refund';
    const coveredByStamped = (stampedAmountCounts.get(amt) || 0) > 0;
    const referencedByAmendment = amendmentRefundIds.has(o.id);

    if (isWebhookOrphan && coveredByStamped && !referencedByAmendment) {
      deletes.push({ rowId: o.id, amountCents: amt, reason: o.reason });
    } else if (referencedByAmendment) {
      notes.push(`orphan ${o.id.slice(0, 8)} (${usd(amt)}) is referenced by an OrderAmendment — left as-is`);
    } else {
      notes.push(`orphan ${o.id.slice(0, 8)} (${usd(amt)}, reason="${o.reason}") not a safe webhook dupe — left as-is`);
    }
  }

  // Post-condition: simulate the resulting rows and require an exact match to Stripe.
  const deleteIds = new Set(deletes.map((d) => d.rowId));
  const resultRows = dbRows.filter((r) => !deleteIds.has(r.id));
  const resultStampedIds = new Set(
    resultRows.map((r) => {
      const merged = merges.find((m) => m.rowId === r.id);
      return merged ? merged.stripeRefundId : r.stripeRefundId;
    })
  );
  resultStampedIds.delete(null);
  resultStampedIds.delete(undefined);

  const resultTotalCents = resultRows.reduce((s, r) => {
    const merged = merges.find((m) => m.rowId === r.id);
    return s + (merged ? merged.amountCents : cents(r.amount));
  }, 0);

  const everyStripeRefundHasRow = stripeRefunds.every((r) => resultStampedIds.has(r.id));
  const noExtraRows = resultRows.length === stripeRefunds.length;
  const totalsMatch = Math.abs(resultTotalCents - stripeTotalCents) <= CENT_TOLERANCE;
  const ok = everyStripeRefundHasRow && noExtraRows && totalsMatch && (merges.length > 0 || deletes.length > 0);

  if (!ok && (merges.length > 0 || deletes.length > 0)) {
    notes.push(
      `post-change state would NOT match Stripe (rows ${resultRows.length} vs stripe ${stripeRefunds.length}, ` +
        `total ${usd(resultTotalCents)} vs ${usd(stripeTotalCents)}) — not applying`
    );
  }

  return { ok, merges, deletes, notes, stripeTotalCents };
}

async function main() {
  log('=== Reconcile duplicate Refund rows against Stripe ===');
  log('Mode:', APPLY ? 'APPLY (will write)' : 'DRY RUN (no writes)');
  if (ONLY_ORDER) log('Scope: order #' + ONLY_ORDER);

  // Candidate orders: any order that has at least one orphan 'Stripe refund' row.
  // (We still verify EVERY such order against Stripe before touching anything.)
  const orphanRows = await prisma.refund.findMany({
    where: { stripeRefundId: null, reason: 'Stripe refund' },
    select: { orderId: true },
  });
  let orderIds = [...new Set(orphanRows.map((r) => r.orderId))];

  if (ONLY_ORDER) {
    const target = await prisma.order.findFirst({ where: { orderNumber: ONLY_ORDER }, select: { id: true } });
    orderIds = target ? orderIds.filter((id) => id === target.id) : [];
    if (!target) log(`WARN: order #${ONLY_ORDER} not found`);
  }

  log(`Candidate orders with webhook-orphan refund rows: ${orderIds.length}`);

  const report = [];
  let totalDeletes = 0;
  let totalMerges = 0;
  let needsManual = 0;
  let applied = 0;

  for (const orderId of orderIds) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, customerName: true, stripePaymentIntentId: true },
    });
    if (!order) continue;

    const dbRows = await prisma.refund.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, stripeRefundId: true, amount: true, reason: true, processedBy: true, createdAt: true },
    });

    const entry = {
      orderNumber: order.orderNumber,
      customer: order.customerName,
      orderId: order.id,
      dbRows: dbRows.length,
      merges: [],
      deletes: [],
      notes: [],
      status: 'skip',
    };

    if (!order.stripePaymentIntentId) {
      entry.notes.push('no stripePaymentIntentId — cannot verify against Stripe; skipped');
      entry.status = 'needs-manual';
      needsManual++;
      report.push(entry);
      continue;
    }

    let stripeRefunds;
    try {
      stripeRefunds = await liveStripeRefunds(order.stripePaymentIntentId);
    } catch (err) {
      entry.notes.push('Stripe lookup failed: ' + (err?.message || String(err)));
      entry.status = 'needs-manual';
      needsManual++;
      report.push(entry);
      continue;
    }

    // Which refund-row ids are pointed to by an OrderAmendment (never delete those).
    const amendmentRefs = await prisma.orderAmendment.findMany({
      where: { refundId: { in: dbRows.map((r) => r.id) } },
      select: { refundId: true },
    });
    const amendmentRefundIds = new Set(amendmentRefs.map((a) => a.refundId));

    const plan = planOrder(order, dbRows, stripeRefunds, amendmentRefundIds);
    entry.merges = plan.merges;
    entry.deletes = plan.deletes;
    entry.notes = plan.notes;

    const stripeTotal = usd(plan.stripeTotalCents);
    const dbTotal = usd(dbRows.reduce((s, r) => s + cents(r.amount), 0));

    log(`\n--- Order #${order.orderNumber} (${order.customerName}) ---`);
    log(`  DB rows: ${dbRows.length} (total ${dbTotal}) | Stripe live refunds: ${stripeRefunds.length} (total ${stripeTotal})`);
    for (const m of plan.merges) log(`  MERGE  row ${m.rowId.slice(0, 8)} <- stamp ${m.stripeRefundId} (${usd(m.amountCents)})`);
    for (const d of plan.deletes) log(`  DELETE row ${d.rowId.slice(0, 8)} (${usd(d.amountCents)}, "${d.reason}")`);
    for (const n of plan.notes) log(`  note: ${n}`);

    if (!plan.ok) {
      entry.status = 'needs-manual';
      needsManual++;
      report.push(entry);
      continue;
    }

    entry.status = APPLY ? 'applied' : 'planned';
    totalMerges += plan.merges.length;
    totalDeletes += plan.deletes.length;

    if (APPLY) {
      await prisma.$transaction(async (tx) => {
        for (const m of plan.merges) {
          await tx.refund.update({
            where: { id: m.rowId },
            data: { stripeRefundId: m.stripeRefundId, status: 'SUCCEEDED' },
          });
        }
        for (const d of plan.deletes) {
          await tx.refund.delete({ where: { id: d.rowId } });
        }
      });
      // Re-label financialStatus from the reconciled rows.
      await recomputeFinancialStatus(order.id);
      applied++;
      log('  ✓ applied');
    }

    report.push(entry);
  }

  log('\n=== Summary ===');
  log(`Orders inspected:   ${orderIds.length}`);
  log(`Rows to MERGE:      ${totalMerges}`);
  log(`Rows to DELETE:     ${totalDeletes}`);
  log(`Needs manual review:${needsManual}`);
  if (APPLY) log(`Orders applied:     ${applied}`);
  else log('\n(DRY RUN — re-run with --apply to write these changes.)');

  if (OUT_JSON) console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report }, null, 2));
}

/**
 * Mirror of recomputeOrderFinancialStatus (src/lib/inventory/services/order-service.ts)
 * — scripts can't import from the @/ alias. Re-derives REFUNDED / PARTIALLY_REFUNDED
 * from the order's remaining refund rows vs. the Stripe-captured amount.
 */
async function recomputeFinancialStatus(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const agg = await prisma.refund.aggregate({ where: { orderId }, _sum: { amount: true } });
  const totalRefunded = Number(agg._sum.amount || 0);

  let originallyCharged = Number(order.total);
  if (order.stripePaymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      originallyCharged = pi.amount_received / 100;
    } catch {
      // keep order.total fallback
    }
  }

  if (totalRefunded >= originallyCharged - 0.005) {
    await prisma.order.update({ where: { id: orderId }, data: { financialStatus: 'REFUNDED' } });
  } else if (totalRefunded > 0) {
    await prisma.order.update({ where: { id: orderId }, data: { financialStatus: 'PARTIALLY_REFUNDED' } });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
