/**
 * One-time repair for orders where a paid OrderAmendment got applied twice.
 *
 * Bug: handleAmendmentInvoicePayment in src/lib/stripe/webhooks.ts was adding
 * the amendment items / totals to the Order rows again after the amend route
 * had already applied them. Result: every PAID amendment had its item quantity
 * deltas and total deltas applied twice. Customer was charged correctly via
 * Stripe (only one invoice), but the Order row + OrderItem rows reflected 2×
 * the request → over-delivery risk.
 *
 * This script:
 *   1. Loads every PAID OrderAmendment.
 *   2. For each, checks whether the order is already in the correct post-fix state
 *      (Order.total matches OrderAmendment.newTotal within $0.02). If yes, skips
 *      — the script is safe to re-run any number of times.
 *   3. Otherwise, reverses one application of the diff:
 *        - "added" items: subtract the added qty from current OrderItem (delete row if hits 0)
 *        - "modified" items: subtract (newQuantity - oldQuantity) from current
 *        - "removed" items: re-add them (the second apply over-deleted)
 *   4. Recomputes Order.subtotal / taxAmount / total from the resulting items.
 *
 * Run with DRY_RUN=1 first to see the planned changes without writing.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   DRY_RUN=1 node scripts/ops/fix-doubled-amendment-orders.mjs
 *   node scripts/ops/fix-doubled-amendment-orders.mjs            # apply
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';
const TAX_RATE = 0.0825;

async function main() {
  console.log('=== Fix doubled-amendment orders ===');
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY');

  const amendments = await prisma.orderAmendment.findMany({
    where: { resolution: 'PAID' },
    include: { order: { include: { items: true } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log('PAID amendments to inspect:', amendments.length);

  for (const a of amendments) {
    const o = a.order;
    const changes = a.changes;
    console.log(`\n--- Order #${o.orderNumber} (${o.customerName}) — amendment ${a.id.slice(0, 8)} ---`);
    console.log('  amendment delta:', a.amountDelta.toString(), '| previous total:', a.previousTotal.toString(), '-> new total:', a.newTotal.toString());

    // Idempotence guard: if Order.total already equals OrderAmendment.newTotal
    // (within rounding tolerance), the fix has already been applied. Skip.
    const totalGap = Number(o.total) - Number(a.newTotal);
    if (Math.abs(totalGap) < 0.02) {
      console.log('  SKIP: already correct (order.total matches amendment.newTotal).');
      continue;
    }

    const itemMap = new Map(o.items.map((i) => [`${i.productId}|${i.variantId}`, i]));
    const planned = []; // { kind, item?, deltaQty, reason }

    for (const added of changes.added || []) {
      const key = `${added.productId}|${added.variantId}`;
      const current = itemMap.get(key);
      if (!current) {
        console.log(`  WARN: "added" entry missing from OrderItem: ${added.title}`);
        continue;
      }
      const newQty = current.quantity - added.quantity;
      planned.push({ kind: 'reduce', item: current, newQty, reason: `added ${added.quantity}× was double-applied` });
    }

    for (const mod of changes.modified || []) {
      const key = `${mod.productId}|${mod.variantId}`;
      const current = itemMap.get(key);
      if (!current) {
        console.log(`  WARN: "modified" entry missing from OrderItem: ${mod.title}`);
        continue;
      }
      const delta = mod.newQuantity - mod.oldQuantity;
      const newQty = current.quantity - delta;
      planned.push({ kind: 'reduce', item: current, newQty, reason: `modified ${mod.oldQuantity}→${mod.newQuantity} (delta ${delta}) was double-applied` });
    }

    for (const rem of changes.removed || []) {
      // "removed" items were deleted twice — the second deletion is a no-op (row already gone).
      // The first deletion was correct, so we don't need to re-add anything. No action.
      console.log(`  NOTE: "removed" entry ignored (single-deletion is correct): ${rem.title}`);
    }

    if (planned.length === 0) {
      console.log('  nothing to do.');
      continue;
    }

    for (const p of planned) {
      console.log(`  PLAN: ${p.item.title} qty ${p.item.quantity} → ${p.newQty}  [${p.reason}]`);
    }

    // Compute new totals from the post-repair item set
    const newItemTotals = o.items.map((i) => {
      const adj = planned.find((p) => p.item.id === i.id);
      const q = adj ? adj.newQty : i.quantity;
      return { id: i.id, quantity: q, lineTotal: Number(i.price) * q };
    });
    const newSubtotal = newItemTotals.reduce((s, x) => s + x.lineTotal, 0);
    const discount = Number(o.discountAmount || 0);
    const taxable = Math.max(0, newSubtotal - discount);
    const newTax = Math.round(taxable * TAX_RATE * 100) / 100;
    const newTotal = newSubtotal - discount + newTax + Number(o.deliveryFee || 0) + Number(o.tipAmount || 0);

    console.log(`  TOTALS: subtotal ${o.subtotal} → ${newSubtotal.toFixed(2)} | tax ${o.taxAmount} → ${newTax.toFixed(2)} | total ${o.total} → ${newTotal.toFixed(2)}`);

    if (!DRY_RUN) {
      await prisma.$transaction(async (tx) => {
        for (const p of planned) {
          if (p.newQty <= 0) {
            await tx.orderItem.delete({ where: { id: p.item.id } });
          } else {
            await tx.orderItem.update({
              where: { id: p.item.id },
              data: {
                quantity: p.newQty,
                totalPrice: new Prisma.Decimal(Number(p.item.price) * p.newQty),
              },
            });
          }
        }
        await tx.order.update({
          where: { id: o.id },
          data: {
            subtotal: new Prisma.Decimal(newSubtotal.toFixed(2)),
            taxAmount: new Prisma.Decimal(newTax.toFixed(2)),
            total: new Prisma.Decimal(newTotal.toFixed(2)),
          },
        });
      });
      console.log('  APPLIED.');
    }
  }

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
