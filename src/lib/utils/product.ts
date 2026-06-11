/** Product utility functions */

import type { Product, ProductVariant } from '@/lib/types';
import { getProductCardImage } from '@/lib/utils/image';
import { isAgeVerified } from '@/lib/utils/age-verification';

export function getFirstAvailableVariant(product: Product): ProductVariant | null {
  const availableVariant = product.variants.edges.find(
    ({ node }) => node.availableForSale
  );
  return availableVariant?.node || null;
}

export function getProductImageUrl(product: Product, index: number = 0, isMobile: boolean = false): string {
  const image = product.images.edges[index]?.node;
  if (!image?.url) return '/images/products/branded-delivery-bag.webp';
  return getProductCardImage(image.url, isMobile);
}

export function getRawProductImageUrl(product: Product, index: number = 0): string {
  const image = product.images.edges[index]?.node;
  return image?.url || '/images/products/branded-delivery-bag.webp';
}

export function getMetafieldValue(product: Product): string | null {
  return product.metafield?.value || null;
}

export function isAlcoholProduct(product: Product): boolean {
  const alcoholTypes = ['spirits', 'wine', 'beer', 'liquor', 'champagne'];
  const productType = product.productType.toLowerCase();
  const tags = product.tags.map(tag => tag.toLowerCase());
  return alcoholTypes.some(type =>
    productType.includes(type) || tags.includes(type)
  );
}

export function getProductABV(product: Product): string | null {
  return product.metafield?.value || null;
}

export function canPurchaseAlcohol(): boolean {
  return isAgeVerified();
}
