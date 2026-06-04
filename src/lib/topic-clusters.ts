/**
 * @fileoverview Topic Cluster Configuration for SEO-optimized blog structure
 * @module lib/topic-clusters
 *
 * This file defines the pillar-cluster relationship for internal linking.
 * Each pillar page is a comprehensive guide that links to all cluster pages,
 * and each cluster page links back to its pillar.
 */

export interface TopicCluster {
  /** The pillar page slug */
  pillarSlug: string;
  /** The pillar page title */
  pillarTitle: string;
  /** The category this cluster covers */
  category: string;
  /** Service page URL for CTAs */
  serviceUrl: string;
  /** Cluster page slugs that link to this pillar */
  clusterSlugs: string[];
}

/**
 * Topic cluster definitions for Party On blog
 * Each cluster has one pillar page and multiple cluster (subtopic) pages
 */
export const TOPIC_CLUSTERS: TopicCluster[] = [
  {
    pillarSlug: 'ultimate-guide-austin-corporate-events',
    pillarTitle: 'The Ultimate Guide to Austin Corporate Events',
    category: 'Corporate Events',
    serviceUrl: '/corporate',
    clusterSlugs: [
      'how-to-choose-the-right-venue-for-your-austin-corporate-event',
      'top-corporate-catering-options-for-austin-business-events',
      'fun-team-building-activities-around-austin',
      'corporate-holiday-party-ideas-for-austin-companies',
      'how-to-organize-transportation-for-large-company-events',
      'professional-bar-service-and-responsible-drinking-for-events',
      'best-live-entertainment-ideas-for-austin-corporate-functions',
      'austin-venues-with-built-in-a-v-and-networking-spaces',
      'how-to-create-branded-photo-moments-for-corporate-events',
      'corporate-event-bar-service-tips-for-austin-businesses',
      'how-to-plan-a-successful-corporate-networking-event-in-austin',
      'essential-bar-setup-checklist-for-austin-office-parties',
      'corporate-client-appreciation-event-ideas-in-austin',
      'how-to-host-a-professional-happy-hour-for-your-austin-team',
      // 'corporate-events-austin-guide' — 301'd to this pillar (WS4)
    ],
  },
  {
    pillarSlug: 'ultimate-guide-austin-bachelor-parties',
    pillarTitle: 'The Ultimate Guide to Austin Bachelor Parties',
    category: 'Bachelor Parties',
    serviceUrl: '/bach-parties',
    clusterSlugs: [
      'best-bbq-spots-for-a-bachelor-party-lunch-in-austin',
      'top-party-boat-rentals-for-austin-bachelor-weekends',
      'how-to-plan-a-brewery-crawl-on-austin-s-east-side',
      'unique-bachelor-party-ideas-beyond-the-bar-scene',
      'best-airbnb-neighborhoods-for-bachelor-parties-in-austin',
      'how-to-create-a-stress-free-bachelor-itinerary-in-austin',
      'austin-s-best-axe-throwing-and-adventure-activities-for-bachelor-parties',
      'what-to-pack-for-a-bachelor-weekend-on-lake-travis',
      'how-to-book-vip-nightlife-and-bottle-service-in-austin',
      'austin-bachelor-party-do-s-and-don-ts-for-first-time-planners',
    ],
  },
  {
    pillarSlug: 'ultimate-guide-austin-bachelorette-parties',
    pillarTitle: 'The Ultimate Guide to Austin Bachelorette Parties',
    category: 'Bachelorette Parties',
    serviceUrl: '/bach-parties',
    clusterSlugs: [
      'how-to-split-costs-fairly-for-a-bachelorette-weekend-in-austin',
      'best-austin-bachelorette-themes-and-matching-outfit-ideas',
      'top-brunch-spots-for-an-austin-bachelorette-crew',
      'spa-and-wellness-retreat-ideas-for-a-relaxing-bachelorette',
      'the-ultimate-guide-to-austin-s-instagram-worthy-photo-ops',
      'how-to-build-a-group-playlist-for-your-austin-bach-trip',
    ],
  },
  {
    pillarSlug: 'ultimate-guide-austin-weddings',
    pillarTitle: 'The Ultimate Guide to Planning Your Austin Wedding',
    category: 'Weddings',
    serviceUrl: '/weddings',
    clusterSlugs: [
      'plan-hill-country-wedding-six-months',
      'best-small-wedding-venues-austin',
      'stress-free-wedding-vendor-checklist',
      'austin-florists-caterers-texas-weddings',
      'friday-sunday-wedding-save-money',
      'austin-elopement-ideas-minimalist',
      'rustic-modern-wedding-decor-texas',
      'wedding-photography-austin-lakes-hills',
      'rehearsal-dinner-austin-restaurants',
      'all-inclusive-austin-wedding-venues',
      'signature-wedding-cocktails-texas-heat',
      'ultimate-guide-austin-wedding-bar-service',
    ],
  },
  // Wedding sub-clusters (added 2026-05 in WS4). Each is anchored on a new
  // commercial page (WS1/WS2/WS3) rather than a blog pillar — the service URL
  // is the conversion target, the cluster posts are top-of-funnel feeders.
  {
    pillarSlug: 'wedding-venues',
    pillarTitle: 'Austin Wedding Venues — Cheap, Small, and Intimate Options',
    category: 'Wedding Venues',
    serviceUrl: '/austin-wedding-venue-boats',
    clusterSlugs: [
      'best-small-wedding-venues-austin',
      'all-inclusive-austin-wedding-venues',
      'austin-elopement-ideas-minimalist',
    ],
  },
  {
    pillarSlug: 'wedding-budget',
    pillarTitle: 'Austin Wedding Budget — How Much, How Many, How Affordable',
    category: 'Wedding Budget',
    serviceUrl: '/wedding-drink-calculator',
    clusterSlugs: [
      'friday-sunday-wedding-save-money',
      'plan-hill-country-wedding-six-months',
    ],
  },
  {
    pillarSlug: 'wedding-vendors',
    pillarTitle: 'Austin Wedding Vendors — DJs, Florists, Photographers, Caterers',
    category: 'Wedding Vendors',
    serviceUrl: '/partners/austin-wedding-dj',
    clusterSlugs: [
      'austin-florists-caterers-texas-weddings',
      'stress-free-wedding-vendor-checklist',
      'wedding-photography-austin-lakes-hills',
      'rehearsal-dinner-austin-restaurants',
    ],
  },
  {
    pillarSlug: 'ultimate-guide-lake-travis-boat-parties',
    pillarTitle: 'The Ultimate Guide to Lake Travis Boat Parties',
    category: 'Boat Parties',
    serviceUrl: '/boat-parties',
    clusterSlugs: [
      'lake-travis-party-boat-checklist',
      'best-party-barge-rentals-austin',
      // 'ultimate-guide-austin-boat-parties-lake-travis' — 301'd to this pillar in next.config.ts (WS4)
    ],
  },
  {
    pillarSlug: 'ultimate-guide-ut-tailgating-austin',
    pillarTitle: 'The Ultimate Guide to UT Football Tailgating in Austin',
    category: 'Tailgating',
    serviceUrl: '/products',
    clusterSlugs: [],
  },
  {
    pillarSlug: 'ultimate-guide-austin-birthday-parties',
    pillarTitle: 'The Ultimate Guide to Birthday Parties in Austin',
    category: 'Birthday Parties',
    serviceUrl: '/products',
    clusterSlugs: [],
  },
  {
    pillarSlug: 'ultimate-guide-austin-engagement-parties',
    pillarTitle: 'The Ultimate Guide to Engagement Parties in Austin',
    category: 'Engagement Parties',
    serviceUrl: '/products',
    clusterSlugs: [],
  },
  {
    pillarSlug: 'ultimate-guide-austin-gender-reveals',
    pillarTitle: 'The Ultimate Guide to Gender Reveals in Austin',
    category: 'Gender Reveals',
    serviceUrl: '/products',
    clusterSlugs: [],
  },
  {
    pillarSlug: 'ultimate-guide-austin-quinceaneras',
    pillarTitle: 'The Ultimate Guide to Austin Quinceaneras',
    category: 'Quinceaneras',
    serviceUrl: '/products',
    clusterSlugs: [],
  },
];

