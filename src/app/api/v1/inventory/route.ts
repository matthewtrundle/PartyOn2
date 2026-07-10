/**
 * Inventory API - Overview and Management
 *
 * GET /api/v1/inventory - Get inventory items (from ProductVariant)
 * GET /api/v1/inventory?view=locations - Get single hardcoded location summary
 * POST /api/v1/inventory - Adjust or count inventory
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  adjustInventory,
  setInventoryCount,
} from '@/lib/inventory/services/inventory-service';

const LOW_STOCK_THRESHOLD = 10;

/**
 * GET /api/v1/inventory
 * Get inventory items from ProductVariant (single source of truth)
 * Query params:
 *   - search: Search by product name, variant title, or SKU
 *   - filter: 'all' | 'low_stock' | 'out_of_stock' | 'missing_cost'
 *   - includeArchived: '1' to include ARCHIVED/DRAFT products (default: ACTIVE only)
 *   - view: 'locations' returns a single hardcoded location summary
 *   - page: Page number (default 1)
 *   - limit: Items per page (default 100)
 *
 * Default sort: out-of-stock → low-stock → in-stock, then product/variant title.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const includeArchived = searchParams.get('includeArchived') === '1';
    const view = searchParams.get('view');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100')));

    // Hardcoded single location summary
    if (view === 'locations') {
      const totalVariants = await prisma.productVariant.count();
      const totalStock = await prisma.productVariant.aggregate({
        _sum: { inventoryQuantity: true },
      });
      const uniqueProducts = await prisma.product.count({
        where: { variants: { some: {} } },
      });

      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'main-warehouse',
            name: 'Main Warehouse',
            summary: {
              totalItems: totalStock._sum.inventoryQuantity ?? 0,
              uniqueProducts,
              itemCount: totalVariants,
            },
          },
        ],
      });
    }

    const where: Prisma.ProductVariantWhereInput = {};

    if (!includeArchived) {
      where.product = { status: 'ACTIVE' };
    }

    if (search) {
      const searchOr: Prisma.ProductVariantWhereInput[] = [
        { product: { title: { contains: search, mode: 'insensitive' } } },
        { sku: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
      where.OR = searchOr;
    }

    if (filter === 'missing_cost') {
      where.costPerUnit = null;
    }

    // Stock-tier filters require post-filter because available = inventoryQuantity - committedQuantity.
    const needsPostFilter = filter === 'out_of_stock' || filter === 'low_stock' || filter === 'oversold';

    const allVariants = await prisma.productVariant.findMany({
      where,
      include: {
        product: { select: { id: true, title: true, handle: true, status: true } },
      },
      orderBy: [{ product: { title: 'asc' } }, { title: 'asc' }],
      ...(!needsPostFilter ? { skip: (page - 1) * limit, take: limit } : {}),
    });

    // Evergreen (trackInventory=false) variants are always sellable — they never
    // belong in low/out/oversold tiers (mirrors checkout + the Today aggregate).
    let filteredVariants = allVariants;
    if (filter === 'oversold') {
      filteredVariants = allVariants.filter(v => v.trackInventory && (v.inventoryQuantity - v.committedQuantity) < 0);
    } else if (filter === 'out_of_stock') {
      filteredVariants = allVariants.filter(v => v.trackInventory && (v.inventoryQuantity - v.committedQuantity) <= 0);
    } else if (filter === 'low_stock') {
      filteredVariants = allVariants.filter(v => {
        const available = v.inventoryQuantity - v.committedQuantity;
        return v.trackInventory && available > 0 && available <= LOW_STOCK_THRESHOLD;
      });
    }

    // Default sort (filter='all' or 'missing_cost'): by stock-tier urgency, then alphabetical.
    // out-of-stock (0) → low-stock (1) → in-stock (2). Ties broken by product/variant title.
    if (!needsPostFilter) {
      const tierOf = (qty: number, committed: number, tracked: boolean): number => {
        if (!tracked) return 2;
        const available = qty - committed;
        if (available <= 0) return 0;
        if (available <= LOW_STOCK_THRESHOLD) return 1;
        return 2;
      };
      filteredVariants = [...filteredVariants].sort((a, b) => {
        const ta = tierOf(a.inventoryQuantity, a.committedQuantity, a.trackInventory);
        const tb = tierOf(b.inventoryQuantity, b.committedQuantity, b.trackInventory);
        if (ta !== tb) return ta - tb;
        const pa = a.product.title.localeCompare(b.product.title);
        if (pa !== 0) return pa;
        return (a.title ?? '').localeCompare(b.title ?? '');
      });
    }

    const totalCount = filteredVariants.length;

    const paginatedVariants = needsPostFilter
      ? filteredVariants.slice((page - 1) * limit, page * limit)
      : filteredVariants;

    const totalForMeta = needsPostFilter
      ? totalCount
      : await prisma.productVariant.count({ where });

    const formattedItems = paginatedVariants.map(variant => ({
      id: variant.id,
      productId: variant.productId,
      productName: variant.product.title,
      productStatus: variant.product.status,
      variantId: variant.id,
      variantName: variant.title || null,
      sku: variant.sku || null,
      quantity: variant.inventoryQuantity,
      committedQuantity: variant.committedQuantity,
      available: variant.inventoryQuantity - variant.committedQuantity,
      trackInventory: variant.trackInventory,
      reservedQuantity: variant.committedQuantity,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      reorderPoint: 5,
      price: variant.price != null ? Number(variant.price) : null,
      costPerUnit: variant.costPerUnit != null ? Number(variant.costPerUnit) : null,
      locationId: 'main-warehouse',
      locationName: 'Main Warehouse',
      lastCountedAt: null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedItems,
      meta: {
        count: formattedItems.length,
        total: totalForMeta,
        page,
        limit,
        totalPages: Math.ceil(totalForMeta / limit),
      },
    });
  } catch (error) {
    console.error('[Inventory API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/inventory
 * Handle inventory operations: adjust, count
 * Transfer is no longer supported (single location).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const operation = body.operation;

    switch (operation) {
      case 'adjust': {
        if (!body.productId || body.quantity === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: productId, quantity' },
            { status: 400 }
          );
        }

        const result = await adjustInventory({
          productId: body.productId,
          variantId: body.variantId,
          quantity: body.quantity,
          reason: body.reason,
          type: body.type || 'ADJUSTMENT',
        });

        return NextResponse.json({ success: true, data: result });
      }

      case 'transfer': {
        return NextResponse.json(
          { success: false, error: 'Transfer not supported' },
          { status: 400 }
        );
      }

      case 'count': {
        if (!Array.isArray(body.items)) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: items (array)' },
            { status: 400 }
          );
        }

        const result = await setInventoryCount({
          items: body.items,
          countedBy: body.countedBy,
        });

        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid operation. Use: adjust, transfer, or count' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Inventory API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Inventory operation failed',
      },
      { status: 500 }
    );
  }
}
