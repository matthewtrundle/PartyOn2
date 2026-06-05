import type { Metadata } from 'next';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
import { bachelorConfig } from '@/components/landing/configs/bachelor';
import { getCuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { getLastMinuteCatalog } from '@/lib/landing/getLastMinuteCatalog';
import { getOccasionPackages } from '@/lib/landing/getOccasionPackages';
import { getUpsellProducts } from '@/lib/landing/getUpsellProducts';

// Render at request time, not at build — avoids DB calls during prerender.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: bachelorConfig.metaTitle,
  description: bachelorConfig.metaDescription,
  alternates: { canonical: `/${bachelorConfig.slug}` },
  openGraph: {
    title: bachelorConfig.metaTitle,
    description: bachelorConfig.metaDescription,
    images: [bachelorConfig.ogImage],
  },
  robots: { index: true, follow: true },
};

export default async function AustinBachelorPartyDeliveryPage() {
  const [catalog, lastMinuteCatalog, packages, upsellProducts] = await Promise.all([
    getCuratedCatalog(),
    getLastMinuteCatalog(),
    getOccasionPackages('bachelor'),
    getUpsellProducts(),
  ]);
  const config = { ...bachelorConfig, packages };
  return (
    <LandingPageTemplate
      config={config}
      catalog={catalog}
      lastMinuteCatalog={lastMinuteCatalog}
      upsellProducts={upsellProducts}
    />
  );
}
