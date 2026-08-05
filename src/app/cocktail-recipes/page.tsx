/**
 * /cocktail-recipes — quick recipe lookup for every Party On Delivery cocktail kit.
 * @module app/cocktail-recipes/page
 *
 * Membership comes from the live `cocktail-kits` category so a retired kit
 * disappears on its own; the curated recipe file only enriches it. A kit with
 * no curated recipe is skipped (with a dev warning) rather than guessed at.
 */

import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import RecipeLookup from '@/components/cocktail-recipes/RecipeLookup';
import { prisma } from '@/lib/database/client';
import { KIT_RECIPES, getKitRecipe } from '@/data/cocktail-recipes';
import { spiritGroupFor } from '@/data/cocktail-recipes/groups';
import { JULY4_KIT_HANDLE_SET } from '@/lib/products/july4-kits';
import type { RecipeKit } from '@/data/cocktail-recipes/types';
import { generateItemListSchema, generateRecipeSchema } from '@/lib/seo/schemas';

export const revalidate = 300;

const SITE_URL = 'https://partyondelivery.com';
const PAGE_URL = `${SITE_URL}/cocktail-recipes`;

export const metadata: Metadata = {
  title: 'Cocktail Kit Recipes | Mixing Instructions | Party On Delivery',
  description:
    'Mixing instructions for every Party On Delivery cocktail kit — margaritas, mojitos, spritzes, espresso martinis and mocktails. Find your kit, see what is inside, and pour in minutes.',
  keywords:
    'cocktail kit recipes, batch cocktail recipes, margarita kit instructions, party pitcher recipes, Austin cocktail kits',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Cocktail Kit Recipes | Party On Delivery',
    description: 'How to mix every Party On Delivery cocktail kit. Search your kit, get the recipe, pour in minutes.',
    url: PAGE_URL,
    siteName: 'Party On Delivery',
    type: 'website',
  },
};

/** Absolute URL for schema.org image fields. */
function absoluteUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${SITE_URL}${path}`;
}

/**
 * Net units sold per product, for ordering the grid by popularity.
 *
 * Counts every non-cancelled order and subtracts refunded units. Recomputed on
 * each revalidation, so the grid re-ranks itself as the season turns instead of
 * following a hand-kept list.
 */
async function getUnitsSold(productIds: string[]): Promise<Map<string, number>> {
  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds }, order: { status: { not: 'CANCELLED' } } },
    _sum: { quantity: true, refundedQuantity: true },
  });

  return new Map(rows.map((row) => [row.productId, (row._sum.quantity ?? 0) - (row._sum.refundedQuantity ?? 0)]));
}

/**
 * Load every ACTIVE cocktail kit that has a curated recipe, best sellers first.
 * Lean select — the page needs a picture, a price and a handle.
 */
async function getRecipeKits(): Promise<RecipeKit[]> {
  const category = await prisma.category.findFirst({ where: { handle: 'cocktail-kits' } });
  if (!category) return [];

  const rows = await prisma.productCategory.findMany({
    where: { categoryId: category.id, product: { status: 'ACTIVE' } },
    select: {
      product: {
        select: {
          id: true,
          handle: true,
          basePrice: true,
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, altText: true } },
          variants: { orderBy: { createdAt: 'asc' }, take: 1, select: { price: true } },
        },
      },
    },
  });

  const unitsSold = await getUnitsSold(rows.map((row) => row.product.id));
  const soldFor = new Map<string, number>();

  const kits: RecipeKit[] = [];
  for (const { product } of rows) {
    // The July 4th trio stays out of the year-round lookup. Their recipes are
    // still authored, so putting them back is a one-line change next summer.
    if (JULY4_KIT_HANDLE_SET.has(product.handle)) continue;

    const recipe = getKitRecipe(product.handle);
    if (!recipe) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[cocktail-recipes] ACTIVE kit "${product.handle}" has no curated recipe — it will not appear.`);
      }
      continue;
    }

    const rawPrice = product.variants[0]?.price ?? product.basePrice;
    soldFor.set(product.handle, unitsSold.get(product.id) ?? 0);
    kits.push({
      ...recipe,
      handle: product.handle,
      group: spiritGroupFor(recipe),
      imageUrl: product.images[0]?.url ?? null,
      imageAlt: product.images[0]?.altText ?? null,
      price: rawPrice === null || rawPrice === undefined ? null : Number(rawPrice).toFixed(2),
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    const live = new Set(rows.map((r) => r.product.handle));
    for (const handle of Object.keys(KIT_RECIPES)) {
      if (!live.has(handle)) {
        console.warn(`[cocktail-recipes] Recipe "${handle}" has no ACTIVE product — the handle may have changed.`);
      }
    }
  }

  // Best sellers first so the kit someone is most likely holding is on top.
  // Alphabetical break for ties, which is most of the long tail.
  return kits.sort(
    (a, b) => (soldFor.get(b.handle) ?? 0) - (soldFor.get(a.handle) ?? 0) || a.displayName.localeCompare(b.displayName)
  );
}

export default async function CocktailRecipesPage(): Promise<ReactElement> {
  const kits = await getRecipeKits();

  const itemListSchema = generateItemListSchema(
    kits.map((kit) => ({
      name: kit.displayName,
      url: `${PAGE_URL}?kit=${kit.handle}`,
      image: absoluteUrl(kit.imageUrl),
      price: kit.price ?? undefined,
    }))
  );

  const recipeSchemas = kits.map((kit) =>
    generateRecipeSchema({
      name: kit.displayName,
      description: `How to mix the ${kit.displayName} cocktail kit from Party On Delivery. ${kit.yieldLabel}.`,
      recipeYield: kit.yieldLabel,
      prepTime: kit.prepTimeISO,
      ingredients: kit.ingredients,
      instructions: kit.instructions,
      image: absoluteUrl(kit.imageUrl),
      url: `${PAGE_URL}?kit=${kit.handle}`,
    })
  );

  return (
    <div className="min-h-screen bg-white">
      <Navigation forceScrolled={true} />

      {/* Deliberately short: a visitor scanning the QR code on a dispenser
          should reach the search box without scrolling on a phone. */}
      <section className="px-4 pt-28 pb-4 text-center sm:px-8 sm:pt-32">
        <h1 className="font-heading text-3xl tracking-[0.1em] text-gray-900 md:text-4xl">Cocktail Kit Recipes</h1>
        <p className="mx-auto mt-2 max-w-xl text-base text-gray-600">Search your kit to see how to mix it.</p>
        <div className="rule-yellow mx-auto mt-4" />
      </section>

      <RecipeLookup kits={kits} />

      <section className="border-t border-gray-200 bg-gray-50 px-4 py-12 text-center sm:px-8">
        <h2 className="font-heading text-2xl tracking-[0.1em] text-gray-900">Need a kit for the weekend?</h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-gray-600">
          Every recipe here comes batched, chilled and delivered across Austin — dispenser included.
        </p>
        <Link href="/cocktail-kits" className="btn-primary mt-5">
          Shop cocktail kits
        </Link>
      </section>

      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchemas) }} />
    </div>
  );
}