/**
 * Find the pillar page for a given cluster page slug
 * @param clusterSlug - The slug of the cluster page
 * @returns The topic cluster containing this slug, or undefined
 */
export function findPillarForCluster(clusterSlug: string): TopicCluster | undefined {
  return TOPIC_CLUSTERS.find(cluster =>
    cluster.clusterSlugs.includes(clusterSlug)
  );
}

/**
 * Find the topic cluster for a given category
 * @param category - The category name
 * @returns The topic cluster for this category, or undefined
 */
export function findClusterByCategory(category: string): TopicCluster | undefined {
  return TOPIC_CLUSTERS.find(cluster =>
    cluster.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Check if a slug is a pillar page
 * @param slug - The page slug to check
 * @returns true if this is a pillar page
 */
export function isPillarPage(slug: string): boolean {
  return TOPIC_CLUSTERS.some(cluster => cluster.pillarSlug === slug);
}

/**
 * Get related cluster pages for a given slug (excluding the current page)
 * @param slug - The current page slug
 * @returns Array of related cluster slugs
 */
export function getRelatedClusterPages(slug: string): string[] {
  const cluster = findPillarForCluster(slug);
  if (!cluster) return [];

  return cluster.clusterSlugs.filter(s => s !== slug);
}

/**
 * Generate the pillar link section for a cluster page
 * @param clusterSlug - The cluster page slug
 * @returns Markdown string with pillar link, or empty string
 */
export function generatePillarLinkSection(clusterSlug: string): string {
  const cluster = findPillarForCluster(clusterSlug);
  if (!cluster) return '';

  return `
---

*This article is part of our comprehensive [${cluster.pillarTitle}](/blog/${cluster.pillarSlug}). Explore the full guide for more tips and resources.*
`;
}

/**
 * Generate related articles section for a cluster page
 * @param clusterSlug - The cluster page slug
 * @param limit - Maximum number of related articles (default 3)
 * @returns Markdown string with related article links
 */
export function generateRelatedArticlesSection(clusterSlug: string, limit = 3): string {
  const related = getRelatedClusterPages(clusterSlug).slice(0, limit);
  if (related.length === 0) return '';

  const links = related.map(slug => {
    // Convert slug to title (basic transformation)
    const title = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `- [${title}](/blog/${slug})`;
  }).join('\n');

  return `
## Related Articles

${links}
`;
}
