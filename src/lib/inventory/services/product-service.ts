/**
 * Product Service
 * Business logic for product management
 */

import { prisma } from '@/lib/database/client';
import { Prisma, ProductStatus } from '@prisma/client';
import { cascadeVariantAvailabilityForStatus } from '@/lib/products/availability';
import type {
  ProductCreateInput,
  ProductUpdateInput,
  ProductFilters,
  ProductWithRelations,
  PaginationParams,
} from '../types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Get paginated list of products with filters
 */
export async function getProducts(
  filters: ProductFilters = {},
  pagination: PaginationParams = {}
): Promise<{ products: ProductWithRelations[]; total: number }> {
  const {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = pagination;

  const take = Math.min(pageSize, MAX_PAGE_SIZE);
  const skip = (page - 1) * take;

  // Build where clause
  const where: Prisma.ProductWhereInput = {};

  if (filters.status) {
    where.status = filters.status as ProductStatus;
  }

  if (filters.productType) {
    where.productType = filters.productType;
  }

  if (filters.vendor) {
    where.vendor = filters.vendor;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { handle: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search } },
    ];
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.basePrice = {};
    if (filters.minPrice !== undefined) {
      where.basePrice.gte = new Prisma.Decimal(filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      where.basePrice.lte = new Prisma.Decimal(filters.maxPrice);
    }
  }

  if (filters.categoryId) {
    where.categories = {
      some: { categoryId: filters.categoryId },
    };
  }

  if (filters.inStock !== undefined) {
    where.variants = {
      some: {
        inventoryQuantity: filters.inStock ? { gt: 0 } : { lte: 0 },
      },
    };
  }

  // Build orderBy
  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
        categories: { include: { category: true } },
      },
      orderBy,
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total };
}

/**
 * Get single product by ID or handle
 */
export async function getProduct(
  idOrHandle: string
): Promise<ProductWithRelations | null> {
  return prisma.product.findFirst({
    where: {
      OR: [{ id: idOrHandle }, { handle: idOrHandle }],
    },
    include: {
      variants: true,
      images: { orderBy: { position: 'asc' } },
      categories: { include: { category: true } },
    },
  });
}

/**
 * Create a new product
 */
export async function createProduct(
  input: ProductCreateInput
): Promise<ProductWithRelations> {
  const product = await prisma.product.create({
    data: {
      handle: input.handle,
      title: input.title,
      description: input.description,
      descriptionHtml: input.descriptionHtml,
      vendor: input.vendor,
      productType: input.productType,
      tags: input.tags || [],
      basePrice: new Prisma.Decimal(input.basePrice),
      compareAtPrice: input.compareAtPrice
        ? new Prisma.Decimal(input.compareAtPrice)
        : null,
      status: (input.status as ProductStatus) || 'DRAFT',
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      abv: input.abv ? new Prisma.Decimal(input.abv) : null,
    },
    include: {
      variants: true,
      images: true,
      categories: { include: { category: true } },
    },
  });

  return product;
}

/**
 * Update an existing product
 */
export async function updateProduct(
  input: ProductUpdateInput
): Promise<ProductWithRelations> {
  const { id, ...data } = input;

  const updateData: Prisma.ProductUpdateInput = {};

  if (data.handle !== undefined) updateData.handle = data.handle;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.descriptionHtml !== undefined) updateData.descriptionHtml = data.descriptionHtml;
  if (data.vendor !== undefined) updateData.vendor = data.vendor;
  if (data.productType !== undefined) updateData.productType = data.productType;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.basePrice !== undefined) updateData.basePrice = new Prisma.Decimal(data.basePrice);
  if (data.compareAtPrice !== undefined) {
    updateData.compareAtPrice = data.compareAtPrice
      ? new Prisma.Decimal(data.compareAtPrice)
      : null;
  }
  if (data.status !== undefined) updateData.status = data.status as ProductStatus;
  if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
  if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
  if (data.abv !== undefined) {
    updateData.abv = data.abv ? new Prisma.Decimal(data.abv) : null;
  }

  // Cascade status → variant availability in the SAME transaction: a product moving to
  // DRAFT/ARCHIVED must take its variants off-sale so it can't be bought via a stale cart or a
  // direct/shared link. Cascade runs first so the product.update's `include` returns fresh variants.
  return prisma.$transaction(async (tx) => {
    if (data.status !== undefined) {
      await cascadeVariantAvailabilityForStatus(tx, id, data.status);
    }
    return tx.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
        categories: { include: { category: true } },
      },
    });
  });
}

/**
 * Delete a product (soft delete by archiving)
 *
 * Archiving also takes the product's variants off-sale (in one transaction) so the archived
 * product can't be bought via a stale cart or a direct/shared product link.
 */
export async function deleteProduct(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    await cascadeVariantAvailabilityForStatus(tx, id, 'ARCHIVED');
  });
}

/**
 * Hard delete a product (permanent)
 */
export async function hardDeleteProduct(id: string): Promise<void> {
  await prisma.product.delete({ where: { id } });
}

/**
 * Get unique product types for filtering
 */
export async function getProductTypes(): Promise<string[]> {
  const result = await prisma.product.findMany({
    select: { productType: true },
    distinct: ['productType'],
    where: { productType: { not: null } },
  });

  return result
    .map(r => r.productType)
    .filter((t): t is string => t !== null);
}

/**
 * Get unique vendors for filtering
 */
export async function getVendors(): Promise<string[]> {
  const result = await prisma.product.findMany({
    select: { vendor: true },
    distinct: ['vendor'],
    where: { vendor: { not: null } },
  });

  return result
    .map(r => r.vendor)
    .filter((v): v is string => v !== null);
}

/**
 * Search products by text
 * Prioritizes title matches over description matches
 */
export async function searchProducts(
  query: string,
  limit = 10
): Promise<ProductWithRelations[]> {
  const words = query.split(/\s+/).filter(w => w.length > 0);

  // Build a condition requiring ALL words to appear in the title
  const titleMatchAll = words.length > 1
    ? { AND: words.map(word => ({ title: { contains: word, mode: 'insensitive' as const } })) }
    : { title: { contains: query, mode: 'insensitive' as const } };

  // Title matches first (best results)
  const titleMatches = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      ...titleMatchAll,
    },
    include: {
      variants: true,
      images: { orderBy: { position: 'asc' }, take: 1 },
      categories: { include: { category: true } },
    },
    take: limit,
  });

  // If we have enough title matches, return them
  if (titleMatches.length >= limit) {
    return titleMatches;
  }

  // Otherwise, fill remaining slots with SKU/tag matches (not description)
  const titleIds = titleMatches.map(p => p.id);
  const remaining = limit - titleMatches.length;

  const otherMatches = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: titleIds },
      OR: [
        { tags: { hasSome: words } },
        { variants: { some: { sku: { contains: query, mode: 'insensitive' } } } },
      ],
    },
    include: {
      variants: true,
      images: { orderBy: { position: 'asc' }, take: 1 },
      categories: { include: { category: true } },
    },
    take: remaining,
  });

  return [...titleMatches, ...otherMatches];
}
