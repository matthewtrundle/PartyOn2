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
 *   - DELETE: an orphan row (stripeRefundId=NULL AND reason='Stripe refund') on
 *     an order whose every live Stripe refund is already represented by a
 *     stamped, Stripe-verified row → the webhook duplicate. Deleted regardless
 *     of its amount, so this also removes the pre-#171 "cumulative total" orphan
 *     the old webhook wrote from charge.amount_refunded (e.g. order #197's
 *     $534.83 orphan = the running total of two real refunds $238.93 + $295.90).
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
import { writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

// The live-key guard, the Prisma/Stripe clients, and main() run ONLY when this
// file is executed directly as a script (see the entrypoint at the bottom). When
// it is imported instead — e.g. a unit test exercising the pure planOrder() —
// nothing here touches the network, the DB, or process.exit, and these stay
// undefined. Keeping the pure planner import-safe is what lets it be tested.
let prisma;
let stripe;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const OUT_JSON = args.includes('--json');
const ONLY_ORDER = num(flag('--order'), 0);
const CENT_TOLERANCE = 1; // 1 cent of slack on total comparisons

// The instant the charge.refunded webhook became idempotent (PR #171, merged
// 2026-06-27 21:13 UTC; last observed pre-fix duplicate was 2026-06-26 22:32
// UTC). We use the next-day boundary as a safe margin past the deploy. This is
// the hard fence for amount-blind deletion: a null-id 'Stripe refund' row can
// only be a webhook duplicate if it was written BEFORE this instant. After it,
// the webhook cannot create such a row, so a matching row is treated as a
// (possibly legitimate) route create/stamp-race artifact and left for manual
// review rather than deleted. Exported so tests can pin both sides of the fence.
export const WEBHOOK_IDEMPOTENT_SINCE = new Date('2026-06-28T00:00:00Z');

function flag(name) {
  const a = args.find((x) => x.startsWith(`${name}=`));
  return a ? a.split('=').slice(1).join('=') : undefined;
}
function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
export function cents(decimalLike) {
  return Math.round(Number(decimalLike) * 100);
}
export function usd(c) {
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
export function planOrder(order, dbRows, stripeRefunds, amendmentRefundIds) {
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

  // Pass 2 — DELETE: leftover orphan duplicates. A webhook orphan carries the
  // literal reason 'Stripe refund' and a null id. No admin/route path writes that
  // exact reason (verified across src — only handleChargeRefunded does, and in
  // current code only WITH a stamped id), so it reads as a webhook artifact.
  //
  // But that reason is a naming CONVENTION, not a schema guarantee: the admin
  // refund route accepts free-text reasons and creates its Refund row, THEN stamps
  // the Stripe id in a separate (non-atomic) step. A crash in that window could
  // leave a *legitimate* null-id 'Stripe refund' row — indistinguishable by shape
  // from a webhook dupe. That failure can only occur AFTER the webhook became
  // idempotent (#171); every genuine webhook dupe was written before it. So the
  // amount-blind delete is fenced to rows that PREDATE the cutover
  // (WEBHOOK_IDEMPOTENT_SINCE). A same-shaped row created after the cutover is
  // flagged for manual review, never swept up.
  //
  // A qualifying pre-cutover orphan is deleted when the order's REAL refunds are
  // already fully represented (every live Stripe refund maps to a stamped/merged
  // row), regardless of the orphan's amount — this clears both the common
  // same-amount dupe AND the pre-#171 "cumulative total" orphan the old webhook
  // derived from charge.amount_refunded (order #197's $534.83 = two real refunds
  // $238.93 + $295.90, which matches no single Stripe refund amount).
  //
  // If a live Stripe refund still lacks a stamped row (a genuinely missing
  // record), we do NOT guess — orphans are left as-is and the post-condition
  // below fails the order into NEEDS-MANUAL.
  const everyStripeRefundCovered =
    stripeRefunds.length > 0 && stripeRefunds.every((r) => stampedIds.has(r.id));

  for (const o of pool) {
    if (o.claimed) continue;
    const amt = cents(o.amount);
    const isWebhookOrphan = o.reason === 'Stripe refund';
    const referencedByAmendment = amendmentRefundIds.has(o.id);
    const predatesCutover = new Date(o.createdAt) < WEBHOOK_IDEMPOTENT_SINCE;

    if (referencedByAmendment) {
      notes.push(`orphan ${o.id.slice(0, 8)} (${usd(amt)}) is referenced by an OrderAmendment — left as-is`);
    } else if (isWebhookOrphan && everyStripeRefundCovered && predatesCutover) {
      deletes.push({ rowId: o.id, amountCents: amt, reason: o.reason });
    } else if (isWebhookOrphan && everyStripeRefundCovered && !predatesCutover) {
      notes.push(
        `orphan ${o.id.slice(0, 8)} (${usd(amt)}) created ${new Date(o.createdAt).toISOString()}, ` +
          `AFTER the #171 idempotency cutover — cannot be a webhook dupe by construction; manual review`
      );
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
  let applyFailed = 0;

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
      try {
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
        // Re-label financialStatus from the reconciled rows. This re-reads
        // aggregates and runs OUTSIDE the transaction above; a failure here does
        // not undo the committed row changes, so we record it and keep going
        // (re-running the script is idempotent and will relabel).
        try {
          await recomputeFinancialStatus(order.id);
        } catch (statusErr) {
          entry.notes.push('applied; financialStatus relabel failed (safe to re-run): ' + (statusErr?.message || String(statusErr)));
          log('  ⚠ applied; status relabel failed (re-run to fix)');
        }
        applied++;
        log('  ✓ applied');
      } catch (applyErr) {
        // The transaction rolled back — this order's rows are untouched. Record
        // the failure and continue so one bad order cannot truncate the batch.
        entry.status = 'apply-failed';
        entry.notes.push('APPLY failed (transaction rolled back, rows untouched): ' + (applyErr?.message || String(applyErr)));
        applyFailed++;
        log('  ✗ apply FAILED (rolled back): ' + (applyErr?.message || String(applyErr)));
      }
    }

    report.push(entry);
  }

  log('\n=== Summary ===');
  log(`Orders inspected:   ${orderIds.length}`);
  log(`Rows to MERGE:      ${totalMerges}`);
  log(`Rows to DELETE:     ${totalDeletes}`);
  log(`Needs manual review:${needsManual}`);
  if (APPLY) {
    log(`Orders applied:     ${applied}`);
    if (applyFailed) log(`Apply FAILURES:     ${applyFailed} (rows untouched — see notes above; safe to re-run)`);
    // Durable audit trail — an --apply deletes financial rows and is not
    // reversible from inside the app, so always persist exactly what changed,
    // independent of the --json flag.
    const auditPath = path.join(os.tmpdir(), `reconcile-refunds-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    try {
      writeFileSync(
        auditPath,
        JSON.stringify(
          {
            appliedAt: new Date().toISOString(),
            summary: { orders: orderIds.length, merges: totalMerges, deletes: totalDeletes, applied, applyFailed, needsManual },
            report,
          },
          null,
          2
        )
      );
      log(`Audit trail written: ${auditPath}`);
    } catch (auditErr) {
      log(`WARN: failed to write audit file: ${auditErr?.message || String(auditErr)}`);
    }
  } else {
    log('\n(DRY RUN — re-run with --apply to write these changes.)');
  }

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

// ---- CLI entrypoint — runs ONLY on direct execution, never on import --------
// (`import`ing this file, e.g. from a unit test, must not hit the network or exit
// the process; the live-key guard and client creation therefore live here.)
// `typeof pathToFileURL === 'function'` also short-circuits under the vitest
// jsdom environment, where `url` resolves to a browser shim without it — so the
// import test never enters this block. pathToFileURL (not string interpolation)
// is required because the repo path contains spaces, which must be %20-encoded
// to match import.meta.url.
if (
  typeof pathToFileURL === 'function' &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!STRIPE_KEY) {
    console.error('ERROR: STRIPE_SECRET_KEY is not set. Run: set -a && source .env.local && set +a');
    process.exit(1);
  }
  if (STRIPE_KEY.startsWith('sk_test_') || STRIPE_KEY.startsWith('rk_test_')) {
    console.error('ERROR: STRIPE_SECRET_KEY is a TEST key. This reconciles LIVE refund data — refusing to run.');
    process.exit(1);
  }
  prisma = new PrismaClient();
  stripe = new Stripe(STRIPE_KEY);
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
