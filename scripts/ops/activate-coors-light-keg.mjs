#!/usr/bin/env node
/**
 * Activate the Coors Light 1/2 Barrel keg so it is orderable.
 *
 * The product already exists in the catalog but was ARCHIVED with its variant
 * flagged availableForSale=false, so it is invisible to every customer-facing
 * surface. Rather than create a duplicate row, this reactivates the existing
 * record and brings it in line with how the other half-barrel kegs are set up:
 *
 *   - status            ARCHIVED -> ACTIVE
 *   - variant available false    -> true          (catalog API filters on this)
 *   - productType       Light Beer -> Keg         (PRODUCT_CATEGORIES.kegs)
 *   - title/handle      legacy "1/4 barrel" naming -> sibling keg convention
 *   - category          (none)   -> "kegs" collection, so it is browsable
 *
 * Price ($174.99) and vendor (Capital Reyes) already match Miller Lite and are
 * left untouched. Inventory quantity is NOT touched -- stock changes belong to
 * the /inventory skill.
 *
 * Idempotent: re-running after a successful apply is a no-op.
 *
 * Usage:
 *   node scripts/ops/activate-coors-light-keg.mjs            # dry run (default)
 *   node scripts/ops/activate-coors-light-keg.mjs --apply    # write to the DB
 */

import { PrismaClient } from '@prisma/client';

const PRODUCT_ID = '49693ddf-128a-4d5a-a85b-7ff6aeec7ed5';
const KEGS_CATEGORY_HANDLE = 'kegs';
const KEGS_POSITION = 7;

const TARGET = {
  status: 'ACTIVE',
  title: 'Coors Light Keg • 1/2 Barrel',
  handle: 'coors-light-keg-1-2-barrel',
  productType: 'Keg',
  vendor: 'Capital Reyes',
  description:
    'Coors Light 1/2 Barrel (15.5 gallons). Perfect for large gatherings, this classic light lager is crisp and refreshing at 4.2% ABV. Brewed with pure Rocky Mountain water, it is ideal for weddings, BBQs, or any celebration. Keg tap and tub rentals available separately.',
  descriptionHtml:
    '<ul>\n<li>Coors Light</li>\n<li>1/2 Barrel (15.5 gallons)</li>\n<li>4.2% ABV</li>\n</ul>\n<p>Perfect for large gatherings, this classic light lager is crisp and refreshing. Brewed with pure Rocky Mountain water, it is ideal for weddings, BBQs, or any celebration. Keg tap and tub rentals available separately.</p>',
};

const VARIANT_TARGET = {
  availableForSale: true,
  sku: 'COORS-LIGHT-KEG-12',
};

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

/** Print a field change, return true when a write is actually needed. */
function diff(label, before, after) {
  const changed = String(before ?? '') !== String(after ?? '');
  const mark = changed ? '~' : ' ';
  if (changed) {
    console.log(`  ${mark} ${label.padEnd(18)} ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  } else {
    console.log(`  ${mark} ${label.padEnd(18)} ${JSON.stringify(after)} (already correct)`);
  }
  return changed;
}

async function main() {
  console.log(apply ? '=== APPLY MODE ===' : '=== DRY RUN (pass --apply to write) ===');
  console.log('');

  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: {
      variants: true,
      images: { orderBy: { position: 'asc' } },
      categories: { include: { category: true } },
    },
  });

  if (!product) throw new Error(`Product ${PRODUCT_ID} not found`);
  if (product.variants.length !== 1) {
    throw new Error(`Expected exactly 1 variant, found ${product.variants.length}`);
  }

  const variant = product.variants[0];

  // Guard: never silently steal a handle from another product.
  const handleOwner = await prisma.product.findUnique({
    where: { handle: TARGET.handle },
    select: { id: true, title: true },
  });
  if (handleOwner && handleOwner.id !== PRODUCT_ID) {
    throw new Error(
      `Handle "${TARGET.handle}" already belongs to ${handleOwner.id} (${handleOwner.title})`
    );
  }

  const kegsCategory = await prisma.category.findUnique({
    where: { handle: KEGS_CATEGORY_HANDLE },
  });
  if (!kegsCategory) throw new Error(`Category "${KEGS_CATEGORY_HANDLE}" not found`);

  console.log(`PRODUCT ${product.id}`);
  let productChanged = false;
  for (const [key, value] of Object.entries(TARGET)) {
    productChanged = diff(key, product[key], value) || productChanged;
  }

  console.log('');
  console.log(`VARIANT ${variant.id}`);
  let variantChanged = false;
  for (const [key, value] of Object.entries(VARIANT_TARGET)) {
    variantChanged = diff(key, variant[key], value) || variantChanged;
  }
  console.log(`    ${'price'.padEnd(18)} $${variant.price} (unchanged - matches Miller Lite keg)`);
  console.log(`    ${'inventoryQty'.padEnd(18)} ${variant.inventoryQuantity} (unchanged - use /inventory to adjust)`);
  console.log(`    ${'costPerUnit'.padEnd(18)} ${variant.costPerUnit ?? 'null'} (unchanged - no invoice cost on file)`);

  const alreadyInKegs = product.categories.some((c) => c.categoryId === kegsCategory.id);
  console.log('');
  console.log('CATEGORY');
  const categoryChanged = !alreadyInKegs;
  if (categoryChanged) {
    console.log(`  ~ link to "${kegsCategory.handle}" (${kegsCategory.title}) at position ${KEGS_POSITION}`);
  } else {
    console.log(`    already linked to "${kegsCategory.handle}"`);
  }

  console.log('');
  console.log('IMAGES (unchanged by this script)');
  for (const img of product.images) {
    console.log(`    pos ${img.position}: ${img.url}`);
  }

  if (!productChanged && !variantChanged && !categoryChanged) {
    console.log('');
    console.log('Nothing to do - already in the target state.');
    return;
  }

  if (!apply) {
    console.log('');
    console.log('Dry run complete. Re-run with --apply to write these changes.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: PRODUCT_ID }, data: TARGET });
    await tx.productVariant.update({ where: { id: variant.id }, data: VARIANT_TARGET });
    await tx.productCategory.upsert({
      where: { productId_categoryId: { productId: PRODUCT_ID, categoryId: kegsCategory.id } },
      update: { position: KEGS_POSITION },
      create: { productId: PRODUCT_ID, categoryId: kegsCategory.id, position: KEGS_POSITION },
    });
  });

  console.log('');
  console.log('Applied. Verifying...');

  const after = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: { variants: true, categories: { include: { category: true } } },
  });
  console.log(
    JSON.stringify(
      {
        title: after.title,
        handle: after.handle,
        status: after.status,
        productType: after.productType,
        vendor: after.vendor,
        basePrice: String(after.basePrice),
        categories: after.categories.map((c) => c.category.handle),
        variant: {
          price: String(after.variants[0].price),
          sku: after.variants[0].sku,
          availableForSale: after.variants[0].availableForSale,
          inventoryQuantity: after.variants[0].inventoryQuantity,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
