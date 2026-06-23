/**
 * Shopify Product Sync Service
 * Syncs products from Shopify to local database
 */

import { PrismaClient, ProductStatus, Prisma } from '@prisma/client';
import { paginatedAdminQuery } from './admin-client';
import { cascadeVariantAvailabilityForStatus } from '@/lib/products/availability';

const PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          handle
          title
          descriptionHtml
          vendor
          productType
          tags
          status
          createdAt
          updatedAt
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantCompareAtPrice {
              amount
            }
          }
          seo {
            title
            description
          }
          variants(first: 100) {
            edges {
              node {
                id
                sku
                title
                price
                compareAtPrice
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
  }
`;

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string | null;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  compareAtPriceRange: {
    minVariantCompareAtPrice: {
      amount: string;
    } | null;
  };
  seo: {
    title: string | null;
    description: string | null;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        sku: string | null;
        title: string;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number | null;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string | null;
        width: number | null;
        height: number | null;
      };
    }>;
  };
}

interface ProductsQueryResult {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: Array<{ node: ShopifyProduct }>;
  };
}

/**
 * Extract Shopify GID numeric ID
 */
function extractShopifyId(gid: string): string {
  return gid.split('/').pop() || gid;
}

/**
 * Map Shopify status to Prisma enum
 */
function mapStatus(status: string): ProductStatus {
  switch (status) {
    case 'ACTIVE':
      return ProductStatus.ACTIVE;
    case 'DRAFT':
      return ProductStatus.DRAFT;
    case 'ARCHIVED':
      return ProductStatus.ARCHIVED;
    default:
      return ProductStatus.DRAFT;
  }
}

export interface SyncResult {
  created: number;
  updated: number;
  errors: Array<{ handle: string; error: string }>;
}

/**
 * Sync all products from Shopify to database
 */
export async function syncAllProducts(prisma: PrismaClient): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  const productIterator = paginatedAdminQuery<ProductsQueryResult, ShopifyProduct>(
    PRODUCTS_QUERY,
    data => data.products.edges.map(e => e.node),
    data => data.products.pageInfo
  );

  for await (const products of productIterator) {
    for (const shopifyProduct of products) {
      try {
        const syncResult = await syncSingleProduct(prisma, shopifyProduct);
        if (syncResult.isNew) {
          result.created++;
        } else {
          result.updated++;
        }
      } catch (error) {
        result.errors.push({
          handle: shopifyProduct.handle,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  return result;
}

/**
 * Sync a single product from Shopify data
 */
async function syncSingleProduct(
  prisma: PrismaClient,
  shopifyProduct: ShopifyProduct
): Promise<{ isNew: boolean }> {
  const shopifyId = extractShopifyId(shopifyProduct.id);

  // Check if product exists
  const existing = await prisma.product.findFirst({
    where: {
      OR: [{ shopifyId }, { handle: shopifyProduct.handle }],
    },
  });

  const basePrice = new Prisma.Decimal(shopifyProduct.priceRangeV2.minVariantPrice.amount);
  const compareAtPrice = shopifyProduct.compareAtPriceRange.minVariantCompareAtPrice
    ? new Prisma.Decimal(shopifyProduct.compareAtPriceRange.minVariantCompareAtPrice.amount)
    : null;

  const productData = {
    handle: shopifyProduct.handle,
    title: shopifyProduct.title,
    descriptionHtml: shopifyProduct.descriptionHtml,
    vendor: shopifyProduct.vendor,
    productType: shopifyProduct.productType,
    tags: shopifyProduct.tags,
    status: mapStatus(shopifyProduct.status),
    shopifyId,
    shopifySyncedAt: new Date(),
    basePrice,
    compareAtPrice,
    currencyCode: shopifyProduct.priceRangeV2.minVariantPrice.currencyCode,
    metaTitle: shopifyProduct.seo.title,
    metaDescription: shopifyProduct.seo.description,
  };

  let productId: string;
  let isNew = false;

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: productData,
    });
    productId = existing.id;
  } else {
    const created = await prisma.product.create({
      data: productData,
    });
    productId = created.id;
    isNew = true;
  }

  // Sync images
  await syncProductImages(prisma, productId, shopifyProduct.images.edges.map(e => e.node));

  // Sync variants
  await syncProductVariants(prisma, productId, shopifyProduct.variants.edges.map(e => e.node));

  // Cascade status → variant availability. Variant sync leaves availableForSale untouched (and
  // new variants default to true), so a DRAFT/ARCHIVED Shopify product would otherwise sync in
  // with purchasable variants. Run last so it overrides freshly-created variants. Mirrors the
  // admin status-change cascade; no-ops for ACTIVE (we never auto-re-enable).
  await cascadeVariantAvailabilityForStatus(prisma, productId, productData.status);

  return { isNew };
}

/**
 * Sync product images
 */
async function syncProductImages(
  prisma: PrismaClient,
  productId: string,
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  }>
): Promise<void> {
  // Delete existing images for this product
  await prisma.productImage.deleteMany({ where: { productId } });

  // Create new images
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    await prisma.productImage.create({
      data: {
        productId,
        url: img.url,
        altText: img.altText,
        width: img.width,
        height: img.height,
        position: i,
        shopifyId: extractShopifyId(img.id),
      },
    });
  }
}

/**
 * Sync product variants
 */
async function syncProductVariants(
  prisma: PrismaClient,
  productId: string,
  variants: Array<{
    id: string;
    sku: string | null;
    title: string;
    price: string;
    compareAtPrice: string | null;
    inventoryQuantity: number | null;
    selectedOptions: Array<{ name: string; value: string }>;
  }>
): Promise<void> {
  for (const variant of variants) {
    const shopifyId = extractShopifyId(variant.id);

    // Check if variant exists
    const existing = await prisma.productVariant.findFirst({
      where: { shopifyId },
    });

    const options = variant.selectedOptions;
    const variantData = {
      productId,
      sku: variant.sku,
      title: variant.title,
      price: new Prisma.Decimal(variant.price),
      compareAtPrice: variant.compareAtPrice
        ? new Prisma.Decimal(variant.compareAtPrice)
        : null,
      shopifyId,
      inventoryQuantity: variant.inventoryQuantity ?? 0,
      option1Name: options[0]?.name || null,
      option1Value: options[0]?.value || null,
      option2Name: options[1]?.name || null,
      option2Value: options[1]?.value || null,
      option3Name: options[2]?.name || null,
      option3Value: options[2]?.value || null,
    };

    if (existing) {
      await prisma.productVariant.update({
        where: { id: existing.id },
        data: variantData,
      });
    } else {
      await prisma.productVariant.create({
        data: variantData,
      });
    }
  }
}
