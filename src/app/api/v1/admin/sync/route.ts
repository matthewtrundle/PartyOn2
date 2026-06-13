/**
 * Shopify Sync API
 * POST /api/v1/admin/sync - Trigger a sync from Shopify
 * GET /api/v1/admin/sync - Get sync status and history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getLastSyncTime, getSyncHistory, syncProductFromShopify } from '@/lib/sync/shopify-sync';

// Shopify Storefront API client
const SHOPIFY_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN;
const STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  priceRange: {
    minVariantPrice: { amount: string };
    maxVariantPrice: { amount: string };
  };
  compareAtPriceRange?: {
    minVariantPrice: { amount: string };
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku?: string;
        price: { amount: string };
        compareAtPrice?: { amount: string };
        availableForSale: boolean;
        quantityAvailable?: number;
        selectedOptions: Array<{ name: string; value: string }>;
        weight?: number;
        weightUnit?: string;
      };
    }>;
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText?: string;
        width?: number;
        height?: number;
      };
    }>;
  };
}

const PRODUCTS_QUERY = `
  query Products($first: Int!, $after: String) {
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
          description
          descriptionHtml
          vendor
          productType
          tags
          priceRange {
            minVariantPrice { amount }
            maxVariantPrice { amount }
          }
          compareAtPriceRange {
            minVariantPrice { amount }
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                price { amount }
                compareAtPrice { amount }
                availableForSale
                quantityAvailable
                selectedOptions { name value }
                weight
                weightUnit
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

/**
 * Fetch products from Shopify Storefront API
 */
async function fetchShopifyProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const response: Response = await fetch(
      `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN || '',
        },
        body: JSON.stringify({
          query: PRODUCTS_QUERY,
          variables: { first: 50, after: cursor },
        }),
      }
    );

    const data: {
      errors?: Array<{ message: string }>;
      data?: {
        products?: {
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          edges?: Array<{ node: ShopifyProduct }>;
        };
      };
    } = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'Failed to fetch from Shopify');
    }

    const productEdges = data.data?.products?.edges || [];
    for (const edge of productEdges) {
      products.push(edge.node);
    }

    hasNextPage = data.data?.products?.pageInfo?.hasNextPage || false;
    cursor = data.data?.products?.pageInfo?.endCursor || null;
  }

  return products;
}

/**
 * GET /api/v1/admin/sync
 * Get sync status and history
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const [lastProductSync, history] = await Promise.all([
      getLastSyncTime('product'),
      getSyncHistory(undefined, 20),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        lastProductSync,
        history,
      },
    });
  } catch (error) {
    console.error('[Sync API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/sync
 * Trigger a sync from Shopify
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { entityType = 'products' } = body as { entityType?: string };

    if (entityType !== 'products') {
      return NextResponse.json(
        { success: false, error: 'Only product sync is currently supported' },
        { status: 400 }
      );
    }

    // Fetch all products from Shopify
    console.log('[Sync API] Starting product sync from Shopify...');
    const shopifyProducts = await fetchShopifyProducts();
    console.log(`[Sync API] Fetched ${shopifyProducts.length} products from Shopify`);

    // Sync each product
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const product of shopifyProducts) {
      const result = await syncProductFromShopify(product);
      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push(`${product.handle}: ${result.error}`);
      }
    }

    console.log(`[Sync API] Sync complete: ${synced} synced, ${failed} failed`);

    return NextResponse.json({
      success: failed === 0,
      data: {
        synced,
        failed,
        total: shopifyProducts.length,
        errors: errors.slice(0, 10), // Only return first 10 errors
      },
    });
  } catch (error) {
    console.error('[Sync API] Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync',
      },
      { status: 500 }
    );
  }
}
