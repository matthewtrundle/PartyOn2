/**
 * Single Product API - Get, Update, Delete
 *
 * GET /api/v1/products/:id - Get single product
 * PUT /api/v1/products/:id - Update product
 * DELETE /api/v1/products/:id - Delete product (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProduct,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
} from '@/lib/inventory/services/product-service';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { stripVariantCosts } from '@/lib/products/sanitize';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/products/:id
 * Get single product by ID or handle
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const product = await getProduct(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Public endpoint — strip internal cost data from variant rows
    const sanitized = {
      ...product,
      variants: stripVariantCosts(product.variants),
    };

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error) {
    console.error('[Products API] GET by ID error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/products/:id
 * Update an existing product
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();

    // Verify product exists
    const existing = await getProduct(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = await updateProduct({
      id: existing.id,
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

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('[Products API] PUT error:', error);

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'A product with this handle already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/products/:id
 * Delete a product (soft delete by default, hard delete with ?hard=true)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const hardDelete = request.nextUrl.searchParams.get('hard') === 'true';

    // Verify product exists
    const existing = await getProduct(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      await hardDeleteProduct(existing.id);
    } else {
      await deleteProduct(existing.id);
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Product permanently deleted' : 'Product archived',
    });
  } catch (error) {
    console.error('[Products API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      },
      { status: 500 }
    );
  }
}
