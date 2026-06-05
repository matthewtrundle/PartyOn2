/**
 * Last-minute catalog — same shape as getCuratedCatalog, but the product
 * pool is restricted to items we can absolutely deliver in 24 hours.
 *
 * Selection rule:
 *   - status = ACTIVE
 *   - at least one variant with availableForSale = true
 *     AND inventoryQuantity >= MIN_INVENTORY (currently 24 units)
 *
 * Why a Postgres threshold instead of the Shopify "last-minute-*"
 * collections used by /order/last-minute? Those collections aren't
 * synced into Postgres tags yet (would require a Shopify-Admin-API
 * sync script). Inventory threshold is a clean Postgres-only proxy for
 * "deep enough stock that ops won't run out before today/tomorrow's
 * delivery slot."
 *
 * A follow-up PR can promote products into this catalog by tagging them
 * in Shopify + syncing tags to Postgres — at that point swap the
 * `where` clause to `tags: { has: 'last-minute' }`.
 */

import { prisma } from '@/lib/database/client';
import type { BuilderProduct, BuilderCategory } from '@/components/landing/types';
import type { CuratedCatalog } from './getCuratedCatalog';

const MIN_INVENTORY = 24;

type ProductTypeKey =
  | 'Light Beer'
  | 'Craft Beer'
  | 'Seltzer'
  | 'Whiskey'
  | 'Tequila'
  | 'Vodka'
  | 'Gin'
  | 'Rum'
  | 'Cocktail Kit'
  | 'Mixer';

type Bucket = {
  type: ProductTypeKey;
  take: number;
  idPrefix: string;
  emoji: string;
  accent: string;
};

// Same categories as the curated catalog so the modal renders the same
// step-1/step-2/step-3 tabs whether the customer is in normal or
// last-minute mode. Take counts kept identical too.
const STEP_ONE: Bucket[] = [
  { type: 'Light Beer', take: 10, idPrefix: 'lb', emoji: '🍺', accent: 'bg-yellow-400' },
  { type: 'Craft Beer', take: 10, idPrefix: 'cb', emoji: '🍺', accent: 'bg-amber-500' },
  { type: 'Seltzer', take: 10, idPrefix: 's', emoji: '🥤', accent: 'bg-cyan-500' },
];
const STEP_TWO: Bucket[] = [
  { type: 'Whiskey', take: 5, idPrefix: 'w', emoji: '🥃', accent: 'bg-amber-700' },
  { type: 'Tequila', take: 5, idPrefix: 't', emoji: '🌵', accent: 'bg-lime-600' },
  { type: 'Vodka', take: 5, idPrefix: 'v', emoji: '🍸', accent: 'bg-blue-500' },
  { type: 'Gin', take: 3, idPrefix: 'g', emoji: '🌿', accent: 'bg-emerald-600' },
  { type: 'Rum', take: 3, idPrefix: 'r', emoji: '🥥', accent: 'bg-amber-300' },
  { type: 'Cocktail Kit', take: 10, idPrefix: 'k', emoji: '🍹', accent: 'bg-orange-500' },
];
const STEP_THREE: Bucket[] = [
  { type: 'Mixer', take: 10, idPrefix: 'm', emoji: '🥤', accent: 'bg-emerald-500' },
];

async function fetchBucket(
  bucket: Bucket,
): Promise<{ top: BuilderProduct[]; extras: BuilderProduct[] }> {
  // Restrict to products with at least one deep-stock available variant.
  const rows = await prisma.product.findMany({
    where: {
      productType: bucket.type,
      status: 'ACTIVE',
      variants: {
        some: {
          availableForSale: true,
          inventoryQuantity: { gte: MIN_INVENTORY },
        },
      },
    },
    include: {
      images: { take: 1, orderBy: { position: 'asc' } },
      variants: { select: { inventoryQuantity: true, availableForSale: true } },
      _count: { select: { orderItems: true } },
    },
    take: 200,
  });

  // Order: highest in-stock first, then by historical orders, then by price.
  rows.sort((a, b) => {
    const aMaxStock = Math.max(...a.variants.map((v) => v.inventoryQuantity));
    const bMaxStock = Math.max(...b.variants.map((v) => v.inventoryQuantity));
    if (aMaxStock !== bMaxStock) return bMaxStock - aMaxStock;
    const orderDiff = b._count.orderItems - a._count.orderItems;
    if (orderDiff !== 0) return orderDiff;
    return Number(a.basePrice) - Number(b.basePrice);
  });

  const mapped = rows.map((r) => {
    const [name, detail] = r.title.split(' • ').map((s) => s.trim());
    return {
      id: `${bucket.idPrefix}-${r.handle}`,
      name: name || r.title,
      detail: detail || undefined,
      price: Number(r.basePrice),
      emoji: bucket.emoji,
      accent: bucket.accent,
      image: r.images[0]?.url || undefined,
      sku: r.handle,
    } satisfies BuilderProduct;
  });

  return {
    top: mapped.slice(0, bucket.take),
    extras: mapped.slice(bucket.take),
  };
}

async function buildCatalogUncached(): Promise<CuratedCatalog> {
  let stepOne, stepTwo, stepThree;
  try {
    [stepOne, stepTwo, stepThree] = await Promise.all([
      Promise.all(STEP_ONE.map(fetchBucket)),
      Promise.all(STEP_TWO.map(fetchBucket)),
      Promise.all(STEP_THREE.map(fetchBucket)),
    ]);
  } catch (err) {
    console.error('[getLastMinuteCatalog] DB fetch failed:', err);
    const empty = { top: [], extras: [] };
    stepOne = STEP_ONE.map(() => empty);
    stepTwo = STEP_TWO.map(() => empty);
    stepThree = STEP_THREE.map(() => empty);
  }

  const stepOneCategories: BuilderCategory[] = STEP_ONE.map((b, i) => ({
    key: b.type.toLowerCase().replace(/\s+/g, '-'),
    label: b.type === 'Seltzer' ? 'Seltzers' : b.type,
    products: stepOne[i].top,
    extras: stepOne[i].extras,
  }));
  const stepTwoCategories: BuilderCategory[] = STEP_TWO.map((b, i) => ({
    key: b.type.toLowerCase().replace(/\s+/g, '-'),
    label: b.type === 'Cocktail Kit' ? 'Cocktail Kits' : b.type,
    products: stepTwo[i].top,
    extras: stepTwo[i].extras,
  }));
  const stepThreeCategories: BuilderCategory[] = STEP_THREE.map((b, i) => ({
    key: b.type.toLowerCase().replace(/\s+/g, '-'),
    label: b.type === 'Mixer' ? 'Sodas & Mixers' : b.type,
    products: stepThree[i].top,
    extras: stepThree[i].extras,
  }));

  const allProducts: BuilderProduct[] = [
    ...stepOneCategories.flatMap((c) => [...c.products, ...(c.extras ?? [])]),
    ...stepTwoCategories.flatMap((c) => [...c.products, ...(c.extras ?? [])]),
    ...stepThreeCategories.flatMap((c) => [...c.products, ...(c.extras ?? [])]),
  ];
  const productById = Object.fromEntries(allProducts.map((p) => [p.id, p])) as Record<
    string,
    BuilderProduct
  >;

  return { stepOneCategories, stepTwoCategories, stepThreeCategories, productById };
}

export const getLastMinuteCatalog = buildCatalogUncached;
