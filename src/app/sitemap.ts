/**
 * Sitemap generation for Party On Delivery
 *
 * Generates dynamic sitemap including:
 * - Static pages (excluding /account blocked by robots.txt)
 * - Shopify products (auto-paginated)
 * - Dynamic delivery location pages
 * - ALL blog posts (JSON + MDX)
 * - Dynamic blog category pages
 *
 * Last updated: Jan 2025 - Added MDX posts and fixed blog URLs
 */

import { MetadataRoute } from 'next'
import blogPosts from '@/data/blog-posts/posts.json'
import { getAllMDXPosts } from '@/lib/blog-mdx'
import { prisma } from '@/lib/database/client'

interface BlogPost {
  slug: string;
  publishedAt: string;
}

interface ProductNode {
  handle: string;
  updatedAt: Date;
}

// Fetch active products from PostgreSQL
async function getProducts(): Promise<ProductNode[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        variants: { some: { availableForSale: true } },
      },
      select: {
        handle: true,
        updatedAt: true,
      },
    });

    return products;
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://partyondelivery.com'

  // Fetch dynamic data
  const products = await getProducts();

  // Static pages (excluding /account pages blocked by robots.txt).
  // Routes that intentionally canonicalize to another URL are not
  // listed here — including a URL in the sitemap while its canonical
  // points elsewhere is flagged as "Incorrect pages found in
  // sitemap.xml" by site-audit tools and confuses Google:
  //   - /plan-event       canonicalizes to /order
  //   - /austin-partners  canonicalizes to /partners
  //   - /blogs/news       has no page; canonical resolves to /
  const staticPages = [
    '',
    '/about',
    '/contact',
    '/order',
    '/blog',
    '/weddings',
    '/wedding-drink-calculator',
    '/austin-wedding-venue-boats',
    '/boat-parties',
    '/austin-bachelor-party-delivery',
    '/austin-bachelorette-party-delivery',
    '/corporate',
    '/delivery-areas',
    '/terms',
    '/privacy',
    '/faqs',
    '/partners',
    '/partners/austin-wedding-dj',
    '/austin-partners'
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date('2026-03-27'),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : route === '/order' ? 0.9 : 0.8
  }))

  // /austin-*-delivery conversion-oriented landing pages (added 2026-05-06).
  // Priority 0.9 to match /order — these are commercial-intent destinations.
  const austinDeliveryLandingPages = [
    '/austin-bachelor-party-delivery',
    '/austin-bachelorette-party-delivery',
    '/austin-corporate-event-delivery',
    '/austin-wedding-weekend-delivery',
    '/austin-4th-of-july-delivery',
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date('2026-05-06'),
    changeFrequency: 'weekly' as const,
    priority: 0.9
  }))

  // Product pages (dynamic) - filter out test products
  const productPages = products
    .filter(product => !product.handle.includes('test'))
    .map(product => ({
      url: `${baseUrl}/products/${product.handle}`,
      lastModified: product.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8
    }))

  // Location pages for SEO (dynamic routes)
  const locationSlugs = [
    'downtown-austin',
    'lake-travis',
    'west-austin',
    'south-austin',
    'east-austin',
    'north-austin'
  ];

  const locationPages = locationSlugs.map(slug => ({
    url: `${baseUrl}/delivery/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7
  }))

  // ALL blog posts (JSON + MDX) - using /blog/ URL format
  const mdxPosts = getAllMDXPosts();

  // JSON blog posts
  const jsonBlogPosts = (blogPosts as BlogPost[]).map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6
  }))

  // MDX blog posts
  const mdxBlogPosts = mdxPosts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6
  }))

  console.log(`Sitemap: Including ${jsonBlogPosts.length} JSON blog posts + ${mdxBlogPosts.length} MDX blog posts = ${jsonBlogPosts.length + mdxBlogPosts.length} total`)

  // Blog categories (dynamic routes - using actual category slugs)
  const categorySlugs = [
    'event-planning',
    'cocktail-recipes',
    'local-guides',
    'business-tips'
  ];

  const blogCategories = categorySlugs.map(slug => ({
    url: `${baseUrl}/blog/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5
  }))

  return [
    ...staticPages,
    ...austinDeliveryLandingPages,
    ...productPages,
    ...locationPages,
    ...jsonBlogPosts,
    ...mdxBlogPosts,
    ...blogCategories
  ]
}
