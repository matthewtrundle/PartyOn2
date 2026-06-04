import type { Metadata } from 'next';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
import WeddingVenueBoatsSchemas from '@/components/seo/WeddingVenueBoatsSchemas';
import { weddingVenueBoatsConfig } from '@/components/landing/configs/wedding-venue-boats';
import { getCuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { getOccasionPackages } from '@/lib/landing/getOccasionPackages';
import { getUpsellProducts } from '@/lib/landing/getUpsellProducts';

/**
 * Boat-as-Wedding-Venue landing page (WS2). Targets the value-segment
 * wedding-venue keyword cluster — see docs/seo/plans/wedding-cluster-strategy-2026.md.
 *
 * Coexists with /austin-wedding-weekend-delivery (the existing wedding
 * landing). This page is the BOAT-VENUE entry; the existing one is the
 * traditional-venue alcohol-delivery entry.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: weddingVenueBoatsConfig.metaTitle,
  description: weddingVenueBoatsConfig.metaDescription,
  alternates: { canonical: `/${weddingVenueBoatsConfig.slug}` },
  openGraph: {
    title: weddingVenueBoatsConfig.metaTitle,
    description: weddingVenueBoatsConfig.metaDescription,
    images: [weddingVenueBoatsConfig.ogImage],
  },
  robots: { index: true, follow: true },
};

export default async function Page() {
  const [catalog, packages, upsellProducts] = await Promise.all([
    getCuratedCatalog(),
    // Reuse wedding occasion packages — venue packages above are illustrative
    // and the modal builder still sells the wedding bar service catalog.
    getOccasionPackages('wedding'),
    getUpsellProducts(),
  ]);
  // Keep our hand-curated venue packages from the config and fall back to
  // the wedding occasion packages only if the config didn't define them.
  const config = {
    ...weddingVenueBoatsConfig,
    packages: weddingVenueBoatsConfig.packages.length > 0 ? weddingVenueBoatsConfig.packages : packages,
  };
  return (
    <>
      <WeddingVenueBoatsSchemas />
      <LandingPageTemplate config={config} catalog={catalog} upsellProducts={upsellProducts} />
    </>
  );
}
