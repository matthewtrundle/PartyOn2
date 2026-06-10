import type { Metadata } from 'next';
import { seoConfig } from './config';

/**
 * Title/description length clamps. Google truncates titles around 60 chars
 * and meta descriptions around 155-160 chars in desktop SERPs. Going over
 * costs CTR; going way under leaves keyword real estate on the table.
 */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

const PRODUCT_TITLE_SUFFIX = 'Buy Online | Austin Same-Day Delivery';
const BLOG_TITLE_SUFFIX = 'Austin Event Bar & Delivery Blog';

function clampTitle(input: string): string {
  if (input.length <= TITLE_MAX) return input;
  const cut = input.slice(0, TITLE_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

function clampDescription(input: string): string {
  if (input.length <= DESCRIPTION_MAX) return input;
  const cut = input.slice(0, DESCRIPTION_MAX - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface ProductMetadataInput {
  handle: string;
  title: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  productType?: string | null;
  image?: { url: string; alt?: string | null } | null;
}

export interface BlogMetadataInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  seo?: {
    title?: string | null;
    description?: string | null;
    keywords?: string[] | null;
  } | null;
  tags?: string[] | null;
  category?: string | null;
  image?: { url: string; alt?: string | null } | null;
  author?: string | null;
  publishedAt?: string | null;
}

/**
 * Build product page <Metadata>. The returned title diverges from the
 * visible H1 (which is just `product.title`) so Google doesn't read the
 * page as a duplicate-signal page.
 *
 * Falls through (in order): explicit `metaTitle` column → generated
 * `${title} — ${suffix} | …` pattern.
 */
export function buildProductMetadata(input: ProductMetadataInput): Metadata {
  const canonicalPath = `/products/${input.handle}`;
  const canonical = `${seoConfig.siteUrl}${canonicalPath}`;

  const rawTitle = input.metaTitle?.trim()
    || `${input.title} — ${PRODUCT_TITLE_SUFFIX}`;
  const title = clampTitle(rawTitle);

  const rawDescription = input.metaDescription?.trim()
    || input.description?.trim()
    || `Buy ${input.title} for same-day delivery in Austin. Premium alcohol delivery for weddings, parties, and events.`;
  const description = clampDescription(rawDescription);

  const ogImage = input.image?.url
    ? [{ url: input.image.url, width: 1200, height: 1200, alt: input.image.alt || input.title }]
    : [seoConfig.defaultOgImage];

  return {
    title,
    description,
    keywords: [input.title, 'austin alcohol delivery', input.productType, 'party supplies austin']
      .filter((k): k is string => Boolean(k))
      .join(', '),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: seoConfig.siteName,
      images: ogImage,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

/**
 * Build blog post <Metadata>. Title diverges from the visible H1 (which is
 * `post.title`) — this is the bigger duplicate-title source on the site
 * since the H1 was previously echoed verbatim into <title> and og:title.
 *
 * Falls through (in order): explicit frontmatter `seo.title` → generated
 * `${title} | ${suffix}` pattern.
 */
export function buildBlogMetadata(input: BlogMetadataInput): Metadata {
  const canonicalPath = `/blog/${input.slug}`;
  const canonical = `${seoConfig.siteUrl}${canonicalPath}`;

  const rawTitle = input.seo?.title?.trim()
    || `${input.title} | ${BLOG_TITLE_SUFFIX}`;
  const title = clampTitle(rawTitle);

  const rawDescription = input.seo?.description?.trim()
    || input.excerpt?.trim()
    || seoConfig.defaultDescription;
  const description = clampDescription(rawDescription);

  const keywordParts = [
    ...(input.seo?.keywords ?? []),
    input.category ?? null,
    ...(input.tags ?? []),
  ].filter((k): k is string => Boolean(k));

  const ogImage = input.image?.url
    ? [{ url: input.image.url, alt: input.image.alt || input.title }]
    : [{ url: seoConfig.defaultOgImage.url, alt: seoConfig.defaultOgImage.alt }];

  return {
    title,
    description,
    keywords: keywordParts.length ? keywordParts.join(', ') : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: seoConfig.siteName,
      publishedTime: input.publishedAt || undefined,
      authors: input.author ? [input.author] : undefined,
      images: ogImage,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}
