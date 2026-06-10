import type { Metadata } from 'next';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
import { corporateConfig } from '@/components/landing/configs/corporate';
import { getCuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { getLastMinuteCatalog } from '@/lib/landing/getLastMinuteCatalog';
import { getOccasionPackages } from '@/lib/landing/getOccasionPackages';
import { getUpsellProducts } from '@/lib/landing/getUpsellProducts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: corporateConfig.metaTitle,
  description: corporateConfig.metaDescription,
  alternates: { canonical: `/${corporateConfig.slug}` },
  openGraph: {
    title: corporateConfig.metaTitle,
    description: corporateConfig.metaDescription,
    images: [corporateConfig.ogImage],
  },
  robots: { index: true, follow: true },
};

export default async function Page() {
  const [catalog, lastMinuteCatalog, packages, upsellProducts] = await Promise.all([
    getCuratedCatalog(),
    getLastMinuteCatalog(),
    getOccasionPackages('corporate'),
    getUpsellProducts(),
  ]);
  const config = { ...corporateConfig, packages };
  return <LandingPageTemplate config={config} catalog={catalog} lastMinuteCatalog={lastMinuteCatalog} upsellProducts={upsellProducts} />;
}
