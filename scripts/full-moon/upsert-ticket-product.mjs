/**
 * Upsert the Lake Travis Full Moon Party ticket product (idempotent).
 *
 * Creates a DRAFT Product "Lake Travis Full Moon Party Ticket" (handle
 * `full-moon-party-ticket`, productType "Event Ticket", one $69 variant with
 * trackInventory=false) in its own "Events" category. Status DRAFT keeps it out
 * of every storefront/catalog/dashboard listing (all require ACTIVE), while it
 * stays purchasable by handle through the /api/v1/full-moon/ticket endpoint.
 *
 * Usage:
 *   node scripts/full-moon/upsert-ticket-product.mjs           # DRY RUN (default)
 *   node scripts/full-moon/upsert-ticket-product.mjs --apply   # write to the DB
 *
 * Env: source your .env.local first so DATABASE_URL is set.
 */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local' });
config();

const APPLY = process.argv.includes('--apply');

const PRODUCT = {
  handle: 'full-moon-party-ticket',
  title: 'Lake Travis Full Moon Party Ticket',
  productType: 'Event Ticket',
  vendor: 'Party On Delivery',
  description: 'One spot on the Lake Travis Full Moon Party sunset cruise — moonrise dance party, light bites, water and ice included. Drinks ordered ahead through Party On Delivery.',
  basePrice: '59.00',
};
const VARIANT = {
  title: 'General Admission',
  sku: 'FM-PARTY-TICKET',
  price: '59.00',
};
const CATEGORY = { handle: 'events', title: 'Events' };

function log(...args) {
  console.log(APPLY ? '[APPLY]' : '[DRY RUN]', ...args);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Source your .env.local first.');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    // --- Category ("Events") ---
    let category = await prisma.category.findUnique({ where: { handle: CATEGORY.handle } });
    if (!category) {
      log(`Create category "${CATEGORY.title}" (${CATEGORY.handle})`);
      if (APPLY) category = await prisma.category.create({ data: CATEGORY });
    } else {
      log(`Category "${CATEGORY.title}" already exists (${category.id ?? 'dry-run'})`);
    }

    // --- Product ---
    let product = await prisma.product.findUnique({
      where: { handle: PRODUCT.handle },
      include: { variants: true, categories: true },
    });

    if (!product) {
      log(`Create DRAFT product "${PRODUCT.title}" (${PRODUCT.handle}) @ $${PRODUCT.basePrice}`);
      log(`  + variant "${VARIANT.title}" @ $${VARIANT.price}, trackInventory=false, availableForSale=true`);
      if (APPLY) {
        product = await prisma.product.create({
          data: {
            handle: PRODUCT.handle,
            title: PRODUCT.title,
            description: PRODUCT.description,
            vendor: PRODUCT.vendor,
            productType: PRODUCT.productType,
            status: 'DRAFT',
            basePrice: PRODUCT.basePrice,
            tags: ['event', 'ticket', 'full-moon-party'],
            variants: {
              create: {
                title: VARIANT.title,
                sku: VARIANT.sku,
                price: VARIANT.price,
                trackInventory: false,
                availableForSale: true,
                inventoryQuantity: 0,
              },
            },
          },
          include: { variants: true, categories: true },
        });
      }
    } else {
      log(`Product "${PRODUCT.title}" already exists (${product.id}); ensuring DRAFT + fields`);
      if (APPLY) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            title: PRODUCT.title,
            description: PRODUCT.description,
            vendor: PRODUCT.vendor,
            productType: PRODUCT.productType,
            status: 'DRAFT',
            basePrice: PRODUCT.basePrice,
          },
        });
      }
      // Ensure exactly one purchasable variant at $69.
      if (product.variants.length === 0) {
        log('  + add missing variant');
        if (APPLY) {
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              title: VARIANT.title,
              sku: VARIANT.sku,
              price: VARIANT.price,
              trackInventory: false,
              availableForSale: true,
              inventoryQuantity: 0,
            },
          });
        }
      } else {
        const v = product.variants[0];
        log(`  ~ update variant ${v.id} → $${VARIANT.price}, trackInventory=false, availableForSale=true`);
        if (APPLY) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: { price: VARIANT.price, trackInventory: false, availableForSale: true },
          });
        }
      }
    }

    // --- Category link ---
    if (APPLY && product && category) {
      await prisma.productCategory.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
        create: { productId: product.id, categoryId: category.id },
        update: {},
      });
      log(`Linked product → category "${CATEGORY.title}"`);
    } else {
      log(`Would link product → category "${CATEGORY.title}"`);
    }

    if (APPLY) {
      const final = await prisma.product.findUnique({
        where: { handle: PRODUCT.handle },
        include: { variants: true },
      });
      console.log('\n✅ Done. Ticket product:');
      console.log(`   id:      ${final?.id}`);
      console.log(`   handle:  ${final?.handle}`);
      console.log(`   status:  ${final?.status} (DRAFT = hidden from shop, purchasable by handle)`);
      console.log(`   variant: ${final?.variants[0]?.id} @ $${final?.variants[0]?.price}`);
    } else {
      console.log('\nDRY RUN ONLY. Re-run with --apply to write these changes to the database.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
