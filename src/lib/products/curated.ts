import { prisma } from '@/lib/database/client';
import { transformToProduct } from '@/lib/products/transform';
import type { Product } from '@/lib/types';

/** Relations needed to transform a Prisma product into the storefront shape. */
const productInclude = {
  images: { orderBy: { position: 'asc' as const } },
  variants: {
    include: { image: true },
    orderBy: { createdAt: 'asc' as const },
  },
  categories: { include: { category: true } },
  bundleComponents: {
    select: {
      quantity: true,
      componentProduct: {
        select: { variants: { select: { inventoryQuantity: true, committedQuantity: true } } },
      },
      componentVariant: {
        select: { inventoryQuantity: true, committedQuantity: true },
      },
    },
  },
};

/**
 * Fetch specific products by handle and return them transformed to the
 * storefront `Product` shape, in the same order as `handles`. Handles that
 * don't resolve (missing / renamed) are skipped. Server-only (uses Prisma) —
 * call from a Server Component and pass the result to a client grid.
 */
export async function getProductsByHandles(handles: string[]): Promise<Product[]> {
  if (handles.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { handle: { in: handles } },
    include: productInclude,
  });
  const byHandle = new Map(rows.map((row) => [row.handle, row]));
  return handles
    .map((handle) => byHandle.get(handle))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => transformToProduct(row));
}
