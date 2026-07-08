/**
 * Comp a guest onto the Full Moon Party guest list WITHOUT a charge.
 *
 * Inserts a $0 PAID Order + OrderItem for the DRAFT ticket product so the guest
 * appears on /api/v1/full-moon/guests and counts toward /count — no Stripe, no
 * money. Use for the host, VIPs, or a raffle winner. Idempotent: re-running for
 * the same email won't create a duplicate comp.
 *
 * Usage:
 *   node scripts/full-moon/comp-guest.mjs                                  # DRY RUN (Allan default)
 *   node scripts/full-moon/comp-guest.mjs --apply
 *   node scripts/full-moon/comp-guest.mjs --name "Jane Doe" --email jane@x.com --apply
 *
 * Env: source .env.local first so DATABASE_URL is set.
 */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Keep in sync with TICKET_PRODUCT_HANDLE in src/components/full-moon/event.ts.
const TICKET_PRODUCT_HANDLE = 'full-moon-party-ticket';

config({ path: '.env.local' });
config();

const APPLY = process.argv.includes('--apply');
function argVal(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const NAME = argVal('--name', 'Allan');
const EMAIL = argVal('--email', 'allan@partyondelivery.com');
const COMP_NOTE = 'full-moon-comp'; // marker for idempotency + audit

function log(...a) { console.log(APPLY ? '[APPLY]' : '[DRY RUN]', ...a); }

async function main() {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set. Source .env.local.'); process.exit(1); }
  const prisma = new PrismaClient();
  try {
    const product = await prisma.product.findUnique({
      where: { handle: TICKET_PRODUCT_HANDLE },
      include: { variants: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    const variant = product?.variants[0];
    if (!product || !variant) { console.error('Ticket product/variant not found. Run upsert-ticket-product.mjs --apply first.'); process.exit(1); }

    // Idempotency: already comped this email for this product?
    const existing = await prisma.orderItem.findFirst({
      where: { productId: product.id, order: { customerEmail: EMAIL, internalNote: COMP_NOTE } },
      select: { orderId: true },
    });
    if (existing) { log(`Already comped ${EMAIL} (order ${existing.orderId}) — nothing to do.`); return; }

    log(`Comp "${NAME}" <${EMAIL}> onto the guest list ($0, PAID, no charge)`);
    if (APPLY) {
      const [firstName, ...rest] = NAME.trim().split(/\s+/);
      const customer = await prisma.customer.upsert({
        where: { email: EMAIL },
        create: { email: EMAIL, firstName, lastName: rest.join(' ') || null },
        update: {},
      });
      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          status: 'CONFIRMED',
          financialStatus: 'PAID',
          fulfillmentStatus: 'DELIVERED', // event ticket — nothing to physically fulfill
          subtotal: 0, taxAmount: 0, deliveryFee: 0, total: 0,
          deliveryDate: new Date('2026-08-01T20:00:00'),
          deliveryTime: '8:00 PM',
          deliveryAddress: { name: 'Anderson Mill Marina', address: '13993 FM 2769', city: 'Leander', state: 'TX', zip: '78641' },
          deliveryPhone: 'n/a',
          customerEmail: EMAIL,
          customerName: NAME,
          internalNote: COMP_NOTE,
          items: {
            create: {
              productId: product.id,
              variantId: variant.id,
              title: product.title,
              price: 0, quantity: 1, totalPrice: 0,
            },
          },
        },
      });
      console.log(`\n✅ Comped. Order ${order.orderNumber} (${order.id}) — ${NAME} is on the guest list.`);
    }

    const sold = await prisma.orderItem.aggregate({ _sum: { quantity: true }, where: { productId: product.id, order: { financialStatus: 'PAID' } } });
    console.log(`Current PAID ticket count: ${sold._sum.quantity ?? 0}`);
  } finally { await prisma.$disconnect(); }
}
main().catch((e) => { console.error('Failed:', e); process.exit(1); });
