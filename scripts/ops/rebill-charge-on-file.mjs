/**
 * Last-resort, operator-run re-bill: charge the card on file for an under-charged order.
 *
 * This is the FINAL step of the dunning ladder in docs/charge-mismatch-remediation.md — only after
 * a fresh re-bill invoice (/invoice/[token]) and two follow-up emails have gone unanswered, and only
 * where a reusable card is on file. The original checkouts did NOT save cards for off-session reuse
 * (`setup_future_usage` was never set), so most orders will have NO reusable card — this tool reports
 * that and exits.
 *
 * Guard-railed:
 *   - One order at a time (refuses bulk).
 *   - Dry run by DEFAULT; pass --confirm to actually charge.
 *   - Computes the owed amount the same way the audit does; --amount=<usd> for a partial/goodwill charge.
 *   - Refuses if no reusable card exists. Reports declines/expired cards gracefully.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/ops/rebill-charge-on-file.mjs --order=227                 # dry run
 *   node scripts/ops/rebill-charge-on-file.mjs --order=227 --confirm       # charge full owed amount
 *   node scripts/ops/rebill-charge-on-file.mjs --order=227 --amount=50 --confirm   # partial
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const ORDER = flag('--order');
const AMOUNT = flag('--amount');

function flag(name) {
  const a = args.find((x) => x.startsWith(`${name}=`));
  return a ? a.split('=').slice(1).join('=') : undefined;
}
function norm(s) {
  return (s || '').trim().toLowerCase();
}
function keyOf(p, v) {
  return `${p}::${v || ''}`;
}

/** PRODUCT lines Stripe charged on a session (mirrors audit-order-charge-mismatches.mjs). */
async function chargedProductLines(sessionId) {
  const res = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 100,
    expand: ['data.price.product'],
  });
  const out = [];
  for (const li of res.data) {
    const product = li.price && typeof li.price.product === 'object' ? li.price.product : null;
    const md = (product && product.metadata) || {};
    if (!md.productId) continue;
    out.push({ productId: md.productId, variantId: md.variantId || null, title: li.description || '' });
  }
  return out;
}

async function main() {
  if (!ORDER) {
    console.error('Usage: --order=<orderNumber> [--amount=<usd>] [--confirm]');
    process.exit(1);
  }
  const orderNumber = Number(ORDER);
  if (!Number.isInteger(orderNumber)) {
    console.error(`Invalid --order: ${ORDER}`);
    process.exit(1);
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber },
    include: {
      items: true,
      amendments: { select: { resolution: true } },
      customer: { select: { stripeCustomerId: true, email: true } },
    },
  });
  if (!order) {
    console.error(`Order #${orderNumber} not found.`);
    process.exit(1);
  }
  if (!order.stripeCheckoutSessionId) {
    console.error(`Order #${orderNumber} has no Stripe session — cannot audit/charge.`);
    process.exit(1);
  }

  // Recompute the undercharge for this single order.
  const charged = await chargedProductLines(order.stripeCheckoutSessionId);
  const chargedKeys = new Set(charged.map((c) => keyOf(c.productId, c.variantId)));
  const chargedProducts = new Set(charged.map((c) => c.productId));
  const chargedTitles = new Set(charged.map((c) => norm(c.title)));

  const under = [];
  for (const it of order.items) {
    if (Number(it.price) <= 0) continue;
    const matched =
      chargedKeys.has(keyOf(it.productId, it.variantId)) ||
      chargedProducts.has(it.productId) ||
      chargedTitles.has(norm(it.title));
    if (!matched) under.push({ title: it.title, qty: it.quantity, usd: Number(it.totalPrice) });
  }
  const owedUsd = under.reduce((s, x) => s + x.usd, 0);
  const hasAmend = order.amendments.some((a) => a.resolution === 'PAID');
  const ageDays = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86_400_000);

  const stripeCustomerId = order.customer?.stripeCustomerId || null;
  let card = null;
  if (stripeCustomerId) {
    try {
      const pms = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 3 });
      card = pms.data[0] || null;
    } catch (e) {
      console.error('Could not list payment methods:', e.message);
    }
  }

  const chargeUsd = AMOUNT !== undefined ? Number(AMOUNT) : owedUsd;
  const chargeCents = Math.round(chargeUsd * 100);

  console.log(`=== Re-bill order #${orderNumber} (${order.customerName}) ===`);
  console.log(`Email:           ${order.customer?.email || order.customerEmail}`);
  console.log(`Age:             ${ageDays} days`);
  console.log(`Undercharged:    $${owedUsd.toFixed(2)}`);
  for (const u of under) console.log(`   - $${u.usd.toFixed(2)}  ${u.title} x${u.qty}`);
  console.log(`Reusable card:   ${card ? `yes (${card.card?.brand} ****${card.card?.last4}, exp ${card.card?.exp_month}/${card.card?.exp_year})` : 'NONE'}`);
  console.log(`Will charge:     $${chargeUsd.toFixed(2)}${AMOUNT !== undefined ? ' (partial / override)' : ''}`);
  if (hasAmend) {
    console.log('WARNING: this order has a PAID amendment — the owed amount may include amendment items');
    console.log('         charged on a separate payment. Verify by hand before charging.');
  }

  if (under.length === 0 && AMOUNT === undefined) {
    console.log('\nNo undercharge detected — nothing to charge. (Pass --amount to override.)');
    await prisma.$disconnect();
    return;
  }
  if (!stripeCustomerId || !card) {
    console.log('\nNo reusable card on file — an off-session charge is not possible.');
    console.log('Send the re-bill invoice link (/invoice/[token]) or write this off.');
    await prisma.$disconnect();
    return;
  }
  if (chargeCents <= 0) {
    console.log('\nCharge amount is $0 — nothing to do.');
    await prisma.$disconnect();
    return;
  }

  if (!CONFIRM) {
    console.log('\nDRY RUN — re-run with --confirm to charge the card on file.');
    await prisma.$disconnect();
    return;
  }

  console.log('\nCharging...');
  try {
    const pi = await stripe.paymentIntents.create({
      amount: chargeCents,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: card.id,
      off_session: true,
      confirm: true,
      description: `Re-bill for under-charged order #${orderNumber}`,
      metadata: { orderNumber: String(orderNumber), reason: 'charge-mismatch-rebill' },
    });
    console.log(`Result: ${pi.status}  (PaymentIntent ${pi.id})`);
    if (pi.status === 'succeeded') {
      console.log('Charged successfully. Confirm in Stripe, then mark the order reconciled.');
    } else {
      console.log('Not settled — check the PaymentIntent in Stripe.');
    }
  } catch (e) {
    // Off-session declines surface here (expired card, authentication_required, insufficient_funds, ...).
    console.error(`Charge failed: ${e.code || e.type || ''} ${e.message}`);
    console.error('Recommend: send the re-bill invoice link instead, or write this off.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
