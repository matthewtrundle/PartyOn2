/**
 * READ-ONLY audit: find orders whose OrderItems diverge from what Stripe actually charged.
 *
 * The fulfillment Order's items used to be rebuilt from a re-read of the cart/drafts at webhook
 * time, independently of the frozen Stripe charge. Items added after checkout shipped FREE
 * (undercharge); items removed stayed BILLED but weren't delivered (overcharge). This script
 * diffs each order's OrderItems against the Stripe session's charged PRODUCT line items,
 * bidirectionally, net of refunds.
 *
 * It NEVER writes to the database or to Stripe — it only reports. Remediation (re-bill invoices,
 * refunds, last-resort charges) is operator-gated; see docs/charge-mismatch-remediation.md.
 *
 * Detection rules:
 *   - Match OrderItem <-> charged line by productId+variantId, then productId, then title.
 *   - UNDERCHARGE = OrderItem with price > 0 that has NO matching charged line (delivered, unbilled).
 *   - OVERCHARGE  = charged product line with amount > 0 that has NO matching OrderItem
 *                   (billed, undelivered), NET of latest_charge.amount_refunded.
 *   - Price-0 OrderItems (free auto-adds / fully promo-covered) and $0 charged lines are
 *     INTENTIONAL and excluded. A line merely discounted by a coupon is still present at its
 *     productId, so it is not flagged.
 *   - Orders with a PAID OrderAmendment are bucketed as AMENDED-REVIEW (amendment items are
 *     charged on a separate PI, so the original-session diff can't be trusted automatically).
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/ops/audit-order-charge-mismatches.mjs                 # human summary
 *   node scripts/ops/audit-order-charge-mismatches.mjs --csv > out.csv # CSV for triage
 *   node scripts/ops/audit-order-charge-mismatches.mjs --json          # machine-readable
 *   node scripts/ops/audit-order-charge-mismatches.mjs --since=2026-02-01 --writeoff-below=10
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const args = process.argv.slice(2);
const OUT_CSV = args.includes('--csv');
const OUT_JSON = args.includes('--json');
const SINCE = flag('--since');
const WRITEOFF_BELOW = num(flag('--writeoff-below'), 0);
const LIMIT = num(flag('--limit'), 0);

function flag(name) {
  const a = args.find((x) => x.startsWith(`${name}=`));
  return a ? a.split('=').slice(1).join('=') : undefined;
}
function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function usd(cents) {
  return (cents / 100).toFixed(2);
}
function log(...a) {
  // Keep stdout clean for --csv/--json; progress + summary go to stderr.
  if (OUT_CSV || OUT_JSON) console.error(...a);
  else console.log(...a);
}

/** The PRODUCT lines Stripe actually charged on a session (tax/tip/delivery excluded). */
async function chargedProductLines(sessionId) {
  const res = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 100,
    expand: ['data.price.product'],
  });
  const out = [];
  for (const li of res.data) {
    const product = li.price && typeof li.price.product === 'object' ? li.price.product : null;
    const md = (product && product.metadata) || {};
    // Product lines carry productId metadata; tax/tip/delivery lines do not -> excluded.
    if (!md.productId) continue;
    out.push({
      productId: md.productId,
      variantId: md.variantId || null,
      title: li.description || (product && product.name) || '(unknown)',
      amountTotalCents: li.amount_total ?? 0, // post-discount — what the customer actually paid
      quantity: li.quantity ?? 1,
    });
  }
  return out;
}

/** Total refunded on the order's payment (so already-corrected overcharges drop out). */
async function refundedCents(paymentIntentId) {
  if (!paymentIntentId) return 0;
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    const charge = pi.latest_charge;
    if (charge && typeof charge === 'object') return charge.amount_refunded || 0;
  } catch {
    /* ignore — reported as 0 refunded */
  }
  return 0;
}

