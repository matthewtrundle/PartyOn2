/**
 * Products API - List and Create
 *
 * GET /api/v1/products - List products with filters and pagination
 * POST /api/v1/products - Create a new product
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProducts,
  createProduct,
  getProductTypes,
  getVendors,
} from '@/lib/inventory/services/product-service';
import type { ProductFilters, PaginationParams, ApiResponse } from '@/lib/inventory/types';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { stripVariantCosts } from '@/lib/products/sanitize';

/**
 * GET /api/v1/products
 * List products with optional filters and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: ProductFilters = {};
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as ProductFilters['status'];
    }
    if (searchParams.get('productType')) {
      filters.productType = searchParams.get('productType')!;
    }
    if (searchParams.get('vendor')) {
      filters.vendor = searchParams.get('vendor')!;
    }
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }
    if (searchParams.get('minPrice')) {
      filters.minPrice = parseFloat(searchParams.get('minPrice')!);
    }
    if (searchParams.get('maxPrice')) {
      filters.maxPrice = parseFloat(searchParams.get('maxPrice')!);
    }
    if (searchParams.get('categoryId')) {
      filters.categoryId = searchParams.get('categoryId')!;
    }
    if (searchParams.get('inStock')) {
      filters.inStock = searchParams.get('inStock') === 'true';
    }

    // Parse pagination
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    };

    // Check if this is a metadata request
    if (searchParams.get('meta') === 'true') {
      const [productTypes, vendors] = await Promise.all([
        getProductTypes(),
        getVendors(),
      ]);

      return NextResponse.json({
        success: true,
        data: { productTypes, vendors },
      });
    }

    const { products, total } = await getProducts(filters, pagination);

    // Public endpoint — strip internal cost data from variant rows
    const sanitized = products.map((product) => ({
      ...product,
      variants: stripVariantCosts(product.variants),
    }));

    const response: ApiResponse<typeof sanitized> = {
      success: true,
      data: sanitized,
      meta: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: (pagination.page || 1) * (pagination.pageSize || 20) < total,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Products API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/products
 * Create a new product
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.handle || !body.title || body.basePrice === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: handle, title, basePrice',
        },
        { status: 400 }
      );
    }

    const product = await createProduct({
      handle: body.handle,
      title: body.title,
      description: body.description,
      descriptionHtml: body.descriptionHtml,
      vendor: body.vendor,
      productType: body.productType,
      tags: body.tags,
      basePrice: body.basePrice,
      compareAtPrice: body.compareAtPrice,
      status: body.status,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      abv: body.abv,
    });

    return NextResponse.json(
      { success: true, data: product },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Products API] POST error:', error);

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'A product with this handle already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product',
      },
      { status: 500 }
    );
  }
}
