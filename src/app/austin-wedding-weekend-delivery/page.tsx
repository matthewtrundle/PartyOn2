import type { Metadata } from 'next';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
import { weddingConfig } from '@/components/landing/configs/wedding';
import { getCuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { getLastMinuteCatalog } from '@/lib/landing/getLastMinuteCatalog';
import { getOccasionPackages } from '@/lib/landing/getOccasionPackages';
import { getUpsellProducts } from '@/lib/landing/getUpsellProducts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: weddingConfig.metaTitle,
  description: weddingConfig.metaDescription,
  alternates: { canonical: `/${weddingConfig.slug}` },
  openGraph: {
    title: weddingConfig.metaTitle,
    description: weddingConfig.metaDescription,
    images: [weddingConfig.ogImage],
  },
  robots: { index: true, follow: true },
};

export default async function Page() {
  const [catalog, lastMinuteCatalog, packages, upsellProducts] = await Promise.all([
    getCuratedCatalog(),
    getLastMinuteCatalog(),
    getOccasionPackages('wedding'),
    getUpsellProducts(),
  ]);
  const config = { ...weddingConfig, packages };
  return <LandingPageTemplate config={config} catalog={catalog} lastMinuteCatalog={lastMinuteCatalog} upsellProducts={upsellProducts} />;
}
