import type { Metadata } from 'next';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
import { bacheloretteConfig } from '@/components/landing/configs/bachelorette';
import { getCuratedCatalog } from '@/lib/landing/getCuratedCatalog';
import { getLastMinuteCatalog } from '@/lib/landing/getLastMinuteCatalog';
import { getOccasionPackages } from '@/lib/landing/getOccasionPackages';
import { getUpsellProducts } from '@/lib/landing/getUpsellProducts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: bacheloretteConfig.metaTitle,
  description: bacheloretteConfig.metaDescription,
  alternates: { canonical: `/${bacheloretteConfig.slug}` },
  openGraph: {
    title: bacheloretteConfig.metaTitle,
    description: bacheloretteConfig.metaDescription,
    images: [bacheloretteConfig.ogImage],
  },
  robots: { index: true, follow: true },
};

export default async function Page() {
  const [catalog, lastMinuteCatalog, packages, upsellProducts] = await Promise.all([
    getCuratedCatalog({ includeBubbly: true }),
    getLastMinuteCatalog(),
    getOccasionPackages('bachelorette'),
    getUpsellProducts(),
  ]);
  const config = { ...bacheloretteConfig, packages };
  return <LandingPageTemplate config={config} catalog={catalog} lastMinuteCatalog={lastMinuteCatalog} upsellProducts={upsellProducts} />;
}
