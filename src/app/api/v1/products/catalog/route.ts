/**
 * Public Product Catalog API
 *
 * GET /api/v1/products/catalog - Active products for customer-facing catalogs
 * (group order dashboards). Intentionally unauthenticated and field-restricted:
 * no inventory counts, no cost data, ACTIVE products only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { Prisma } from '@prisma/client';

const MAX_LIMIT = 100;

/**
 * GET /api/v1/products/catalog
 * Query params:
 * - collection: category handle to filter by (optional)
 * - limit: max products to return (default 50, capped at 100)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection') || undefined;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10) || 50,
      MAX_LIMIT
    );

    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(collection && {
        categories: { some: { category: { handle: collection } } },
      }),
    };

    const products = await prisma.product.findMany({
      where,
      orderBy: { title: 'asc' },
      take: limit,
      select: {
        id: true,
        handle: true,
        title: true,
        productType: true,
        basePrice: true,
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: { url: true, altText: true },
        },
        variants: {
          where: { availableForSale: true },
          select: {
            id: true,
            title: true,
            price: true,
            availableForSale: true,
          },
        },
      },
    });

    const transformed = products.map((product) => ({
      id: product.id,
      handle: product.handle,
      title: product.title,
      productType: product.productType,
      basePrice: Number(product.basePrice),
      image: product.images[0] || null,
      variants: product.variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: Number(v.price),
        availableForSale: v.availableForSale,
      })),
    }));

    return NextResponse.json(
      { success: true, data: { products: transformed } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[Product Catalog API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
