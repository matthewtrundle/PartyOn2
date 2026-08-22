/**
 * Server-side fetcher for the landing-page Package Builder modal.
 *
 * Queries the live Postgres database (the same DB that powers the
 * partyondelivery.com site) to pull top-selling products per category,
 * then returns the catalog in the shape the modal already understands.
 *
 * Cached for 1 hour to avoid hammering the DB on every page request.
 *
 * Used by: src/app/austin-*-party-delivery/page.tsx
 */

import { prisma } from '@/lib/database/client';
import type { BuilderProduct, BuilderCategory } from '@/components/landing/types';

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
  | 'Mixer'
  | 'Sparkling Wine';

type Bucket = {
  type: ProductTypeKey;
  take: number;
  idPrefix: string;
  emoji: string;
  accent: string;
};

// Same category counts as the original curated list.
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

// Bubbly/champagne — opt-in per occasion (e.g. bachelorette). Pulls the live
// "Sparkling Wine" productType, which covers champagne, prosecco AND rosé,
// so it fills the bachelorette Step One ("Bubbly, rosé & seltzers") tab.
const BUBBLY: Bucket = {
  type: 'Sparkling Wine',
  take: 10,
  idPrefix: 'sp',
  emoji: '🥂',
  accent: 'bg-amber-300',
};

export type CuratedCatalogOptions = { includeBubbly?: boolean };

async function fetchBucket(
  bucket: Bucket,
): Promise<{ top: BuilderProduct[]; extras: BuilderProduct[] }> {
  const rows = await prisma.product.findMany({
    where: { productType: bucket.type, status: 'ACTIVE' },
    include: {
      images: { take: 1, orderBy: { position: 'asc' } },
      variants: { select: { inventoryQuantity: true, availableForSale: true } },
      _count: { select: { orderItems: true } },
    },
    take: 200,
  });

  // Sort: in-stock first, then by historical orders desc, then by price asc.
  rows.sort((a, b) => {
    const aStock = a.variants.some((v) => v.inventoryQuantity > 0 || v.availableForSale);
    const bStock = b.variants.some((v) => v.inventoryQuantity > 0 || v.availableForSale);
    if (aStock !== bStock) return aStock ? -1 : 1;
    const orderDiff = b._count.orderItems - a._count.orderItems;
    if (orderDiff !== 0) return orderDiff;
    return Number(a.basePrice) - Number(b.basePrice);
  });

  const mapped = rows.map((r) => {
    // Split title on " • " — common pattern: "Brand Name • Size Format"
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

async function buildCatalogUncached(opts: CuratedCatalogOptions = {}) {
  // Bubbly/champagne rides in Step One (the bachelorette "Bubbly, rosé &
  // seltzers" step) only when the occasion asks for it.
  const stepOneBuckets: Bucket[] = opts.includeBubbly ? [...STEP_ONE, BUBBLY] : STEP_ONE;

  let stepOne, stepTwo, stepThree;
  try {
    [stepOne, stepTwo, stepThree] = await Promise.all([
      Promise.all(stepOneBuckets.map(fetchBucket)),
      Promise.all(STEP_TWO.map(fetchBucket)),
      Promise.all(STEP_THREE.map(fetchBucket)),
    ]);
  } catch (err) {
    // If the DB is unreachable (build-time, network blip, etc.), serve an
    // empty catalog rather than 500ing the whole landing page.
    console.error('[getCuratedCatalog] DB fetch failed:', err);
    const empty = { top: [], extras: [] };
    stepOne = stepOneBuckets.map(() => empty);
    stepTwo = STEP_TWO.map(() => empty);
    stepThree = STEP_THREE.map(() => empty);
  }

  const stepOneCategories: BuilderCategory[] = stepOneBuckets.map((b, i) => ({
    key: b.type.toLowerCase().replace(/\s+/g, '-'),
    label:
      b.type === 'Seltzer'
        ? 'Seltzers'
        : b.type === 'Sparkling Wine'
          ? 'Bubbly & Champagne'
          : b.type,
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

  // productById must contain every product the user might add, including extras.
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

export const getCuratedCatalog = buildCatalogUncached;

export type CuratedCatalog = Awaited<ReturnType<typeof buildCatalogUncached>>;