/** Whether a reusable saved card exists (last-resort charge is only possible if so). */
async function hasReusableCard(stripeCustomerId) {
  if (!stripeCustomerId) return false;
  try {
    const pms = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 1 });
    return pms.data.length > 0;
  } catch {
    return false;
  }
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const where = { stripeCheckoutSessionId: { not: null } };
  if (SINCE) where.createdAt = { gte: new Date(SINCE) };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      amendments: { select: { resolution: true } },
      customer: { select: { stripeCustomerId: true } },
    },
    orderBy: { orderNumber: 'asc' },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  log(`=== Order <-> Stripe charge mismatch audit (READ-ONLY) ===`);
  log(`Scanning ${orders.length} orders with a Stripe session${SINCE ? ` since ${SINCE}` : ''}...`);

  const rows = [];
  const skipped = [];
  let scanned = 0;

  for (const order of orders) {
    scanned++;
    if (scanned % 25 === 0) log(`  ...${scanned}/${orders.length}`);

    let charged;
    try {
      charged = await chargedProductLines(order.stripeCheckoutSessionId);
    } catch (e) {
      // Legacy orders reference an old Stripe account -> resource_missing. Skip.
      skipped.push({ orderNumber: order.orderNumber, reason: e.message });
      continue;
    }

    // Aggregate charged lines and delivered items by productId, then diff by QUANTITY (not mere
    // presence) so a quantity bumped up after checkout is caught too. Equal quantity = no flag
    // regardless of price, which naturally ignores discounts/promos. Keyed by productId (not
    // productId+variantId) because "manual-*" catalog items carry variantId === productId in the
    // Stripe metadata while the OrderItem carries the real variantId — keying on the pair would
    // split one real line into a phantom over+under pair.
    const chargedByKey = new Map();
    for (const c of charged) {
      const cur = chargedByKey.get(c.productId) || { title: c.title, qty: 0, paidCents: 0 };
      cur.qty += c.quantity;
      cur.paidCents += c.amountTotalCents; // post-discount, what the customer actually paid
      chargedByKey.set(c.productId, cur);
    }
    const orderByKey = new Map();
    for (const it of order.items) {
      const cur = orderByKey.get(it.productId) || { title: it.title, qty: 0, retailCents: 0 };
      cur.qty += it.quantity;
      cur.retailCents += Math.round(Number(it.totalPrice) * 100); // full retail delivered
      orderByKey.set(it.productId, cur);
    }

    const under = []; // delivered, unbilled — extra units on the order
    const over = []; // billed, undelivered — extra units on the charge
    for (const k of new Set([...chargedByKey.keys(), ...orderByKey.keys()])) {
      const c = chargedByKey.get(k);
      const o = orderByKey.get(k);
      const cQty = c?.qty || 0;
      const oQty = o?.qty || 0;
      if (oQty > cQty) {
        // Value the extra delivered units at their retail unit price (0 => free item, skip).
        const unitRetail = o.qty ? o.retailCents / o.qty : 0;
        const cents = Math.round((oQty - cQty) * unitRetail);
        if (cents > 0) under.push({ title: o.title, qty: oQty - cQty, cents });
      } else if (cQty > oQty) {
        // Value the billed-but-undelivered units at what was actually paid per unit.
        const unitPaid = c.qty ? c.paidCents / c.qty : 0;
        const cents = Math.round((cQty - oQty) * unitPaid);
        if (cents > 0) over.push({ title: c.title, qty: cQty - oQty, cents });
      }
    }

    if (under.length === 0 && over.length === 0) continue;

    const underCents = under.reduce((s, x) => s + x.cents, 0);
    const overCents = over.reduce((s, x) => s + x.cents, 0);
    const refunded = over.length > 0 ? await refundedCents(order.stripePaymentIntentId) : 0;
    const netOverCents = Math.max(0, overCents - refunded);
    const reusableCard = under.length > 0 ? await hasReusableCard(order.customer?.stripeCustomerId) : false;
    // Applied amendments (added items on a separate PI, or a refund) make the UNDERCHARGE side of
    // the single-session diff unreliable. Recorded as a flag; overcharges-owed stay reliable because
    // refund-netting already zeroes out anything the customer was made whole on.
    const hasAmend = order.amendments.some((a) => a.resolution === 'PAID' || a.resolution === 'REFUNDED');
    const ageDays = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86_400_000);

    rows.push({
      orderNumber: order.orderNumber,
      type: order.groupOrderV2Id ? 'group' : 'solo',
      customer: order.customerName,
      email: order.customerEmail,
      direction: under.length && over.length ? 'BOTH' : under.length ? 'UNDERCHARGE' : 'OVERCHARGE',
      underUsd: Number((underCents / 100).toFixed(2)),
      overOwedUsd: Number((netOverCents / 100).toFixed(2)),
      refundedUsd: Number((refunded / 100).toFixed(2)),
      ageDays,
      reusableCard,
      classification: hasAmend ? 'AMENDED-REVIEW' : 'CLEAN',
      sessionId: order.stripeCheckoutSessionId,
      paymentIntentId: order.stripePaymentIntentId || '',
      detail: [
        ...under.map((u) => `-$${usd(u.cents)} ${u.title} x${u.qty} (delivered, unbilled)`),
        ...over.map((o) => `+$${usd(o.cents)} ${o.title} x${o.qty} (billed, undelivered)`),
      ].join(' | '),
    });
  }

  // Sort for triage: biggest customer-owed first, then biggest losses.
  rows.sort((a, b) => b.overOwedUsd - a.overOwedUsd || b.underUsd - a.underUsd);

  // Overcharges OWED are reliable even on amended orders: refund-netting zeroes out anything the
  // customer was already made whole on, so whatever still nets > 0 is genuinely owed (e.g. #227).
  const overRows = rows.filter((r) => r.overOwedUsd > 0);
  // Undercharges on amended orders are NOT reliable — amendment-added items are charged on a
  // separate PI, so they look unbilled against the original session. Split them for manual review.
  const underRows = rows.filter((r) => r.underUsd > 0 && r.classification === 'CLEAN');
  const underAmended = rows.filter((r) => r.underUsd > 0 && r.classification === 'AMENDED-REVIEW');
  const totalUnder = underRows.reduce((s, r) => s + r.underUsd, 0);
  const totalUnderAmended = underAmended.reduce((s, r) => s + r.underUsd, 0);
  const totalOverOwed = overRows.reduce((s, r) => s + r.overOwedUsd, 0);
  const writeoffCount = WRITEOFF_BELOW > 0 ? underRows.filter((r) => r.underUsd < WRITEOFF_BELOW).length : 0;

  if (OUT_JSON) {
    process.stdout.write(
      JSON.stringify(
        {
          summary: {
            scanned,
            skipped: skipped.length,
            overchargedOwed: { orders: overRows.length, totalUsd: Number(totalOverOwed.toFixed(2)) },
            underchargedClean: { orders: underRows.length, totalUsd: Number(totalUnder.toFixed(2)) },
            underchargedAmendedReview: { orders: underAmended.length, totalUsd: Number(totalUnderAmended.toFixed(2)) },
          },
          rows,
          skipped,
        },
        null,
        2
      ) + '\n'
    );
  } else if (OUT_CSV) {
    const cols = [
      'orderNumber', 'type', 'customer', 'email', 'direction', 'underUsd', 'overOwedUsd',
      'refundedUsd', 'ageDays', 'reusableCard', 'classification', 'sessionId', 'paymentIntentId', 'detail',
    ];
    const lines = [cols.join(',')];
    for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(','));
    process.stdout.write(lines.join('\n') + '\n');
  }

  // Summary (stderr under --csv/--json, stdout otherwise).
  log('');
  log('--- SUMMARY ---');
  log(`Scanned: ${scanned}   Skipped (legacy/no session): ${skipped.length}`);
  log(`OVERCHARGED still owed to customer (net of refunds):       ${overRows.length} orders, $${totalOverOwed.toFixed(2)}`);
  log(`UNDERCHARGED (delivered, never billed), no amendment:      ${underRows.length} orders, $${totalUnder.toFixed(2)}`);
  log(`UNDERCHARGED but order amended (verify — separate PI):     ${underAmended.length} orders, $${totalUnderAmended.toFixed(2)}`);
  if (WRITEOFF_BELOW > 0) {
    log(`  (of no-amendment undercharges, ${writeoffCount} are below the $${WRITEOFF_BELOW} write-off threshold)`);
  }
  if (overRows.length) {
    log('');
    log('Customers owed a refund (do these first — pure goodwill):');
    for (const r of overRows) {
      log(`  #${r.orderNumber}  ${r.customer}  $${r.overOwedUsd.toFixed(2)}  (refunded so far $${r.refundedUsd.toFixed(2)})`);
    }
  }
  if (underRows.length && !OUT_CSV && !OUT_JSON) {
    log('');
    log('Top undercharges (re-bill candidates — see docs/charge-mismatch-remediation.md):');
    for (const r of underRows.slice(0, 15)) {
      log(`  #${r.orderNumber}  ${r.customer}  $${r.underUsd.toFixed(2)}  age ${r.ageDays}d  reusableCard=${r.reusableCard}  [${r.type}]`);
      log(`      ${r.detail}`);
    }
    if (underRows.length > 15) log(`  ...and ${underRows.length - 15} more (use --csv for the full list).`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
