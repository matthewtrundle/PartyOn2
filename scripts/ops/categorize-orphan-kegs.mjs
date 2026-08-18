#!/usr/bin/env node
/**
 * Link sellable beer kegs that are missing from the "kegs" collection.
 *
 * Four ACTIVE, sellable kegs carry no ProductCategory row at all, so they never
 * appear in the Kegs & Equipment collection -- which is what both the storefront
 * category browse and every group-order dashboard read from. They were only ever
 * reachable through the hardcoded array in KegProductGrid.tsx, and Shiner Light
 * Blonde 1/4 was not even on that page, so it was unreachable everywhere.
 *
 * Miller Lite additionally has productType 'Light Beer' rather than 'Keg', which
 * keeps it out of PRODUCT_CATEGORIES.kegs (src/lib/products/categories.ts) even
 * once it is in the collection.
 *
 * Deliberately NOT touched:
 *   - Keg Tap Rental / Keg Tub Rental / Keg Shell Deposit / Ultimate Keg Party
 *     Package -- equipment, not beer. They live in the `rentals` collection and
 *     moving them is a merchandising decision, not a bug fix.
 *   - Prices, inventory quantities, availability flags.
 *
 * Idempotent: re-running after a successful apply is a no-op.
 *
 * Usage:
 *   node scripts/ops/categorize-orphan-kegs.mjs            # dry run (default)
 *   node scripts/ops/categorize-orphan-kegs.mjs --apply    # write to the DB
 */

import { PrismaClient } from '@prisma/client';

const KEGS_CATEGORY_HANDLE = 'kegs';

/** Each entry: handle, expected title (a guard), and optional productType fix. */
const TARGETS = [
  {
    handle: 'miller-lite-keg',
    expectTitle: 'Miller Lite Keg • 1/2 Barrel 11 gal',
    productType: 'Keg', // currently 'Light Beer'
    position: 14,
  },
  {
    handle: 'karbach-love-street-1-2-barrell',
    expectTitle: 'Karbach Love Street • 1/2 Barrel',
    position: 16,
  },
  {
    handle: 'yuengling-slim-1-4-barrel',
    expectTitle: 'Yuengling Slim Keg 1/4 Barrel',
    position: 17,
  },
  {
    handle: 'shiner-light-blonde-keg-1-4-barrel',
    expectTitle: 'Shiner Light Blonde Keg • 1/4 Barrel',
    position: 18,
  },
];

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

async function main() {
  console.log(apply ? '=== APPLY MODE ===' : '=== DRY RUN (pass --apply to write) ===');
  console.log('');

  const kegsCategory = await prisma.category.findUnique({
    where: { handle: KEGS_CATEGORY_HANDLE },
  });
  if (!kegsCategory) throw new Error(`Category "${KEGS_CATEGORY_HANDLE}" not found`);

  const plan = [];

  for (const target of TARGETS) {
    const product = await prisma.product.findUnique({
      where: { handle: target.handle },
      include: { variants: true, categories: true },
    });

    if (!product) {
      console.log(`SKIP  ${target.handle} -- not found`);
      continue;
    }
    if (product.title !== target.expectTitle) {
      throw new Error(
        `Guard failed for ${target.handle}: expected title "${target.expectTitle}", found "${product.title}"`
      );
    }
    if (product.status !== 'ACTIVE') {
      console.log(`SKIP  ${target.handle} -- status is ${product.status}, not ACTIVE`);
      continue;
    }
    if (!product.variants.some((v) => v.availableForSale)) {
      console.log(`SKIP  ${target.handle} -- no sellable variant`);
      continue;
    }

    const needsCategory = !product.categories.some((c) => c.categoryId === kegsCategory.id);
    const needsType = Boolean(target.productType) && product.productType !== target.productType;

    console.log(product.title);
    console.log(`      handle       ${product.handle}`);
    if (needsType) {
      console.log(`    ~ productType  ${JSON.stringify(product.productType)} -> ${JSON.stringify(target.productType)}`);
    } else {
      console.log(`      productType  ${JSON.stringify(product.productType)} (already correct)`);
    }
    if (needsCategory) {
      console.log(`    ~ collection   (none) -> "${kegsCategory.handle}" at position ${target.position}`);
    } else {
      console.log(`      collection   already in "${kegsCategory.handle}"`);
    }
    console.log(`      price        $${product.variants[0].price} (unchanged)`);
    console.log('');

    if (needsCategory || needsType) {
      plan.push({ product, target, needsCategory, needsType });
    }
  }

  if (plan.length === 0) {
    console.log('Nothing to do - all targets already in the target state.');
    return;
  }

  if (!apply) {
    console.log(`Dry run complete. ${plan.length} product(s) would change. Re-run with --apply.`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const { product, target, needsCategory, needsType } of plan) {
      if (needsType) {
        await tx.product.update({
          where: { id: product.id },
          data: { productType: target.productType },
        });
      }
      if (needsCategory) {
        await tx.productCategory.upsert({
          where: {
            productId_categoryId: { productId: product.id, categoryId: kegsCategory.id },
          },
          update: { position: target.position },
          create: {
            productId: product.id,
            categoryId: kegsCategory.id,
            position: target.position,
          },
        });
      }
    }
  });

  console.log(`Applied to ${plan.length} product(s). Verifying...`);
  console.log('');

  const verify = await prisma.product.findMany({
    where: { handle: { in: TARGETS.map((t) => t.handle) } },
    include: { categories: { include: { category: true } } },
    orderBy: { title: 'asc' },
  });
  for (const p of verify) {
    console.log(
      `  ${p.title}  [${p.productType}]  collections: ${p.categories.map((c) => c.category.handle).join(', ') || 'NONE'}`
    );
  }
}

main()
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
